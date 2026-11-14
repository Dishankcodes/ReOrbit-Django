"""Voucher rules: what a donation earns, who can use a voucher, and how it is spent once.

The browser never decides a discount. The orders app calls check() to price a cart,
check(lock=True) + spend() inside the checkout transaction, and give_back() when an unpaid
or cancelled checkout lets the voucher go.
"""

import secrets
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.utils import timezone

from apps.core import buyers as buyer_kit

from .models import Voucher

VOUCHER_DAYS = 90  # how long a new voucher stays valid
MIN_ORDER_MULTIPLE = 2  # a voucher needs a cart of at least twice its value (the app tells donors this)
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O or 1/I to mix up when typing

# Same numbers as frontend/src/user/data/donationsStore.js (SERVER_WEIGHT, CONDITION_FACTOR,
# REWARD_RULES) so the estimate a donor sees is what they get.
WEIGHT_PER_ITEM = {
    "Furniture": Decimal("12"), "Home Decor": Decimal("3"), "Fashion": Decimal("1.2"), "Clothing": Decimal("3.5"),
    "Kitchen": Decimal("4"), "Electronics": Decimal("5"), "Books": Decimal("4"), "Sports": Decimal("3"),
}
DEFAULT_WEIGHT = Decimal("1.5")
CONDITION_FACTOR = {"Good": Decimal("1"), "Medium": Decimal("0.7"), "Worst": Decimal("0.4")}
DEFAULT_FACTOR = Decimal("0.7")
POINTS_BASE, POINTS_PER_ITEM = 50, 10
CO2_PER_KG = Decimal("1.9")
VOUCHER_MIN, VOUCHER_MAX = 50, 500


class VoucherError(Exception):
    """A voucher cannot be used. `code` starts with VOUCHER_ so the app can clear the box."""

    def __init__(self, message, code="VOUCHER_INVALID"):
        super().__init__(message)
        self.message, self.code = message, code


# --------------------------------------------------------------------------- #
# what a donation earns
# --------------------------------------------------------------------------- #
def _round_half_up(value, places="1"):
    return Decimal(value).quantize(Decimal(places), rounding=ROUND_HALF_UP)


def weight_kg(category, quantity):
    """Rough weight of a donation, to one decimal place."""
    return _round_half_up(WEIGHT_PER_ITEM.get(category, DEFAULT_WEIGHT) * max(1, int(quantity or 1)), "0.1")


def co2_saved(weight):
    return _round_half_up(Decimal(weight) * CO2_PER_KG, "0.01")


def reward_points(quantity):
    return POINTS_BASE + POINTS_PER_ITEM * max(1, int(quantity or 1))


def voucher_amount(category, quantity, condition):
    kg = WEIGHT_PER_ITEM.get(category, DEFAULT_WEIGHT) * max(1, int(quantity or 1))
    worth = int(_round_half_up(kg * 12 * CONDITION_FACTOR.get(condition, DEFAULT_FACTOR) / 10, "1")) * 10
    return max(VOUCHER_MIN, min(VOUCHER_MAX, worth))


# --------------------------------------------------------------------------- #
# issuing
# --------------------------------------------------------------------------- #
def new_code():
    for _ in range(20):
        code = "RO-" + "".join(secrets.choice(CODE_ALPHABET) for _ in range(8))
        if not Voucher.objects.filter(code=code).exists():
            return code
    raise RuntimeError("Could not make a unique voucher code.")  # 32^8 codes: practically unreachable


def issue_for_donation(donation):
    """The donor's voucher. Safe to call twice: one voucher per donation (also a database rule)."""
    existing = Voucher.objects.filter(source_type="donation", source_id=donation.public_id).first()
    if existing:
        return existing
    amount = voucher_amount(donation.category, donation.quantity, donation.condition)
    return Voucher.objects.create(
        owner=donation.donor, code=new_code(), title=f"₹{amount} marketplace voucher", amount=amount,
        min_order=amount * MIN_ORDER_MULTIPLE, expires_at=timezone.now() + timedelta(days=VOUCHER_DAYS),
        source_type="donation", source_id=donation.public_id,
    )


# --------------------------------------------------------------------------- #
# using
# --------------------------------------------------------------------------- #
def clean_code(raw):
    return "".join(str(raw or "").split()).upper()


def check(buyer, raw_code, goods_total, *, lock=False):
    """Return the Voucher if `buyer` can use it on a cart with `goods_total` rupees of goods.

    Raises VoucherError in plain words. With lock=True the row is locked (call inside the checkout
    transaction), so two checkouts can never both spend it. A code that is not found and a code
    that belongs to someone else give the same answer, so codes cannot be guessed.
    """
    if buyer_kit.type_of(buyer) != "user":
        raise VoucherError("Vouchers are for member accounts.", "VOUCHER_MEMBER")
    code = clean_code(raw_code)
    if not code:
        raise VoucherError("Enter a voucher code.")
    qs = Voucher.objects.filter(code=code)
    voucher = (qs.select_for_update() if lock else qs).first()
    if voucher is None or voucher.owner_id != buyer.pk:
        raise VoucherError("This voucher isn't valid.")
    if voucher.status == Voucher.Status.USED:
        raise VoucherError("This voucher has already been used.", "VOUCHER_USED")
    if voucher.is_expired:
        raise VoucherError("This voucher has expired.", "VOUCHER_EXPIRED")
    if goods_total < voucher.min_order:
        raise VoucherError(
            f"Add ₹{voucher.min_order - goods_total:,} more to use this voucher (minimum order ₹{voucher.min_order:,}).",
            "VOUCHER_MIN_ORDER",
        )
    return voucher


def discount_for(voucher, payable_total):
    """Rupees off. Never the whole bill: an order always keeps at least ₹1 to pay."""
    return max(0, min(voucher.amount, int(payable_total) - 1))


def spend(voucher, payment):
    """Mark it used by this checkout. Call in the same transaction as check(lock=True)."""
    voucher.status, voucher.used_at, voucher.used_checkout = Voucher.Status.USED, timezone.now(), payment.public_id
    voucher.save(update_fields=["status", "used_at", "used_checkout", "updated_at"])


def give_back(payment_public_id):
    """The checkout that spent it was given up (unpaid hold released, or every order cancelled)."""
    if not payment_public_id:
        return 0
    return Voucher.objects.filter(used_checkout=payment_public_id, status=Voucher.Status.USED).update(
        status=Voucher.Status.ACTIVE, used_at=None, used_checkout="", updated_at=timezone.now())


# --------------------------------------------------------------------------- #
# how the API shows it
# --------------------------------------------------------------------------- #
def voucher_data(v):
    return {
        "id": v.public_id, "code": v.code, "title": v.title, "amount": v.amount, "min_order": v.min_order,
        "status": v.effective_status, "expires_at": v.expires_at, "used_at": v.used_at,
        "source": {"type": v.source_type, "id": v.source_id},
    }


def brief(v):
    """What the checkout quote says about the voucher it applied."""
    return {"code": v.code, "title": v.title, "amount": v.amount, "min_order": v.min_order}
