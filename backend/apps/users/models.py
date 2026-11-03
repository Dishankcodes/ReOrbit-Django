from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.db.models.functions import Lower

from apps.core.ids import PublicIdModel
from apps.core.validators import validate_image, validate_phone, validate_pincode


class Users(PublicIdModel):
    public_id_prefix = "USR"

    class AuthProvider(models.TextChoices):
        EMAIL = "email", "Email"
        GOOGLE = "google", "Google"

    class Status(models.TextChoices):
        ACTIVE = "Active", "Active"
        SUSPENDED = "Suspended", "Suspended"
        BLOCKED = "Blocked", "Blocked"
        DELETED = "Deleted", "Deleted"

    user_id = models.BigAutoField(primary_key=True)
    full_name = models.CharField(max_length=150)
    # Stored lower-case (see save). A Lower(email) unique index backs this up.
    email = models.EmailField(max_length=255, unique=True)
    # Empty for Google sign-in accounts.
    password = models.CharField(max_length=255, null=True, blank=True)
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
        db_table = "users"
        constraints = [
            models.UniqueConstraint(Lower("email"), name="users_email_lower_uniq"),
        ]

    def __str__(self):
        return f"{self.public_id or self.user_id} {self.email}"

    def save(self, *args, **kwargs):
        self.email = (self.email or "").strip().lower()
        super().save(*args, **kwargs)

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        if not self.password:
            return False
        return check_password(raw_password, self.password)


class User_Profile(models.Model):
    profile_id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(
        Users, on_delete=models.CASCADE, related_name="profile", db_column="user_id"
    )
    profile_image = models.ImageField(
        upload_to="users/profile/", null=True, blank=True, validators=[validate_image]
    )
    bio = models.CharField(max_length=250, blank=True)
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    phone = models.CharField(
        max_length=20, null=True, blank=True, validators=[validate_phone]
    )
    pincode = models.CharField(
        max_length=10, null=True, blank=True, validators=[validate_pincode]
    )
    notification_preferences = models.JSONField(default=dict, blank=True)
    privacy_preferences = models.JSONField(default=dict, blank=True)
    # Cached counters. They are set by the server only (Domain A and B services),
    # never by the browser. The history tables are the source of truth.
    environmental_impact = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    total_uploads = models.PositiveIntegerField(default=0)
    total_sales = models.PositiveIntegerField(default=0)
    total_purchases = models.PositiveIntegerField(default=0)
    orbit_points = models.IntegerField(default=0)

    class Meta:
        db_table = "user_profile"
