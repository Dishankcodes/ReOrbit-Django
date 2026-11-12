"""Donation vouchers: what a donation earns, and how a voucher is used at checkout.

Value rules (all whole rupees):
  worth = weight_kg x RUPEES_PER_KG x condition factor, rounded to ₹10, between MIN and MAX
  min order = 2 x worth,  valid for VALID_DAYS days
Points are separate and cheap: POINTS_BASE + POINTS_PER_ITEM per item.
"""

import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import Voucher

RUPEES_PER_KG = 12
MIN_VOUCHER = 50
MAX_VOUCHER = 500
VALID_DAYS = 90
MIN_ORDER_FACTOR = 2
POINTS_BASE = 50
POINTS_PER_ITEM = 10
CONDITION_FACTOR = {"Good": 1.0, "Medium": 0.7, "Worst": 0.4}
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I


class VoucherError(Exception):
    def __init__(self, message, code="VOUCHER_INVALID"):
        super().__init__(message)
        self.message, self.code = message, code


def voucher_worth(weight_kg, condition):
    raw = float(weight_kg or 0) * RUPEES_PER_KG * CONDITION_FACTOR.get(condition, 0.7)
    worth = int(round(raw / 10.0)) * 10
    return max(MIN_VOUCHER, min(MAX_VOUCHER, worth))


def points_for(quantity):
    return POINTS_BASE + POINTS_PER_ITEM * max(1, int(quantity or 1))


def _new_code():
    for _ in range(20):
        code = "RO-" + "".join(secrets.choice(_ALPHABET) for _ in range(8))
        if not Voucher.objects.filter(code=code).exists():
            return code
    raise RuntimeError("Could not make a voucher code.")


def issue_for_donation(donation):
    """One voucher per donation. Safe to call twice: the second call returns the first."""
    with transaction.atomic():
        found = Voucher.objects.filter(source_type="donation", source_id=donation.public_id).first()
        if found:
            return found
        amount = voucher_worth(donation.weight_kg, donation.condition)
        return Voucher.objects.create(
            owner=donation.user, code=_new_code(), amount=amount, min_order=amount * MIN_ORDER_FACTOR,
            title=f"₹{amount} marketplace voucher", expires_at=timezone.now() + timedelta(days=VALID_DAYS),
            source_type="donation", source_id=donation.public_id,
        )


def voucher_data(v):
    expired = v.status == Voucher.Status.ACTIVE and v.expires_at <= timezone.now()
    return {
        "id": v.public_id, "code": v.code, "title": v.title, "amount": v.amount, "min_order": v.min_order,
        "status": Voucher.Status.EXPIRED if expired else v.status, "expires_at": v.expires_at,
        "used_at": v.used_at, "source": {"type": v.source_type, "id": v.source_id}, "created_at": v.created_at,
    }


def check(buyer, code, subtotal, *, lock=False):
    """Return (voucher, discount) or raise VoucherError. `buyer` is the account row."""
    from apps.core import buyers as buyer_kit

    code = " ".join(str(code or "").split()).upper()
    if not code:
        raise VoucherError("Enter a voucher code.")
    if buyer_kit.type_of(buyer) != "user":
        raise VoucherError("Vouchers are for member accounts.")
    qs = Voucher.objects.select_for_update() if lock else Voucher.objects
    v = qs.filter(code=code).first()
    if v is None or v.owner_id != buyer.pk:
        raise VoucherError("That code isn't valid for your account.")
    if v.status == Voucher.Status.USED:
        raise VoucherError("You've already used this voucher.", "VOUCHER_USED")
    if v.status == Voucher.Status.EXPIRED or v.expires_at <= timezone.now():
        raise VoucherError("This voucher has expired.", "VOUCHER_EXPIRED")
    if subtotal < v.min_order:
        raise VoucherError(f"Add items worth ₹{v.min_order:,} or more to use this voucher.", "VOUCHER_MIN_ORDER")
    return v, min(v.amount, subtotal)


def split_discount(discount, subtotals):
    """Share a discount across orders by their goods value; the last one takes the rounding."""
    total = sum(subtotals) or 1
    out, left = [], discount
    for i, s in enumerate(subtotals):
        part = left if i == len(subtotals) - 1 else min(left, (discount * s) // total)
        out.append(part)
        left -= part
    return out


def mark_used(voucher):
    voucher.status, voucher.used_at = Voucher.Status.USED, timezone.now()
    voucher.save(update_fields=["status", "used_at", "updated_at"])


def reclaim(voucher):
    """A payment that was released came back and is going ahead: spend the voucher again if it is free."""
    if voucher and voucher.status == Voucher.Status.ACTIVE and voucher.expires_at > timezone.now():
        mark_used(voucher)


def restore(voucher):
    """Give a voucher back (the checkout it was spent on never went through)."""
    if voucher and voucher.status == Voucher.Status.USED:
        voucher.status, voucher.used_at = Voucher.Status.ACTIVE, None
        voucher.save(update_fields=["status", "used_at", "updated_at"])
