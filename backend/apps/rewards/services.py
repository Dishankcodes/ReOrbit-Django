"""Orbit Points and vouchers. Views stay thin; every rule lives here.

Points
  * Every change is one PointsEntry. Earning is idempotent: (member, kind, ref_type, ref_id) is unique, so a
    retry, a double click or a replayed signal can never pay twice.
  * What an action is worth comes from RewardRule (edited by admins). Reward bugs never break the thing
    that earned the reward: the hooks below swallow and log their own errors.
Vouchers
  * Donation vouchers and vouchers bought with points belong to one member and work once.
  * A public coupon (kind "code") is checked against its limits at checkout and then becomes a used voucher.
"""

import logging
import secrets
from datetime import date, datetime, time, timedelta

from django.db import IntegrityError, transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from .models import PointsEntry, RewardOffer, RewardRule, Voucher

log = logging.getLogger(__name__)

# ---- donation voucher values (whole rupees) -------------------------------------------------------- #
RUPEES_PER_KG = 12
MIN_VOUCHER = 50
MAX_VOUCHER = 500
VALID_DAYS = 90
MIN_ORDER_FACTOR = 2
CONDITION_FACTOR = {"Good": 1.0, "Medium": 0.7, "Worst": 0.4}
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I

LEVELS = (("seedling", "Seedling", 0), ("sprout", "Sprout", 500), ("orbiter", "Orbiter", 1500),
          ("guardian", "Guardian", 3000), ("champion", "Champion", 5000))
NOT_LIVE_RULES = {"referral", "follow"}  # the platform has nothing to hand these out yet
EARN_KINDS = ("purchase", "firstOrder", "donation", "listing", "review", "follow", "referral")
LIFETIME_KINDS = EARN_KINDS + ("reversal", "revoke")  # spending, refunds and deductions never lower the level
MAX_ADJUST = 100000
AUDIENCES = ("all", "new", "donors")


class VoucherError(Exception):
    def __init__(self, message, code="VOUCHER_INVALID"):
        super().__init__(message)
        self.message, self.code = message, code


class RewardError(Exception):
    def __init__(self, message, errors=None, code=None, status=400):
        super().__init__(message)
        self.message, self.errors, self.code, self.status = message, errors or {}, code, status


def _rand(n=4):
    return "".join(secrets.choice(_ALPHABET) for _ in range(n))


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
    lifetime = q.filter(Q(kind__in=LIFETIME_KINDS) | Q(kind="adjust", points__gt=0)).aggregate(s=Coalesce(Sum("points"), 0))["s"]
    return balance, max(0, lifetime)


def award(user, kind, points, title, detail="", ref_type="", ref_id="", admin=None):
    """Write one ledger row. Returns it, or None when it was already written (or worth nothing)."""
    if not points:
        return None
    try:
        with transaction.atomic():
            return PointsEntry.objects.create(user=user, kind=kind, points=int(points), title=title[:120], detail=str(detail or "")[:200],
                                              ref_type=ref_type[:12], ref_id=str(ref_id)[:24], admin=admin)
    except IntegrityError:
        return None


def rule_points(key):
    r = RewardRule.objects.filter(key=key).first()
    return r.points if r and r.active else 0


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
    goods = max(0, order.subtotal - getattr(order, "discount", 0))
    return (goods // 100) * rule_points("purchase")


def _on_order_delivered(order):
    if order.buyer_type != "user" or not order.buyer_user_id:
        return
    user = order.buyer_user
    award(user, "purchase", _purchase_points(order), "Order delivered", order.public_id, "order", order.public_id)
    from apps.orders.models import Order  # local import: orders imports this app

    if not Order.objects.filter(buyer_user=user, status=Order.Status.DELIVERED).exclude(pk=order.pk).exists():
        award(user, "firstOrder", rule_points("firstOrder"), "First order bonus", "Your first delivered order", "user", user.public_id)


def on_order_delivered(order):
    return _safe(_on_order_delivered, order)


def _on_order_returned(order, refund_amount):
    if order.buyer_type != "user" or not order.buyer_user_id:
        return
    earned = PointsEntry.objects.filter(user=order.buyer_user, kind="purchase", ref_type="order", ref_id=order.public_id).first()
    if not earned or earned.points <= 0 or order.total <= 0:
        return
    share = min(1.0, float(refund_amount) / float(order.total))
    back = int(earned.points * share)
    award(order.buyer_user, "reversal", -back, "Points taken back", f"{order.public_id} was returned", "order", order.public_id)


def on_order_returned(order, refund_amount):
    return _safe(_on_order_returned, order, refund_amount)


def on_review(user, review):
    if user is None:
        return None
    return _safe(lambda: award(user, "review", rule_points("review"), "Review posted", review.title or "Product review",
                               "review", review.public_id))


def on_listing_published(user, item):
    return _safe(lambda: award(user, "listing", rule_points("listing"), "Item listed", item.title, "listing", item.public_id))


def donation_points(quantity):
    return rule_points("donationBase") + rule_points("donationItem") * max(1, int(quantity or 1))


def on_donation_received(donation):
    """Called once when ReOrbit receives a donation: points + voucher. Safe to call twice."""
    pts = donation_points(donation.quantity)
    entry = award(donation.user, "donation", pts, "Donation received",
                  f"{donation.title} · {donation.quantity} {'item' if donation.quantity == 1 else 'items'}", "donation", donation.public_id)
    if entry is None:
        entry = PointsEntry.objects.filter(user=donation.user, kind="donation", ref_id=donation.public_id).first()
    return entry.points if entry else 0


# --------------------------------------------------------------------------- #
# donation vouchers
# --------------------------------------------------------------------------- #
def voucher_worth(weight_kg, condition):
    raw = float(weight_kg or 0) * RUPEES_PER_KG * CONDITION_FACTOR.get(condition, 0.7)
    return max(MIN_VOUCHER, min(MAX_VOUCHER, int(round(raw / 10.0)) * 10))


def _new_code(prefix="RO"):
    for _ in range(20):
        code = f"{prefix}-{_rand(8 if prefix == 'RO' else 4)}"
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
            source_type="donation", source_id=donation.public_id)


# --------------------------------------------------------------------------- #
# vouchers at checkout
# --------------------------------------------------------------------------- #
def effective_status(v):
    if v.status == Voucher.Status.ACTIVE and v.expires_at <= timezone.now():
        return Voucher.Status.EXPIRED
    return v.status


def voucher_data(v):
    return {
        "id": v.public_id, "code": v.code, "title": v.title, "amount": v.amount, "min_order": v.min_order,
        "discount_type": v.discount_type, "percent": v.percent, "max_discount": v.max_discount or v.amount,
        "status": effective_status(v), "expires_at": v.expires_at, "used_at": v.used_at,
        "source": {"type": v.source_type, "id": v.source_id}, "points_spent": v.points_spent, "created_at": v.created_at,
    }


def discount_for(v, subtotal):
    if v.discount_type == "percent":
        cap = v.max_discount or subtotal
        return max(0, min(subtotal * v.percent // 100, cap, subtotal))
    return max(0, min(v.amount, subtotal))


def has_ordered(user):
    from apps.orders.models import Order

    return Order.objects.filter(buyer_user=user).exclude(status__in=(Order.Status.CANCELLED, Order.Status.PENDING_PAYMENT)).exists()


def has_donated(user):
    from apps.donations.models import Donation

    return Donation.objects.filter(user=user, status__in=(Donation.Status.RECEIVED, Donation.Status.COMPLETED)).exists()


def _check_offer(buyer, offer, subtotal, has_remaker, lock):
    """Raises VoucherError when this member cannot use the public coupon now."""
    today = timezone.localdate()
    if offer.draft or offer.paused or offer.valid_from > today:
        raise VoucherError("That code isn't valid for your account.")
    if offer.valid_to < today:
        raise VoucherError("This coupon has expired.", "VOUCHER_EXPIRED")
    live = offer.vouchers.exclude(status=Voucher.Status.VOID)
    if live.count() >= offer.usage_limit:
        raise VoucherError("This coupon has been fully claimed.", "VOUCHER_USED_UP")
    if live.filter(owner=buyer).count() >= offer.per_user:
        raise VoucherError("You've already used this coupon.", "VOUCHER_USED")
    if offer.audience == "new" and has_ordered(buyer):
        raise VoucherError("This coupon is for first-time buyers only.", "VOUCHER_AUDIENCE")
    if offer.audience == "donors" and not has_donated(buyer):
        raise VoucherError("Complete a donation to unlock this coupon.", "VOUCHER_AUDIENCE")
    if offer.min_level and level_index(totals(buyer)[1]) < offer.min_level:
        raise VoucherError(f"Reach {LEVELS[offer.min_level][1]} level to use this coupon.", "VOUCHER_LEVEL")
    if offer.remaker_only and not has_remaker:
        raise VoucherError("Add a ReMaker product to use this coupon.", "VOUCHER_AUDIENCE")
    if subtotal < offer.min_order:
        raise VoucherError(f"Add items worth ₹{offer.min_order:,} or more to use this voucher.", "VOUCHER_MIN_ORDER")


def check(buyer, code, subtotal, *, lock=False, has_remaker=True):
    """Return (voucher, discount) or raise VoucherError. `buyer` is the account row.

    With lock=True (inside the checkout transaction) the rows are locked, and a public coupon is
    saved as this member's voucher so the rest of checkout treats it like any other voucher.
    """
    from apps.core import buyers as buyer_kit

    code = " ".join(str(code or "").split()).upper()
    if not code:
        raise VoucherError("Enter a voucher code.")
    if buyer_kit.type_of(buyer) != "user":
        raise VoucherError("Vouchers are for member accounts.")
    owned = (Voucher.objects.select_for_update() if lock else Voucher.objects).filter(code=code).first()
    if owned is not None:
        if owned.owner_id != buyer.pk:
            raise VoucherError("That code isn't valid for your account.")
        if owned.status == Voucher.Status.USED:
            raise VoucherError("You've already used this voucher.", "VOUCHER_USED")
        if owned.status == Voucher.Status.VOID:
            raise VoucherError("That code isn't valid for your account.")
        if owned.status == Voucher.Status.EXPIRED or owned.expires_at <= timezone.now():
            raise VoucherError("This voucher has expired.", "VOUCHER_EXPIRED")
        if subtotal < owned.min_order:
            raise VoucherError(f"Add items worth ₹{owned.min_order:,} or more to use this voucher.", "VOUCHER_MIN_ORDER")
        return owned, discount_for(owned, subtotal)

    qs = RewardOffer.objects.select_for_update() if lock else RewardOffer.objects
    offer = qs.filter(code=code, kind="code").first()
    if offer is None:
        raise VoucherError("That code isn't valid for your account.")
    _check_offer(buyer, offer, subtotal, has_remaker, lock)
    claim = Voucher(owner=buyer, code=_new_code(offer.code[:11]), amount=offer.value if offer.discount_type == "fixed" else offer.max_discount,
                    min_order=offer.min_order, title=offer.title, expires_at=timezone.now() + timedelta(days=1), source_type="code",
                    offer=offer, discount_type=offer.discount_type, percent=offer.value if offer.discount_type == "percent" else 0,
                    max_discount=offer.max_discount)
    discount = discount_for(claim, subtotal)
    if lock:
        claim.save()
    return claim, discount


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
    """A released payment came back and is going ahead: spend the voucher again if it is free."""
    if voucher and voucher.status in (Voucher.Status.ACTIVE, Voucher.Status.VOID) and (voucher.offer_id or voucher.expires_at > timezone.now()):
        mark_used(voucher)


def restore(voucher):
    """The checkout it was spent on never went through. A held voucher is theirs again; a coupon claim is cancelled."""
    if voucher and voucher.status == Voucher.Status.USED:
        if voucher.offer_id and voucher.source_type == "code":
            voucher.status, voucher.used_at = Voucher.Status.VOID, None
        else:
            voucher.status, voucher.used_at = Voucher.Status.ACTIVE, None
        voucher.save(update_fields=["status", "used_at", "updated_at"])


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
        "discount_type": o.discount_type, "value": o.value, "min_order": o.min_order, "max_discount": o.max_discount or o.value,
        "points_cost": o.points_cost, "usage_limit": o.usage_limit, "used": used, "left": max(0, o.usage_limit - used),
        "usage_pct": min(100, round(used * 100 / o.usage_limit)) if o.usage_limit else 0, "per_user": o.per_user,
        "audience": o.audience, "min_level": o.min_level, "remaker_only": o.remaker_only,
        "valid_from": o.valid_from, "valid_to": o.valid_to, "draft": o.draft, "paused": o.paused, "status": status,
        "days_left": (o.valid_to - today).days, "expiring_soon": status == "Active" and (o.valid_to - today).days <= 7,
    }


def member_offer_data(o, user, used, mine, balance, level):
    d = offer_data(o, used)
    reason = ""
    if o.kind == "points":
        if d["status"] != "Active":
            reason = {"Paused": "This reward is paused right now.", "Used_Up": "This reward is fully claimed.",
                      "Scheduled": "This reward isn't open yet.", "Expired": "This reward has ended."}.get(d["status"], "Not available.")
        elif level < o.min_level:
            reason = f"Reach {LEVELS[o.min_level][1]} level to unlock this."
        elif mine >= o.per_user:
            reason = "You've claimed the most you can."
        elif balance < o.points_cost:
            reason = f"You need {o.points_cost - balance} more points."
    d["claimed_by_me"] = mine
    d["can_redeem"] = o.kind == "points" and not reason
    d["reason"] = reason
    return d


def member_offers(user):
    today = timezone.localdate()
    balance, lifetime = totals(user)
    level = level_index(lifetime)
    rows = list(RewardOffer.objects.filter(draft=False, valid_to__gte=today).annotate(
        used_n=Count("vouchers", filter=~Q(vouchers__status=Voucher.Status.VOID)),
        mine_n=Count("vouchers", filter=~Q(vouchers__status=Voucher.Status.VOID) & Q(vouchers__owner=user))))
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
        used = offer_used(offer)
        status = offer_status(offer, used=used)
        if status != "Active":
            msg = {"Paused": "This reward is paused right now.", "Used_Up": "This reward is fully claimed.",
                   "Scheduled": "This reward isn't open yet."}.get(status, "This reward isn't available.")
            raise RewardError(msg, code="OFFER_" + status.upper())
        if level_index(lifetime) < offer.min_level:
            raise RewardError(f"Reach {LEVELS[offer.min_level][1]} level to unlock this.", code="LEVEL_LOCKED")
        if offer.vouchers.filter(owner=user).exclude(status=Voucher.Status.VOID).count() >= offer.per_user:
            raise RewardError("You've claimed the most you can.", code="PER_USER_LIMIT")
        if balance < offer.points_cost:
            raise RewardError(f"You need {offer.points_cost - balance} more points.", code="NOT_ENOUGH_POINTS")
        end = datetime.combine(offer.valid_to, time(23, 59, 59), tzinfo=timezone.get_current_timezone())
        v = Voucher.objects.create(
            owner=user, code=_new_code(offer.code[:11]), amount=offer.value if offer.discount_type == "fixed" else offer.max_discount,
            min_order=offer.min_order, title=offer.title, expires_at=end, source_type="points", source_id=f"RDM-{_rand(10)}",
            offer=offer, discount_type=offer.discount_type, percent=offer.value if offer.discount_type == "percent" else 0,
            max_discount=offer.max_discount, points_spent=offer.points_cost)
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
    donated = Donation.objects.filter(user=user)
    stats = {
        "delivered_orders": delivered.count(),
        "bought_items": OrderItem.objects.filter(order__in=delivered).aggregate(n=Coalesce(Sum("qty"), 0))["n"],
        "donations_completed": donated.filter(status=Donation.Status.COMPLETED).count(),
        "donated_items": donated.filter(status__in=(Donation.Status.PICKED_UP, Donation.Status.RECEIVED, Donation.Status.COMPLETED))
                                .aggregate(n=Coalesce(Sum("quantity"), 0))["n"],
        "reviews": ProductReview.objects.filter(reviewer_user=user).count(),
        "listed": Item.objects.filter(user=user, item_status__in=(Item.Status.LISTED, Item.Status.RESERVED, Item.Status.SOLD)).count(),
        "sold": Item.objects.filter(user=user, item_status=Item.Status.SOLD).count(),
        "wishlist": WishlistEntry.objects.filter(user=user).count(),
    }
    return {
        "balance": balance, "lifetime": lifetime, "level": level_data(i), "level_index": i, "next": nxt,
        "progress": round((lifetime - LEVELS[i][2]) * 100 / (nxt["min"] - LEVELS[i][2])) if nxt else 100,
        "to_next": (nxt["min"] - lifetime) if nxt else 0,
        "vouchers_ready": sum(1 for v in Voucher.objects.filter(owner=user, status=Voucher.Status.ACTIVE) if v.expires_at > timezone.now()),
        "stats": stats, "levels": [level_data(n) for n in range(len(LEVELS))],
    }


def entry_data(e):
    return {"id": e.pk, "kind": e.kind, "title": e.title, "detail": e.detail, "points": e.points,
            "ref": {"type": e.ref_type, "id": e.ref_id}, "at": e.created_at}


def rule_data(r):
    return {"id": r.key, "group": r.group, "title": r.title, "description": r.description, "points": r.points, "unit": r.unit,
            "active": r.active, "live": r.key not in NOT_LIVE_RULES, "updated_at": r.updated_at}


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
    vf, vt = _date(data.get("valid_from"), "valid_from", errors), _date(data.get("valid_to"), "valid_to", errors)
    if vf and vt and vt < vf:
        errors["valid_to"] = ["The end date can't be before the start date."]
    elif vt and offer is None and vt < timezone.localdate():
        errors["valid_to"] = ["The end date is in the past."]
    if errors:
        raise RewardError("Please fix the highlighted fields.", errors)
    fields = dict(code=code, title=title, description=" ".join(str(data.get("description") or "").split())[:255], kind=kind,
                  discount_type=dtype, value=value, min_order=min_order, max_discount=cap, points_cost=cost if kind == "points" else 0,
                  usage_limit=limit, per_user=per_user, audience=audience, min_level=level,
                  remaker_only=bool(data.get("remaker_only")), valid_from=vf, valid_to=vt,
                  draft=bool(data.get("draft")), paused=bool(data.get("paused")))
    if offer is None:
        return RewardOffer.objects.create(**fields)
    for k, v in fields.items():
        setattr(offer, k, v)
    offer.save()
    return offer


def delete_offer(offer):
    if offer.vouchers.exists():
        raise RewardError("Members already hold this voucher, so it can't be deleted. Pause it instead.", code="IN_USE", status=409)
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
            raise RewardError(f"They only have {balance} points to take off.", {"amount": [f"They only have {balance} points."]}, code="BELOW_ZERO")
        entry = award(user, "adjust", n, "Adjusted by ReOrbit", reason, "adjust", f"ADJ-{_rand(10)}", admin=admin)
    return entry


def cancel_redemption(voucher, admin, reason=""):
    """Cancel an unused voucher bought with points and give the points back."""
    with transaction.atomic():
        v = Voucher.objects.select_for_update().get(pk=voucher.pk)
        if v.source_type != "points":
            raise RewardError("Only vouchers bought with points can be cancelled here.", code="BAD_TYPE", status=409)
        if v.status != Voucher.Status.ACTIVE:
            raise RewardError("This voucher has already been used, expired or cancelled.", code="BAD_STATE", status=409)
        v.status = Voucher.Status.VOID
        v.save(update_fields=["status", "updated_at"])
        award(v.owner, "refund", v.points_spent, "Reward cancelled", f"{v.title} was cancelled", "voucher", v.public_id, admin=admin)
    return v


def revoke_donation_reward(donation, admin, reason):
    """Take back what a donation paid (points, and the voucher if it is unspent)."""
    reason = " ".join(str(reason or "").split())[:200]
    if len(reason) < 3:
        raise RewardError("Tell the member why.", {"reason": ["Tell the member why (at least 3 characters)."]})
    with transaction.atomic():
        paid = PointsEntry.objects.filter(user=donation.user, kind="donation", ref_id=donation.public_id).first()
        if paid is None:
            raise RewardError("This donation hasn't been rewarded yet.", code="NOT_REWARDED", status=409)
        if PointsEntry.objects.filter(user=donation.user, kind="revoke", ref_id=donation.public_id).exists():
            raise RewardError("This reward was already taken back.", code="ALREADY_REVOKED", status=409)
        award(donation.user, "revoke", -paid.points, "Donation reward taken back", reason, "donation", donation.public_id, admin=admin)
        Voucher.objects.filter(source_type="donation", source_id=donation.public_id, status=Voucher.Status.ACTIVE).update(status=Voucher.Status.VOID)


def restore_donation_reward(donation, admin):
    with transaction.atomic():
        gone = PointsEntry.objects.filter(user=donation.user, kind="revoke", ref_id=donation.public_id)
        if not gone.exists():
            raise RewardError("This reward wasn't taken back.", code="NOT_REVOKED", status=409)
        gone.delete()
        Voucher.objects.filter(source_type="donation", source_id=donation.public_id, status=Voucher.Status.VOID,
                               expires_at__gt=timezone.now()).update(status=Voucher.Status.ACTIVE)
