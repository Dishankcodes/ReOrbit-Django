from django.db import models
from django.db.models.functions import Lower

from apps.core.ids import PublicIdModel
from apps.core.models import SellableBase
from apps.core.validators import validate_image, validate_phone, validate_pincode


class ReMakers(PublicIdModel):
    public_id_prefix = "RMK"

    class AuthProvider(models.TextChoices):
        EMAIL = "email", "Email"
        GOOGLE = "google", "Google"

    class Status(models.TextChoices):
        ACTIVE = "Active", "Active"
        SUSPENDED = "Suspended", "Suspended"
        BLOCKED = "Blocked", "Blocked"
        DELETED = "Deleted", "Deleted"

    remaker_id = models.BigAutoField(primary_key=True)
    username = models.CharField(max_length=100, unique=True)
    full_name = models.CharField(max_length=150)
    email = models.EmailField(max_length=255, unique=True)
    # ReMakers sign in with an emailed code, so there is no password column.
    google_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    auth_provider = models.CharField(
        max_length=20, choices=AuthProvider.choices, default=AuthProvider.EMAIL
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    status_reason = models.TextField(blank=True)
    status_changed_by = models.ForeignKey(
        "admins.Admins",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    status_changed_at = models.DateTimeField(null=True, blank=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    # the last time the app was used while signed in (stamped at most every 2 minutes): "Online now"
    last_seen_at = models.DateTimeField(null=True, blank=True)
    # sign-ins from before this moment stop working (password changed or reset, "sign out everywhere")
    tokens_valid_after = models.DateTimeField(null=True, blank=True)
    # set when the person deletes their own account: they can sign in within 30 days to undo it
    deletion_requested_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "remakers"
        constraints = [
            models.UniqueConstraint(Lower("email"), name="remakers_email_lower_uniq"),
            models.UniqueConstraint(
                Lower("username"), name="remakers_username_lower_uniq"
            ),
        ]

    def __str__(self):
        return f"{self.public_id or self.remaker_id} {self.username}"

    def save(self, *args, **kwargs):
        self.email = (self.email or "").strip().lower()
        super().save(*args, **kwargs)


class ReMaker_Profile(models.Model):
    remaker_profile_id = models.BigAutoField(primary_key=True)
    remaker = models.OneToOneField(
        ReMakers,
        on_delete=models.CASCADE,
        related_name="profile",
        db_column="remaker_id",
    )
    profile_image = models.ImageField(
        upload_to="remakers/profile/",
        null=True,
        blank=True,
        validators=[validate_image],
    )
    cover_image = models.ImageField(
        upload_to="remakers/cover/",
        null=True,
        blank=True,
        validators=[validate_image],
    )
    studio_name = models.CharField(max_length=120, blank=True)
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    pincode = models.CharField(
        max_length=10, null=True, blank=True, validators=[validate_pincode]
    )
    phone = models.CharField(
        max_length=20, null=True, blank=True, validators=[validate_phone]
    )
    bio = models.TextField(null=True, blank=True)
    skills = models.TextField(null=True, blank=True)
    speciality = models.CharField(max_length=150, blank=True)
    experience = models.CharField(max_length=100, null=True, blank=True)
    certification = models.TextField(null=True, blank=True)
    social_links = models.JSONField(default=dict, blank=True)
    # Settings › Notifications topics and Settings › Privacy switches ({key: bool}); missing = on
    notification_preferences = models.JSONField(default=dict, blank=True)
    privacy_preferences = models.JSONField(default=dict, blank=True)
    # Cached counters: set by the server only, never by the browser.
    environmental_impact = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    total_uploads = models.PositiveIntegerField(default=0)
    total_sales = models.PositiveIntegerField(default=0)
    total_purchases = models.PositiveIntegerField(default=0)
    rating_average = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    rating_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "remaker_profile"


class RemakerProduct(SellableBase):
    """A finished product a ReMaker sells (design: ReMaker_Products)."""

    class Pickup(models.TextChoices):
        SELLER_HANDOVER = "Seller_Handover", "Seller hands over to courier"
        PLATFORM_PICKUP = "Platform_Pickup", "Managed by ReOrbit"

    class Condition(models.TextChoices):
        UPCYCLED = "Upcycled", "Upcycled"
        REFURBISHED = "Refurbished", "Refurbished"
        BRAND_NEW = "Brand new", "Brand new"

    # original price, shown struck through with "% off". A product on sale doesn't take coupons
    # or points vouchers (donation vouchers still apply)
    mrp = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    public_id_prefix = "RPR"
    # what kind of piece it is (the marketplace's condition filter): made from rescued material,
    # an old piece restored, or made new by hand
    condition = models.CharField(max_length=20, choices=Condition.choices, default=Condition.UPCYCLED)
    pickup_preference = models.CharField(
        max_length=20, choices=Pickup.choices, default=Pickup.SELLER_HANDOVER
    )
    # What the buyer pays for delivery when ReOrbit manages it. The ReMaker sets it per product.
    delivery_fee = models.PositiveIntegerField(null=True, blank=True)

    remaker = models.ForeignKey(
        ReMakers, on_delete=models.PROTECT, related_name="products"
    )
    # Provenance only: the ReOrbit item this was made from (NULL = made from scratch).
    source_item = models.ForeignKey(
        "listings.Item",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="remaker_products",
    )
    materials = models.TextField(blank=True)
    dimensions = models.CharField(max_length=150, blank=True)
    customization_available = models.BooleanField(default=False)
    deactivated_by = models.ForeignKey(
        "admins.Admins",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    deactivation_reason = models.TextField(blank=True)
    deactivated_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "remaker_products"
        ordering = ["-created_at", "-pk"]
        indexes = [
            models.Index(fields=["status", "created_at"], name="rprod_status_created_idx"),
            models.Index(fields=["remaker", "status"], name="rprod_remaker_status_idx"),
            models.Index(fields=["category"], name="rprod_category_idx"),
        ]

    def __str__(self):
        return f"{self.public_id} {self.title}"
