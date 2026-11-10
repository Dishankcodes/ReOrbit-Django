"""Plain dict builders. Faster than DRF serializers for lists and easy to read."""

from django.core.files.storage import default_storage

from .models import Order

from apps.core import buyers


def media_url(request, name):
    if not name:
        return None
    url = default_storage.url(name)
    return request.build_absolute_uri(url) if request else url


def seller_of(o):
    if o.seller_type == "user" and o.seller_user_id:
        u = o.seller_user
        return {"type": "user", "id": u.public_id, "name": u.full_name}
    if o.seller_type == "remaker" and o.seller_remaker_id:
        r = o.seller_remaker
        return {"type": "remaker", "id": r.public_id, "name": r.full_name, "username": r.username}
    return {"type": "platform", "id": "", "name": "ReOrbit"}


def order_data(o, request, *, events=False, buyer=False):
    """`events` adds the tracking history; `buyer` adds who bought (sellers and admin need it)."""
    data = {
        "id": o.public_id,
        "status": o.status,
        "payment": {
            "id": o.payment.public_id,
            "method": o.payment.method,
            "status": o.payment_status,
        },
        "seller": seller_of(o),
        "items": [
            {
                "id": ln.ref_id, "kind": ln.kind, "title": ln.title, "qty": ln.qty,
                "unit_price": ln.unit_price, "line_total": ln.line_total,
                "cover": media_url(request, ln.cover),
            }
            for ln in o.lines.all()
        ],
        "subtotal": o.subtotal, "platform_fee": o.platform_fee, "delivery_fee": o.delivery_fee, "total": o.total,
        "address": o.address, "note": o.note,
        "courier": {"name": o.courier_name, "tracking_no": o.tracking_no} if o.tracking_no else None,
        "created_at": o.created_at, "confirmed_at": o.confirmed_at, "shipped_at": o.shipped_at,
        "delivered_at": o.delivered_at, "cancelled_at": o.cancelled_at,
        "cancel_reason": o.cancel_reason, "cancelled_by": o.cancelled_by,
        "can_cancel": o.status in (Order.Status.CONFIRMED, Order.Status.PACKED),
    }
    if buyer:
        data["buyer"] = buyers.info(o)
    if events:
        data["events"] = [
            {"label": e.label, "detail": e.detail, "actor": e.actor, "at": e.created_at} for e in o.events.all()
        ]
    return data


def address_data(a):
    return {
        "id": a.public_id, "label": a.label, "name": a.recipient_name, "phone": a.phone,
        "line1": a.address_line1, "line2": a.address_line2, "landmark": a.landmark,
        "city": a.city, "state": a.state, "pincode": a.pincode, "is_default": a.is_default,
    }
