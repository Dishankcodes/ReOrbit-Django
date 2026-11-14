"""Everything an admin can do to warehouse stock, and how stock gets in and out.

Each action is one transaction: it checks the lot is in a state that allows it, changes the
lot, writes a line to its timeline, keeps the marketplace listing (the Admin_Items row linked
to it) in step, and adds an audit row. The screens only show actions this file allows.
"""

import math
from datetime import timedelta

from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from apps.admins.models import AdminItem
from apps.core.models import Category, PlatformSettings
from apps.core.services import audit, notify
from apps.listings.models import MediaImage
from apps.platform.settings_api import DEFAULT_WAREHOUSE
from apps.remakers.models import ReMakers
from apps.users.models import Users

from .models import WarehouseEvent, WarehouseItem

Stage, Sale = WarehouseItem.Stage, WarehouseItem.Sale

# ---------------------------------------------------------------- layout
ZONES = (
    ("A", "Furniture hall", 60),
    ("B", "Home & kitchen", 48),
    ("C", "Textiles & clothing", 56),
    ("D", "Electronics & books", 36),
    ("E", "Sports & misc", 24),
)
ZONE_CAPACITY = {key: cap for key, _name, cap in ZONES}
CATEGORY_ZONE = {
    "furniture": "A", "home decor": "B", "kitchen": "B", "clothing": "C",
    "fashion": "C", "electronics": "D", "books": "D", "sports": "E",
}
RACKS, LEVELS, QC_BAYS = 8, 4, 4
CONDITIONS = ("Like new", "Good", "Fair", "Needs refurbishing")

SNOOZE_DAYS = 3
PROMOTE_DAYS = 7
REFURB_DAYS = 10
CUT_PERCENT = 15
MAX_MONEY = 10_000_000

ALERT_LABELS = {"watch": "Unsold 7+ days", "slow": "Slow moving", "dead": "Dead stock"}


class WarehouseError(Exception):
    def __init__(self, message, errors=None, code="WAREHOUSE_ERROR", status=400):
        super().__init__(message)
        self.message, self.errors, self.code, self.status = message, errors or {}, code, status


# ---------------------------------------------------------------- small helpers
def log(item, label, detail="", tone="neutral", admin=None, at=None):
    return WarehouseEvent.objects.create(
        item=item, label=label[:80], detail=str(detail or "")[:255], tone=tone, actor=admin,
        at=at or timezone.now(),
    )


def rules():
    stored = PlatformSettings.load().warehouse_rules or {}
    return {**DEFAULT_WAREHOUSE, **stored}


def _text(value, limit):
    return " ".join(str(value or "").split())[:limit]


def _whole(value, low, high):
    if isinstance(value, bool):
        return None
    try:
        number = int(str(value).strip())
    except (TypeError, ValueError):
        return None
    return number if low <= number <= high else None


def round_to_ten(value):
    return max(10, int(round(value / 10.0)) * 10)


def alert_for(item, rule=None, now=None):
    """None, or {"key", "label", "days"} when a listed lot has gone unsold too long (and is
    not snoozed). The levels come from Admin > Settings > Warehouse."""
    if item.warehouse_status != Stage.STORED or item.sale_status != Sale.LISTED or not item.listed_at:
        return None
    now = now or timezone.now()
    if item.snoozed_until and item.snoozed_until > now:
        return None
    rule = rule or rules()
    days = max(0, (now - item.listed_at).days)
    if days < rule["unsoldDays"]:
        return None
    key = "dead" if days >= rule["deadDays"] else "slow" if days >= rule["slowDays"] else "watch"
    return {"key": key, "label": ALERT_LABELS[key], "days": days}


def allowed_actions(item, rule=None, now=None):
    stage, sale = item.warehouse_status, item.sale_status
    if stage == Stage.RECEIVED:
        return ["putAway"]
    if stage == Stage.ASSIGNED:
        return ["dispatch"]
    if stage == Stage.REFURBISHMENT:
        return ["receiveBack"]
    if stage == Stage.STORED and sale == Sale.NOT_LISTED:
        return ["list", "refurbish", "donate"]
    if stage == Stage.STORED and sale == Sale.LISTED:
        actions = ["discount", "promote", "refurbish", "donate"]
        if alert_for(item, rule, now):
            actions.append("snooze")
        return actions
    return []


# ---------------------------------------------------------------- shelves
def zone_for(category):
    return CATEGORY_ZONE.get((category or "").strip().lower(), "E")


def assign_shelf(category, exclude_pk=None):
    """The emptiest rack and level in the category's zone. Refuses when the zone is full."""
    zone = zone_for(category)
    taken = WarehouseItem.objects.filter(zone=zone, warehouse_status__in=(Stage.STORED, Stage.ASSIGNED))
    if exclude_pk:
        taken = taken.exclude(pk=exclude_pk)
    capacity = ZONE_CAPACITY[zone]
    if taken.count() >= capacity:
        raise WarehouseError(
            f"Zone {zone} is full ({capacity} spaces). Free a space before putting this away.",
            code="ZONE_FULL", status=409,
        )
    used = {(r, lvl): n for r, lvl, n in taken.values_list("rack", "level").annotate(n=Count("pk"))}
    best = min(
        ((used.get((f"{r:02d}", lvl), 0), r, lvl) for r in range(1, RACKS + 1) for lvl in range(1, LEVELS + 1))
    )
    return zone, f"{best[1]:02d}", best[2]


def assign_qc_bay(exclude_pk=None):
    taken = WarehouseItem.objects.filter(zone="QC", warehouse_status=Stage.REFURBISHMENT)
    if exclude_pk:
        taken = taken.exclude(pk=exclude_pk)
    used = dict(taken.values_list("rack").annotate(n=Count("pk")))
    bay = min(range(1, QC_BAYS + 1), key=lambda b: (used.get(f"{b:02d}", 0), b))
    return "QC", f"{bay:02d}", 1


def _place(item, spot):
    item.zone, item.rack, item.level = spot


def _clear_place(item):
    item.zone = item.rack = ""
    item.level = None


# ---------------------------------------------------------------- the marketplace listing
def store_item_of(item, lock=False):
    qs = AdminItem.objects.filter(warehouse_item=item)
    return (qs.select_for_update() if lock else qs).first()


def _copy_photos(item, store):
    """A donated lot's photos become the listing's photos (the files are reused, not copied)."""
    if not item.donation_id or MediaImage.objects.filter(admin_item=store).exists():
        return
    for n, photo in enumerate(item.donation.photos.all()[:8]):
        MediaImage.objects.create(
            admin_item=store, image=photo.image.name, display_order=n,
            image_type=MediaImage.Kind.COVER if n == 0 else MediaImage.Kind.GALLERY,
        )


def _put_on_sale(item, admin):
    store = store_item_of(item, lock=True)
    if store is None:
        category = Category.objects.filter(name__iexact=item.category).first()
        if category is None:
            raise WarehouseError(
                f"Create the category “{item.category}” first, so this can be listed under it.",
                {"category": [f"There is no category named “{item.category}”."]},
            )
        store = AdminItem.objects.create(
            admin=admin, category=category, sku=item.sku, title=item.title,
            description=f"{item.condition or 'Good'} condition. Checked by ReOrbit before it was listed.",
            price=item.list_price, stock=item.quantity, status=AdminItem.Status.LISTED, warehouse_item=item,
        )
        _copy_photos(item, store)
    else:
        store.price, store.stock, store.status = item.list_price, item.quantity, AdminItem.Status.LISTED
        store.save(update_fields=["price", "stock", "status", "updated_at"])
    return store


def _sync_price(item):
    store = store_item_of(item, lock=True)
    if store:
        store.price = item.list_price
        store.save(update_fields=["price", "updated_at"])


def _take_off_sale(item):
    store = store_item_of(item, lock=True)
    if store and store.status in (AdminItem.Status.LISTED, AdminItem.Status.SOLD_OUT):
        store.status = AdminItem.Status.INACTIVE
        store.save(update_fields=["status", "updated_at"])


# ---------------------------------------------------------------- the actions
def _put_away(item, admin, payload, now):
    _place(item, assign_shelf(item.category, item.pk))
    item.warehouse_status, item.stored_at = Stage.STORED, now
    log(item, "Stored on shelf", f"Location {item.bin} · Admin", "good", admin, now)


def _list(item, admin, payload, now):
    if payload.get("price") not in (None, ""):
        price = _whole(payload.get("price"), 1, MAX_MONEY)
        if price is None:
            raise WarehouseError("Enter a price in rupees.", {"price": ["Enter a price from ₹1 to ₹1,00,00,000."]})
        item.list_price = price
    if not item.list_price:
        raise WarehouseError("Set a price before listing.", {"price": ["Set a price before listing this item."]})
    item.original_price = item.list_price  # the price it went on sale at
    item.sale_status, item.listed_at, item.snoozed_until = Sale.LISTED, now, None
    _put_on_sale(item, admin)
    log(item, "Listed on marketplace", f"Price ₹{item.list_price:,}", "good", admin, now)


def cut_price(item, percent, now, admin=None, label=None):
    item.list_price = round_to_ten(item.list_price * (100 - percent) / 100.0)
    item.price_cuts += 1
    item.listed_at, item.snoozed_until = now, None
    _sync_price(item)
    log(item, label or f"Price cut by {percent}%",
        f"New price ₹{item.list_price:,} · unsold timer restarted", "wait", admin, now)


def _discount(item, admin, payload, now):
    cut_price(item, CUT_PERCENT, now, admin)


def _promote(item, admin, payload, now):
    until = now + timedelta(days=PROMOTE_DAYS)
    item.promoted_until = item.snoozed_until = until
    log(item, "Promoted on homepage", f"Featured for {PROMOTE_DAYS} days · Admin", "good", admin, now)


def pick_remaker(category, wanted=None):
    """The active ReMaker whose speciality or skills best fit the category, with the lightest
    workload. `wanted` (a ReMaker id) overrides the choice."""
    active = ReMakers.objects.filter(status=ReMakers.Status.ACTIVE).select_related("profile")
    if wanted:
        chosen = active.filter(public_id=str(wanted).strip()).first()
        if chosen is None:
            raise WarehouseError("Choose an active ReMaker.", {"remaker": ["That ReMaker can't take work right now."]})
        return chosen
    word = (category or "").strip().lower()
    load = dict(
        WarehouseItem.objects.filter(warehouse_status=Stage.REFURBISHMENT)
        .values_list("refurb_remaker").annotate(n=Count("pk"))
    )

    def score(r):
        profile = getattr(r, "profile", None)
        fit = 0
        if word and word in (getattr(profile, "speciality", "") or "").lower():
            fit += 2
        if word and word in (getattr(profile, "skills", "") or "").lower():
            fit += 1
        return (-fit, load.get(r.pk, 0), r.pk)

    best = sorted(active, key=score)
    if not best:
        raise WarehouseError("No active ReMaker is available to take this work.", code="NO_REMAKER", status=409)
    return best[0]


def _refurbish(item, admin, payload, now):
    remaker = pick_remaker(item.category, payload.get("remaker"))
    _take_off_sale(item)
    item.warehouse_status, item.sale_status = Stage.REFURBISHMENT, Sale.NOT_LISTED
    item.listed_at = item.promoted_until = item.snoozed_until = None
    _place(item, assign_qc_bay(item.pk))
    item.refurb_remaker, item.refurb_assigned_at = remaker, now
    item.refurb_due_at, item.refurb_progress = now + timedelta(days=REFURB_DAYS), "Assigned"
    log(item, "Sent to refurbishment", f"Assigned to {remaker.full_name} · Admin", "wait", admin, now)
    notify(remaker, "New refurbishment job",
           f"{item.title} ({item.public_id}) has been assigned to you. Please finish by {item.refurb_due_at:%d %b}.",
           module="Jobs", target_url="/remaker-jobs", ref_type="warehouse_item", ref_id=item.public_id)


def _donate(item, admin, payload, now):
    reason = _text(payload.get("reason"), 255)
    if len(reason) < 3:
        raise WarehouseError("Say who receives it.",
                             {"reason": ["Say which NGO or drive receives it (at least 3 characters)."]})
    _take_off_sale(item)
    item.warehouse_status, item.sale_status = Stage.RELEASED, Sale.DONATED
    item.released_at, item.given_to = now, reason
    item.listed_at = item.promoted_until = item.snoozed_until = None
    _clear_place(item)
    log(item, "Donated", f"{reason} · Admin", "neutral", admin, now)


def _snooze(item, admin, payload, now):
    item.snoozed_until = now + timedelta(days=SNOOZE_DAYS)
    log(item, "Alert snoozed", f"For {SNOOZE_DAYS} days · Admin", "neutral", admin, now)


def _receive_back(item, admin, payload, now):
    spot = assign_shelf(item.category, item.pk)
    _place(item, spot)
    item.warehouse_status, item.sale_status, item.condition = Stage.STORED, Sale.NOT_LISTED, "Good"
    item.refurb_remaker = item.refurb_assigned_at = item.refurb_due_at = None
    item.refurb_progress = ""
    log(item, "Received back from ReMaker", f"Quality check passed · {item.bin}", "good", admin, now)


def _dispatch(item, admin, payload, now):
    item.warehouse_status, item.released_at = Stage.RELEASED, now
    _clear_place(item)
    log(item, "Dispatched to buyer", "Left the warehouse · Admin", "neutral", admin, now)
    if item.order_id:
        from apps.orders import services as orders  # imported here: orders imports this module too

        orders.event(item.order, "Left the warehouse", f"{item.title} was handed to the courier", "admin")


ACTIONS = {
    "putAway": _put_away, "list": _list, "discount": _discount, "promote": _promote,
    "refurbish": _refurbish, "donate": _donate, "snooze": _snooze,
    "receiveBack": _receive_back, "dispatch": _dispatch,
}


def run_action(public_id, key, admin, payload=None, ip=None):
    """Apply one action to one lot. Raises WarehouseError (and changes nothing) when it can't."""
    if key not in ACTIONS:
        raise WarehouseError("Unknown action.", code="BAD_ACTION")
    payload = payload or {}
    with transaction.atomic():
        item = (
            WarehouseItem.objects.select_for_update(of=("self",))  # Postgres can't lock a nullable join
            .select_related("donation", "order", "refurb_remaker")
            .filter(public_id=public_id).first()
        )
        if item is None:
            raise WarehouseError("Item not found.", code="NOT_FOUND", status=404)
        now = timezone.now()
        if key not in allowed_actions(item, now=now):
            raise WarehouseError(
                f"That isn't possible while this item is {item.get_warehouse_status_display().lower()}"
                f" ({item.sale_status.lower()}).",
                code="BAD_STATE", status=409,
            )
        before = {"warehouse_status": item.warehouse_status, "sale_status": item.sale_status,
                  "list_price": item.list_price, "location": item.bin}
        ACTIONS[key](item, admin, payload, now)
        item.save()
        audit(admin, f"warehouse.{key}", "warehouse_item", item.public_id, before=before,
              after={"warehouse_status": item.warehouse_status, "sale_status": item.sale_status,
                     "list_price": item.list_price, "location": item.bin},
              reason=_text(payload.get("reason"), 255), ip=ip)
    return item


def run_bulk(ids, key, admin, payload=None, ip=None):
    """The same action on several lots. Each one stands alone: some may fail, the rest go through."""
    done, failed = [], []
    for public_id in dict.fromkeys(ids):
        try:
            run_action(public_id, key, admin, payload, ip)
            done.append(public_id)
        except WarehouseError as e:
            failed.append({"id": public_id, "message": e.message, "code": e.code})
    return done, failed


# ---------------------------------------------------------------- stock in
def check_in(admin, data, ip=None):
    """Stock ReOrbit has bought from a User or a ReMaker arrives at the dock."""
    errors = {}
    title = _text(data.get("title"), 150)
    if len(title) < 3:
        errors["title"] = ["Enter what the item is (at least 3 characters)."]
    category = _text(data.get("category"), 100)
    if not category:
        errors["category"] = ["Choose a category."]
    quantity = _whole(data.get("quantity", 1), 1, 999)
    if quantity is None:
        errors["quantity"] = ["Quantity must be between 1 and 999."]
    condition = _text(data.get("condition") or "Good", 20)
    if condition not in CONDITIONS:
        errors["condition"] = ["Choose Like new, Good, Fair or Needs refurbishing."]
    cost = _whole(data.get("cost_price", 0), 0, MAX_MONEY)
    if cost is None:
        errors["cost_price"] = ["Enter the buying price in rupees."]
    price = _whole(data.get("list_price", 0) or 0, 0, MAX_MONEY)
    if price is None:
        errors["list_price"] = ["Enter the selling price in rupees."]

    user = remaker = None
    kind = _text(data.get("source_type"), 10).lower()
    ref = _text(data.get("source"), 24)
    if kind == "user":
        user = Users.objects.filter(public_id=ref).first()
    elif kind == "remaker":
        remaker = ReMakers.objects.filter(public_id=ref).first()
    if user is None and remaker is None:
        errors["source"] = ["Choose the User or ReMaker it was bought from."]
    if errors:
        raise WarehouseError("Please correct the highlighted fields.", errors)

    party = user or remaker
    city = getattr(getattr(party, "profile", None), "city", "") or ""
    with transaction.atomic():
        item = WarehouseItem.objects.create(
            title=title, category=category, quantity=quantity, condition=condition,
            source_user=user, source_remaker=remaker, source_name=party.full_name,
            source_sub=party.email if user else f"“{party.username}”", source_city=city,
            purchase_ref=_text(data.get("purchase_ref"), 40), cost_price=cost,
            list_price=price, original_price=price, zone="DOCK", rack="01", level=1,
        )
        log(item, "Received at warehouse",
            f"Bought from {party.full_name}" + (f" · {item.purchase_ref}" if item.purchase_ref else ""),
            "good", admin)
        audit(admin, "warehouse.checkIn", "warehouse_item", item.public_id,
              after={"title": title, "quantity": quantity, "source": party.public_id}, ip=ip)
    return item


def update_stock(public_id, admin, data, ip=None):
    """Stock management on a lot that is still here: price, quantity, condition, or move it."""
    with transaction.atomic():
        item = WarehouseItem.objects.select_for_update().filter(public_id=public_id).first()
        if item is None:
            raise WarehouseError("Item not found.", code="NOT_FOUND", status=404)
        if item.warehouse_status == Stage.RELEASED:
            raise WarehouseError("This item has left the warehouse, so it can't be changed.",
                                 code="BAD_STATE", status=409)
        errors, notes = {}, []
        now = timezone.now()
        before = {"list_price": item.list_price, "quantity": item.quantity,
                  "condition": item.condition, "location": item.bin}

        if "list_price" in data:
            price = _whole(data["list_price"], 1, MAX_MONEY)
            if price is None:
                errors["list_price"] = ["Enter a price in rupees."]
            elif price != item.list_price:
                notes.append(("Price changed", f"₹{item.list_price:,} → ₹{price:,}", "neutral"))
                item.list_price = price
                item.original_price = item.original_price or price
        if "quantity" in data:
            quantity = _whole(data["quantity"], 1, 999)
            reason = _text(data.get("reason"), 255)
            if quantity is None:
                errors["quantity"] = ["Quantity must be between 1 and 999."]
            elif item.warehouse_status == Stage.ASSIGNED:
                errors["quantity"] = ["This item is sold, so its quantity can't change."]
            elif quantity != item.quantity and len(reason) < 3:
                errors["reason"] = ["Say why the stock count changed (at least 3 characters)."]
            elif quantity != item.quantity:
                notes.append(("Stock adjusted", f"{item.quantity} → {quantity} · {reason}", "wait"))
                item.quantity = quantity
        if "condition" in data:
            condition = _text(data["condition"], 20)
            if condition not in CONDITIONS:
                errors["condition"] = ["Choose Like new, Good, Fair or Needs refurbishing."]
            elif condition != item.condition:
                notes.append(("Condition updated", f"{item.condition or '—'} → {condition}", "neutral"))
                item.condition = condition
        if "location" in data:
            spot = _move_target(item, data["location"], errors)
            if spot:
                _place(item, spot)
                notes.append(("Moved", f"Now at {item.bin}", "neutral"))
        if errors:
            raise WarehouseError("Please correct the highlighted fields.", errors)

        item.save()
        store = store_item_of(item, lock=True)
        if store and item.sale_status == Sale.LISTED:
            store.price, store.stock = item.list_price, item.quantity
            store.save(update_fields=["price", "stock", "updated_at"])
        for label, detail, tone in notes:
            log(item, label, f"{detail} · Admin", tone, admin, now)
        if notes:
            audit(admin, "warehouse.update", "warehouse_item", item.public_id, before=before,
                  after={"list_price": item.list_price, "quantity": item.quantity,
                         "condition": item.condition, "location": item.bin}, ip=ip)
    return item


def _move_target(item, raw, errors):
    """{"zone","rack","level"} for a lot that sits on the racks. Refuses a full zone."""
    if item.warehouse_status not in (Stage.STORED, Stage.ASSIGNED):
        errors["location"] = ["Only items on a shelf can be moved."]
        return None
    raw = raw if isinstance(raw, dict) else {}
    zone = str(raw.get("zone") or "").upper()
    rack, level = _whole(raw.get("rack"), 1, RACKS), _whole(raw.get("level"), 1, LEVELS)
    if zone not in ZONE_CAPACITY or rack is None or level is None:
        errors["location"] = [f"Choose a zone (A–E), a rack (1–{RACKS}) and a level (1–{LEVELS})."]
        return None
    if zone != item.zone:
        used = WarehouseItem.objects.filter(
            zone=zone, warehouse_status__in=(Stage.STORED, Stage.ASSIGNED)
        ).exclude(pk=item.pk).count()
        if used >= ZONE_CAPACITY[zone]:
            errors["location"] = [f"Zone {zone} is full."]
            return None
    return zone, f"{rack:02d}", level


# ---------------------------------------------------------------- hooks from other apps
def receive_donation(donation):
    """A donated item reached the dock."""
    condition = {"Good": "Good", "Medium": "Fair", "Worst": "Needs refurbishing"}.get(donation.condition, "Good")
    user = donation.user
    item, created = WarehouseItem.objects.get_or_create(
        donation=donation,
        defaults=dict(
            title=donation.title, category=donation.category, quantity=donation.quantity, condition=condition,
            weight_kg=donation.weight_kg, received_at=donation.received_at or timezone.now(),
            source_user=user, source_name=user.full_name, source_sub=user.email,
            source_city=getattr(getattr(user, "profile", None), "city", "") or "",
            purchase_ref=donation.public_id or "", zone="DOCK", rack="01", level=1,
        ),
    )
    if created:
        log(item, "Received at warehouse", f"Donated by {user.full_name} · {donation.public_id}", "good",
            at=item.received_at)
    return item


def donation_completed(donation, ngo):
    """The donation was handed to an NGO from the donations screen."""
    item = WarehouseItem.objects.select_for_update().filter(donation=donation).first()
    if item is None or item.warehouse_status == Stage.RELEASED:
        return
    now = timezone.now()
    _take_off_sale(item)
    item.warehouse_status, item.sale_status = Stage.RELEASED, Sale.DONATED
    item.released_at, item.given_to = now, ngo
    item.listed_at = item.promoted_until = item.snoozed_until = None
    _clear_place(item)
    item.save()
    log(item, "Donated", f"{ngo} · Donation completed", "neutral", at=now)


def on_store_sale(store, order):
    """An order took the last unit of a listing that came from the warehouse."""
    if not store.warehouse_item_id or store.stock > 0:
        return
    item = WarehouseItem.objects.select_for_update().get(pk=store.warehouse_item_id)
    if item.warehouse_status == Stage.STORED and item.sale_status == Sale.LISTED:
        item.warehouse_status, item.sale_status, item.order = Stage.ASSIGNED, Sale.SOLD, order
        item.snoozed_until = item.promoted_until = None
        item.save()
        log(item, "Sold on the marketplace", f"Order {order.public_id} · ready to dispatch", "good")


def on_store_restock(store, order):
    """The order was cancelled or returned: the lot is for sale again."""
    if not store.warehouse_item_id:
        return
    item = WarehouseItem.objects.select_for_update().filter(pk=store.warehouse_item_id).first()
    if item and item.order_id == order.pk and item.warehouse_status == Stage.ASSIGNED:
        item.warehouse_status, item.sale_status, item.order = Stage.STORED, Sale.LISTED, None
        item.save()
        log(item, "Order cancelled", f"{order.public_id} · back on sale", "wait")


# ---------------------------------------------------------------- automatic price cuts
def auto_price_cuts(now=None):
    """Admin > Settings > Warehouse can switch on automatic cuts: a listed lot that has become
    Slow moving (or worse) gets its price cut by the configured percentage, and its timer restarts.
    Returns the ids that were cut. Run daily: python manage.py warehouse_autocut"""
    rule, now = rules(), now or timezone.now()
    if not rule["autoPriceCut"]:
        return []
    cut = []
    for pk in WarehouseItem.objects.filter(
        warehouse_status=Stage.STORED, sale_status=Sale.LISTED
    ).values_list("pk", flat=True):
        with transaction.atomic():
            item = WarehouseItem.objects.select_for_update().get(pk=pk)
            alert = alert_for(item, rule, now)
            if alert and alert["key"] in ("slow", "dead") and item.sale_status == Sale.LISTED:
                cut_price(item, rule["priceCutPct"], now,
                          label=f"Automatic price cut by {rule['priceCutPct']}%")
                item.save()
                audit(None, "warehouse.autoCut", "warehouse_item", item.public_id,
                      after={"list_price": item.list_price})
                cut.append(item.public_id)
    return cut
