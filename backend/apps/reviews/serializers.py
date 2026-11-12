from apps.orders.serializers import media_url, seller_of

from . import services


def product_review_data(r, request):
    return {
        "id": r.public_id, "rating": r.rating, "title": r.title, "body": r.body, "recommend": r.recommend,
        "quality": r.quality, "as_described": r.as_described, "value": r.value, "packaging": r.packaging,
        "photos": [{"id": p.pk, "url": media_url(request, p.image.name)} for p in r.photos.all()],
        "created_at": r.created_at, "edited_at": r.edited_at, "edit_until": services.edit_until(r),
    }


def seller_review_data(r):
    return {
        "id": r.public_id, "rating": r.rating, "body": r.body, "tags": r.tags,
        "communication": r.communication, "packing": r.packing, "dispatch": r.dispatch, "as_promised": r.as_promised,
        "reply": r.reply, "replied_at": r.replied_at,
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
