"""Seller wallet: earnings, balances and payouts (members and ReMakers).

How the money flows (read this first)
  1. A buyer pays ReOrbit (Razorpay) or pays cash on delivery. ReOrbit holds it.
  2. When an order is DELIVERED the seller earns the item subtotal. The buyer already paid
     the platform fee and delivery on top, so nothing more is cut from the seller. The
     earning is PENDING for `payout_hold_days` (the return/dispute window), then AVAILABLE.
  3. The seller (or the automatic run, if switched on) creates a payout for the available
     balance. That takes the money out of the wallet at once (so it cannot be paid twice).
  4. An admin sends the bank/UPI transfer outside the app and marks the payout PAID with the
     transfer reference. If the admin REJECTS it, the money goes back to the wallet.

Everything is an append-only ledger (WalletEntry); balances are sums, never a stored number
that could drift. Platform (ReOrbit store) orders earn nothing for a seller.
"""

import logging
import re
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.core.models import Notification, PlatformSettings
from apps.core.services import audit, notify

from .models import Payout, PayoutAccount, WalletEntry

log = logging.getLogger(__name__)


class WalletError(Exception):
    def __init__(self, message, errors=None, code="WALLET_ERROR", status=400):
        super().__init__(message)
        self.message, self.errors, self.code, self.status = message, errors, code, status


def owner_of(account_type, account):
    """{"seller_user": x} or {"seller_remaker": x} for a logged-in member or ReMaker."""
    if account_type == "user":
        return {"seller_user": account}
    if account_type == "remaker":
        return {"seller_remaker": account}
    raise WalletError("Only members and ReMakers have a wallet.", status=403, code="NO_WALLET")


def owner_obj(owner):
    return owner.get("seller_user") or owner.get("seller_remaker")


def _target(owner):
    if "seller_user" in owner:
        return "/user-wallet"
    return "/remaker-earnings/payouts"


def _notify(owner, title, body, **kw):
    try:
        with transaction.atomic():
            notify(owner_obj(owner), title, body, module="earnings", target_url=_target(owner), **kw)
    except Exception:
        log.exception("wallet notification failed")


def _notify_admins(title, body, ref_id=""):
    from apps.admins.models import Admins

    try:
        with transaction.atomic():
            for a in Admins.objects.filter(status="Active"):
                if a.has_module("earnings", "view"):
                    notify(a, title, body, module="earnings", target_url="/admin-earnings",
                           ref_type="payout", ref_id=ref_id)
    except Exception:
        log.exception("admin notification failed")


# --------------------------------------------------------------------------- #
# balances and earnings
# --------------------------------------------------------------------------- #
def balances(owner):
    """One query. available already has requested payouts taken out."""
    now = timezone.now()
    a = WalletEntry.objects.filter(**owner).aggregate(
        pending=Sum("amount", filter=Q(kind="Earning", available_at__gt=now)),
        available=Sum("amount", filter=Q(available_at__lte=now)),
        lifetime=Sum("amount", filter=Q(kind="Earning")),
        in_review=Sum("amount", filter=Q(kind="Payout", payout__status="Pending")),
        paid=Sum("amount", filter=Q(kind="Payout", payout__status="Paid")),
    )
    return {
        "pending": a["pending"] or 0,
        "available": a["available"] or 0,
        "in_review": -(a["in_review"] or 0),
        "paid_out": -(a["paid"] or 0),
        "lifetime": a["lifetime"] or 0,
    }


def credit_delivered_order(order):
    """Called inside the delivery transaction. Safe to call twice (one earning per order)."""
    if order.seller_type == "platform" or order.subtotal <= 0:
        return None
    owner = {"seller_user": order.seller_user} if order.seller_type == "user" else {"seller_remaker": order.seller_remaker}
    s = PlatformSettings.load()
    now = timezone.now()
    try:
        with transaction.atomic():
            entry, created = WalletEntry.objects.get_or_create(
                order=order, kind=WalletEntry.Kind.EARNING,
                defaults={**owner, "amount": order.subtotal, "available_at": now + timedelta(days=s.payout_hold_days),
                          "note": f"{order.public_id} delivered"},
            )
    except IntegrityError:
        return None
    if created:
        when = "now" if s.payout_hold_days == 0 else f"in {s.payout_hold_days} day(s)"
        _notify(owner, "Earning added", f"₹{order.subtotal:,} from {order.public_id} is in your wallet and can be paid out {when}.",
                ref_type="order", ref_id=order.public_id)
    return entry


# --------------------------------------------------------------------------- #
# payout account
# --------------------------------------------------------------------------- #
IFSC = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")
UPI = re.compile(r"^[A-Za-z0-9._\-]{2,64}@[A-Za-z][A-Za-z0-9]{1,30}$")


def clean_account(data):
    errors, v = {}, {}
    text = lambda k: " ".join(str(data.get(k) or "").split())  # noqa: E731
    method = text("method").lower()
    if method not in ("bank", "upi"):
        raise WalletError("Choose bank account or UPI.", {"method": ["Choose bank account or UPI."]})
    v["method"] = method
    v["holder_name"] = text("holder_name")
    if len(v["holder_name"]) < 2:
        errors["holder_name"] = ["Enter the account holder's name."]
    v.update(bank_name="", account_number="", ifsc="", upi_id="")
    if method == "bank":
        v["bank_name"] = text("bank_name")[:80]
        v["account_number"] = text("account_number").replace(" ", "")
        v["ifsc"] = text("ifsc").upper()
        if not (v["account_number"].isdigit() and 9 <= len(v["account_number"]) <= 18):
            errors["account_number"] = ["Account number must be 9 to 18 digits."]
        if not IFSC.match(v["ifsc"]):
            errors["ifsc"] = ["Enter a valid IFSC (for example SBIN0001234)."]
        confirm = text("account_number_confirm").replace(" ", "")
        if "account_number_confirm" in data and confirm != v["account_number"]:
            errors["account_number_confirm"] = ["The two account numbers don't match."]
    else:
        v["upi_id"] = text("upi_id").lower()
        if not UPI.match(v["upi_id"]):
            errors["upi_id"] = ["Enter a valid UPI id (for example name@bank)."]
    if errors:
        raise WalletError("Please fix the highlighted fields.", errors)
    return v


def save_account(owner, data):
    v = clean_account(data)
    with transaction.atomic():
        _lock_owner(owner)  # two first-time saves at once queue here instead of colliding
        acct, created = PayoutAccount.objects.update_or_create(**owner, defaults=v)
    _notify(owner, "Payout details saved" if created else "Payout details changed",
            "If you did not do this, contact support right away.", ref_type="payout_account", ref_id="")
    return acct


def get_account(owner):
    return PayoutAccount.objects.filter(**owner).first()


# --------------------------------------------------------------------------- #
# payouts
# --------------------------------------------------------------------------- #
def _lock_owner(owner):
    obj = owner_obj(owner)
    type(obj).objects.select_for_update().get(pk=obj.pk)


def request_payout(owner, amount=None, source="seller"):
    """Move `amount` (default: everything available) out of the wallet into a pending payout."""
    s = PlatformSettings.load()
    with transaction.atomic():
        _lock_owner(owner)  # two taps / two tabs queue up here, so the balance can't be spent twice
        account = get_account(owner)
        if account is None:
            raise WalletError("Add your bank or UPI details first.", {"account": ["Add your bank or UPI details first."]},
                              code="NO_ACCOUNT")
        if Payout.objects.filter(**owner, status=Payout.Status.PENDING).exists():
            raise WalletError("You already have a payout waiting to be paid. Wait for it to finish.",
                              code="PAYOUT_OPEN", status=409)
        available = balances(owner)["available"]
        if amount is None:
            amount = available
        if isinstance(amount, bool) or not (isinstance(amount, int) or (isinstance(amount, str) and amount.strip().isdigit())):
            raise WalletError("Enter a whole-rupee amount.", {"amount": ["Enter a whole-rupee amount."]})
        amount = int(amount)
        if amount < s.payout_min_amount:
            raise WalletError(f"The smallest payout is ₹{s.payout_min_amount:,}.",
                              {"amount": [f"The smallest payout is ₹{s.payout_min_amount:,}."]}, code="BELOW_MINIMUM")
        if amount > available:
            raise WalletError(f"Only ₹{available:,} is available to pay out right now.",
                              {"amount": [f"Only ₹{available:,} is available."]}, code="INSUFFICIENT")
        payout = Payout.objects.create(**owner, amount=amount, source=source, account=account.snapshot())
        WalletEntry.objects.create(**owner, kind=WalletEntry.Kind.PAYOUT, amount=-amount, available_at=timezone.now(),
                                   payout=payout, note=f"Payout {payout.public_id}")
    _notify(owner, "Payout requested" if source == "seller" else "Payout created",
            f"₹{amount:,} will be sent to your {'bank account' if account.method == 'bank' else 'UPI'} by ReOrbit.",
            ref_type="payout", ref_id=payout.public_id)
    _notify_admins("Payout to pay", f"{payout.public_id}: ₹{amount:,} for {owner_obj(owner).full_name}.", payout.public_id)
    return payout


def mark_paid(payout_pk, admin, reference, ip=None):
    reference = " ".join(str(reference or "").split())
    if len(reference) < 3:
        raise WalletError("Enter the transfer reference (UTR / transaction id).",
                          {"reference": ["Enter the transfer reference."]})
    with transaction.atomic():
        p = Payout.objects.select_for_update().get(pk=payout_pk)
        if p.status != Payout.Status.PENDING:
            raise WalletError(f"This payout is already {p.status.lower()}.", code="BAD_STATE", status=409)
        p.status, p.reference, p.paid_at, p.processed_by = Payout.Status.PAID, reference[:60], timezone.now(), admin
        p.save(update_fields=["status", "reference", "paid_at", "processed_by", "updated_at"])
        audit(admin, "payout.paid", "payout", p.public_id, after={"amount": p.amount, "reference": reference[:60]}, ip=ip)
    owner = _owner_of_payout(p)
    _notify(owner, "Payout sent", f"₹{p.amount:,} was sent. Reference: {p.reference}.", ref_type="payout", ref_id=p.public_id)
    return p


def reject(payout_pk, admin, reason, ip=None):
    reason = " ".join(str(reason or "").split())
    if len(reason) < 3:
        raise WalletError("Give a reason for rejecting.", {"reason": ["Give a reason for rejecting."]})
    with transaction.atomic():
        p = Payout.objects.select_for_update().get(pk=payout_pk)
        if p.status != Payout.Status.PENDING:
            raise WalletError(f"This payout is already {p.status.lower()}.", code="BAD_STATE", status=409)
        p.status, p.reject_reason, p.processed_by = Payout.Status.REJECTED, reason[:255], admin
        p.save(update_fields=["status", "reject_reason", "processed_by", "updated_at"])
        owner = _owner_of_payout(p)
        WalletEntry.objects.create(**owner, kind=WalletEntry.Kind.RELEASE, amount=p.amount, available_at=timezone.now(),
                                   payout=p, note=f"Payout {p.public_id} returned")
        audit(admin, "payout.reject", "payout", p.public_id, reason=reason, ip=ip)
    _notify(owner, "Payout not sent", f"₹{p.amount:,} is back in your wallet. Reason: {reason}.", ref_type="payout", ref_id=p.public_id)
    return p


def _owner_of_payout(p):
    return {"seller_user": p.seller_user} if p.seller_user_id else {"seller_remaker": p.seller_remaker}


def run_auto(limit=500):
    """If automatic payouts are on, create a payout for every seller whose available balance
    reaches the minimum (and who has saved payout details and nothing already waiting).
    An admin still sends the transfer; this only removes the 'request' step."""
    s = PlatformSettings.load()
    if not s.payout_auto:
        return {"created": 0, "skipped_no_account": 0}
    now = timezone.now()
    created = skipped = 0
    for field in ("seller_user", "seller_remaker"):
        has_account = PayoutAccount.objects.filter(**{f"{field}__isnull": False}).values(field)
        waiting = Payout.objects.filter(status=Payout.Status.PENDING, **{f"{field}__isnull": False}).values(field)
        base = (WalletEntry.objects.filter(**{f"{field}__isnull": False}, available_at__lte=now)
                .exclude(**{f"{field}__in": waiting})
                .order_by().values(field).annotate(total=Sum("amount"))
                .filter(total__gte=max(s.payout_min_amount, 1)))
        # sellers who could be paid but have no saved details: counted, not looped over forever
        skipped += base.exclude(**{f"{field}__in": has_account}).count()
        for row in base.filter(**{f"{field}__in": has_account}).order_by("-total")[:limit]:
            owner = {field: _owner_row(field, row[field])}
            try:
                request_payout(owner, None, source="auto")
                created += 1
            except WalletError:
                continue
    return {"created": created, "skipped_no_account": skipped}


def _owner_row(field, pk):
    from apps.remakers.models import ReMakers
    from apps.users.models import Users

    return (Users if field == "seller_user" else ReMakers).objects.get(pk=pk)
