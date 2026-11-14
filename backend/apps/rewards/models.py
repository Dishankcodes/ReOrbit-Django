"""Donation vouchers.

A donor earns one voucher when ReOrbit receives their item at the warehouse (see
apps/donations). The voucher is the member's own: it can be spent once, on one checkout, and
only by its owner. ReOrbit pays for the discount, so sellers are always paid in full.
"""

from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.core.ids import PublicIdModel
from apps.core.models import TimeStampedModel


class Voucher(PublicIdModel, TimeStampedModel):
    public_id_prefix = "DVC"

    class Status(models.TextChoices):
        ACTIVE = "Active", "Active"
        USED = "Used", "Used"
        EXPIRED = "Expired", "Expired"
        VOID = "Void", "Cancelled"

    offer = models.ForeignKey(
        "rewards.RewardOffer", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="vouchers",
    )

    owner = models.ForeignKey("users.Users", on_delete=models.CASCADE, related_name="vouchers")
    code = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=120)
    amount = models.PositiveIntegerField(help_text="Rupees taken off the order")
    discount_type = models.CharField(max_length=7, default="fixed")
    percent = models.PositiveSmallIntegerField(default=0)
    max_discount = models.PositiveIntegerField(default=0)
    points_spent = models.PositiveIntegerField(default=0)
    min_order = models.PositiveIntegerField(default=0, help_text="Smallest goods total (rupees) the voucher works on")
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.ACTIVE)
    used_at = models.DateTimeField(null=True, blank=True)
    used_checkout = models.CharField(
        max_length=24, blank=True, help_text="public_id of the Payment that spent it. Cleared if that checkout is given up"
    )
    # What earned it, kept as text so this app never depends on the app that issued it.
    source_type = models.CharField(max_length=20)
    source_id = models.CharField(max_length=24)

    class Meta:
        db_table = "vouchers"
        ordering = ["-created_at", "-pk"]
        indexes = [models.Index(fields=["owner", "status"], name="voucher_owner_status_idx")]
        constraints = [
            models.UniqueConstraint(fields=["source_type", "source_id"], name="voucher_one_per_source"),
            models.CheckConstraint(condition=Q(amount__gt=0), name="voucher_amount_gt_0"),
        ]

    @property
    def is_expired(self):
        return self.expires_at <= timezone.now()

    @property
    def effective_status(self):
        """Active, Used or Expired. Expiry is worked out from the date, so nothing has to run to flip it."""
        if self.status == self.Status.USED:
            return "Used"
        return "Expired" if self.is_expired else "Active"

    def __str__(self):
        return f"{self.code} {self.effective_status}"


class RewardRule(models.Model):
    key = models.CharField(max_length=20, unique=True)
    group = models.CharField(max_length=20)
    title = models.CharField(max_length=80)
    description = models.CharField(max_length=200)
    points = models.PositiveIntegerField(default=0)
    unit = models.CharField(max_length=30)
    active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        "admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        db_table = "reward_rules"
        ordering = ["pk"]


class RewardOffer(PublicIdModel, TimeStampedModel):
    public_id_prefix = "RWD"
    code = models.CharField(max_length=16, unique=True)
    title = models.CharField(max_length=120)
    description = models.CharField(max_length=255, blank=True)
    kind = models.CharField(max_length=6)
    discount_type = models.CharField(max_length=7, default="fixed")
    value = models.PositiveIntegerField()
    min_order = models.PositiveIntegerField(default=0)
    max_discount = models.PositiveIntegerField(default=0)
    points_cost = models.PositiveIntegerField(default=0)
    usage_limit = models.PositiveIntegerField(default=1)
    per_user = models.PositiveSmallIntegerField(default=1)
    audience = models.CharField(max_length=6, default="all")
    min_level = models.PositiveSmallIntegerField(default=0)
    remaker_only = models.BooleanField(default=False)
    valid_from = models.DateField()
    valid_to = models.DateField()
    draft = models.BooleanField(default=False)
    paused = models.BooleanField(default=False)

    class Meta:
        db_table = "reward_offers"
        ordering = ["-created_at", "-pk"]


class PointsEntry(models.Model):
    kind = models.CharField(max_length=12)
    points = models.IntegerField()
    title = models.CharField(max_length=120)
    detail = models.CharField(max_length=200, blank=True)
    ref_type = models.CharField(max_length=12)
    ref_id = models.CharField(max_length=24)
    created_at = models.DateTimeField(auto_now_add=True)
    admin = models.ForeignKey(
        "admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    user = models.ForeignKey("users.Users", on_delete=models.CASCADE, related_name="points")

    class Meta:
        db_table = "points_entries"
        ordering = ["-created_at", "-pk"]
        indexes = [models.Index(fields=["user", "-created_at"], name="pts_user_created_idx")]
        constraints = [
            models.UniqueConstraint(fields=["user", "kind", "ref_type", "ref_id"], name="pts_one_per_ref")
        ]
