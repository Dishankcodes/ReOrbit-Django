"""Orbit Points and vouchers. Views stay thin; every rule lives here.

Points
  * Every change is one PointsEntry. Earning is idempotent: (member, kind, ref_type, ref_id) is unique,
    so a retry, a double click or a replayed call can never pay twice.
  * What an action is worth comes from RewardRule (edited by admins in Admin > Rewards). A reward bug
    never breaks the thing that earned the reward: the on_* hooks swallow and log their own errors.
Vouchers
  * Donation vouchers and vouchers bought with points belong to one member and work once.
  * A public coupon (RewardOffer kind "code") is checked against its limits at checkout and is then
    saved as a "code" voucher for that member, so the rest of checkout treats it like any voucher.
  * The browser never decides a discount. The orders app calls check() to price a cart,
    check(lock=True) + spend() inside the checkout transaction, and give_back() when an unpaid or
    cancelled checkout lets the voucher go.
"""

import logging
import secrets
from datetime import date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.db import IntegrityError, transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.core import buyers as buyer_kit
from apps.core.models import DEFAULT_DONATION_VOUCHER_TIERS, PlatformSettings

from .models import PointsEntry, RewardOffer, RewardRule, Voucher

log = logging.getLogger(__name__)

VOUCHER_DAYS = 90  # how long a new donation voucher stays valid
MIN_ORDER_MULTIPLE = 2  # a donation voucher needs a cart of at least twice its value (the app tells donors this)
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
# Fallbacks only, used if the RewardRule rows are ever missing (a fresh, unseeded database).
# The real numbers an admin can change live in RewardRule (keys "donationBase"/"donationItem")
# and PlatformSettings.donation_co2_per_kg.
DEFAULT_DONATION_BASE_POINTS, DEFAULT_DONATION_ITEM_POINTS = 100, 20
DEFAULT_CO2_PER_KG = Decimal("1.9")
# An accepted donation always earns at least a ₹100 voucher; more for bigger or better items.
VOUCHER_MIN, VOUCHER_MAX = 100, 500

LEVELS = (("seedling", "Seedling", 0), ("sprout", "Sprout", 500), ("orbiter", "Orbiter", 1500),
          ("guardian", "Guardian", 3000), ("champion", "Champion", 5000))
NOT_LIVE_RULES = {"referral", "follow"}  # the platform has nothing that hands these out yet
EARN_KINDS = ("purchase", "firstOrder", "donation", "listing", "review", "follow", "referral")
LIFETIME_KINDS = EARN_KINDS + ("reversal", "revoke")  # spending, refunds and deductions never lower the level
MAX_ADJUST = 100000
AUDIENCES = ("all", "new", "donors", "members", "remakers")
APPLIES_TO = ("any", "remaker", "reorbit")
MEMBER_ONLY_AUDIENCES = ("new", "donors", "members")


class VoucherError(Exception):
    """A voucher cannot be used. `code` starts with VOUCHER_ so the app can clear the box."""

    def __init__(self, message, code="VOUCHER_INVALID"):
        super().__init__(message)
        self.message, self.code = message, code


class RewardError(Exception):
    def __init__(self, message, errors=None, code=None, status=400):
        super().__init__(message)
        self.message, self.errors, self.code, self.status = message, errors or {}, code, status


def _rand(n=4):
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(n))


# --------------------------------------------------------------------------- #
# levels and the ledger
# --------------------------------------------------------------------------- #
def level_index(lifetime):
    return max(i for i, (_, _, lo) in enumerate(LEVELS) if lifetime >= lo)


def level_data(i):
    key, name, lo = LEVELS[i]
    return {"key": key, "name": name, "min": lo}


def totals(user):
    """(balance, lifetime). Lifetime counts everything earned; spending and admin deductions do not lower it."""
    q = PointsEntry.objects.filter(user=user)
    balance = q.aggregate(s=Coalesce(Sum("points"), 0))["s"]
    lifetime = q.filter(Q(kind__in=LIFETIME_KINDS) | Q(kind="adjust", points__gt=0)).aggregate(
        s=Coalesce(Sum("points"), 0))["s"]
    return balance, max(0, lifetime)


def award(user, kind, points, title, detail="", ref_type="", ref_id="", admin=None):
    """Write one ledger row. Returns it, or None when it was already written (or is worth nothing)."""
    if not points:
        return None
    try:
        with transaction.atomic():
            return PointsEntry.objects.create(
                user=user, kind=kind, points=int(points), title=title[:120], detail=str(detail or "")[:200],
                ref_type=ref_type[:12], ref_id=str(ref_id)[:24], admin=admin)
    except IntegrityError:
        return None


def _rule_points(key, fallback):
    """A RewardRule's points, 0 if an admin has switched it off, or `fallback` if the rule doesn't
    exist at all (matches frontend/src/user/data/rewardsStore.js, so estimates and credits agree)."""
    rule = RewardRule.objects.filter(key=key).first()
    if rule is None:
        return fallback
    return rule.points if rule.active else 0


def rule_points(key):
    return _rule_points(key, 0)


def _safe(fn, *args, **kwargs):
    """Run a reward hook without ever failing the caller's transaction."""
    try:
        with transaction.atomic():
            return fn(*args, **kwargs)
    except Exception:  # noqa: BLE001 - a reward bug must not break an order, a review or a listing
        log.exception("reward hook %s failed", getattr(fn, "__name__", fn))
        return None


# --------------------------------------------------------------------------- #
# hooks: called by the apps where the earning happens
# --------------------------------------------------------------------------- #
def _purchase_points(order):
    goods = max(0, order.subtotal - (order.discount or 0))
    return (goods // 100) * rule_points("purchase")


def _on_order_delivered(order):
    if order.buyer_type != "user" or not order.buyer_user_id:
        return
    user = order.buyer_user
    award(user, "purchase", _purchase_points(order), "Order delivered", order.public_id, "order", order.public_id)
    from apps.orders.models import Order  # local import: orders imports this app

    if not Order.objects.filter(buyer_user=user, status=Order.Status.DELIVERED).exclude(pk=order.pk).exists():
        award(user, "firstOrder", rule_points("firstOrder"), "First order bonus", "Your first delivered order",
              "user", user.public_id)


def on_order_delivered(order):
    return _safe(_on_order_delivered, order)


def _on_order_returned(order, refund_amount):
    if order.buyer_type != "user" or not order.buyer_user_id:
        return
    earned = PointsEntry.objects.filter(user=order.buyer_user, kind="purchase", ref_type="order",
                                        ref_id=order.public_id).first()
    if not earned or earned.points <= 0 or order.total <= 0:
        return
    share = min(1.0, float(refund_amount) / float(order.total))
    back = int(earned.points * share)
    award(order.buyer_user, "reversal", -back, "Points taken back", f"{order.public_id} was returned",
          "order", order.public_id)


def on_order_returned(order, refund_amount):
    return _safe(_on_order_returned, order, refund_amount)


def on_review(user, review):
    """Only member accounts collect Orbit Points."""
    if user is None or buyer_kit.type_of(user) != "user":
        return None
    return _safe(lambda: award(user, "review", rule_points("review"), "Review posted",
                               getattr(review, "title", "") or "Product review", "review", review.public_id))


def on_listing_published(user, item):
    if user is None or buyer_kit.type_of(user) != "user":
        return None
    return _safe(lambda: award(user, "listing", rule_points("listing"), "Item listed", item.title,
                               "listing", item.public_id))


def reward_points(quantity):
    """What a donation earns automatically: the "donationBase" rule once, plus "donationItem" per item.
    An admin can override this per donation (Donation.admin_points); this is only the fallback."""
    base = _rule_points("donationBase", DEFAULT_DONATION_BASE_POINTS)
    per_item = _rule_points("donationItem", DEFAULT_DONATION_ITEM_POINTS)
    return base + per_item * max(1, int(quantity or 1))


def on_donation_received(donation, points=None):
    """Credit a received donation to the ledger. Safe to call twice: returns what was credited."""
    if points is None:
        points = reward_points(donation.effective_quantity)
    entry = award(donation.donor, "donation", points, "Donation received",
                  f"{donation.title} · {donation.effective_quantity} item(s) reached the warehouse.",
                  "donation", donation.public_id)
    if entry is None:
        entry = PointsEntry.objects.filter(user=donation.donor, kind="donation", ref_id=donation.public_id).first()
    return entry.points if entry else 0


# --------------------------------------------------------------------------- #
# what a donation earns
# --------------------------------------------------------------------------- #
def _round_half_up(value, places="1"):
    return Decimal(value).quantize(Decimal(places), rounding=ROUND_HALF_UP)


def weight_kg(category, quantity):
    """Rough weight of a donation, to one decimal place."""
    return _round_half_up(WEIGHT_PER_ITEM.get(category, DEFAULT_WEIGHT) * max(1, int(quantity or 1)), "0.1")


def co2_saved(weight):
    """kg of CO2 counted as saved, at the admin-configurable rate (Settings > Platform)."""
    rate = PlatformSettings.load().donation_co2_per_kg or DEFAULT_CO2_PER_KG
    return _round_half_up(Decimal(weight) * rate, "0.01")


def donation_voucher_tiers():
    """The voucher amounts an admin can give for a donation (Settings > Platform), never below
    the ₹100 minimum."""
    raw = PlatformSettings.load().donation_voucher_tiers or list(DEFAULT_DONATION_VOUCHER_TIERS)
    tiers = sorted({int(t) for t in raw if str(t).isdigit() and int(t) >= VOUCHER_MIN})
    return tiers or [VOUCHER_MIN]


def voucher_amount(category, quantity, condition):
    kg = WEIGHT_PER_ITEM.get(category, DEFAULT_WEIGHT) * max(1, int(quantity or 1))
    worth = int(_round_half_up(kg * 12 * CONDITION_FACTOR.get(condition, DEFAULT_FACTOR) / 10, "1")) * 10
    return max(VOUCHER_MIN, min(VOUCHER_MAX, worth))


# --------------------------------------------------------------------------- #
# issuing
# --------------------------------------------------------------------------- #
def new_code(prefix="RO"):
    for _ in range(20):
        code = f"{prefix}-{_rand(8 if prefix == 'RO' else 4)}"
        if not Voucher.objects.filter(code=code).exists():
            return code
    raise RuntimeError("Could not make a unique voucher code.")


def issue_for_donation(donation, amount=None):
    """The donor's voucher. Safe to call twice: one voucher per donation (also a database rule).
    `amount` lets an admin's own choice (Donation.admin_voucher_amount) override the automatic amount."""
    existing = Voucher.objects.filter(source_type="donation", source_id=donation.public_id).first()
    if existing:
        return existing
    amount = max(VOUCHER_MIN, int(amount or voucher_amount(donation.category, donation.quantity, donation.condition)))
    return Voucher.objects.create(
        owner=donation.donor, code=new_code(), title=f"₹{amount} marketplace voucher", amount=amount,
        min_order=amount * MIN_ORDER_MULTIPLE, expires_at=timezone.now() + timedelta(days=VOUCHER_DAYS),
        source_type="donation", source_id=donation.public_id,
    )


# --------------------------------------------------------------------------- #
# vouchers at checkout
# --------------------------------------------------------------------------- #
def clean_code(raw):
    return "".join(str(raw or "").split()).upper()


def effective_status(v):
    """Active, Used, Expired or Void. Expiry is worked out from the date, so nothing has to run to flip it."""
    if v.status == Voucher.Status.ACTIVE and v.expires_at <= timezone.now():
        return Voucher.Status.EXPIRED
    return v.status


def discount_for(v, base, payable=None):
    """Rupees off `base` (the goods total). With `payable`, an order always keeps at least ₹1 to pay."""
    base = int(base)
    if v.discount_type == "percent":
        cap = v.max_discount or base
        off = max(0, min(base * v.percent // 100, cap, base))
    else:
        off = max(0, min(v.amount, base))
    if payable is not None:
        off = max(0, min(off, int(payable) - 1))
    return off


def has_ordered(user):
    from apps.orders.models import Order

    return Order.objects.filter(buyer_user=user).exclude(
        status__in=(Order.Status.CANCELLED, Order.Status.PENDING_PAYMENT)).exists()


def _maker_has_ordered(maker):
    from apps.orders.models import Order

    return Order.objects.filter(buyer_remaker=maker).exclude(
        status__in=(Order.Status.CANCELLED, Order.Status.PENDING_PAYMENT)).exists()


def has_donated(user):
    from apps.donations.models import Donation

    return Donation.objects.filter(donor=user, status__in=(Donation.Status.RECEIVED, Donation.Status.COMPLETED)).exists()


def _audience_block(offer, user):
    """Why `user` is outside the offer's audience, or ""."""
    if offer.audience == "new" and has_ordered(user):
        return "This coupon is for first-time buyers only."
    if offer.audience == "donors" and not has_donated(user):
        return "Complete a donation to unlock this coupon."
    return ""


def _check_offer(buyer, offer, goods_total, seller_types):
    """Raises VoucherError when this member cannot use the public coupon now."""
    today = timezone.localdate()
    if offer.draft or offer.paused or offer.valid_from > today:
        raise VoucherError("This voucher isn't valid.")
    if offer.valid_to < today:
        raise VoucherError("This coupon has expired.", "VOUCHER_EXPIRED")
    live = offer.vouchers.exclude(status=Voucher.Status.VOID)
    is_maker = buyer_kit.type_of(buyer) == "remaker"
    if live.filter(**({"owner_remaker": buyer} if is_maker else {"owner": buyer})).count() >= offer.per_user:
        raise VoucherError("You've already used this coupon.", "VOUCHER_USED")
    if live.count() >= offer.usage_limit:
        raise VoucherError("This coupon has been fully claimed.", "VOUCHER_USED_UP")
    if is_maker:
        # ReMakers have no Orbit Points or donations, so member-only coupons can't apply
        if offer.audience in ("donors", "members") or offer.min_level:
            raise VoucherError("This coupon is for member accounts.", "VOUCHER_MEMBER")
        if offer.audience == "new" and _maker_has_ordered(buyer):
            raise VoucherError("This coupon is for first-time buyers only.", "VOUCHER_AUDIENCE")
    else:
        if offer.audience == "remakers":
            raise VoucherError("This coupon is for ReMaker accounts.", "VOUCHER_AUDIENCE")
        blocked = _audience_block(offer, buyer)
        if blocked:
            raise VoucherError(blocked, "VOUCHER_AUDIENCE")
    if not is_maker and offer.min_level and level_index(totals(buyer)[1]) < offer.min_level:
        raise VoucherError(f"Reach {LEVELS[offer.min_level][1]} level to use this coupon.", "VOUCHER_LEVEL")
    types = set(seller_types or ())
    if offer.applies_to == "remaker" and "remaker" not in types:
        raise VoucherError("Add a ReMaker creation to use this coupon.", "VOUCHER_PRODUCTS")
    if offer.applies_to == "reorbit" and "platform" not in types:
        raise VoucherError("Add a product sold by ReOrbit to use this coupon.", "VOUCHER_PRODUCTS")
    if goods_total < offer.min_order:
        raise VoucherError(
            f"Add ₹{offer.min_order - goods_total:,} more to use this coupon (minimum order ₹{offer.min_order:,}).",
            "VOUCHER_MIN_ORDER")


def check(buyer, raw_code, goods_total, *, lock=False, seller_types=None):
    """Return (voucher, discount) or raise VoucherError. `buyer` is the account row.

    With lock=True (inside the checkout transaction) the rows are locked, so two checkouts can never both
    spend it, and a public coupon is saved as this member's voucher. A code that is not found and a code
    that belongs to someone else give the same answer, so codes cannot be guessed.
    """
    kind = buyer_kit.type_of(buyer)
    if kind not in ("user", "remaker"):
        raise VoucherError("Vouchers are for member and ReMaker accounts.", "VOUCHER_MEMBER")
    is_maker = kind == "remaker"
    code = clean_code(raw_code)
    if not code:
        raise VoucherError("Enter a voucher code.")
    goods_total = int(goods_total)

    qs = Voucher.objects.filter(code=code)
    owned = (qs.select_for_update() if lock else qs).first()
    if owned is not None:
        # a ReMaker never has donation or points vouchers: only their own coupon claims match
        mine = owned.owner_remaker_id == buyer.pk if is_maker else owned.owner_id == buyer.pk
        if not mine or owned.status == Voucher.Status.VOID:
            raise VoucherError("This voucher isn't valid.")
        if owned.status == Voucher.Status.USED:
            raise VoucherError("This voucher has already been used.", "VOUCHER_USED")
        if effective_status(owned) == Voucher.Status.EXPIRED:
            raise VoucherError("This voucher has expired.", "VOUCHER_EXPIRED")
        if goods_total < owned.min_order:
            raise VoucherError(
                f"Add ₹{owned.min_order - goods_total:,} more to use this voucher (minimum order ₹{owned.min_order:,}).",
                "VOUCHER_MIN_ORDER")
        return owned, discount_for(owned, goods_total)

    oqs = RewardOffer.objects.filter(code=code, kind="code")
    offer = (oqs.select_for_update() if lock else oqs).first()
    if offer is None:
        raise VoucherError("This voucher isn't valid.")
    _check_offer(buyer, offer, goods_total, seller_types)
    claim = Voucher(
        **({"owner_remaker": buyer} if is_maker else {"owner": buyer}),
        code=new_code(offer.code[:11]), offer=offer, title=offer.title,
        amount=offer.value if offer.discount_type == "fixed" else offer.max_discount,
        discount_type=offer.discount_type, percent=offer.value if offer.discount_type == "percent" else 0,
        max_discount=offer.max_discount, min_order=offer.min_order,
        expires_at=timezone.now() + timedelta(days=1), source_type="code", source_id=f"CLM-{_rand(10)}",
    )
    discount = discount_for(claim, goods_total)
    if lock:
        claim.save()
    return claim, discount


def split_discount(discount, totals_list):
    """Share a discount across orders in proportion to what each costs. No order gets more than it
    costs, and the shares add up to exactly `discount`."""
    n = sum(totals_list)
    if discount <= 0 or n <= 0:
        return [0] * len(totals_list)
    shares = [discount * t // n for t in totals_list]
    left = discount - sum(shares)
    by_remainder = sorted(range(len(totals_list)), key=lambda i: (discount * totals_list[i]) % n, reverse=True)
    for i in by_remainder[:left]:
        shares[i] += 1
    return shares


def spend(voucher, payment):
    """Mark it used by this checkout. Call in the same transaction as check(lock=True)."""
    voucher.status, voucher.used_at, voucher.used_checkout = Voucher.Status.USED, timezone.now(), payment.public_id
    voucher.save(update_fields=["status", "used_at", "used_checkout", "updated_at"])


def mark_used(voucher):
    voucher.status, voucher.used_at = Voucher.Status.USED, timezone.now()
    voucher.save(update_fields=["status", "used_at", "updated_at"])


def restore(voucher):
    """The checkout it was spent on never went through. A held voucher is theirs again; a coupon claim
    is cancelled so the coupon's limits count it no more."""
    if voucher and voucher.status == Voucher.Status.USED:
        voucher.status = Voucher.Status.VOID if voucher.source_type == "code" else Voucher.Status.ACTIVE
        voucher.used_at, voucher.used_checkout = None, ""
        voucher.save(update_fields=["status", "used_at", "used_checkout", "updated_at"])


def give_back(payment_public_id):
    """The checkout that spent it was given up (unpaid hold released, or every order cancelled)."""
    if not payment_public_id:
        return 0
    n = 0
    for v in Voucher.objects.filter(used_checkout=payment_public_id, status=Voucher.Status.USED):
        restore(v)
        n += 1
    return n


# --------------------------------------------------------------------------- #
# how the API shows a voucher
# --------------------------------------------------------------------------- #
def voucher_data(v):
    return {
        "id": v.public_id, "code": v.code, "title": v.title, "amount": v.amount, "min_order": v.min_order,
        "discount_type": v.discount_type, "percent": v.percent, "max_discount": v.max_discount or v.amount,
        "status": effective_status(v), "expires_at": v.expires_at, "used_at": v.used_at,
        "source": {"type": v.source_type, "id": v.source_id}, "points_spent": v.points_spent,
        "created_at": v.created_at,
    }


def brief(v):
    """What the checkout quote says about the voucher it applied. A coupon shows the code the member typed."""
    code = v.offer.code if v.source_type == "code" and v.offer_id else v.code
    return {"code": code, "title": v.title, "amount": v.amount, "min_order": v.min_order,
            "discount_type": v.discount_type, "percent": v.percent}


# --------------------------------------------------------------------------- #
# offers: what the member sees, redeeming points
# --------------------------------------------------------------------------- #
def offer_status(o, today=None, used=None):
    today = today or timezone.localdate()
    if o.draft:
        return "Draft"
    if o.valid_to < today:
        return "Expired"
    if used is not None and used >= o.usage_limit:
        return "Used_Up"
    if o.paused:
        return "Paused"
    if o.valid_from > today:
        return "Scheduled"
    return "Active"


def offer_used(o):
    return o.vouchers.exclude(status=Voucher.Status.VOID).count()


def offer_data(o, used=None):
    used = offer_used(o) if used is None else used
    today = timezone.localdate()
    status = offer_status(o, today, used)
    return {
        "id": o.public_id, "code": o.code, "title": o.title, "description": o.description, "kind": o.kind,
        "discount_type": o.discount_type, "value": o.value, "min_order": o.min_order,
        "max_discount": o.max_discount or o.value, "points_cost": o.points_cost, "usage_limit": o.usage_limit,
        "used": used, "left": max(0, o.usage_limit - used),
        "usage_pct": min(100, round(used * 100 / o.usage_limit)) if o.usage_limit else 0, "per_user": o.per_user,
        "audience": o.audience, "min_level": o.min_level, "applies_to": o.applies_to,
        "valid_from": o.valid_from, "valid_to": o.valid_to, "draft": o.draft, "paused": o.paused, "status": status,
        "days_left": (o.valid_to - today).days, "expiring_soon": status == "Active" and (o.valid_to - today).days <= 7,
    }


_UNAVAILABLE = {"Paused": "This reward is paused right now.", "Used_Up": "This reward is fully claimed.",
                "Scheduled": "This reward isn't open yet.", "Expired": "This reward has ended."}


def _redeem_block(o, user, status, mine, balance, level):
    """(code, message) saying why `user` can't redeem points offer `o` now, or (None, "")."""
    if status != "Active":
        return "OFFER_" + status.upper(), _UNAVAILABLE.get(status, "This reward isn't available.")
    if level < o.min_level:
        return "LEVEL_LOCKED", f"Reach {LEVELS[o.min_level][1]} level to unlock this."
    if mine >= o.per_user:
        return "PER_USER_LIMIT", "You've claimed the most you can."
    blocked = _audience_block(o, user)
    if blocked:
        return "AUDIENCE", blocked
    if balance < o.points_cost:
        return "NOT_ENOUGH_POINTS", f"You need {o.points_cost - balance} more points."
    return None, ""


def member_offer_data(o, user, used, mine, balance, level):
    d = offer_data(o, used)
    reason = ""
    if o.kind == "points":
        _, reason = _redeem_block(o, user, d["status"], mine, balance, level)
    d["claimed_by_me"] = mine
    d["can_redeem"] = o.kind == "points" and not reason
    d["reason"] = reason
    return d


def member_offers(user):
    today = timezone.localdate()
    balance, lifetime = totals(user)
    level = level_index(lifetime)
    live = ~Q(vouchers__status=Voucher.Status.VOID)
    rows = list(RewardOffer.objects.filter(draft=False, valid_to__gte=today).exclude(audience="remakers").annotate(
        used_n=Count("vouchers", filter=live),
        mine_n=Count("vouchers", filter=live & Q(vouchers__owner=user))))
    return [member_offer_data(o, user, o.used_n, o.mine_n, balance, level) for o in rows]


def redeem(user, offer_public_id):
    """Spend points on a points offer. One transaction: the member row is locked so two taps can't overspend."""
    from apps.users.models import Users

    with transaction.atomic():
        Users.objects.select_for_update().get(pk=user.pk)
        offer = RewardOffer.objects.select_for_update().filter(public_id=offer_public_id, kind="points").first()
        if offer is None:
            raise RewardError("This reward isn't available.", code="NOT_FOUND", status=404)
        balance, lifetime = totals(user)
        mine = offer.vouchers.filter(owner=user).exclude(status=Voucher.Status.VOID).count()
        code, message = _redeem_block(offer, user, offer_status(offer, used=offer_used(offer)), mine,
                                      balance, level_index(lifetime))
        if code:
            raise RewardError(message, code=code)
        end = datetime.combine(offer.valid_to, time(23, 59, 59), tzinfo=timezone.get_current_timezone())
        v = Voucher.objects.create(
            owner=user, code=new_code(offer.code[:11]), offer=offer, title=offer.title,
            amount=offer.value if offer.discount_type == "fixed" else offer.max_discount,
            discount_type=offer.discount_type, percent=offer.value if offer.discount_type == "percent" else 0,
            max_discount=offer.max_discount, min_order=offer.min_order, expires_at=end,
            source_type="points", source_id=f"RDM-{_rand(10)}", points_spent=offer.points_cost)
        award(user, "spend", -offer.points_cost, "Reward redeemed", offer.title, "voucher", v.public_id)
    return v


def summary(user):
    from apps.donations.models import Donation
    from apps.listings.models import Item
    from apps.orders.models import Order, OrderItem
    from apps.reviews.models import ProductReview
    from apps.social.models import WishlistEntry

    balance, lifetime = totals(user)
    i = level_index(lifetime)
    nxt = level_data(i + 1) if i + 1 < len(LEVELS) else None
    delivered = Order.objects.filter(buyer_user=user, status=Order.Status.DELIVERED)
    completed = Donation.objects.filter(donor=user, status=Donation.Status.COMPLETED)
    stats = {
        "delivered_orders": delivered.count(),
        "bought_items": OrderItem.objects.filter(order__in=delivered).aggregate(n=Coalesce(Sum("qty"), 0))["n"],
        "donations_completed": completed.count(),
        "donated_items": sum(d.effective_quantity for d in completed),
        "reviews": ProductReview.objects.filter(reviewer_user=user).count(),
        "listed": Item.objects.filter(user=user, item_status__in=(
            Item.Status.LISTED, Item.Status.RESERVED, Item.Status.SOLD)).count(),
        "sold": Item.objects.filter(user=user, item_status=Item.Status.SOLD).count(),
        "wishlist": WishlistEntry.objects.filter(user=user).count(),
        # every point ever spent on rewards (the ledger is paged, so the page can't add it up itself)
        "spent": -(PointsEntry.objects.filter(user=user, points__lt=0).aggregate(n=Coalesce(Sum("points"), 0))["n"]),
    }
    return {
        "balance": balance, "lifetime": lifetime, "level": level_data(i), "level_index": i, "next": nxt,
        # a percentage (0-100): the dashboard and profile show it as "40% to Orbiter"
        "progress": round((lifetime - LEVELS[i][2]) * 100 / (nxt["min"] - LEVELS[i][2])) if nxt else 100,
        "to_next": (nxt["min"] - lifetime) if nxt else 0,
        "vouchers_ready": Voucher.objects.filter(owner=user, status=Voucher.Status.ACTIVE,
                                                 expires_at__gt=timezone.now()).count(),
        "stats": stats, "levels": [level_data(n) for n in range(len(LEVELS))],
    }


# The badges a member can earn (same list the Badges page shows). (id, icon, title, text, stat, target)
BADGES = (
    ("first-orbit", "leaf", "First Orbit", "Completed a first sustainable purchase.", "delivered_orders", 1),
    ("circular-shopper", "shopping-bag", "Circular Shopper", "5 marketplace orders delivered.", "delivered_orders", 5),
    ("collector", "heart", "Thoughtful Collector", "Saved 10 products to their wishlist.", "wishlist", 10),
    ("community-giver", "gift", "Community Giver", "Completed 3 donations.", "donations_completed", 3),
    ("second-life", "recycle", "Second Life", "Rescued 25 items from waste by buying or donating.", "rescued", 25),
    ("makers-friend", "users", "Maker's Friend", "Follows 3 ReMakers.", "following", 3),
    ("reviewer", "star", "Helpful Reviewer", "Posted 3 order reviews.", "reviews", 3),
    ("seller-starter", "tag", "Seller Starter", "Listed a first item for sale.", "listed", 1),
    ("trusted-seller", "badge", "Trusted Seller", "Sold 3 items to happy buyers.", "sold", 3),
    ("impact-champion", "trophy", "Impact Champion", "Reached 5,000 lifetime Orbit Points.", "lifetime", 5000),
)


def earned_badges(user, stats=None, lifetime=None):
    """The badges this member has earned, worked out from the same numbers as summary()."""
    from apps.social.models import Follow

    if stats is None:
        data = summary(user)
        stats, lifetime = data["stats"], data["lifetime"]
    nums = {**stats, "rescued": (stats.get("donated_items") or 0) + (stats.get("bought_items") or 0),
            "lifetime": lifetime or 0,
            "following": Follow.objects.filter(follower_type="user", user=user).count()}
    return [{"id": b, "icon": icon, "title": t, "text": txt}
            for b, icon, t, txt, key, target in BADGES if (nums.get(key) or 0) >= target]


def entry_data(e):
    return {"id": e.pk, "kind": e.kind, "title": e.title, "detail": e.detail, "points": e.points,
            "ref": {"type": e.ref_type, "id": e.ref_id} if e.ref_type else None, "at": e.created_at}


def rule_data(r):
    return {"id": r.key, "group": r.group, "title": r.title, "description": r.description, "points": r.points,
            "unit": r.unit, "active": r.active, "live": r.key not in NOT_LIVE_RULES, "updated_at": r.updated_at}


# --------------------------------------------------------------------------- #
# admin
# --------------------------------------------------------------------------- #
def _int(raw, name, errors, lo=0, hi=1_000_000, default=None):
    if raw in (None, ""):
        if default is not None:
            return default
        errors[name] = ["Enter a number."]
        return 0
    try:
        n = int(raw)
    except (TypeError, ValueError):
        errors[name] = ["Enter a whole number."]
        return 0
    if not lo <= n <= hi:
        errors[name] = [f"Enter a number from {lo} to {hi:,}."]
    return n


def _date(raw, name, errors):
    try:
        return date.fromisoformat(str(raw or "")[:10])
    except ValueError:
        errors[name] = ["Choose a date."]
        return None


def save_offer(data, admin, offer=None):
    errors = {}
    code = "".join(str(data.get("code") or "").upper().split())
    if not (3 <= len(code) <= 11) or not all(c.isalnum() or c == "-" for c in code):
        errors["code"] = ["Use 3 to 11 letters, numbers or dashes."]
    elif RewardOffer.objects.filter(code=code).exclude(pk=offer.pk if offer else None).exists() or \
            Voucher.objects.filter(code=code).exists():
        errors["code"] = ["That code is already taken."]
    title = " ".join(str(data.get("title") or "").split())[:120]
    if len(title) < 3:
        errors["title"] = ["Give it a title."]
    kind = str(data.get("kind") or "")
    if kind not in ("points", "code"):
        errors["kind"] = ["Choose points or code."]
    dtype = str(data.get("discount_type") or "fixed")
    if dtype not in ("fixed", "percent"):
        errors["discount_type"] = ["Choose fixed or percent."]
    value = _int(data.get("value"), "value", errors, 1, 100 if dtype == "percent" else 100000)
    min_order = _int(data.get("min_order"), "min_order", errors, 0, 1_000_000, default=0)
    cap = _int(data.get("max_discount"), "max_discount", errors, 0, 100000, default=0)
    if dtype == "fixed":
        cap = value
    elif not cap:
        errors["max_discount"] = ["Set the most a percentage can take off."]
    cost = _int(data.get("points_cost"), "points_cost", errors, 0, 1_000_000, default=0)
    if kind == "points" and cost < 1:
        errors["points_cost"] = ["Set how many points it costs."]
    limit = _int(data.get("usage_limit"), "usage_limit", errors, 1, 1_000_000)
    per_user = _int(data.get("per_user"), "per_user", errors, 1, 100, default=1)
    audience = str(data.get("audience") or "all")
    if audience not in AUDIENCES:
        errors["audience"] = ["Choose who can use it."]
    level = _int(data.get("min_level"), "min_level", errors, 0, len(LEVELS) - 1, default=0)
    applies_to = str(data.get("applies_to") or "any")
    if applies_to not in APPLIES_TO:
        errors["applies_to"] = ["Choose which products it works on."]
    if kind == "points" and audience == "remakers":
        errors["audience"] = ["Points rewards are for members. Use a coupon code for ReMakers."]
    if audience == "remakers" and level:
        errors["min_level"] = ["ReMakers have no Orbit level."]
    vf, vt = _date(data.get("valid_from"), "valid_from", errors), _date(data.get("valid_to"), "valid_to", errors)
    if vf and vt and vt < vf:
        errors["valid_to"] = ["The end date can't be before the start date."]
    elif vt and offer is None and vt < timezone.localdate():
        errors["valid_to"] = ["The end date is in the past."]
    if errors:
        raise RewardError("Please fix the highlighted fields.", errors)
    fields = dict(
        code=code, title=title, description=" ".join(str(data.get("description") or "").split())[:255], kind=kind,
        discount_type=dtype, value=value, min_order=min_order, max_discount=cap,
        points_cost=cost if kind == "points" else 0, usage_limit=limit, per_user=per_user, audience=audience,
        min_level=level, applies_to=applies_to, valid_from=vf, valid_to=vt,
        draft=bool(data.get("draft")), paused=bool(data.get("paused")))
    if offer is None:
        return RewardOffer.objects.create(**fields)
    for k, v in fields.items():
        setattr(offer, k, v)
    offer.save()
    return offer


def delete_offer(offer):
    if offer.vouchers.exists():
        raise RewardError("Members already hold this voucher, so it can't be deleted. Pause it instead.",
                          code="IN_USE", status=409)
    offer.delete()


def save_rule(rule, data, admin):
    errors = {}
    if "points" in data:
        rule.points = _int(data.get("points"), "points", errors, 0, 100000)
    if "active" in data:
        rule.active = bool(data.get("active"))
    if errors:
        raise RewardError("Please fix the highlighted fields.", errors)
    rule.updated_by = admin
    rule.save()
    return rule


def adjust(admin, user, amount, reason):
    reason = " ".join(str(reason or "").split())[:200]
    errors = {}
    n = _int(amount, "amount", errors, -MAX_ADJUST, MAX_ADJUST)
    if not errors and n == 0:
        errors["amount"] = ["Enter points to add or take off."]
    if len(reason) < 3:
        errors["reason"] = ["Tell the member why (at least 3 characters)."]
    if errors:
        raise RewardError("Please fix the highlighted fields.", errors)
    from apps.users.models import Users

    with transaction.atomic():
        Users.objects.select_for_update().get(pk=user.pk)
        balance, _ = totals(user)
        if balance + n < 0:
            raise RewardError(f"They only have {balance} points to take off.",
                              {"amount": [f"They only have {balance} points."]}, code="BELOW_ZERO")
        entry = award(user, "adjust", n, "Adjusted by ReOrbit", reason, "adjust", f"ADJ-{_rand(10)}", admin=admin)
    return entry


def cancel_redemption(voucher, admin, reason=""):
    """Cancel an unused voucher bought with points and give the points back."""
    with transaction.atomic():
        v = Voucher.objects.select_for_update().get(pk=voucher.pk)
        if v.source_type != "points":
            raise RewardError("Only vouchers bought with points can be cancelled here.", code="BAD_TYPE", status=409)
        if v.status != Voucher.Status.ACTIVE:
            raise RewardError("This voucher has already been used, expired or cancelled.", code="BAD_STATE",
                              status=409)
        v.status = Voucher.Status.VOID
        v.save(update_fields=["status", "updated_at"])
        award(v.owner, "refund", v.points_spent, "Reward cancelled", f"{v.title} was cancelled", "voucher",
              v.public_id, admin=admin)
    return v


def revoke_donation_reward(donation, admin, reason):
    """Take back what a donation paid (points, and the voucher if it is unspent)."""
    reason = " ".join(str(reason or "").split())[:200]
    if len(reason) < 3:
        raise RewardError("Tell the member why.", {"reason": ["Tell the member why (at least 3 characters)."]})
    with transaction.atomic():
        paid = PointsEntry.objects.filter(user=donation.donor, kind="donation", ref_id=donation.public_id).first()
        if paid is None:
            raise RewardError("This donation hasn't been rewarded yet.", code="NOT_REWARDED", status=409)
        if PointsEntry.objects.filter(user=donation.donor, kind="revoke", ref_id=donation.public_id).exists():
            raise RewardError("This reward was already taken back.", code="ALREADY_REVOKED", status=409)
        award(donation.donor, "revoke", -paid.points, "Donation reward taken back", reason, "donation",
              donation.public_id, admin=admin)
        Voucher.objects.filter(source_type="donation", source_id=donation.public_id,
                               status=Voucher.Status.ACTIVE).update(status=Voucher.Status.VOID)


def restore_donation_reward(donation, admin):
    with transaction.atomic():
        gone = PointsEntry.objects.filter(user=donation.donor, kind="revoke", ref_id=donation.public_id)
        if not gone.exists():
            raise RewardError("This reward wasn't taken back.", code="NOT_REVOKED", status=409)
        gone.delete()
        Voucher.objects.filter(source_type="donation", source_id=donation.public_id, status=Voucher.Status.VOID,
                               expires_at__gt=timezone.now()).update(status=Voucher.Status.ACTIVE)
