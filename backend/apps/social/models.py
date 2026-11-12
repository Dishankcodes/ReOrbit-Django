"""Social features shared by all three kinds of account.

Wishlist: ONE table for members, ReMakers and admins. `actor_type` says whose row
it is, and exactly one of the three account columns is filled (the database
checks it). The saved thing is held by its public id (LST-.., RPR-.., ADI-..)
because it can live in any of three product tables.
"""

from django.db import models
from django.db.models import Q

from apps.core.models import TimeStampedModel


class WishlistEntry(TimeStampedModel):
    class Actor(models.TextChoices):
        USER = "user", "Member"
        REMAKER = "remaker", "ReMaker"
        ADMIN = "admin", "Admin"

    actor_type = models.CharField(max_length=8, choices=Actor.choices)
    user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.CASCADE, related_name="wishlist_entries")
    remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.CASCADE, related_name="wishlist_entries")
    admin = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.CASCADE, related_name="wishlist_entries")
    item_kind = models.CharField(max_length=8)  # user | remaker | admin: who sells it
    item_ref = models.CharField(max_length=24)  # LST-.. | RPR-.. | ADI-..

    class Meta:
        db_table = "wishlist_entries"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(actor_type="user", user__isnull=False, remaker__isnull=True, admin__isnull=True)
                    | Q(actor_type="remaker", remaker__isnull=False, user__isnull=True, admin__isnull=True)
                    | Q(actor_type="admin", admin__isnull=False, user__isnull=True, remaker__isnull=True)
                ),
                name="wishlist_exactly_one_owner",
            ),
            models.UniqueConstraint(fields=["user", "item_ref"], condition=Q(user__isnull=False), name="wishlist_unique_user_item"),
            models.UniqueConstraint(fields=["remaker", "item_ref"], condition=Q(remaker__isnull=False), name="wishlist_unique_remaker_item"),
            models.UniqueConstraint(fields=["admin", "item_ref"], condition=Q(admin__isnull=False), name="wishlist_unique_admin_item"),
        ]
