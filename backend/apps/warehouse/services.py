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
# Two floors. Donated items go to Floor 1; everything ReOrbit bought (from members or ReMakers)
# goes to Floor 2. Each floor has one area per marketplace category (Admin › Content), lettered in
# the order the categories were created (A = the first), plus a last "Other items" area for anything
# whose category isn't known. A zone is floor + area ("1A" = Floor 1, the first category) and a bin
# reads 1A-03-2 (zone, rack, level). The letters only grow when a category is added, so a lot never
# changes area. The admin screens read this layout from the server (layout() below).
FLOORS = (
    ("1", "Floor 1", "Donated items"),
    ("2", "Floor 2", "Bought stock"),
)
AREA_CAPACITY = 40   # spaces per area (8 racks × 4 levels, plus room on the floor)
LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXY"  # Z is never used: the "Other items" area takes the next free letter
# Before any category exists (a new install): the original five areas.
DEFAULT_AREAS = (
    ("Furniture", ("furniture",)),
    ("Home & kitchen", ("home decor", "kitchen")),
    ("Textiles & clothing", ("clothing", "fashion")),
    ("Electronics & books", ("electronics", "books")),
    ("Sports & misc", ("sports",)),
)
# Optional per-zone capacity overrides, {"2A": 60}. Empty means AREA_CAPACITY everywhere.
ZONE_CAPACITY = {}


def areas_from(category_names):
    """[(letter, area name, {lower-case category names})] from category names in creation order.
    Also used by the migration that moved existing lots to the new areas."""
    names = [n for n in category_names if n and n.strip()]
    if not names:
        rows = [(name, set(keys)) for name, keys in DEFAULT_AREAS]
        return [(LETTERS[i], name, keys) for i, (name, keys) in enumerate(rows)]
    rows = [(n.strip(), {n.strip().lower()}) for n in names[: len(LETTERS) - 1]]
    out = [(LETTERS[i], name, keys) for i, (name, keys) in enumerate(rows)]
    out.append((LETTERS[len(out)], "Other items", set()))
    return out


def _areas():
    from apps.core.models import Category

    return areas_from(list(Category.objects.order_by("pk").values_list("name", flat=True)))


def zone_keys():
    return {f"{floor}{letter}" for floor, _n, _note in FLOORS for letter, _name, _k in _areas()}


def capacity_of(zone):
    return ZONE_CAPACITY.get(zone, AREA_CAPACITY)


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
def floor_for(item):
    """Donations live on Floor 1, bought stock on Floor 2."""
    return "1" if getattr(item, "donation_id", None) else "2"


def zone_for(category, floor="2"):
    """The category's area on that floor (the last area, "Other items", when the category is unknown)."""
    key = (category or "").strip().lower()
    areas = _areas()
    letter = next((letter for letter, _name, keys in areas if key in keys), areas[-1][0])
    return f"{floor}{letter}"


def layout():
    """The floor plan for the admin screens: floors, their zones, rack sizes and the address."""
    from apps.core.buyers import reorbit_address_data

    a = reorbit_address_data()
    areas = _areas()
    address = ", ".join(x for x in ((a or {}).get("line1"), (a or {}).get("line2"), (a or {}).get("city"),
                                     (a or {}).get("pincode")) if x) if a else ""
    return {
        "floors": [
            {"key": f, "name": name, "note": note,
             "zones": [{"key": f"{f}{area}", "area": area, "name": zname, "capacity": capacity_of(f"{f}{area}")}
                       for area, zname, _keys in areas]}
            for f, name, note in FLOORS
        ],
        "racks": RACKS, "levels": LEVELS, "qc_bays": QC_BAYS,
        "address": address,
    }


def assign_shelf(category, exclude_pk=None, floor="2"):
    """The emptiest rack and level in the category's zone on that floor. Refuses when the zone is full."""
    zone = zone_for(category, floor)
    taken = WarehouseItem.objects.filter(zone=zone, warehouse_status__in=(Stage.STORED, Stage.ASSIGNED))
    if exclude_pk:
        taken = taken.exclude(pk=exclude_pk)
    capacity = capacity_of(zone)
    if taken.count() >= capacity:
        raise WarehouseError(
            f"Zone {zone} (Floor {zone[0]}) is full ({capacity} spaces). Free a space before putting this away.",
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
    for n, photo in enumerate(item.donation.images.all()[:8]):
        MediaImage.objects.create(
            admin_item=store, image=photo.image.name, display_order=n,
            image_type=MediaImage.Kind.COVER if n == 0 else MediaImage.Kind.GALLERY,
        )


def _put_on_sale(item, admin):
    store = store_item_of(item, lock=True)
    store_condition = {
        "Good": "Good",
        "Fair": "Fair",
        "Needs refurbishing": "Refurbished",
    }.get(item.condition, "Good")
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
            price=item.list_price, stock=item.quantity, status=AdminItem.Status.LISTED,
            condition=store_condition, warehouse_item=item,
        )
        _copy_photos(item, store)
    else:
        store.price, store.stock, store.status, store.condition = (
            item.list_price, item.quantity, AdminItem.Status.LISTED, store_condition
        )
        store.save(update_fields=["price", "stock", "status", "condition", "updated_at"])
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
    _place(item, assign_shelf(item.category, item.pk, floor_for(item)))
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
    spot = assign_shelf(item.category, item.pk, floor_for(item))
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
    if zone not in zone_keys() or rack is None or level is None:
        errors["location"] = [f"Choose a zone (floor and area, like 2A), a rack (1–{RACKS}) and a level (1–{LEVELS})."]
        return None
    if zone != item.zone:
        used = WarehouseItem.objects.filter(
            zone=zone, warehouse_status__in=(Stage.STORED, Stage.ASSIGNED)
        ).exclude(pk=item.pk).count()
        if used >= capacity_of(zone):
            errors["location"] = [f"Zone {zone} (Floor {zone[0]}) is full."]
            return None
    return zone, f"{rack:02d}", level


# ---------------------------------------------------------------- hooks from other apps
def receive_donation(donation):
    """A donated item reached the dock."""
    condition = {"Good": "Good", "Medium": "Fair", "Worst": "Needs refurbishing"}.get(
        donation.received_condition or donation.condition, "Good")
    user = donation.donor
    quantity = donation.received_quantity if donation.received_quantity is not None else donation.quantity
    item, created = WarehouseItem.objects.get_or_create(
        donation=donation,
        defaults=dict(
            title=donation.title, category=donation.category, quantity=max(1, quantity), condition=condition,
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


# ---------------------------------------------------------------- stock the team bought on the marketplace
PURCHASE_CONDITION = {
    "new": "Like new", "like new": "Like new", "excellent": "Like new",
    "very good": "Good", "good": "Good", "refurbished": "Good", "fair": "Fair",
}


def purchase_ref(order, line):
    return f"{order.public_id}-L{line.pk}"


def receive_purchase(order):
    """An order the ReOrbit team placed on the marketplace (Admin › Buy Products) was delivered.
    Each thing bought arrives at the dock as bought stock: put away, it goes to Floor 2.
    Safe to call twice: a line that already arrived is skipped. Returns the new lots."""
    if not order.buyer_admin_id or order.seller_type not in ("user", "remaker"):
        return []  # only team purchases from members or ReMakers; ReOrbit's own store is already ours
    seller = order.seller_user if order.seller_type == "user" else order.seller_remaker
    if seller is None:
        return []
    city = getattr(getattr(seller, "profile", None), "city", "") or ""
    sub = seller.email if order.seller_type == "user" else f"“{getattr(seller, 'username', '') or seller.full_name}”"
    made = []
    lines = order.lines.select_related("item__category", "remaker_product__category")
    for ln in lines:
        ref = purchase_ref(order, ln)
        if WarehouseItem.objects.filter(purchase_ref=ref).exists():
            continue
        src = ln.item or ln.remaker_product
        category = getattr(getattr(src, "category", None), "name", "") or "Other"
        raw = (getattr(ln.item, "condition", "") or "") if ln.item_id else "Like new"
        condition = PURCHASE_CONDITION.get(raw.strip().lower(), "Good")
        item = WarehouseItem.objects.create(
            title=ln.title[:150], category=category[:100], quantity=ln.qty, condition=condition,
            source_user=seller if order.seller_type == "user" else None,
            source_remaker=seller if order.seller_type == "remaker" else None,
            source_name=seller.full_name, source_sub=sub[:150], source_city=city,
            purchase_ref=ref, cost_price=ln.line_total, list_price=ln.unit_price, original_price=ln.unit_price,
            photo=ln.cover or "", zone="DOCK", rack="01", level=1,
        )
        log(item, "Received at warehouse",
            f"Bought on the marketplace from {seller.full_name} · Order {order.public_id}", "good",
            order.buyer_admin)
        made.append(item)
    if made:
        notify(order.buyer_admin, "Your purchase is at the warehouse",
               f"{order.public_id}: {len(made)} item{'s' if len(made) > 1 else ''} arrived at the receiving dock. "
               "Put it away to store it on Floor 2.",
               module="warehouse", target_url=f"/admin-warehouse/{made[0].public_id}",
               ref_type="warehouse_item", ref_id=made[0].public_id)
    return made


def on_purchase_returned(order):
    """A team purchase was returned to its seller: its lots leave the warehouse (unless already sold on)."""
    now = timezone.now()
    for item in WarehouseItem.objects.select_for_update().filter(purchase_ref__startswith=f"{order.public_id}-L"):
        if item.warehouse_status in (Stage.RELEASED, Stage.ASSIGNED):
            continue  # already gone, or already sold to someone else
        _take_off_sale(item)
        item.warehouse_status, item.sale_status = Stage.RELEASED, Sale.NOT_LISTED
        item.released_at, item.given_to = now, "Returned to seller"
        item.listed_at = item.promoted_until = item.snoozed_until = None
        _clear_place(item)
        item.save()
        log(item, "Returned to seller", f"Order {order.public_id} was returned and refunded", "neutral", at=now)


def register_store_product(store, admin):
    """A ReOrbit store product that went live without coming from the warehouse (new stock or a
    refurbished piece added straight on Sell products): it gets a warehouse lot, so every ReOrbit
    product has a shelf. Stored on Floor 2 in its category's area and marked Listed; when the last
    unit sells, on_store_sale makes it ready to dispatch, as for any warehouse listing. When that
    area is full it waits at the dock to be put away."""
    if store.warehouse_item_id:
        return None
    now = timezone.now()
    with transaction.atomic():
        sku = store.sku if not WarehouseItem.objects.filter(sku=store.sku).exists() else None
        price = int(store.price or 0)
        item = WarehouseItem(
            sku=sku, title=store.title[:150], category=store.category.name if store.category_id else "Other",
            quantity=max(1, store.stock or 1), condition=(store.condition or "Good")[:20],
            source_name="ReOrbit store",
            source_sub="Refurbished stock" if getattr(store, "source", "") == "refurbished" else "New stock",
            purchase_ref=store.public_id, list_price=price, original_price=price,
            sale_status=Sale.LISTED, listed_at=now,
        )
        try:
            _place(item, assign_shelf(item.category, floor="2"))
            item.warehouse_status, item.stored_at = Stage.STORED, now
            where = f"Stored at {item.zone}"
        except WarehouseError:
            item.zone, item.rack, item.level = "DOCK", "01", 1
            item.warehouse_status = Stage.RECEIVED
            where = "Its area is full: waiting at the dock to be put away"
        item.save()
        if item.warehouse_status == Stage.STORED:
            where = f"Stored at {item.bin}"
        log(item, "Added from the ReOrbit store", f"{store.public_id} went live · {where}", "good", admin, now)
        store.warehouse_item = item
        store.save(update_fields=["warehouse_item", "updated_at"])
    return item


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
