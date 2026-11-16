"""Complaints as the admin screens read them (same field names the UI already uses)."""

from apps.donations.serializers import media_url
from apps.listings.models import Item
from apps.reviews import services as review_services

from . import services
from .models import Complaint, ComplaintWarning

SELECT = (
    "assignee", "resolved_by", "logged_by", "reporter_user", "reporter_remaker",
    "target_user__profile", "target_remaker__profile",
    "target_item__user__profile", "target_item__category",
    "target_remaker_product__remaker__profile", "target_remaker_product__category",
    "target_admin_item__category", "target_admin_item__admin",
    "target_product_review__order__seller_user__profile", "target_product_review__order__seller_remaker__profile",
    "target_product_review__order_item", "target_product_review__reviewer_user", "target_product_review__reviewer_remaker",
    "target_seller_review__order__seller_user__profile", "target_seller_review__order__seller_remaker__profile",
    "target_seller_review__reviewer_user", "target_seller_review__reviewer_remaker",
)
PREFETCH = ("events", "notes", "target_item__images", "target_remaker_product__images", "target_admin_item__images")


def queryset():
    return Complaint.objects.select_related(*SELECT).prefetch_related(*PREFETCH)


def _image(request, profile):
    name = profile.profile_image.name if profile and getattr(profile, "profile_image", None) else ""
    return media_url(request, name) if name else None


def _cover(request, row):
    imgs = sorted(row.images.all(), key=lambda i: (i.display_order, i.pk))
    return media_url(request, imgs[0].image.name) if imgs else None


def _person(request, acct, kind):
    prof = getattr(acct, "profile", None)
    return {
        "id": acct.public_id, "name": acct.full_name, "role": "ReMaker" if kind == "remaker" else "User",
        "path": f"/admin-{'remakers' if kind == 'remaker' else 'users'}/{acct.public_id}",
        "image": _image(request, prof), "status": acct.status,
    }


def _owner(request, row):
    if isinstance(row, Item):
        return _person(request, row.user, "user")
    if hasattr(row, "remaker"):
        return _person(request, row.remaker, "remaker")
    return {"id": row.admin.public_id, "name": "ReOrbit", "role": "Admin", "path": "/admin-sell",
            "image": None, "status": "Staff"}  # ReOrbit's own store: nobody to suspend


def target_data(c, request):
    row = services.target_row(c)
    pid = row.public_id
    base = {"key": f"{c.target_type}:{pid}", "type": c.target_type, "id": pid}
    if c.target_type == "User":
        p = getattr(row, "profile", None)
        return {**base, "name": row.full_name, "image": _image(request, p), "path": f"/admin-users/{pid}",
                "sub": f"{getattr(p, 'city', '') or ''} · User".strip(" ·"), "status": row.status,
                "email": row.email, "since": row.created_at, "city": getattr(p, "city", "") or "", "live": True}
    if c.target_type == "ReMaker":
        p = getattr(row, "profile", None)
        return {**base, "name": row.full_name, "image": _image(request, p), "path": f"/admin-remakers/{pid}",
                "sub": f"{getattr(p, 'city', '') or ''} · @{row.username}".strip(" ·"), "status": row.status,
                "email": row.email, "since": row.created_at, "city": getattr(p, "city", "") or "",
                "rating": float(getattr(p, "rating_average", 0) or 0), "live": True}
    if c.target_type == "Product":
        owner = _owner(request, row)
        live = services.is_live(row)
        kind = "item" if isinstance(row, Item) else "remaker" if hasattr(row, "remaker") else "admin"
        pending = isinstance(row, Item) and row.item_status == Item.Status.DRAFT
        return {**base, "name": row.title, "image": _cover(request, row), "path": f"/admin-products/{pid}",
                "sub": f"{owner['name']} · {owner['role']}", "live": live,
                "status": "Live" if live else "Pending review" if pending else "Not live",
                "price": float(getattr(row, "listing_price", None) or getattr(row, "price", 0) or 0),
                "category": row.category.name,
                "product": {"type": kind, "title": row.title, "image": _cover(request, row)},
                "canRemove": services.can_remove(row), "owner": owner}
    # a review: the owner is the seller who received it
    order = row.order
    t, seller = review_services.seller_account(order)
    reviewer = services.reviewer_of(row)
    product = getattr(getattr(row, "order_item", None), "title", "") if pid.startswith("PRV-") else ""
    owner = _person(request, seller, t) if seller is not None else \
        {"id": "", "name": "ReOrbit", "role": "Admin", "path": "/admin-complaints", "image": None, "status": "Staff"}
    hidden = row.status != row.Status.VISIBLE
    return {**base, "name": f"{reviewer.full_name}’s review", "image": None, "path": owner["path"],
            "sub": f"On {product or owner['name']} · {row.rating}★", "status": "Removed" if hidden else "Visible",
            "live": not hidden, "rating": row.rating, "text": row.body, "reviewer": reviewer.full_name,
            "onProduct": product or owner["name"], "at": row.created_at, "owner": owner}


def complaint_data(c, request, warnings):
    resolution = None
    if c.resolution_action or c.status in ("Resolved", "Dismissed"):
        resolution = {"action": c.resolution_action, "note": c.resolution_note,
                      "by": c.resolved_by.full_name if c.resolved_by else "Admin team", "at": c.resolved_at}
    return {
        "id": c.public_id, "type": c.target_type, "targetId": services.target_row(c).public_id,
        "category": c.category, "description": c.description, "status": c.status, "source": c.source,
        "reporter": {"name": c.reporter_name, "role": c.reporter_role},
        "createdAt": c.created_at,
        "assigneeId": c.assignee.public_id if c.assignee else None,
        "resolution": resolution,
        "events": [{"id": f"e{e.pk}", "label": e.label, "detail": e.detail, "tone": e.tone, "at": e.created_at}
                   for e in c.events.all()],
        "notes": [{"id": f"n{n.pk}", "text": n.text, "by": n.author_name, "at": n.created_at} for n in c.notes.all()],
        "target": target_data(c, request),
        "warnings": warnings,
    }


def warnings_by_target():
    """{target key: [{at, message, complaintId, by}]} so one person's or listing's history shows on every complaint."""
    out = {}
    qs = ComplaintWarning.objects.select_related(
        "complaint", "complaint__target_user", "complaint__target_remaker", "complaint__target_item",
        "complaint__target_remaker_product", "complaint__target_admin_item",
        "complaint__target_product_review", "complaint__target_seller_review")
    for w in qs:
        row = services.target_row(w.complaint)
        key = f"{w.complaint.target_type}:{row.public_id}"
        out.setdefault(key, []).append(
            {"at": w.created_at, "message": w.message, "complaintId": w.complaint.public_id, "by": w.sent_by_name})
    return out
