"""Pickup data as the admin screens read it (same field names the UI already uses)."""

from apps.donations.serializers import media_url

from .models import PickupRequest


def member_data(m):
    return {"id": f"PM-{m.pk}", "name": m.name, "phone": m.phone, "role": m.role, "status": m.status,
            "joinedAt": m.created_at}


def team_data(t, token=False):
    row = {
        "id": t.public_id, "name": t.name, "area": t.area, "vehicle": t.vehicle, "capacity": t.capacity,
        "status": "Active" if t.status == "Active" else "Paused", "pausedReason": t.paused_reason,
        "note": t.note, "createdAt": t.created_at,
        "members": [member_data(m) for m in t.members.all()],
    }
    if token:
        row["token"] = t.token
    return row


def _cover(request, obj):
    images = list(obj.images.all()) if obj is not None else []
    return media_url(request, images[0].image.name) if images else None


def request_data(r, request):
    seller = r.seller
    profile = getattr(seller, "profile", None)
    snap = r.address_snapshot or {}
    photo = profile.profile_image.name if profile and profile.profile_image else ""
    if r.order_id:
        o = r.order
        lines = list(o.lines.all())
        first = lines[0] if lines else None
        item = {"id": o.public_id, "title": (first.title if first else o.public_id) +
                (f" + {len(lines) - 1} more" if len(lines) > 1 else ""),
                "category": "Order delivery", "image": media_url(request, first.cover) if first and first.cover else None,
                "quantity": sum(ln.qty for ln in lines)}
        buyer = o.buyer_user or o.buyer_remaker or o.buyer_admin
        addr = o.address or {}
        order = {"id": o.public_id, "status": o.status, "total": o.total, "delivery_fee": o.delivery_fee,
                 "payment": o.payment_status, "path": f"/admin-orders/{o.public_id}",
                 "courier": {"name": o.courier_name, "tracking_no": o.tracking_no} if o.tracking_no else None,
                 "buyer": {"name": buyer.full_name if buyer else addr.get("name", ""), "phone": addr.get("phone", ""),
                           "address": addr.get("line1") or addr.get("address") or addr.get("line", ""),
                           "city": addr.get("city", ""), "pincode": addr.get("pincode", "")}}
    else:
        it = r.item
        item = {"id": it.public_id, "title": it.title, "category": it.category.name,
                "image": _cover(request, it), "quantity": it.quantity}
        order = None
    kind = "remaker" if r.remaker_id else "user"
    from apps.core.buyers import reorbit_address_data

    return {
        "id": r.public_id,
        "kind": "order" if r.order_id else "item",
        # a collected listing goes to ReOrbit's own address (Admin > Addresses); an order goes to the buyer
        "drop_to": reorbit_address_data() if not r.order_id else None,
        "item": item,
        "order": order,
        "status": r.status,
        "date": r.pickup_date.isoformat() if r.pickup_date else None,
        "slot": r.pickup_slot or None,
        "partner": r.assigned_partner.name if r.assigned_partner else None,
        "requested_at": r.created_at,
        "cancel_reason": r.cancel_reason,
        "customer": {
            "id": seller.public_id, "name": seller.full_name, "email": seller.email, "type": kind,
            "phone": snap.get("phone") or (profile.phone if profile else "") or "",
            "image": media_url(request, photo) if photo else None, "status": seller.status,
            "address": snap.get("line", ""), "city": snap.get("city", ""), "state": snap.get("state", ""),
            "pincode": snap.get("pincode", ""),
            "path": f"/admin-remakers/{seller.public_id}" if kind == "remaker" else f"/admin-users/{seller.public_id}",
        },
        "events": [{"id": e.pk, "label": e.label, "detail": e.detail, "tone": e.tone, "at": e.created_at,
                    "actor": e.actor} for e in r.events.all()],
    }


def request_queryset():
    return (PickupRequest.objects.select_related("item", "item__category", "user", "user__profile", "remaker",
                                                 "remaker__profile", "assigned_partner", "order", "order__buyer_user",
                                                 "order__buyer_remaker", "order__buyer_admin")
            .prefetch_related("events", "item__images", "order__lines"))
