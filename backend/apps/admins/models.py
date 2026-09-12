from django.db import models
from django.contrib.auth.hashers import make_password, check_password


class Admins(models.Model):
    class PermissionLevel(models.TextChoices):
        ADMIN = "Admin", "Admin"
        SUPER_ADMIN = "Super_Admin", "Super Admin"

    class Status(models.TextChoices):
        ACTIVE = "Active", "Active"
        BLOCKED = "Blocked", "Blocked"

    admin_id = models.BigAutoField(primary_key=True)
    full_name = models.CharField(max_length=150)
    email = models.EmailField(max_length=255, unique=True)
    password = models.CharField(max_length=255)
    permission_level = models.CharField(
        max_length=20, choices=PermissionLevel.choices, default=PermissionLevel.ADMIN
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    activated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "admins"

    def set_password(self, raw):
        self.password = make_password(raw)

    def check_password(self, raw):
        return check_password(raw, self.password)
