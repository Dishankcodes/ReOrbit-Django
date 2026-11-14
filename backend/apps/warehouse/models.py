"""The ReOrbit warehouse: one row per lot of stock, from the dock to the courier.

Two states describe a lot:
  warehouse_status  Received -> Stored -> (Refurbishment -> Stored) -> Assigned -> Released
  sale_status       Not listed -> Listed -> Sold   (or Donated when it leaves as a donation)
Everything that happens to a lot is written to WarehouseEvent, the timeline the admin sees.
"""

from django.db import models
from django.utils import timezone

from apps.core.ids import PublicIdModel
from apps.core.models import TimeStampedModel

CATEGORY_CODE = {
    "furniture": "FUR", "home decor": "DEC", "kitchen": "KIT", "clothing": "CLO",
    "fashion": "FAS", "electronics": "ELE", "books": "BOK", "sports": "SPT",
}


class WarehouseItem(PublicIdModel, TimeStampedModel):
    public_id_prefix = "WHI"

    class Stage(models.TextChoices):
        RECEIVED = "Received", "At the dock"
        STORED = "Stored", "Stored on a shelf"
        ASSIGNED = "Assigned", "Sold, waiting to dispatch"
        REFURBISHMENT = "Refurbishment", "With a ReMaker"
        RELEASED = "Released", "Left the warehouse"

    class Sale(models.TextChoices):
        NOT_LISTED = "Not listed", "Not listed"
        LISTED = "Listed", "Listed"
        SOLD = "Sold", "Sold"
        DONATED = "Donated", "Donated"

    sku = models.CharField(max_length=40, unique=True, null=True, blank=True)
    donation = models.OneToOneField(
        "donations.Donation", null=True, blank=True, on_delete=models.SET_NULL, related_name="warehouse_item"
    )
    title = models.CharField(max_length=150)
    category = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(default=1)
    condition = models.CharField(max_length=20, blank=True)
    weight_kg = models.DecimalField(max_digits=7, decimal_places=1, default=0)

    # Who ReOrbit got it from (the names are copied so the history survives an account change)
    source_user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    source_remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    source_name = models.CharField(max_length=150, blank=True)
    source_sub = models.CharField(max_length=150, blank=True)
    source_city = models.CharField(max_length=100, blank=True)
    purchase_ref = models.CharField(max_length=40, blank=True)

    # Rupees, whole numbers
    cost_price = models.PositiveIntegerField(default=0)
    list_price = models.PositiveIntegerField(default=0)
    original_price = models.PositiveIntegerField(default=0)

    warehouse_status = models.CharField(max_length=14, choices=Stage.choices, default=Stage.RECEIVED)
    sale_status = models.CharField(max_length=10, choices=Sale.choices, default=Sale.NOT_LISTED)

    # Where it is: zone A-E on the racks, DOCK, or QC (refurbishment bay). Empty once it has left.
    zone = models.CharField(max_length=8, blank=True)
    rack = models.CharField(max_length=2, blank=True)
    level = models.PositiveSmallIntegerField(null=True, blank=True)

    received_at = models.DateTimeField(default=timezone.now)
    stored_at = models.DateTimeField(null=True, blank=True)
    listed_at = models.DateTimeField(null=True, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)

    price_cuts = models.PositiveSmallIntegerField(default=0)
    promoted_until = models.DateTimeField(null=True, blank=True)
    snoozed_until = models.DateTimeField(null=True, blank=True)

    # Refurbishment: which ReMaker has it and how far along they are
    refurb_remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    refurb_assigned_at = models.DateTimeField(null=True, blank=True)
    refurb_due_at = models.DateTimeField(null=True, blank=True)
    refurb_progress = models.CharField(max_length=12, blank=True)  # Assigned | In_Progress

    order = models.ForeignKey("orders.Order", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    given_to = models.CharField(max_length=255, blank=True)  # the NGO / drive when donated

    class Meta:
        db_table = "warehouse_items"
        ordering = ["-received_at", "-pk"]
        indexes = [
            models.Index(fields=["warehouse_status", "-received_at"], name="wh_stage_recv_idx"),
            models.Index(fields=["sale_status", "listed_at"], name="wh_sale_listed_idx"),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(quantity__gte=1), name="wh_quantity_gte_1"),
            models.CheckConstraint(
                condition=models.Q(warehouse_status="Released") | ~models.Q(zone=""),
                name="wh_location_until_released",
            ),
        ]

    def __str__(self):
        return f"{self.public_id} {self.title}"

    @property
    def bin(self):
        if not self.zone:
            return ""
        if self.zone in ("DOCK", "QC"):
            return f"{self.zone}-{self.rack}"
        return f"{self.zone}-{self.rack}-{self.level}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.sku:  # RO-FUR-1001, built from the id so it is unique and readable
            code = CATEGORY_CODE.get((self.category or "").strip().lower(), "GEN")
            number = "".join(ch for ch in (self.public_id or "") if ch.isdigit()) or str(self.pk)
            self.sku = f"RO-{code}-{number}"
            super().save(update_fields=["sku"])


class WarehouseEvent(models.Model):
    """One line of an item's history. Never edited."""

    item = models.ForeignKey(WarehouseItem, on_delete=models.CASCADE, related_name="events")
    label = models.CharField(max_length=80)
    detail = models.CharField(max_length=255, blank=True)
    tone = models.CharField(max_length=8, default="neutral")  # good | wait | neutral
    actor = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "warehouse_events"
        ordering = ["at", "pk"]
        indexes = [models.Index(fields=["item", "at"], name="wh_event_item_at_idx")]
