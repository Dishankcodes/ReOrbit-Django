"""Donations. A member gives an item away; ReOrbit collects it free of charge.

  Pending -> Scheduled -> Picked_Up -> Received -> Completed
                  \\-> Failed_Pickup -/        (collection didn't happen; reschedule instead of rejecting)
  (or Rejected by ReOrbit at Pending/Scheduled, or Cancelled by the donor)

The pickup is confirmed by the assigned PickupPartner entering the donor's handover code
(verification, not a rubber stamp). At Received, warehouse staff record what actually arrived
(quantity, condition) against what the donor declared, and the donor's reward is based on what
was actually collected. At Completed, we record when the donation was handed on and how much of it, and a
certificate PDF is generated for the donor. Who it went to is free text, same as before.
"""

from django.db import models
from django.db.models import Q

from apps.core.ids import PublicIdModel
from apps.core.models import TimeStampedModel


class PickupPartner(PublicIdModel, TimeStampedModel):
    """A pickup team. Carries its own access token, since drivers have no ReOrbit account."""

    public_id_prefix = "PTR"

    class Status(models.TextChoices):
        ACTIVE = "Active", "Active"
        INACTIVE = "Inactive", "Inactive"

    name = models.CharField(max_length=60, unique=True, help_text="Team label, e.g. 'Pickup team A'")
    lead_name = models.CharField(max_length=120, blank=True, help_text="The lead's own name, shown to the donor")
    phone = models.CharField(max_length=20, blank=True)
    token = models.CharField(max_length=40, unique=True, editable=False)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        db_table = "pickup_partners"
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.token:
            import secrets
            self.token = secrets.token_urlsafe(24)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Donation(PublicIdModel, TimeStampedModel):
    public_id_prefix = "DON"

    class Status(models.TextChoices):
        PENDING = "Pending", "Under review"
        SCHEDULED = "Scheduled", "Pickup scheduled"
        FAILED_PICKUP = "Failed_Pickup", "Pickup attempt failed"
        PICKED_UP = "Picked_Up", "Picked up"
        RECEIVED = "Received", "Received"
        COMPLETED = "Completed", "Completed"
        REJECTED = "Rejected", "Not accepted"
        CANCELLED = "Cancelled", "Cancelled"

    class Condition(models.TextChoices):
        GOOD = "Good", "Good"
        MEDIUM = "Medium", "Medium"
        WORST = "Worst", "Needs repair"

    donor = models.ForeignKey("users.Users", on_delete=models.PROTECT, related_name="donations")
    title = models.CharField(max_length=100)
    category = models.CharField(max_length=100, help_text="Category name at the time of donating")
    description = models.TextField(max_length=1000)
    condition = models.CharField(max_length=10, choices=Condition.choices)
    quantity = models.PositiveSmallIntegerField(default=1)
    weight_kg = models.DecimalField(max_digits=7, decimal_places=1, default=0)
    status = models.CharField(max_length=14, choices=Status.choices, default=Status.PENDING)

    # the pickup
    pickup_date = models.DateField(null=True, blank=True)
    pickup_slot = models.CharField(max_length=30, blank=True)
    pickup_address = models.JSONField(help_text="Copy of the donor's address at donation time")
    contact_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20)
    note = models.CharField(max_length=200, blank=True)
    assigned_partner = models.ForeignKey(
        PickupPartner, null=True, blank=True, on_delete=models.SET_NULL, related_name="pickups")
    handover_code = models.CharField(max_length=4, blank=True)
    reschedule_count = models.PositiveSmallIntegerField(default=0)
    failed_pickup_count = models.PositiveSmallIntegerField(default=0)

    # what admin actually agreed to collect (partial acceptance). Defaults to the full quantity.
    accepted_quantity = models.PositiveSmallIntegerField(null=True, blank=True)
    partial_reject_reason = models.CharField(max_length=255, blank=True)

    # warehouse check-in, against what the donor declared and what was accepted
    received_quantity = models.PositiveSmallIntegerField(null=True, blank=True)
    received_condition = models.CharField(max_length=10, choices=Condition.choices, blank=True)
    received_note = models.CharField(max_length=255, blank=True)

    # how it ended
    reject_reason = models.CharField(max_length=255, blank=True)
    cancel_reason = models.CharField(max_length=255, blank=True)
    ngo = models.CharField(max_length=100, blank=True, help_text="Who it was handed on to (free text)")
    distributed_quantity = models.PositiveSmallIntegerField(null=True, blank=True)
    distributed_at = models.DateTimeField(null=True, blank=True)
    certificate_id = models.CharField(max_length=24, blank=True)
    certificate_file = models.FileField(upload_to="certificates/", null=True, blank=True)
    received_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # what the donor earned when it was received
    reward_points = models.PositiveIntegerField(default=0)
    reward_voucher = models.OneToOneField(
        "rewards.Voucher", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        db_table = "donations"
        ordering = ["-created_at", "-pk"]
        indexes = [
            models.Index(fields=["donor", "-created_at"], name="don_donor_created_idx"),
            models.Index(fields=["status", "created_at"], name="don_status_created_idx"),
            models.Index(fields=["assigned_partner", "status"], name="don_partner_status_idx"),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gte=1), name="donation_quantity_gte_1"),
        ]

    @property
    def effective_quantity(self):
        """What the donor is actually credited for: received > accepted > declared, first one set."""
        for q in (self.received_quantity, self.accepted_quantity, self.quantity):
            if q is not None:
                return q
        return self.quantity

    @property
    def quantity_mismatch(self):
        base = self.accepted_quantity if self.accepted_quantity is not None else self.quantity
        return self.received_quantity is not None and self.received_quantity != base

    @property
    def condition_mismatch(self):
        return bool(self.received_condition) and self.received_condition != self.condition

    def __str__(self):
        return f"{self.public_id} {self.status}"


class DonationImage(models.Model):
    donation = models.ForeignKey(Donation, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="donations/")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "donation_images"
        ordering = ["pk"]


class DonationEvent(models.Model):
    """One line of the donation's history. Shown to the donor and to admins."""

    class Tone(models.TextChoices):
        GOOD = "good", "Good"
        INFO = "info", "Info"
        WAIT = "wait", "Waiting"
        BAD = "bad", "Bad"
        NEUTRAL = "neutral", "Neutral"

    donation = models.ForeignKey(Donation, on_delete=models.CASCADE, related_name="events")
    label = models.CharField(max_length=60)
    detail = models.CharField(max_length=255, blank=True)
    tone = models.CharField(max_length=8, choices=Tone.choices, default=Tone.NEUTRAL)
    actor = models.CharField(max_length=10, blank=True)  # donor | admin | partner | system
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "donation_events"
        ordering = ["created_at", "pk"]
        indexes = [models.Index(fields=["donation", "created_at"], name="don_event_idx")]
