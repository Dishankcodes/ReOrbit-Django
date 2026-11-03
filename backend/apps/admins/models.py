from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.db.models.functions import Lower

from apps.core.ids import PublicIdModel

# The areas of the admin app. Each admin gets a level per area: none / view / edit.
ADMIN_MODULES = (
    "dashboard",
    "users",
    "remakers",
    "products",
    "orders",
    "shop",
    "sell",
    "donations",
    "pickups",
    "complaints",
    "support",
    "warehouse",
    "rewards",
    "notifications",
    "content",
    "earnings",
    "reports",
    "settings",
)
MODULE_LEVELS = {"none": 0, "view": 1, "edit": 2}


class Admins(PublicIdModel):
    public_id_prefix = "ADM"

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
    # {"orders": "edit", "users": "view", ...}. Missing area = "none".
    # A Super_Admin always has "edit" everywhere.
    modules = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_admins",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    activated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "admins"
        constraints = [
            models.UniqueConstraint(Lower("email"), name="admins_email_lower_uniq"),
        ]

    def __str__(self):
        return f"{self.public_id or self.admin_id} {self.email}"

    def save(self, *args, **kwargs):
        self.email = (self.email or "").strip().lower()
        super().save(*args, **kwargs)

    def set_password(self, raw):
        self.password = make_password(raw)

    def check_password(self, raw):
        return check_password(raw, self.password)

    # ---- module access -------------------------------------------------- #
    def module_level(self, module):
        if self.permission_level == self.PermissionLevel.SUPER_ADMIN:
            return "edit"
        level = (self.modules or {}).get(module, "none")
        return level if level in MODULE_LEVELS else "none"

    def has_module(self, module, level="view"):
        return MODULE_LEVELS[self.module_level(module)] >= MODULE_LEVELS[level]

    def effective_modules(self):
        return {m: self.module_level(m) for m in ADMIN_MODULES}
