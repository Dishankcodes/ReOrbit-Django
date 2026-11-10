"""Plain dict builders. Faster than DRF serializers for lists and easy to read."""

from django.core.files.storage import default_storage

from datetime import timedelta

from django.utils import timezone

from . import returns
from .models import Order
from .services import FAIL_REASONS

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


def return_data(rr, request):
    now = timezone.now()
    return {
        "id": rr.public_id, "status": rr.status,
        "reason": {"code": rr.reason_code, "label": returns.REASONS.get(rr.reason_code, (rr.reason_code, ""))[0]},
        "details": rr.details, "fault": rr.fault,
        "seller_note": rr.seller_note, "admin_note": rr.admin_note, "decided_by": rr.decided_by,
        "decided_at": rr.decided_at, "escalate_until": rr.escalate_until, "received_at": rr.received_at,
        "refund_amount": rr.refund_amount, "created_at": rr.created_at,
        "photos": [media_url(request, p.image.name) for p in rr.photos.all()],
        "return_shipping_paid_by": rr.fault or "buyer",
        "can_escalate": rr.status == rr.Status.REJECTED and bool(rr.escalate_until) and rr.escalate_until > now,
        "can_withdraw": rr.status == rr.Status.REQUESTED,
        "expected_refund": returns.refund_amount(rr.order, rr.fault) if rr.status in rr.OPEN else rr.refund_amount,
    }


def refund_data(r):
    return {"id": r.public_id, "amount": r.amount, "status": r.status, "method": r.method, "reason": r.reason,
            "note": r.note, "reference": r.reference, "created_at": r.created_at, "processed_at": r.processed_at}


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
        "seller_earning": 0 if o.seller_type == "platform" else o.subtotal + o.delivery_fee,
        "cod_received_at": o.cod_received_at,
        "failed": {"reason": o.fail_reason, "label": FAIL_REASONS.get(o.fail_reason, (o.fail_reason, ""))[0],
                   "note": o.fail_note, "fault": o.fail_fault, "at": o.failed_at} if o.fail_reason else None,
        "refunds": [refund_data(r) for r in o.refunds.all()],
    }
    rr = getattr(o, "return_request", None)
    data["return"] = return_data(rr, request) if rr else None
    data["can_return"] = rr is None and o.status == Order.Status.DELIVERED and returns.window_open(o)
    data["return_until"] = (o.delivered_at + timedelta(days=returns.RETURN_DAYS)) if o.delivered_at else None
    if buyer:
        b = buyers.info(o)
        if request is None or getattr(getattr(request, "user", None), "account_type", "") != "admin":
            b.pop("email", None)  # sellers see who is buying, not their email
        data["buyer"] = b
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
