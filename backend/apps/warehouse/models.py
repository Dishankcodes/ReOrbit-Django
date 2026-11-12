from django.db import models

from apps.core.ids import PublicIdModel
from apps.core.models import TimeStampedModel


class WarehouseItem(PublicIdModel, TimeStampedModel):
    """A donated item that has reached the ReOrbit warehouse (made when admin marks it received)."""

    public_id_prefix = "WHI"

    class Status(models.TextChoices):
        IN_STOCK = "In_Stock", "In the warehouse"
        GIVEN_OUT = "Given_Out", "Given to a partner"

    donation = models.OneToOneField(
        "donations.Donation", null=True, blank=True, on_delete=models.SET_NULL, related_name="warehouse_item"
    )
    title = models.CharField(max_length=120)
    category = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(default=1)
    condition = models.CharField(max_length=10, blank=True)
    weight_kg = models.DecimalField(max_digits=7, decimal_places=1, default=0)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.IN_STOCK)
    location = models.CharField(max_length=80, default="Main warehouse")
    given_to = models.CharField(max_length=120, blank=True)
    received_at = models.DateTimeField()
    given_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "warehouse_items"
        ordering = ["-received_at", "-pk"]
        indexes = [models.Index(fields=["status", "-received_at"], name="wh_status_recv_idx")]

    def __str__(self):
        return f"{self.public_id} {self.title}"
