"""Writing, editing and listing reviews. Views stay thin; every rule lives here."""

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from django.db.models import Avg, Count

from apps.core import buyers
from apps.core.events import emit, review_posted
from apps.core.images import delete_file, process_image
from apps.core.services import notify
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


def seller_account(order):
    """(type, account) of whoever sold the order, or (None, None) for ReOrbit's own store."""
    if order.seller_type in ("user", "remaker"):
        acct = getattr(order, f"seller_{order.seller_type}", None)
        if acct is not None:
            return order.seller_type, acct
    return None, None


def find_review(public_id):
    """A review by its public id (PRV-… product review, SRV-… seller review)."""
    pid = str(public_id or "")
    model = ProductReview if pid.startswith("PRV-") else SellerReview if pid.startswith("SRV-") else None
    if model is None:
        return None
    return model.objects.select_for_update().filter(public_id=pid).first()


def order_of(review):
    return review.order


def refresh_rating(order):
    """Recount a ReMaker's rating: the average of every visible product and seller review they have received.

    (Members who sell have no stored rating; the public pages work theirs out from the reviews.)
    """
    t, acct = seller_account(order)
    if t != "remaker":
        return
    visible = ProductReview.Status.VISIBLE
    p = ProductReview.objects.filter(order__seller_remaker=acct, status=visible).aggregate(n=Count("pk"), a=Avg("rating"))
    s = SellerReview.objects.filter(seller_remaker=acct, status=visible).aggregate(n=Count("pk"), a=Avg("rating"))
    n = (p["n"] or 0) + (s["n"] or 0)
    total = (p["a"] or 0) * (p["n"] or 0) + (s["a"] or 0) * (s["n"] or 0)
    type(acct).objects.filter(pk=acct.pk).update(rating_average=round(total / n, 2) if n else 0, rating_count=n)


def _announce_new(review, order, what, title_text):
    """Tell the seller, and raise the cross-domain event. Called only when a review is first written."""
    t, acct = seller_account(order)
    if acct is not None:
        stars = "★" * review.rating
        if t == "remaker":
            url = "/remaker-reviews"
        else:
            url = "/user-sell"
        notify(acct, f"New {review.rating}-star review", f"{stars} {what}{title_text}.",
               module="reviews", target_url=url, ref_type="review", ref_id=review.public_id)
    reviewer = getattr(review, f"reviewer_{review.reviewer_type}")
    emit(review_posted, type(review), review_public_id=review.public_id, reviewer_ref=reviewer.public_id,
         seller_ref=acct.public_id if acct is not None else "")


def _delivered_order(account, order_id):
    o = (Order.objects.select_related("seller_user", "seller_remaker")
         .filter(public_id=order_id, buyer_key=buyers.key_of(account)).first())
    if o is None:
        raise ReviewError("We couldn't find that order.", status=404)
    if o.status != Order.Status.DELIVERED:
        raise ReviewError("You can review an order once it is delivered.", code="not_delivered")
    return o


def _check_hidden(review):
    if review.status == review.Status.HIDDEN:
        raise ReviewError("ReOrbit has hidden this review, so it can't be edited.", status=409, code="review_hidden")


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
        _check_hidden(review)
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

    is_new = review is None
    if is_new:
        review = ProductReview.objects.create(order=order, order_item=line, **base, **fields)
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
    refresh_rating(order)
    if is_new:
        _announce_new(review, order, f"on “{line.title}”", f": {review.title}" if review.title else "")
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
        _check_hidden(review)
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
        review = SellerReview.objects.create(order=order, **seller, **base, **fields)
        refresh_rating(order)
        _announce_new(review, order, f"on order {order.public_id}", "")
        return review
    for k, v in fields.items():
        setattr(review, k, v)
    review.edited_at = timezone.now()
    review.save()
    refresh_rating(order)
    return review


def _my_received(account, review_id):
    """A review that `account` received as the seller (product or seller review), locked for update."""
    t = buyers.type_of(account)
    review = find_review(review_id) if t in ("user", "remaker") else None
    order = review.order if review else None
    if review is None or seller_account(order) != (t, account):
        raise ReviewError("We couldn't find that review.", status=404)
    return review


def _notify_reviewer(review, title, body):
    reviewer = getattr(review, f"reviewer_{review.reviewer_type}")
    url = "/remaker-my-reviews" if review.reviewer_type == "remaker" else "/user-reviews"
    notify(reviewer, title, body, module="reviews", target_url=url, ref_type="review", ref_id=review.public_id)


@transaction.atomic
def reply_to_review(account, review_id, text):
    """The member or ReMaker who sold the order answers the review. They can edit or remove the answer."""
    review = _my_received(account, review_id)
    if review.status == review.Status.HIDDEN:
        raise ReviewError("This review is hidden, so it can't be answered.", status=409, code="review_hidden")
    text = " ".join(str(text or "").split())
    if len(text) < 10:
        raise ReviewError("Please fix the highlighted fields.", errors={"reply": ["Write at least 10 characters."]})
    if len(text) > 500:
        raise ReviewError("Please fix the highlighted fields.", errors={"reply": ["Keep this under 500 characters."]})
    first = not review.reply
    review.reply, review.replied_at, review.reply_edited = text, review.replied_at if not first else timezone.now(), not first
    review.save(update_fields=["reply", "replied_at", "reply_edited", "updated_at"])
    if first:
        _notify_reviewer(review, "The seller replied to your review", f"“{text[:120]}{'…' if len(text) > 120 else ''}”")
    return review


@transaction.atomic
def delete_reply(account, review_id):
    review = _my_received(account, review_id)
    review.reply, review.replied_at, review.reply_edited = "", None, False
    review.save(update_fields=["reply", "replied_at", "reply_edited", "updated_at"])
    return review


# kept for the old name
reply_to_seller_review = reply_to_review
