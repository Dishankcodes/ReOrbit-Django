"""The warehouse as the admin screens read it (the same field names the UI already uses)."""

from django.db.models import Count
from django.utils import timezone

from apps.donations.serializers import media_url
from apps.social.models import WishlistEntry

from . import services
from .models import WarehouseItem

PREFETCH = ("events", "donation__photos", "store_item__images")
SELECT = (
    "donation", "order", "refurb_remaker", "store_item",
    "source_user__profile", "source_remaker__profile",
)


def queryset():
    return WarehouseItem.objects.select_related(*SELECT).prefetch_related(*PREFETCH)


def wishlist_counts(items):
    refs = [w.store_item.public_id for w in items if hasattr(w, "store_item") and w.store_item]
    if not refs:
        return {}
    rows = WishlistEntry.objects.filter(item_ref__in=refs).values("item_ref").annotate(n=Count("pk"))
    return {r["item_ref"]: r["n"] for r in rows}


def _store(w):
    try:
        return w.store_item
    except WarehouseItem.store_item.RelatedObjectDoesNotExist:
        return None


def _image(w, request):
    if w.donation_id:
        photos = list(w.donation.photos.all())
        if photos:
            return media_url(request, photos[0].image.name)
    store = _store(w)
    if store:
        images = sorted(store.images.all(), key=lambda i: (i.display_order, i.pk))
        if images:
            return media_url(request, images[0].image.name)
    return ""


def _source(w, request):
    if w.source_remaker_id:
        party, kind, path = w.source_remaker, "ReMaker", "/admin-remakers/"
    elif w.source_user_id:
        party, kind, path = w.source_user, "User", "/admin-users/"
    else:
        return {"type": "User", "id": "", "name": w.source_name or "Unknown", "sub": w.source_sub,
                "image": "", "city": w.source_city, "path": ""}
    photo = getattr(getattr(party, "profile", None), "profile_image", None)
    return {
        "type": kind, "id": party.public_id, "name": w.source_name or party.full_name,
        "sub": w.source_sub, "image": media_url(request, photo.name) if photo else "",
        "city": w.source_city, "path": f"{path}{party.public_id}",
    }


def item_data(w, request, *, wishlisted=0, now=None, rule=None):
    now = now or timezone.now()
    rule = rule or services.rules()
    events = [
        {"id": f"e-{e.pk}", "label": e.label, "detail": e.detail, "at": e.at, "tone": e.tone}
        for e in w.events.all()
    ]
    refurb = None
    if w.refurb_remaker_id:
        r = w.refurb_remaker
        refurb = {
            "name": r.full_name, "path": f"/admin-remakers/{r.public_id}",
            "assigned_at": w.refurb_assigned_at, "due": w.refurb_due_at, "progress": w.refurb_progress,
        }
    return {
        "inventory_id": w.public_id,
        "sku": w.sku,
        "item_id": w.donation.public_id if w.donation_id else "",
        "title": w.title,
        "category": w.category,
        "image": _image(w, request),
        "condition": w.condition,
        "quantity": w.quantity,
        "source": _source(w, request),
        "purchase_ref": w.purchase_ref,
        "cost_price": w.cost_price,
        "list_price": w.list_price,
        "original_price": w.original_price,
        "received_at": w.received_at,
        "stored_at": w.stored_at,
        "listed_at": w.listed_at,
        "released_at": w.released_at,
        "warehouse_status": w.warehouse_status,
        "sale_status": w.sale_status,
        "location": {"zone": w.zone, "rack": w.rack, "level": w.level, "bin": w.bin} if w.zone else None,
        "refurb": refurb,
        "views": 0,
        "wishlisted": wishlisted,
        "promoted": bool(w.promoted_until and w.promoted_until > now),
        "price_cuts": w.price_cuts,
        "snoozed_until": w.snoozed_until,
        "order_id": w.order.public_id if w.order_id else None,
        "given_to": w.given_to,
        "events": events,
        "actions": services.allowed_actions(w, rule, now),
    }


def items_data(items, request):
    items = list(items)
    now, rule, counts = timezone.now(), services.rules(), wishlist_counts(items)
    out = []
    for w in items:
        store = _store(w)
        out.append(item_data(w, request, wishlisted=counts.get(store.public_id, 0) if store else 0,
                             now=now, rule=rule))
    return out
