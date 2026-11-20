"""Plain dict builders. Faster than DRF serializers for lists and easy to read."""

from django.conf import settings
from django.core.files.storage import default_storage
from django.db.models import Avg, Count, Sum

from datetime import timedelta

from django.utils import timezone

from . import returns
from .models import Order, OrderItem
from .services import FAIL_REASONS

from apps.core import buyers



def _auto_confirm_on(o):
    from .services import auto_confirm_on  # local import: services imports this module

    return auto_confirm_on(o)


def _tracking_url(courier, number):
    from .services import tracking_url  # local import: services imports this module

    return tracking_url(courier, number)

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


def reorbit_store():
    """ReOrbit's own details, for orders the platform sells itself: the default address in
    Admin › Addresses, with any REORBIT_STORE_* setting taking priority. Never made up."""
    from apps.core.buyers import reorbit_address_data
    from apps.core.support_contacts import support_email

    c = settings.REORBIT_STORE
    a = reorbit_address_data() or {}
    line = c["address_line"] or ", ".join(x for x in (a.get("line1"), a.get("line2")) if x)
    return {
        "name": c["name"], "phone": c["phone"] or a.get("phone", ""),
        "email": support_email(),
        "address": {"line1": line, "city": c["city"] or a.get("city", ""), "state": c["state"] or a.get("state", ""),
                    "pincode": c["pincode"] or a.get("pincode", "")},
    }


def _image(request, profile):
    f = getattr(profile, "profile_image", None) if profile else None
    return media_url(request, f.name) if f else None


def _items_sold(**seller):
    """Pieces this seller has delivered (the profile's total_sales counter is never kept up to date)."""
    return OrderItem.objects.filter(order__status=Order.Status.DELIVERED, **{f"order__{k}": v for k, v in seller.items()}
                                    ).aggregate(n=Sum("qty"))["n"] or 0


def seller_card(o, request):
    """The "Sold by" card on one order: who the seller really is. Used on the order detail only,
    because it counts reviews. Fields the seller has not filled in come back empty, never made up."""
    from apps.reviews.models import ProductReview, SellerReview

    base = seller_of(o)
    if base["type"] == "platform":
        return {**base, **reorbit_store(), "verified": True}
    visible = ProductReview.Status.VISIBLE
    if base["type"] == "remaker":
        r = o.seller_remaker
        p = getattr(r, "profile", None)
        return {
            **base, "image": _image(request, p), "city": getattr(p, "city", "") or "",
            "craft": (getattr(p, "speciality", "") or getattr(p, "studio_name", "") or ""),
            "rating": float(getattr(p, "rating_average", 0) or 0), "totalReviews": getattr(p, "rating_count", 0) or 0,
            "experience": getattr(p, "experience", "") or "",
            "productsSold": _items_sold(seller_remaker=r),
            "verified": r.email_verified_at is not None,
        }
    u = o.seller_user
    p = getattr(u, "profile", None)
    pr = ProductReview.objects.filter(order__seller_user=u, status=visible).aggregate(n=Count("pk"), a=Avg("rating"))
    sr = SellerReview.objects.filter(seller_user=u, status=visible).aggregate(n=Count("pk"), a=Avg("rating"))
    n = (pr["n"] or 0) + (sr["n"] or 0)
    total = (pr["a"] or 0) * (pr["n"] or 0) + (sr["a"] or 0) * (sr["n"] or 0)
    return {
        **base, "image": _image(request, p), "city": getattr(p, "city", "") or "",
        "rating": round(total / n, 1) if n else 0, "totalReviews": n,
        "productsSold": _items_sold(seller_user=u),
    }


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


TICKET_PATH = {"user": "/user-help/tickets/", "remaker": "/remaker-help/tickets/", "admin": "/admin-support/"}


def related_data(o, request, data):
    """Everything tied to this order besides its tracking events: support tickets, the return and refunds.
    Newest first. Members and ReMakers only see tickets they opened themselves; admins see all of them."""
    from apps.support.models import SupportTicket

    acct = getattr(getattr(request, "user", None), "account", None)
    kind = {"Users": "user", "ReMakers": "remaker", "Admins": "admin"}.get(type(acct).__name__, "")
    tickets = SupportTicket.objects.filter(order_id=o.public_id)
    if kind == "user":
        tickets = tickets.filter(user=acct)
    elif kind == "remaker":
        tickets = tickets.filter(remaker=acct)
    elif kind != "admin":
        tickets = tickets.none()
    rows = []
    for t in tickets:
        rows.append({"kind": "ticket", "id": t.public_id, "title": t.subject, "status": t.status, "detail": t.category,
                     "at": t.created_at, "url": f"{TICKET_PATH[kind]}{t.public_id}" if kind else ""})
    rr = data.get("return")
    if rr:
        rows.append({"kind": "return", "id": rr["id"], "title": "Return: " + rr["reason"]["label"], "status": rr["status"],
                     "detail": rr["details"] or "", "at": rr["created_at"], "url": ""})
    for rf in data.get("refunds", []):
        rows.append({"kind": "refund", "id": rf["id"], "title": f"Refund of ₹{rf['amount']:,}", "status": rf["status"],
                     "detail": rf["note"] or rf["reason"], "at": rf["processed_at"] or rf["created_at"], "url": ""})
    rows.sort(key=lambda r: r["at"], reverse=True)
    return rows


def pickup_of(o, seller_view=False):
    """The ReOrbit pickup of a "Managed by ReOrbit" order, once the seller asked for it. The seller
    (only) also gets the 4-digit handover code to show the pickup team."""
    if not o.managed_delivery:
        return None
    r = getattr(o, "delivery_pickup", None)
    if r is None:
        return {"requested": bool(o.pickup_requested_at), "status": None}
    # after ReOrbit cancels a pickup the seller can ask again (requested goes back to False)
    data = {"requested": bool(o.pickup_requested_at), "id": r.public_id, "status": r.status, "date": r.pickup_date,
            "slot": r.pickup_slot, "team": r.assigned_partner.name if r.assigned_partner_id else None,
            "cancel_reason": r.cancel_reason, "requested_at": o.pickup_requested_at}
    if seller_view and r.status == "Scheduled" and r.handover_code:
        data["handover_code"] = r.handover_code
    return data


def _is_seller(o, request):
    a = getattr(getattr(request, "user", None), "account", None)
    if a is None:
        return False
    kind = getattr(request.user, "account_type", "")
    return (kind == "user" and o.seller_user_id == a.pk) or (kind == "remaker" and o.seller_remaker_id == a.pk)


def _reorbit_address():
    from apps.core.buyers import reorbit_address_data

    return reorbit_address_data()


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
                "cover": media_url(request, ln.cover), "returnable": ln.returnable,
            }
            for ln in o.lines.all()
        ],
        "subtotal": o.subtotal, "platform_fee": o.platform_fee, "delivery_fee": o.delivery_fee, "discount": o.discount, "total": o.total,
        "address": address_view(o.address), "note": o.note,
        "courier": {"name": o.courier_name, "tracking_no": o.tracking_no,
                    "tracking_url": _tracking_url(o.courier_name, o.tracking_no)} if o.tracking_no else None,
        "created_at": o.created_at, "confirmed_at": o.confirmed_at, "shipped_at": o.shipped_at,
        "delivered_at": o.delivered_at, "cancelled_at": o.cancelled_at,
        # a shipped courier order becomes Delivered by itself on this date (unless a ticket is open)
        "auto_confirm_on": _auto_confirm_on(o),
        "cancel_reason": o.cancel_reason, "cancelled_by": o.cancelled_by,
        "can_cancel": o.status in (Order.Status.CONFIRMED, Order.Status.PACKED),
        "seller_earning": 0 if o.seller_type == "platform" else o.subtotal + (0 if o.managed_delivery else o.delivery_fee),
        "managed_delivery": o.managed_delivery,
        # ReOrbit's own address (Admin > Addresses): where its store orders ship from and returns go back to
        "reorbit_address": _reorbit_address() if o.seller_type == "platform" or o.managed_delivery else None,
        "pickup": pickup_of(o, seller_view=_is_seller(o, request)),
        "cod_received_at": o.cod_received_at,
        "failed": {"reason": o.fail_reason, "label": FAIL_REASONS.get(o.fail_reason, (o.fail_reason, ""))[0],
                   "note": o.fail_note, "fault": o.fail_fault, "at": o.failed_at} if o.fail_reason else None,
        "refunds": [refund_data(r) for r in o.refunds.all()],
    }
    # the buyer's own product reviews of this order (the Orders screens show "Rate this order" until one exists)
    revs = [r for r in o.product_reviews.all()]
    data["review"] = (
        {"rating": revs[0].rating, "at": revs[0].created_at, "count": len(revs)} if revs else None
    )
    # the buyer (member, ReMaker or admin) can review once delivered, until it has been reviewed
    data["can_review"] = o.status == Order.Status.DELIVERED and not revs
    rr = getattr(o, "return_request", None)
    data["return"] = return_data(rr, request) if rr else None
    no_returns = any(not ln.returnable for ln in o.lines.all())
    data["returns_accepted"] = not no_returns
    data["can_return"] = (rr is None and not no_returns and o.status == Order.Status.DELIVERED
                          and returns.window_open(o))
    data["return_until"] = (o.delivered_at + timedelta(days=returns.RETURN_DAYS)) if o.delivered_at else None
    if buyer:
        b = buyers.info(o)
        if request is None or getattr(getattr(request, "user", None), "account_type", "") != "admin":
            b.pop("email", None)  # sellers see who is buying, not their email
        data["buyer"] = b
    if events:
        data["seller"] = seller_card(o, request)
        data["related"] = related_data(o, request, data)
        data["events"] = [
            {"label": e.label, "detail": e.detail, "actor": e.actor, "at": e.created_at} for e in o.events.all()
        ]
    return data


def report_row(o):
    """Slim row for the admin dashboard, reports and earnings: no timeline, address or reviews."""
    return {
        "id": o.public_id,
        "status": o.status,
        "payment_status": o.payment_status,
        "method": o.payment.method,
        "seller": seller_of(o),
        "buyer": buyers.info(o, email=False),
        "items": [{"ref": ln.ref_id, "kind": ln.kind, "title": ln.title, "qty": ln.qty} for ln in o.lines.all()],
        "subtotal": o.subtotal, "platform_fee": o.platform_fee, "delivery_fee": o.delivery_fee,
        "managed_delivery": o.managed_delivery,
        "discount": o.discount, "total": o.total,
        "created_at": o.created_at, "confirmed_at": o.confirmed_at, "shipped_at": o.shipped_at,
        "cancel_reason": o.cancel_reason, "cod_received_at": o.cod_received_at,
        "refund_due": o.payment_status in ("Refund_Pending", "Refund_Failed"),
    }


def address_view(snap):
    """An order keeps a copy of the address as it was (SavedAddress.snapshot(): address_line1,
    recipient_name, ...). Screens read the same shape as saved addresses (line1, name), so give both."""
    snap = dict(snap or {})
    snap.setdefault("name", snap.get("recipient_name", ""))
    snap.setdefault("line1", snap.get("address_line1", ""))
    snap.setdefault("line2", snap.get("address_line2", ""))
    return snap


def address_data(a):
    return {
        "id": a.public_id, "label": a.label, "name": a.recipient_name, "phone": a.phone,
        "line1": a.address_line1, "line2": a.address_line2, "landmark": a.landmark,
        "city": a.city, "state": a.state, "pincode": a.pincode, "is_default": a.is_default,
    }
