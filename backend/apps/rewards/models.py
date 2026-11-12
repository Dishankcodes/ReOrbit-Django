from django.db import models

from apps.core.models import TimeStampedModel
from apps.core.ids import PublicIdModel


class Voucher(PublicIdModel, TimeStampedModel):
    """A one-time marketplace voucher a member earns when ReOrbit receives a donation.

    It is worth `amount` rupees off the goods in one marketplace checkout, once the cart
    reaches `min_order`. ReOrbit carries the discount: the seller is still paid in full.
    """

    public_id_prefix = "VCH"

    class Status(models.TextChoices):
        ACTIVE = "Active", "Ready to use"
        USED = "Used", "Used"
        EXPIRED = "Expired", "Expired"

    owner = models.ForeignKey("users.Users", on_delete=models.CASCADE, related_name="vouchers")
    code = models.CharField(max_length=16, unique=True)
    amount = models.PositiveIntegerField()
    min_order = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.ACTIVE)
    title = models.CharField(max_length=120, blank=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    # What earned it. Plain text id (DON-1005) so this app does not depend on donations.
    source_type = models.CharField(max_length=20, blank=True)
    source_id = models.CharField(max_length=24, blank=True)

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
