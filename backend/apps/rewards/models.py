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

    owner = models.ForeignKey("users.Users", on_delete=models.CASCADE, related_name="vouchers")
    code = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=120)
    amount = models.PositiveIntegerField(help_text="Rupees taken off the order")
    min_order = models.PositiveIntegerField(default=0, help_text="Smallest goods total (rupees) the voucher works on")
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
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
