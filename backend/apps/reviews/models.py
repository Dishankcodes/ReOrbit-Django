"""Reviews written by buyers (a member or a ReMaker) once an order is delivered.

* ProductReview: one per delivered order line.
* SellerReview:  one per order, only when a member or ReMaker sold it (never for ReOrbit's own store).
"""

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

from apps.core.ids import PublicIdModel
from apps.core.models import TimeStampedModel

STARS = [MinValueValidator(1), MaxValueValidator(5)]


def stars(**kw):
    return models.PositiveSmallIntegerField(validators=STARS, **kw)


class _Review(PublicIdModel, TimeStampedModel):
    class Status(models.TextChoices):
        VISIBLE = "Visible", "Visible"
        HIDDEN = "Hidden", "Hidden"

    reviewer_type = models.CharField(max_length=8)  # user | remaker
    reviewer_key = models.CharField(max_length=24, db_index=True)  # "user:5"
    reviewer_user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    reviewer_remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    rating = stars()
    body = models.CharField(max_length=1000, blank=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    # The seller's answer. Both kinds of review can be answered once (and the answer edited or removed).
    reply = models.CharField(max_length=500, blank=True)
    replied_at = models.DateTimeField(null=True, blank=True)
    reply_edited = models.BooleanField(default=False)
    # Moderation: a hidden review is removed from public pages and from the rating.
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.VISIBLE, db_index=True)
    hidden_reason = models.CharField(max_length=300, blank=True)
    hidden_at = models.DateTimeField(null=True, blank=True)
    hidden_by = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        abstract = True


class ProductReview(_Review):
    public_id_prefix = "PRV"

    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE, related_name="product_reviews")
    order_item = models.OneToOneField("orders.OrderItem", on_delete=models.CASCADE, related_name="review")
    title = models.CharField(max_length=80, blank=True)
    quality = stars(null=True, blank=True)
    as_described = stars(null=True, blank=True)
    value = stars(null=True, blank=True)
    packaging = stars(null=True, blank=True)
    recommend = models.BooleanField(default=True)

    class Meta:
        db_table = "product_reviews"
        ordering = ["-created_at", "-pk"]
        constraints = [
            models.CheckConstraint(condition=Q(rating__gte=1, rating__lte=5), name="prodrev_rating_1_5"),
            models.CheckConstraint(
                condition=(
                    Q(reviewer_type="user", reviewer_user__isnull=False, reviewer_remaker__isnull=True)
                    | Q(reviewer_type="remaker", reviewer_remaker__isnull=False, reviewer_user__isnull=True)
                ),
                name="prodrev_one_reviewer",
            ),
        ]


class ProductReviewPhoto(models.Model):
    review = models.ForeignKey(ProductReview, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to="reviews/")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "product_review_photos"
        ordering = ["pk"]


class SellerReview(_Review):
    public_id_prefix = "SRV"

    order = models.OneToOneField("orders.Order", on_delete=models.CASCADE, related_name="seller_review")
    seller_type = models.CharField(max_length=8)  # user | remaker
    seller_user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.CASCADE, related_name="seller_reviews")
    seller_remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.CASCADE, related_name="seller_reviews")
    communication = stars(null=True, blank=True)
    packing = stars(null=True, blank=True)
    dispatch = stars(null=True, blank=True)
    as_promised = stars(null=True, blank=True)
    tags = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "seller_reviews"
        ordering = ["-created_at", "-pk"]
        constraints = [
            models.CheckConstraint(condition=Q(rating__gte=1, rating__lte=5), name="sellrev_rating_1_5"),
            models.CheckConstraint(
                condition=(
                    Q(reviewer_type="user", reviewer_user__isnull=False, reviewer_remaker__isnull=True)
                    | Q(reviewer_type="remaker", reviewer_remaker__isnull=False, reviewer_user__isnull=True)
                ),
                name="sellrev_one_reviewer",
            ),
            models.CheckConstraint(
                condition=(
                    Q(seller_type="user", seller_user__isnull=False, seller_remaker__isnull=True)
                    | Q(seller_type="remaker", seller_remaker__isnull=False, seller_user__isnull=True)
                ),
                name="sellrev_one_seller",
            ),
        ]


class ReviewReport(PublicIdModel, TimeStampedModel):
    """A member or ReMaker asks ReOrbit to look at a review (usually the seller who got it)."""

    public_id_prefix = "RRP"

    class Status(models.TextChoices):
        PENDING = "Pending", "Pending"
        UPHELD = "Upheld", "Upheld"  # the review was hidden
        DISMISSED = "Dismissed", "Dismissed"  # the review stays

    product_review = models.ForeignKey(ProductReview, null=True, blank=True, on_delete=models.CASCADE, related_name="reports")
    seller_review = models.ForeignKey(SellerReview, null=True, blank=True, on_delete=models.CASCADE, related_name="reports")
    reporter_type = models.CharField(max_length=8)  # user | remaker
    reporter_key = models.CharField(max_length=24, db_index=True)  # "user:5"
    reporter_user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    reporter_remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    reason = models.CharField(max_length=60)
    note = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)
    resolved_by = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_note = models.CharField(max_length=300, blank=True)

    class Meta:
        db_table = "review_reports"
        ordering = ["-created_at", "-pk"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(product_review__isnull=False, seller_review__isnull=True)
                    | Q(product_review__isnull=True, seller_review__isnull=False)
                ),
                name="revreport_one_review",
            ),
            models.CheckConstraint(
                condition=(
                    Q(reporter_type="user", reporter_user__isnull=False, reporter_remaker__isnull=True)
                    | Q(reporter_type="remaker", reporter_remaker__isnull=False, reporter_user__isnull=True)
                ),
                name="revreport_one_reporter",
            ),
            models.UniqueConstraint(
                fields=["reporter_key", "product_review"], condition=Q(product_review__isnull=False),
                name="revreport_once_per_product_review",
            ),
            models.UniqueConstraint(
                fields=["reporter_key", "seller_review"], condition=Q(seller_review__isnull=False),
                name="revreport_once_per_seller_review",
            ),
        ]
