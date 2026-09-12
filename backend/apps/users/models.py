from django.db import models
from django.contrib.auth.hashers import make_password, check_password


class Users(models.Model):
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
    email = models.EmailField(max_length=255, unique=True)
    password = models.CharField(max_length=255)
    google_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    auth_provider = models.CharField(
        max_length=20, choices=AuthProvider.choices, default=AuthProvider.EMAIL
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "users"

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)


class User_Profile(models.Model):
    profile_id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(
        Users, on_delete=models.CASCADE, related_name="profile", db_column="user_id"
    )
    profile_image = models.ImageField(upload_to="users/profile/", null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    pincode = models.CharField(max_length=10, null=True, blank=True)
    environmental_impact = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    total_uploads = models.PositiveIntegerField(default=0)
    total_sales = models.PositiveIntegerField(default=0)
    total_purchases = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "user_profile"
