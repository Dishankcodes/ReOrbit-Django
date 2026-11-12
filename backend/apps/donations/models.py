from django.db import models

from apps.core.ids import PublicIdModel
from apps.core.models import TimeStampedModel


class Donation(PublicIdModel, TimeStampedModel):
    """An item a member gives to ReOrbit. Pickup is always free.

    Pending -> Scheduled -> Picked_Up -> Received -> Completed
    A pending donation can be Rejected (and reopened); a member can Cancel until pickup.
    Received is the moment the item is in the warehouse: the member's reward is issued then.
    """

    public_id_prefix = "DON"

    class Status(models.TextChoices):
        PENDING = "Pending", "Under review"
        SCHEDULED = "Scheduled", "Pickup scheduled"
        PICKED_UP = "Picked_Up", "Picked up"
        RECEIVED = "Received", "Received at the warehouse"
        COMPLETED = "Completed", "Completed"
        REJECTED = "Rejected", "Not accepted"
        CANCELLED = "Cancelled", "Cancelled"

    class Condition(models.TextChoices):
        GOOD = "Good", "Good"
        MEDIUM = "Medium", "Medium"
        WORST = "Worst", "Needs repair"

    user = models.ForeignKey("users.Users", on_delete=models.PROTECT, related_name="donations")
    title = models.CharField(max_length=120)
    category = models.CharField(max_length=100)
    description = models.TextField(max_length=1000)
    condition = models.CharField(max_length=10, choices=Condition.choices)
    quantity = models.PositiveSmallIntegerField(default=1)
    weight_kg = models.DecimalField(max_digits=7, decimal_places=1, default=0)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)

    # Where and when. The address is copied so editing the address book never changes history.
    address = models.JSONField(default=dict)
    contact_name = models.CharField(max_length=120)
    contact_phone = models.CharField(max_length=20)
    note = models.CharField(max_length=200, blank=True)
    pickup_date = models.DateField(null=True, blank=True)
    pickup_slot = models.CharField(max_length=30, blank=True)
    reschedule_count = models.PositiveSmallIntegerField(default=0)
    partner = models.CharField(max_length=80, blank=True)  # pickup team (and lead) chosen by ReOrbit
    handover_code = models.CharField(max_length=4, blank=True)

    reject_reason = models.CharField(max_length=255, blank=True)
    cancel_reason = models.CharField(max_length=255, blank=True)
    ngo = models.CharField(max_length=120, blank=True)
    certificate_id = models.CharField(max_length=24, blank=True)

    reviewed_by = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    picked_up_at = models.DateTimeField(null=True, blank=True)
    received_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Reward, written once when the item is received.
    points_awarded = models.PositiveIntegerField(default=0)
    voucher_code = models.CharField(max_length=16, blank=True)
    voucher_amount = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "donations"
        ordering = ["-created_at", "-pk"]
        indexes = [
            models.Index(fields=["user", "-created_at"], name="don_user_created_idx"),
            models.Index(fields=["status", "-created_at"], name="don_status_created_idx"),
        ]

    def __str__(self):
        return f"{self.public_id} {self.title}"


class DonationPhoto(models.Model):
    donation = models.ForeignKey(Donation, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to="donations/")
    display_order = models.SmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "donation_photos"
        ordering = ["display_order", "pk"]


class DonationEvent(models.Model):
    class Tone(models.TextChoices):
        NEUTRAL = "neutral", "neutral"
        GOOD = "good", "good"
        BAD = "bad", "bad"
        WAIT = "wait", "wait"
        INFO = "info", "info"

    donation = models.ForeignKey(Donation, on_delete=models.CASCADE, related_name="events")
    label = models.CharField(max_length=120)
    detail = models.CharField(max_length=255, blank=True)
    tone = models.CharField(max_length=8, choices=Tone.choices, default=Tone.NEUTRAL)
    actor = models.CharField(max_length=8, default="system")  # user | admin | system
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "donation_events"
        ordering = ["created_at", "pk"]
