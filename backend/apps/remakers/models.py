from django.db import models
from django.db.models.functions import Lower

from apps.core.ids import PublicIdModel
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
