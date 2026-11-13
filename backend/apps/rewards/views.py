"""Rewards API (mounted at /api/rewards/).

Member
  GET  me/summary/             balance, level, progress, stats for badges
  GET  me/ledger/              points history (paged)
  GET  me/rules/               what each action earns
  GET  me/offers/              rewards to spend points on and public coupons
  POST me/offers/<id>/redeem/  spend points, get a voucher
  GET  me/vouchers/            vouchers I hold
Admin (module "rewards")
  GET  admin/rules/   PATCH admin/rules/<key>/  {points, active}
  GET/POST admin/offers/   GET/PATCH/DELETE admin/offers/<id>/
  GET  admin/redemptions/  POST admin/redemptions/<voucher>/cancel/
  GET  admin/users/        POST admin/users/<id>/adjust/   GET admin/users/<id>/ledger/
  GET  admin/donation-rewards/   POST admin/donation-rewards/<donation>/revoke|restore/
"""

from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitUser
from apps.core.pagination import StandardPagination
from apps.core.responses import created, fail, ok
from apps.core.services import audit

from . import services
from .models import PointsEntry, RewardOffer, RewardRule, Voucher

IP = lambda r: r.META.get("REMOTE_ADDR")  # noqa: E731


def _err(e):
    return fail(e.message, errors=e.errors, status=e.status, code=e.code)


# --------------------------------------------------------------------------- member
class MySummary(APIView):
    permission_classes = [IsReOrbitUser]

    def get(self, request):
        return ok(services.summary(request.user.account))


class MyLedger(APIView):
    permission_classes = [IsReOrbitUser]

    def get(self, request):
        pager = StandardPagination()
        page = pager.paginate_queryset(PointsEntry.objects.filter(user=request.user.account), request)
        return pager.get_paginated_response([services.entry_data(e) for e in page])


class MyRules(APIView):
    permission_classes = [IsReOrbitUser]

    def get(self, request):
        return ok({"rules": [services.rule_data(r) for r in RewardRule.objects.all()]})


class MyOffers(APIView):
    permission_classes = [IsReOrbitUser]

    def get(self, request):
        return ok({"offers": services.member_offers(request.user.account)})


class MyRedeem(APIView):
    permission_classes = [IsReOrbitUser]

    def post(self, request, offer_id):
        try:
            v = services.redeem(request.user.account, offer_id)
        except services.RewardError as e:
            return _err(e)
        return created({"voucher": services.voucher_data(v), "balance": services.totals(request.user.account)[0]}, "Reward redeemed.")


class MyVouchers(APIView):
    """GET /api/rewards/me/vouchers/  the member's vouchers, ready ones first."""
    permission_classes = [IsReOrbitUser]

    def get(self, request):
        rows = [services.voucher_data(v) for v in Voucher.objects.filter(owner=request.user.account).exclude(status="Void")]
        order = {"Active": 0, "Used": 1, "Expired": 2}
        rows.sort(key=lambda r: order.get(r["status"], 3))
        return ok({"vouchers": rows, "ready": sum(1 for r in rows if r["status"] == "Active")})


# --------------------------------------------------------------------------- admin
class _Admin(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("rewards")]


class AdminRules(_Admin):
    def get(self, request):
        return ok({"rules": [services.rule_data(r) for r in RewardRule.objects.all()]})


class AdminRule(_Admin):
    def patch(self, request, key):
        rule = get_object_or_404(RewardRule, key=key)
        before = {"points": rule.points, "active": rule.active}
        try:
            services.save_rule(rule, request.data, request.user.account)
        except services.RewardError as e:
            return _err(e)
        audit(request.user.account, "rewards.rule", "reward_rule", rule.key, before=before,
              after={"points": rule.points, "active": rule.active}, ip=IP(request))
        return ok({"rule": services.rule_data(rule)}, "Rule saved.")


class AdminOffers(_Admin):
    def get(self, request):
        rows = RewardOffer.objects.annotate(used_n=Count("vouchers", filter=~Q(vouchers__status=Voucher.Status.VOID)))
        return ok({"offers": [services.offer_data(o, o.used_n) for o in rows]})

    def post(self, request):
        try:
            o = services.save_offer(request.data, request.user.account)
        except services.RewardError as e:
            return _err(e)
        audit(request.user.account, "rewards.offer.create", "reward_offer", o.public_id, after={"code": o.code}, ip=IP(request))
        return created({"offer": services.offer_data(o)}, "Voucher created.")


class AdminOffer(_Admin):
    def get(self, request, public_id):
        return ok({"offer": services.offer_data(get_object_or_404(RewardOffer, public_id=public_id))})

    def patch(self, request, public_id):
        o = get_object_or_404(RewardOffer, public_id=public_id)
        merged = {**services.offer_data(o), **request.data}  # a PATCH may send just {paused: true}
        try:
            services.save_offer(merged, request.user.account, offer=o)
        except services.RewardError as e:
            return _err(e)
        audit(request.user.account, "rewards.offer.update", "reward_offer", o.public_id, after={"code": o.code, "paused": o.paused, "draft": o.draft}, ip=IP(request))
        return ok({"offer": services.offer_data(o)}, "Voucher saved.")

    def delete(self, request, public_id):
        o = get_object_or_404(RewardOffer, public_id=public_id)
        try:
            services.delete_offer(o)
        except services.RewardError as e:
            return _err(e)
        audit(request.user.account, "rewards.offer.delete", "reward_offer", public_id, ip=IP(request))
        return ok({}, "Voucher deleted.")


def _owner(v):
    u = v.owner
    return {"id": u.public_id, "name": u.full_name, "email": u.email, "status": u.status, "path": f"/admin-users/{u.public_id}"}


class AdminRedemptions(_Admin):
    """Vouchers members bought with points."""

    def get(self, request):
        qs = Voucher.objects.filter(source_type="points").select_related("owner", "offer")
        st = request.query_params.get("status")
        if st in ("Active", "Used", "Void"):
            qs = qs.filter(status=st)
        elif st == "Expired":
            from django.utils import timezone

            qs = qs.filter(status="Active", expires_at__lte=timezone.now())
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(code__icontains=q) | Q(title__icontains=q) | Q(owner__full_name__icontains=q) | Q(owner__email__icontains=q))
        pager = StandardPagination()
        page = pager.paginate_queryset(qs, request)
        rows = [{**services.voucher_data(v), "owner": _owner(v), "offer": v.offer.public_id if v.offer_id else None} for v in page]
        return pager.get_paginated_response(rows)


class AdminRedemptionCancel(_Admin):
    def post(self, request, public_id):
        v = get_object_or_404(Voucher, public_id=public_id)
        try:
            services.cancel_redemption(v, request.user.account, request.data.get("reason"))
        except services.RewardError as e:
            return _err(e)
        audit(request.user.account, "rewards.redemption.cancel", "voucher", v.public_id, reason=str(request.data.get("reason") or "")[:255], ip=IP(request))
        v.refresh_from_db()
        return ok({"voucher": services.voucher_data(v)}, "Voucher cancelled and points returned.")


class AdminUsers(_Admin):
    """Members and their points, biggest first."""

    def get(self, request):
        from apps.users.models import Users

        qs = Users.objects.exclude(status="Deleted").annotate(
            balance=Coalesce(Sum("points__points"), 0),
            lifetime=Coalesce(Sum("points__points", filter=Q(points__kind__in=services.LIFETIME_KINDS) | Q(points__kind="adjust", points__points__gt=0)), 0),
        )
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(full_name__icontains=q) | Q(email__icontains=q) | Q(public_id__icontains=q))
        qs = qs.order_by("-lifetime", "pk")
        pager = StandardPagination()
        page = pager.paginate_queryset(qs, request)
        ids = [u.pk for u in page]
        kinds = {}
        for r in PointsEntry.objects.filter(user_id__in=ids).values("user_id", "kind").annotate(n=Sum("points")):
            kinds.setdefault(r["user_id"], {})[r["kind"]] = r["n"]
        rows = []
        for u in page:
            k = kinds.get(u.pk, {})
            lifetime = max(0, u.lifetime)
            rows.append({
                "id": u.public_id, "name": u.full_name, "email": u.email, "status": u.status, "path": f"/admin-users/{u.public_id}",
                "balance": u.balance, "lifetime": lifetime, "level": services.level_data(services.level_index(lifetime)),
                "by_kind": k, "purchases": k.get("purchase", 0) + k.get("firstOrder", 0) + k.get("reversal", 0),
                "reviews": k.get("review", 0), "listings": k.get("listing", 0), "donated": k.get("donation", 0) + k.get("revoke", 0),
                "spent": -k.get("spend", 0),
            })
        return pager.get_paginated_response(rows)


class AdminUserAdjust(_Admin):
    def post(self, request, public_id):
        from apps.users.models import Users

        u = get_object_or_404(Users, public_id=public_id)
        try:
            e = services.adjust(request.user.account, u, request.data.get("amount"), request.data.get("reason"))
        except services.RewardError as err:
            return _err(err)
        audit(request.user.account, "rewards.adjust", "user", u.public_id, after={"points": e.points}, reason=e.detail, ip=IP(request))
        return ok({"entry": services.entry_data(e), "balance": services.totals(u)[0]}, "Points updated.")


class AdminUserLedger(_Admin):
    def get(self, request, public_id):
        from apps.users.models import Users

        u = get_object_or_404(Users, public_id=public_id)
        pager = StandardPagination()
        page = pager.paginate_queryset(PointsEntry.objects.filter(user=u).select_related("admin"), request)
        rows = [{**services.entry_data(e), "admin": e.admin.full_name if e.admin_id else None} for e in page]
        return pager.get_paginated_response(rows)


class AdminDonationRewards(_Admin):
    """What each donation paid (or will pay) its donor."""

    def get(self, request):
        from apps.donations.models import Donation

        qs = Donation.objects.filter(status__in=("Picked_Up", "Received", "Completed")).select_related("user").order_by("-created_at")[:500]
        paid = {e.ref_id: e for e in PointsEntry.objects.filter(kind="donation", ref_id__in=[d.public_id for d in qs])}
        revoked = set(PointsEntry.objects.filter(kind="revoke", ref_id__in=list(paid)).values_list("ref_id", flat=True))
        rows = []
        for d in qs:
            e = paid.get(d.public_id)
            status = "Revoked" if d.public_id in revoked else "Credited" if e else "Pending"
            rows.append({
                "id": d.public_id, "title": d.title, "quantity": d.quantity, "status_of_donation": d.status,
                "donor": {"id": d.user.public_id, "name": d.user.full_name, "email": d.user.email, "path": f"/admin-users/{d.user.public_id}"},
                "points": e.points if e else services.donation_points(d.quantity), "voucher": {"code": d.voucher_code, "amount": d.voucher_amount} if d.voucher_code else None,
                "status": status, "at": d.received_at or d.picked_up_at or d.created_at,
            })
        return ok({"results": rows})


class AdminDonationRewardRevoke(_Admin):
    def post(self, request, public_id):
        from apps.donations.models import Donation

        d = get_object_or_404(Donation.objects.select_related("user"), public_id=public_id)
        try:
            services.revoke_donation_reward(d, request.user.account, request.data.get("reason"))
        except services.RewardError as e:
            return _err(e)
        audit(request.user.account, "rewards.donation.revoke", "donation", d.public_id, reason=str(request.data.get("reason") or "")[:255], ip=IP(request))
        return ok({}, "Reward taken back.")


class AdminDonationRewardRestore(_Admin):
    def post(self, request, public_id):
        from apps.donations.models import Donation

        d = get_object_or_404(Donation.objects.select_related("user"), public_id=public_id)
        try:
            services.restore_donation_reward(d, request.user.account)
        except services.RewardError as e:
            return _err(e)
        audit(request.user.account, "rewards.donation.restore", "donation", d.public_id, ip=IP(request))
        return ok({}, "Reward restored.")
