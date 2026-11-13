"""Rewards: earning rules, a points ledger, a catalogue of offers and the vouchers members hold.

* RewardRule   what an action is worth in Orbit Points (edited in Admin > Rewards).
* PointsEntry  the ledger. Every change to a member's points is one signed row; the balance is their sum.
* RewardOffer  something admins publish: spend points for a voucher ("points") or a public coupon code ("code").
* Voucher      a one-time discount a member holds: from a donation, from spending points, or a used coupon.
"""

from django.db import models

from apps.core.ids import PublicIdModel
from apps.core.models import TimeStampedModel


class RewardRule(models.Model):
    key = models.CharField(max_length=20, unique=True)
    group = models.CharField(max_length=20)
    title = models.CharField(max_length=80)
    description = models.CharField(max_length=200)
    points = models.PositiveIntegerField(default=0)
    unit = models.CharField(max_length=30)
    active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        db_table = "reward_rules"
        ordering = ["pk"]

    def __str__(self):
        return f"{self.key} {self.points}"


class RewardOffer(PublicIdModel, TimeStampedModel):
    public_id_prefix = "RWD"

    code = models.CharField(max_length=16, unique=True)
    title = models.CharField(max_length=120)
    description = models.CharField(max_length=255, blank=True)
    kind = models.CharField(max_length=6)  # points | code
    discount_type = models.CharField(max_length=7, default="fixed")  # fixed | percent
    value = models.PositiveIntegerField()  # rupees, or a percentage
    min_order = models.PositiveIntegerField(default=0)
    max_discount = models.PositiveIntegerField(default=0)  # cap in rupees (0 = no cap)
    points_cost = models.PositiveIntegerField(default=0)
    usage_limit = models.PositiveIntegerField(default=1)  # how many times it can be claimed in all
    per_user = models.PositiveSmallIntegerField(default=1)
    audience = models.CharField(max_length=6, default="all")  # all | new | donors
    min_level = models.PositiveSmallIntegerField(default=0)  # 0 Seedling ... 4 Champion
    remaker_only = models.BooleanField(default=False)
    valid_from = models.DateField()
    valid_to = models.DateField()
    draft = models.BooleanField(default=False)
    paused = models.BooleanField(default=False)

    class Meta:
        db_table = "reward_offers"
        ordering = ["-created_at", "-pk"]

    def __str__(self):
        return f"{self.code} {self.title}"


class Voucher(PublicIdModel, TimeStampedModel):
    """A one-time discount a member holds. ReOrbit carries the cost: the seller is still paid in full."""

    public_id_prefix = "VCH"

    class Status(models.TextChoices):
        ACTIVE = "Active", "Ready to use"
        USED = "Used", "Used"
        EXPIRED = "Expired", "Expired"
        VOID = "Void", "Cancelled"

    owner = models.ForeignKey("users.Users", on_delete=models.CASCADE, related_name="vouchers")
    code = models.CharField(max_length=16, unique=True)
    amount = models.PositiveIntegerField()  # rupees off; for a percentage voucher, the most it can take off
    min_order = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.ACTIVE)
    title = models.CharField(max_length=120, blank=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    # What earned it: "donation" + DON-1005, "points" + a redemption id, or "code" for a used public coupon.
    source_type = models.CharField(max_length=20, blank=True)
    source_id = models.CharField(max_length=24, blank=True)
    offer = models.ForeignKey(RewardOffer, null=True, blank=True, on_delete=models.SET_NULL, related_name="vouchers")
    discount_type = models.CharField(max_length=7, default="fixed")
    percent = models.PositiveSmallIntegerField(default=0)
    max_discount = models.PositiveIntegerField(default=0)
    points_spent = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "vouchers"
        ordering = ["-created_at", "-pk"]
        indexes = [models.Index(fields=["owner", "status"], name="vch_owner_status_idx")]
        constraints = [
            models.UniqueConstraint(
                fields=["source_type", "source_id"],
                condition=~models.Q(source_id=""),
                name="vch_one_per_source",
            )
        ]

    def __str__(self):
        return f"{self.code} ₹{self.amount}"


class PointsEntry(models.Model):
    """One change to a member's Orbit Points. Positive earns, negative spends or takes back."""

    user = models.ForeignKey("users.Users", on_delete=models.CASCADE, related_name="points")
    kind = models.CharField(max_length=12)  # purchase firstOrder donation listing review follow referral spend adjust revoke reversal
    points = models.IntegerField()
    title = models.CharField(max_length=120)
    detail = models.CharField(max_length=200, blank=True)
    ref_type = models.CharField(max_length=12)
    ref_id = models.CharField(max_length=24)
    admin = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "points_entries"
        ordering = ["-created_at", "-pk"]
        indexes = [models.Index(fields=["user", "-created_at"], name="pts_user_created_idx")]
        constraints = [models.UniqueConstraint(fields=["user", "kind", "ref_type", "ref_id"], name="pts_one_per_ref")]

    def __str__(self):
        return f"{self.user_id} {self.kind} {self.points:+d}"
