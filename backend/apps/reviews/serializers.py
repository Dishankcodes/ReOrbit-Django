from apps.orders.serializers import media_url, seller_of

from . import services

PRODUCT_ASPECTS = services.PRODUCT_ASPECTS
SELLER_ASPECTS = services.SELLER_ASPECTS


def _reply(r):
    return ({"text": r.reply, "created_at": r.replied_at, "edited": r.reply_edited} if r.reply else None)


def product_review_data(r, request):
    """A product review as its writer sees it (My Reviews)."""
    return {
        "id": r.public_id, "rating": r.rating, "title": r.title, "body": r.body, "recommend": r.recommend,
        "quality": r.quality, "as_described": r.as_described, "value": r.value, "packaging": r.packaging,
        "photos": [{"id": p.pk, "url": media_url(request, p.image.name)} for p in r.photos.all()],
        "created_at": r.created_at, "edited_at": r.edited_at, "edit_until": services.edit_until(r),
        "reply": r.reply, "replied_at": r.replied_at, "status": r.status, "hidden_reason": r.hidden_reason,
    }


def seller_review_data(r):
    return {
        "id": r.public_id, "rating": r.rating, "body": r.body, "tags": r.tags,
        "communication": r.communication, "packing": r.packing, "dispatch": r.dispatch, "as_promised": r.as_promised,
        "reply": r.reply, "replied_at": r.replied_at, "status": r.status, "hidden_reason": r.hidden_reason,
        "created_at": r.created_at, "edited_at": r.edited_at, "edit_until": services.edit_until(r),
    }


def entry_data(line, request):
    """One delivered order line with the state of its reviews."""
    o = line.order
    pr = getattr(line, "review", None)
    sr = getattr(o, "seller_review", None)
    reviewable_seller = services.can_review_seller(o)
    return {
        "order_id": o.public_id, "line_id": line.ref_id, "delivered_at": o.delivered_at,
        "item": {"title": line.title, "qty": line.qty, "cover": media_url(request, line.cover)},
        "seller": seller_of(o), "can_review_seller": reviewable_seller,
        "product_review": product_review_data(pr, request) if pr else None,
        "seller_review": seller_review_data(sr) if sr and reviewable_seller else None,
        "complete": bool(pr) and (bool(sr) or not reviewable_seller),
    }


# ------------------------------------------------------------------ shared pieces
def kind_of(r):
    return "product" if r.public_id.startswith("PRV-") else "seller"


def aspects_of(r):
    keys = PRODUCT_ASPECTS if kind_of(r) == "product" else SELLER_ASPECTS
    return {k: getattr(r, k) for k in keys if getattr(r, k)}


def photos_of(r, request):
    return [{"id": p.pk, "url": media_url(request, p.image.name)} for p in r.photos.all()] if kind_of(r) == "product" else []


def reviewer_of(r):
    return getattr(r, f"reviewer_{r.reviewer_type}")


def first_name_initial(name):
    parts = (name or "").split()
    if not parts:
        return "A buyer"
    return parts[0] if len(parts) == 1 else f"{parts[0]} {parts[-1][0]}."


def target_of(r, request):
    """What the review is about: a product (ref + title + picture) or the seller's service on an order."""
    if kind_of(r) == "product":
        line = r.order_item
        return {"ref": line.ref_id, "title": line.title, "image": media_url(request, line.cover)}
    return None


def report_data(rep):
    reporter = getattr(rep, f"reporter_{rep.reporter_type}")
    return {
        "id": rep.public_id, "reason": rep.reason, "note": rep.note, "status": rep.status,
        "created_at": rep.created_at, "resolved_at": rep.resolved_at, "resolution_note": rep.resolution_note,
        "reporter": {"type": rep.reporter_type, "id": reporter.public_id, "name": reporter.full_name},
    }


# ----------------------------------------------------------- the seller's inbox
def received_data(r, request, mine=None):
    """A review as the seller who received it sees it. `mine` is the seller's own report of it, if any."""
    reviewer = reviewer_of(r)
    return {
        "id": r.public_id, "kind": kind_of(r), "rating": r.rating, "title": getattr(r, "title", ""), "body": r.body,
        "recommend": getattr(r, "recommend", None), "aspects": aspects_of(r), "tags": getattr(r, "tags", []) if kind_of(r) == "seller" else [],
        "photos": photos_of(r, request), "created_at": r.created_at, "edited_at": r.edited_at,
        "order_id": r.order.public_id, "product": target_of(r, request),
        "reviewer": {"type": r.reviewer_type, "id": reviewer.public_id, "name": reviewer.full_name,
                     "city": reviewer.city or "", "image": media_url(request, reviewer.profile_image.name if reviewer.profile_image else "")},
        "reply": _reply(r), "report": report_data(mine) if mine else None,
        "status": r.status, "hidden_reason": r.hidden_reason,
    }


# ----------------------------------------------------------------- public pages
def public_data(r, request):
    reviewer = reviewer_of(r)
    return {
        "id": r.public_id, "kind": kind_of(r), "rating": r.rating, "title": getattr(r, "title", ""), "body": r.body,
        "name": first_name_initial(reviewer.full_name), "image": media_url(request, reviewer.profile_image.name if reviewer.profile_image else ""),
        "date": r.created_at, "verified": True, "aspects": aspects_of(r), "photos": photos_of(r, request),
        "product": target_of(r, request), "reply": _reply(r),
    }


# ------------------------------------------------------------------------ admin
def admin_data(r, request):
    reviewer = reviewer_of(r)
    t, seller = services.seller_account(r.order)
    return {
        "id": r.public_id, "kind": kind_of(r), "rating": r.rating, "title": getattr(r, "title", ""), "body": r.body,
        "recommend": getattr(r, "recommend", None), "aspects": aspects_of(r), "tags": getattr(r, "tags", []) if kind_of(r) == "seller" else [],
        "photos": photos_of(r, request), "created_at": r.created_at, "edited_at": r.edited_at,
        "order_id": r.order.public_id, "product": target_of(r, request),
        "reviewer": {"type": r.reviewer_type, "id": reviewer.public_id, "name": reviewer.full_name, "email": reviewer.email},
        "seller": {"type": t or "platform", "id": seller.public_id if seller else "", "name": seller.full_name if seller else "ReOrbit"},
        "reply": _reply(r), "status": r.status, "hidden_reason": r.hidden_reason, "hidden_at": r.hidden_at,
        "hidden_by": r.hidden_by.full_name if r.hidden_by_id else "",
        "reports": [report_data(x) for x in r.reports.all()],
        "pending_reports": sum(x.status == "Pending" for x in r.reports.all()),
    }
