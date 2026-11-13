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


class Follow(TimeStampedModel):
    """A member, ReMaker, or admin follows a ReMaker account."""
    follower_type = models.CharField(max_length=8, choices=WishlistEntry.Actor.choices)
    user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.CASCADE, related_name="remaker_follows")
    remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.CASCADE, related_name="follows_received")
    admin = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.CASCADE, related_name="remaker_follows")
    target = models.ForeignKey("remakers.ReMakers", on_delete=models.CASCADE, related_name="followers")

    class Meta:
        db_table = "social_follows"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(condition=(
                Q(follower_type="user", user__isnull=False, remaker__isnull=True, admin__isnull=True)
                | Q(follower_type="remaker", remaker__isnull=False, user__isnull=True, admin__isnull=True)
                | Q(follower_type="admin", admin__isnull=False, user__isnull=True, remaker__isnull=True)
            ), name="follow_exactly_one_owner"),
            models.CheckConstraint(condition=~Q(follower_type="remaker", remaker=models.F("target")), name="follow_no_self"),
            models.UniqueConstraint(fields=["user", "target"], condition=Q(user__isnull=False), name="follow_unique_user_target"),
            models.UniqueConstraint(fields=["remaker", "target"], condition=Q(remaker__isnull=False), name="follow_unique_remaker_target"),
            models.UniqueConstraint(fields=["admin", "target"], condition=Q(admin__isnull=False), name="follow_unique_admin_target"),
        ]


class Cart(TimeStampedModel):
    """One persistent cart per signed-in account; lines contain IDs and quantities only."""
    actor_type = models.CharField(max_length=8, choices=WishlistEntry.Actor.choices)
    user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.CASCADE, related_name="carts")
    remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.CASCADE, related_name="carts")
    admin = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.CASCADE, related_name="carts")

    class Meta:
        db_table = "shopping_carts"
        constraints = [models.CheckConstraint(condition=(
            Q(actor_type="user", user__isnull=False, remaker__isnull=True, admin__isnull=True)
            | Q(actor_type="remaker", remaker__isnull=False, user__isnull=True, admin__isnull=True)
            | Q(actor_type="admin", admin__isnull=False, user__isnull=True, remaker__isnull=True)
        ), name="cart_exactly_one_owner"),
            models.UniqueConstraint(fields=["user"], condition=Q(user__isnull=False), name="cart_one_per_user"),
            models.UniqueConstraint(fields=["remaker"], condition=Q(remaker__isnull=False), name="cart_one_per_remaker"),
            models.UniqueConstraint(fields=["admin"], condition=Q(admin__isnull=False), name="cart_one_per_admin")]


class CartLine(TimeStampedModel):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="lines")
    item_ref = models.CharField(max_length=24)
    quantity = models.PositiveSmallIntegerField()

    class Meta:
        db_table = "shopping_cart_lines"
        constraints = [models.UniqueConstraint(fields=["cart", "item_ref"], name="cart_line_unique_item"), models.CheckConstraint(condition=Q(quantity__gte=1, quantity__lte=99), name="cart_line_quantity_range")]
