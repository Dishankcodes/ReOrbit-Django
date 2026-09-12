from django.db import models


class ReMakers(models.Model):
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
        db_table = "remakers"


class ReMaker_Profile(models.Model):
    remaker_profile_id = models.BigAutoField(primary_key=True)
    remaker = models.OneToOneField(
        ReMakers,
        on_delete=models.CASCADE,
        related_name="profile",
        db_column="remaker_id",
    )
    profile_image = models.ImageField(
        upload_to="remakers/profile/", null=True, blank=True
    )
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    pincode = models.CharField(max_length=10, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)

    bio = models.TextField(null=True, blank=True)
    skills = models.TextField(null=True, blank=True)
    experience = models.CharField(max_length=100, null=True, blank=True)

    certification = models.TextField(null=True, blank=True)

    environmental_impact = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    total_uploads = models.PositiveIntegerField(default=0)
    total_sales = models.PositiveIntegerField(default=0)
    total_purchases = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "remaker_profile"
