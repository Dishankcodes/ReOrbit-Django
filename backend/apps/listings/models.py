"""User listings (the design's Items table) and their pictures (Media_Images).

A listing keeps the same row for its whole life. Lifecycle (item_status) and
moderation (moderation_status) are separate: disabling a listing hides it but
never erases whether it was sold, withdrawn or sent to the warehouse.
"""

from django.db import models
from django.db.models import Q

from apps.core.ids import PublicIdModel
from apps.core.models import TimeStampedModel
from apps.core.validators import validate_image


class Item(PublicIdModel, TimeStampedModel):
    public_id_prefix = "LST"

    class Condition(models.TextChoices):
        EXCELLENT = "Excellent", "Excellent"
        VERY_GOOD = "Very Good", "Very Good"
        GOOD = "Good", "Good"
        FAIR = "Fair", "Fair"

    class Pickup(models.TextChoices):
        SELLER_HANDOVER = "Seller_Handover", "Seller hands over"
        PLATFORM_PICKUP = "Platform_Pickup", "Platform pickup"

    class Status(models.TextChoices):
        DRAFT = "Draft", "Draft"
        LISTED = "Listed", "Listed"
        RESERVED = "Reserved", "Reserved"
        SOLD = "Sold", "Sold"
        DONATED = "Donated", "Donated"
        WITHDRAWN = "Withdrawn", "Withdrawn"
        WAREHOUSE = "Warehouse", "Warehouse"

    class Moderation(models.TextChoices):
        NORMAL = "Normal", "Normal"
        FLAGGED = "Flagged", "Flagged"
        DISABLED = "Disabled", "Disabled"

    user = models.ForeignKey(
        "users.Users", on_delete=models.PROTECT, related_name="items"
    )
    category = models.ForeignKey(
        "core.Category", on_delete=models.PROTECT, related_name="items"
    )
    title = models.CharField(max_length=150)
    description = models.TextField()
    condition = models.CharField(max_length=12, choices=Condition.choices)
    quantity = models.PositiveIntegerField(default=1)
    estimated_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    listing_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    pickup_preference = models.CharField(max_length=20, choices=Pickup.choices)
    item_status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.DRAFT
    )
    moderation_status = models.CharField(
        max_length=10, choices=Moderation.choices, default=Moderation.NORMAL
    )
    moderation_note = models.TextField(blank=True)
    moderated_by = models.ForeignKey(
        "admins.Admins",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    moderated_at = models.DateTimeField(null=True, blank=True)
    city = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "items"
        ordering = ["-created_at", "-pk"]
        indexes = [
            models.Index(fields=["item_status", "moderation_status"], name="items_status_mod_idx"),
            models.Index(fields=["user", "item_status"], name="items_user_status_idx"),
            models.Index(fields=["category"], name="items_category_idx"),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gte=0), name="item_quantity_gte_0"),
        ]

    def __str__(self):
        return f"{self.public_id} {self.title}"

    @property
    def is_public(self):
        return (
            self.item_status == self.Status.LISTED
            and self.moderation_status != self.Moderation.DISABLED
            and self.deleted_at is None
        )


class MediaImage(models.Model):
    """Pictures. The design keeps one table for every parent; only listings use
    it so far. Later domains add their own nullable parent FK here."""

    class Kind(models.TextChoices):
        COVER = "Cover", "Cover"
        GALLERY = "Gallery", "Gallery"

    # Exactly one parent is set (see the check constraint below).
    item = models.ForeignKey(
        Item, on_delete=models.CASCADE, related_name="images", null=True, blank=True
    )
    remaker_product = models.ForeignKey(
        "remakers.RemakerProduct", on_delete=models.CASCADE, related_name="images", null=True, blank=True
    )
    admin_item = models.ForeignKey(
        "admins.AdminItem", on_delete=models.CASCADE, related_name="images", null=True, blank=True
    )
    image = models.ImageField(upload_to="listings/", validators=[validate_image])
    image_type = models.CharField(max_length=30, choices=Kind.choices, default=Kind.GALLERY)
    display_order = models.SmallIntegerField(default=0)
    uploaded_by_user = models.ForeignKey(
        "users.Users", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "media_images"
        ordering = ["display_order", "pk"]
        indexes = [
            models.Index(fields=["item", "display_order"], name="media_item_order_idx"),
            models.Index(fields=["remaker_product", "display_order"], name="media_rprod_order_idx"),
            models.Index(fields=["admin_item", "display_order"], name="media_aitem_order_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(item__isnull=False, remaker_product__isnull=True, admin_item__isnull=True)
                    | Q(item__isnull=True, remaker_product__isnull=False, admin_item__isnull=True)
                    | Q(item__isnull=True, remaker_product__isnull=True, admin_item__isnull=False)
                ),
                name="media_exactly_one_parent",
            )
        ]
