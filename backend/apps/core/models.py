from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower

from .ids import PublicIdModel, PublicIdSequence  # noqa: F401  (PublicIdSequence registers the table)
from .validators import validate_phone, validate_pincode


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# --------------------------------------------------------------------------- #
# Category (managed by Admin, used by listings, products and donations)
# --------------------------------------------------------------------------- #
class Category(PublicIdModel, TimeStampedModel):
    public_id_prefix = "CAT"

    class AppliesTo(models.TextChoices):
        ITEM = "Item", "Item"
        PRODUCT = "Product", "Product"
        BOTH = "Both", "Both"

    class Status(models.TextChoices):
        ACTIVE = "Active", "Active"
        INACTIVE = "Inactive", "Inactive"

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=255, blank=True)
    applies_to = models.CharField(
        max_length=10, choices=AppliesTo.choices, default=AppliesTo.BOTH
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.ACTIVE
    )
    sort_order = models.SmallIntegerField(default=0)
    created_by = models.ForeignKey(
        "admins.Admins",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    class Meta:
        db_table = "categories"
        ordering = ["sort_order", "name"]
        verbose_name_plural = "categories"
        constraints = [
            models.UniqueConstraint(Lower("name"), name="uniq_category_name_ci"),
        ]

    def __str__(self):
        return self.name


# --------------------------------------------------------------------------- #
# Platform settings: exactly one row (pk = 1)
# --------------------------------------------------------------------------- #
class PlatformSettings(TimeStampedModel):
    platform_fee_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=3,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    item_delivery = models.PositiveIntegerField(default=149)
    product_delivery = models.PositiveIntegerField(default=79)
    free_delivery_from = models.PositiveIntegerField(default=1500)
    cod_enabled = models.BooleanField(default=True)
    cod_limit = models.PositiveIntegerField(default=20000)
    max_listings_per_day = models.PositiveIntegerField(default=5)
    support_email = models.EmailField(blank=True)
    updated_by = models.ForeignKey(
        "admins.Admins",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    class Meta:
        db_table = "platform_settings"
        verbose_name_plural = "platform settings"
        constraints = [
            models.CheckConstraint(
                condition=Q(pk=1), name="platform_settings_single_row"
            )
        ]

    def save(self, *args, **kwargs):
        self.pk = 1
        if self._state.adding:
            # A fresh object replacing the single row keeps the original created_at.
            existing = type(self).objects.filter(pk=1).values_list("created_at", flat=True).first()
            if existing:
                self.created_at = existing
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise models.ProtectedError("Platform settings cannot be deleted.", set())

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def as_public_dict(self):
        """The commerce rules the User and ReMaker apps read (camelCase for the frontend)."""
        return {
            "platformFeePct": float(self.platform_fee_pct),
            "itemDelivery": self.item_delivery,
            "productDelivery": self.product_delivery,
            "freeDeliveryFrom": self.free_delivery_from,
            "codEnabled": self.cod_enabled,
            "codLimit": self.cod_limit,
            "maxListingsPerDay": self.max_listings_per_day,
        }


# --------------------------------------------------------------------------- #
# Saved address (user or remaker). Orders and pickups store a snapshot copy.
# --------------------------------------------------------------------------- #
class SavedAddress(PublicIdModel, TimeStampedModel):
    public_id_prefix = "ADR"

    user = models.ForeignKey(
        "users.Users",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="saved_addresses",
    )
    remaker = models.ForeignKey(
        "remakers.ReMakers",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="saved_addresses",
    )
    label = models.CharField(max_length=30, default="Home")
    recipient_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20, validators=[validate_phone])
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    landmark = models.CharField(max_length=150, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=6, validators=[validate_pincode])
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = "saved_addresses"
        ordering = ["-is_default", "-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    (Q(user__isnull=False) & Q(remaker__isnull=True))
                    | (Q(user__isnull=True) & Q(remaker__isnull=False))
                ),
                name="saved_address_exactly_one_owner",
            ),
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(is_default=True, user__isnull=False),
                name="saved_address_one_default_per_user",
            ),
            models.UniqueConstraint(
                fields=["remaker"],
                condition=Q(is_default=True, remaker__isnull=False),
                name="saved_address_one_default_per_remaker",
            ),
        ]

    def snapshot(self):
        """Plain dict copied onto an order or pickup so later edits never change history."""
        return {
            "label": self.label,
            "recipient_name": self.recipient_name,
            "phone": self.phone,
            "address_line1": self.address_line1,
            "address_line2": self.address_line2,
            "landmark": self.landmark,
            "city": self.city,
            "state": self.state,
            "pincode": self.pincode,
        }


# --------------------------------------------------------------------------- #
# In-app notification inbox (one recipient: user OR remaker OR admin)
# --------------------------------------------------------------------------- #
class Notification(PublicIdModel):
    public_id_prefix = "NTF"

    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        CRITICAL = "critical", "Critical"

    user = models.ForeignKey(
        "users.Users",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    remaker = models.ForeignKey(
        "remakers.ReMakers",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    admin = models.ForeignKey(
        "admins.Admins",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=150)
    body = models.TextField()
    module = models.CharField(max_length=60, blank=True)
    target_url = models.CharField(max_length=500, blank=True)
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.INFO
    )
    # Cross-domain reference to the record that caused it (allowed: ref_type + ref_id).
    ref_type = models.CharField(max_length=40, blank=True)
    ref_id = models.CharField(max_length=40, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    dismissed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read", "-created_at"], name="ntf_user_idx"),
            models.Index(
                fields=["remaker", "is_read", "-created_at"], name="ntf_remaker_idx"
            ),
            models.Index(fields=["admin", "is_read", "-created_at"], name="ntf_admin_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    (Q(user__isnull=False) & Q(remaker__isnull=True) & Q(admin__isnull=True))
                    | (Q(user__isnull=True) & Q(remaker__isnull=False) & Q(admin__isnull=True))
                    | (Q(user__isnull=True) & Q(remaker__isnull=True) & Q(admin__isnull=False))
                ),
                name="notification_exactly_one_recipient",
            )
        ]


# --------------------------------------------------------------------------- #
# Audit log (who did what). A (ref_type, ref_id) pair is allowed here.
# --------------------------------------------------------------------------- #
class AuditLog(models.Model):
    class ActorType(models.TextChoices):
        USER = "user", "User"
        REMAKER = "remaker", "ReMaker"
        ADMIN = "admin", "Admin"
        SYSTEM = "system", "System"

    actor_type = models.CharField(max_length=10, choices=ActorType.choices)
    actor_public_id = models.CharField(max_length=24, blank=True)
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=80)
    entity_id = models.CharField(max_length=40)
    before_data = models.JSONField(null=True, blank=True)
    after_data = models.JSONField(null=True, blank=True)
    reason = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["entity_type", "entity_id"], name="audit_entity_idx"),
            models.Index(fields=["actor_type", "actor_public_id"], name="audit_actor_idx"),
        ]
