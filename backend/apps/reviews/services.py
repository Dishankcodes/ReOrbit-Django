"""Writing, editing and listing reviews. Views stay thin; every rule lives here."""

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.core import buyers
from apps.core.images import delete_file, process_image
from apps.core.validators import validate_image
from apps.orders.models import Order, OrderItem

from .models import ProductReview, ProductReviewPhoto, SellerReview

EDIT_DAYS = 30
MAX_PHOTOS = 3
SELLER_TAGS = ["Fast dispatch", "Friendly", "Good packing", "Helpful"]
PRODUCT_ASPECTS = ("quality", "as_described", "value", "packaging")
SELLER_ASPECTS = ("communication", "packing", "dispatch", "as_promised")


class ReviewError(Exception):
    def __init__(self, message, errors=None, status=400, code=None):
        super().__init__(message)
        self.message, self.errors, self.status, self.code = message, errors or {}, status, code


def _stars(data, key, errors, required=False):
    raw = data.get(key)
    if raw in (None, ""):
        if required:
            errors[key] = ["Choose a star rating."]
        return None
    try:
        n = int(raw)
    except (TypeError, ValueError):
        n = 0
    if not 1 <= n <= 5:
        errors[key] = ["Use 1 to 5 stars."]
        return None
    return n


def _text(data, key, limit, errors):
    v = " ".join(str(data.get(key) or "").split())
    if len(v) > limit:
        errors[key] = [f"Keep this under {limit} characters."]
    return v


def reviewer_fields(account):
    t = buyers.type_of(account)
    if t not in ("user", "remaker"):
        raise ReviewError("Only members and ReMakers can write reviews.", status=403)
    return {"reviewer_type": t, "reviewer_key": buyers.key_of(account), f"reviewer_{t}": account}


def can_review_seller(order):
    return order.seller_type in ("user", "remaker")


def edit_until(review):
    return review.created_at + timedelta(days=EDIT_DAYS)


def _delivered_order(account, order_id):
    o = (Order.objects.select_related("seller_user", "seller_remaker")
         .filter(public_id=order_id, buyer_key=buyers.key_of(account)).first())
    if o is None:
        raise ReviewError("We couldn't find that order.", status=404)
    if o.status != Order.Status.DELIVERED:
        raise ReviewError("You can review an order once it is delivered.", code="not_delivered")
    return o


def _check_edit_window(review):
    if timezone.now() > edit_until(review):
        raise ReviewError(f"Reviews can only be edited for {EDIT_DAYS} days.", code="edit_window_closed")


def _photos(review, files, remove_ids, errors):
    keep = list(review.photos.exclude(pk__in=remove_ids)) if review.pk else []
    if len(keep) + len(files) > MAX_PHOTOS:
        errors["photos"] = [f"You can add up to {MAX_PHOTOS} photos."]
        return
    for f in files:
        try:
            validate_image(f)
        except Exception as e:  # ValidationError
            errors["photos"] = [getattr(e, "messages", [str(e)])[0]]
            return


# --------------------------------------------------------------------- product
@transaction.atomic
def save_product_review(account, order_id, line_id, data, files=(), remove_photo_ids=()):
    base = reviewer_fields(account)
    order = _delivered_order(account, order_id)
    line = OrderItem.objects.filter(order=order, ref_id=line_id).first()
    if line is None:
        raise ReviewError("We couldn't find that item in the order.", status=404)
    review = ProductReview.objects.select_for_update().filter(order_item=line).first()
    if review:
        _check_edit_window(review)

    errors = {}
    fields = {"rating": _stars(data, "rating", errors, required=True),
              "title": _text(data, "title", 80, errors), "body": _text(data, "body", 1000, errors)}
    for k in PRODUCT_ASPECTS:
        fields[k] = _stars(data, k, errors)
    rec = data.get("recommend")
    fields["recommend"] = False if str(rec).lower() in ("false", "0", "no") else True
    remove = [int(x) for x in remove_photo_ids if str(x).isdigit()]
    _photos(review or ProductReview(), list(files), remove, errors)
    if errors:
        raise ReviewError("Please fix the highlighted fields.", errors=errors)

    if review is None:
        review = ProductReview.objects.create(order=order, order_item=line, **base, **fields)
        if base["reviewer_type"] == "user":
            from apps.rewards import services as rewards  # local import: rewards reads reviews lazily too

            rewards.on_review(account, review)  # Orbit Points for a new review (not for edits)
    else:
        for k, v in fields.items():
            setattr(review, k, v)
        review.edited_at = timezone.now()
        review.save()
        for p in review.photos.filter(pk__in=remove):
            delete_file(p.image)
            p.delete()
    for f in files:
        ProductReviewPhoto.objects.create(review=review, image=process_image(f, max_side=1600))
    return review


# ---------------------------------------------------------------------- seller
@transaction.atomic
def save_seller_review(account, order_id, data):
    base = reviewer_fields(account)
    order = _delivered_order(account, order_id)
    if not can_review_seller(order):
        raise ReviewError("This order was sold by ReOrbit, so there is no seller to review.", code="platform_seller")
    review = SellerReview.objects.select_for_update().filter(order=order).first()
    if review:
        _check_edit_window(review)

    errors = {}
    fields = {"rating": _stars(data, "rating", errors, required=True), "body": _text(data, "body", 1000, errors)}
    for k in SELLER_ASPECTS:
        fields[k] = _stars(data, k, errors)
    tags = data.getlist("tags") if hasattr(data, "getlist") else data.get("tags") or []
    if isinstance(tags, str):
        tags = [tags]
    tags = [t for t in tags if t in SELLER_TAGS]
    fields["tags"] = list(dict.fromkeys(tags))
    if errors:
        raise ReviewError("Please fix the highlighted fields.", errors=errors)

    if review is None:
        seller = {"seller_type": order.seller_type, f"seller_{order.seller_type}": getattr(order, f"seller_{order.seller_type}")}
        return SellerReview.objects.create(order=order, **seller, **base, **fields)
    for k, v in fields.items():
        setattr(review, k, v)
    review.edited_at = timezone.now()
    review.save()
    return review


@transaction.atomic
def reply_to_seller_review(account, review_id, text):
    """The member or ReMaker who sold the order answers the review once (they can edit the answer)."""
    t = buyers.type_of(account)
    review = SellerReview.objects.select_for_update().filter(public_id=review_id, seller_type=t, **{f"seller_{t}": account}).first() if t in ("user", "remaker") else None
    if review is None:
        raise ReviewError("We couldn't find that review.", status=404)
    text = " ".join(str(text or "").split())
    if not text:
        raise ReviewError("Write a reply.", errors={"reply": ["Write a reply."]})
    if len(text) > 500:
        raise ReviewError("Please fix the highlighted fields.", errors={"reply": ["Keep this under 500 characters."]})
    review.reply, review.replied_at = text, timezone.now()
    review.save(update_fields=["reply", "replied_at", "updated_at"])
    return review
