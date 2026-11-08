"""Wallet and payouts API (mounted under /api/payments/).

Seller (member or ReMaker)
  GET  wallet/             balances + rules + saved account (masked) + latest payout
  GET  wallet/entries/     ledger, paged   (?kind=Earning|Payout|Release)
  GET  account/  PUT account/     payout details (masked on the way out)
  GET  payouts/            my payouts, paged
  POST payouts/request/    {amount?}  default = everything available
Admin (module "earnings")
  GET   admin/payouts/             queue, paged (?status= &q=) + counts
  POST  admin/payouts/<id>/pay/    {reference}
  POST  admin/payouts/<id>/reject/ {reason}
  POST  admin/payouts/run-auto/    create payouts now (same as the daily command)
  GET/PATCH admin/rules/           payout_hold_days, payout_min_amount, payout_auto
  GET   admin/summary/             money owed to sellers
"""

from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitAuthenticated
from apps.core.models import PlatformSettings
from apps.core.pagination import StandardPagination
from apps.core.responses import fail, ok
from apps.core.services import audit

from . import wallet
from .models import Payout, WalletEntry


def _err(e):
    return fail(e.message, errors=e.errors, status=e.status, code=e.code)


def _rules(s):
    return {"payout_hold_days": s.payout_hold_days, "payout_min_amount": s.payout_min_amount, "payout_auto": s.payout_auto}


def payout_data(p, *, full=False, seller=False):
    d = {
        "id": p.public_id, "amount": p.amount, "status": p.status, "source": p.source,
        "reference": p.reference, "paid_at": p.paid_at, "reject_reason": p.reject_reason, "created_at": p.created_at,
    }
    snap = dict(p.account or {})
    if not full:  # sellers and lists never get the full account number
        from .models import PayoutAccount
        masked = PayoutAccount(**{k: snap.get(k, "") for k in ("method", "holder_name", "bank_name", "account_number", "ifsc", "upi_id")}).masked()
        snap = masked
    d["account"] = snap
    if seller:
        s = p.seller_user or p.seller_remaker
        d["seller"] = {"type": "user" if p.seller_user_id else "remaker", "id": s.public_id, "name": s.full_name, "email": s.email}
    return d


def entry_data(e):
    return {"id": e.pk, "kind": e.kind, "amount": e.amount, "available_at": e.available_at, "created_at": e.created_at,
            "note": e.note, "order": e.order.public_id if e.order_id else None, "payout": e.payout.public_id if e.payout_id else None}


class _SellerView(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def owner(self, request):
        return wallet.owner_of(request.user.account_type, request.user.account)


class WalletView(_SellerView):
    def get(self, request):
        try:
            owner = self.owner(request)
        except wallet.WalletError as e:
            return _err(e)
        acct = wallet.get_account(owner)
        last = Payout.objects.filter(**owner).first()
        return ok({
            "balances": wallet.balances(owner),
            "rules": _rules(PlatformSettings.load()),
            "account": acct.masked() if acct else None,
            "last_payout": payout_data(last) if last else None,
        })


class EntriesView(_SellerView):
    def get(self, request):
        try:
            owner = self.owner(request)
        except wallet.WalletError as e:
            return _err(e)
        qs = WalletEntry.objects.filter(**owner).select_related("order", "payout")
        k = request.query_params.get("kind")
        if k in ("Earning", "Payout", "Release"):
            qs = qs.filter(kind=k)
        pager = StandardPagination()
        page = pager.paginate_queryset(qs, request)
        return pager.get_paginated_response([entry_data(e) for e in page])


class AccountView(_SellerView):
    def get(self, request):
        try:
            acct = wallet.get_account(self.owner(request))
        except wallet.WalletError as e:
            return _err(e)
        return ok({"account": acct.masked() if acct else None})

    def put(self, request):
        try:
            acct = wallet.save_account(self.owner(request), request.data)
        except wallet.WalletError as e:
            return _err(e)
        return ok({"account": acct.masked()}, message="Payout details saved.")


class MyPayoutsView(_SellerView):
    def get(self, request):
        try:
            owner = self.owner(request)
        except wallet.WalletError as e:
            return _err(e)
        pager = StandardPagination()
        page = pager.paginate_queryset(Payout.objects.filter(**owner), request)
        return pager.get_paginated_response([payout_data(p) for p in page])


class RequestPayoutView(_SellerView):
    def post(self, request):
        try:
            p = wallet.request_payout(self.owner(request), request.data.get("amount"))
        except wallet.WalletError as e:
            return _err(e)
        return ok({"payout": payout_data(p), "balances": wallet.balances(self.owner(request))}, message="Payout requested.")


# ------------------------------------------------------------------ admin
class _AdminView(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("earnings")]


class AdminPayouts(_AdminView):
    def get(self, request):
        qs = Payout.objects.select_related("seller_user", "seller_remaker")
        st = request.query_params.get("status")
        if st in ("Pending", "Paid", "Rejected"):
            qs = qs.filter(status=st)
        t = (request.query_params.get("q") or "").strip()
        if t:
            qs = qs.filter(Q(public_id__icontains=t) | Q(reference__icontains=t) | Q(seller_user__full_name__icontains=t)
                           | Q(seller_user__email__icontains=t) | Q(seller_remaker__full_name__icontains=t)
                           | Q(seller_remaker__email__icontains=t))
        pager = StandardPagination()
        page = pager.paginate_queryset(qs, request)
        resp = pager.get_paginated_response([payout_data(p, full=True, seller=True) for p in page])
        counts = {r["status"]: r["n"] for r in Payout.objects.order_by().values("status").annotate(n=Count("pk"))}
        resp.data["data"]["counts"] = counts
        return resp


class AdminPay(_AdminView):
    def post(self, request, public_id):
        p = get_object_or_404(Payout, public_id=public_id)
        try:
            p = wallet.mark_paid(p.pk, request.user.account, request.data.get("reference"), ip=request.META.get("REMOTE_ADDR"))
        except wallet.WalletError as e:
            return _err(e)
        return ok({"payout": payout_data(Payout.objects.select_related("seller_user", "seller_remaker").get(pk=p.pk), full=True, seller=True)},
                  message="Marked as paid.")


class AdminReject(_AdminView):
    def post(self, request, public_id):
        p = get_object_or_404(Payout, public_id=public_id)
        try:
            p = wallet.reject(p.pk, request.user.account, request.data.get("reason"), ip=request.META.get("REMOTE_ADDR"))
        except wallet.WalletError as e:
            return _err(e)
        return ok({"payout": payout_data(Payout.objects.select_related("seller_user", "seller_remaker").get(pk=p.pk), full=True, seller=True)},
                  message="Payout rejected. The money is back in the seller's wallet.")


class AdminRunAuto(_AdminView):
    def post(self, request):
        r = wallet.run_auto()
        audit(request.user.account, "payout.run_auto", "payout", "", after=r, ip=request.META.get("REMOTE_ADDR"))
        if not PlatformSettings.load().payout_auto:
            return fail("Automatic payouts are switched off.", code="AUTO_OFF")
        return ok(r, message=f"{r['created']} payout(s) created.")


class AdminRules(_AdminView):
    def get(self, request):
        return ok(_rules(PlatformSettings.load()))

    def patch(self, request):
        s = PlatformSettings.load()
        before = _rules(s)
        errors, d = {}, request.data
        if "payout_hold_days" in d:
            v = _int(d["payout_hold_days"])
            if v is None or not 0 <= v <= 60:
                errors["payout_hold_days"] = ["Enter 0 to 60 days."]
            else:
                s.payout_hold_days = v
        if "payout_min_amount" in d:
            v = _int(d["payout_min_amount"])
            if v is None or not 1 <= v <= 1_000_000:
                errors["payout_min_amount"] = ["Enter an amount between ₹1 and ₹10,00,000."]
            else:
                s.payout_min_amount = v
        if "payout_auto" in d:
            if not isinstance(d["payout_auto"], bool):
                errors["payout_auto"] = ["Must be true or false."]
            else:
                s.payout_auto = d["payout_auto"]
        if errors:
            return fail("Please fix the highlighted fields.", errors=errors)
        s.updated_by = request.user.account
        s.save()
        audit(request.user.account, "settings.payout_rules", "settings", "1", before=before, after=_rules(s), ip=request.META.get("REMOTE_ADDR"))
        return ok(_rules(s), message="Payout rules saved.")


def _int(v):
    try:
        if isinstance(v, bool):
            return None
        return int(v)
    except (TypeError, ValueError):
        return None


class AdminSummary(_AdminView):
    def get(self, request):
        now = timezone.now()
        a = WalletEntry.objects.aggregate(
            pending=Sum("amount", filter=Q(kind="Earning", available_at__gt=now)),
            available=Sum("amount", filter=Q(available_at__lte=now)),
        )
        p = Payout.objects.aggregate(
            awaiting=Sum("amount", filter=Q(status="Pending")),
            paid=Sum("amount", filter=Q(status="Paid")),
        )
        return ok({"pending": a["pending"] or 0, "available": a["available"] or 0,
                   "awaiting_payment": p["awaiting"] or 0, "paid_total": p["paid"] or 0, "rules": _rules(PlatformSettings.load())})
