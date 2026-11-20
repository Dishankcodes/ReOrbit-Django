"""Pickups. Two kinds, both free for the customer:

  - donation pickups live on the Donation itself (apps.donations), the way they always have;
  - item pickups: a listing set to "Managed by ReOrbit" gets one PickupRequest when it goes live;
  - order pickups: a sold "Managed by ReOrbit" order, once the seller (member or ReMaker) packed it and asked
    ReOrbit to collect it. Picked up = the order is on its way; completed = delivered to the buyer.

  Requested -> Scheduled -> Picked_Up -> Completed      (or Cancelled; a cancelled one can be reopened)

A pickup team is a donations.PickupPartner (that row also carries the driver's access token and is what
a donation's assigned_partner points to). Here we add the people on the crew. The partner's lead_name and
phone always follow the current Lead, because that is what donors and customers are shown.
"""

from django.db import models
from django.db.models import Q

from apps.core.ids import PublicIdModel
from apps.core.models import TimeStampedModel


class PickupTeamMember(TimeStampedModel):
    class Role(models.TextChoices):
        LEAD = "Lead", "Lead"
        DRIVER = "Driver", "Driver"
        HELPER = "Helper", "Helper"

    class Status(models.TextChoices):
        ACTIVE = "Active", "Active"
        ON_LEAVE = "On leave", "On leave"

    team = models.ForeignKey("donations.PickupPartner", on_delete=models.CASCADE, related_name="members")
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.HELPER)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        db_table = "pickup_team_members"
        ordering = ["pk"]
        constraints = [
            # one Lead per team: making someone else Lead demotes the old one first
            models.UniqueConstraint(fields=["team"], condition=Q(role="Lead"), name="one_lead_per_pickup_team"),
        ]

    def __str__(self):
        return f"{self.name} ({self.role})"


class PickupRequest(PublicIdModel, TimeStampedModel):
    """A platform-managed pickup: of a listed item (`item`) or of a sold order to deliver (`order`)."""

    public_id_prefix = "PKR"

    class Status(models.TextChoices):
        REQUESTED = "Requested", "Requested"
        SCHEDULED = "Scheduled", "Scheduled"
        PICKED_UP = "Picked_Up", "Picked up"
        COMPLETED = "Completed", "Completed"
        CANCELLED = "Cancelled", "Cancelled"

    item = models.OneToOneField("listings.Item", null=True, blank=True, on_delete=models.PROTECT,
                                related_name="pickup_request")
    order = models.OneToOneField("orders.Order", null=True, blank=True, on_delete=models.PROTECT,
                                 related_name="delivery_pickup")
    # who hands the parcel over: a member, or (order pickups only) a ReMaker
    user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.PROTECT, related_name="item_pickups")
    remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.PROTECT,
                                related_name="order_pickups")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.REQUESTED)
    pickup_date = models.DateField(null=True, blank=True)
    pickup_slot = models.CharField(max_length=30, blank=True)
    assigned_partner = models.ForeignKey(
        "donations.PickupPartner", null=True, blank=True, on_delete=models.SET_NULL, related_name="item_pickups")
    # copy of the seller's address when the request was made, so later profile edits don't move old pickups
    address_snapshot = models.JSONField(default=dict)
    cancel_reason = models.CharField(max_length=255, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    # 4 digits the seller shows the pickup team (apps.core.handover); made when the pickup is scheduled
    handover_code = models.CharField(max_length=4, blank=True)
    handover_tries = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "pickup_requests"
        ordering = ["-created_at", "-pk"]
        indexes = [
            models.Index(fields=["status", "pickup_date"], name="pkreq_status_date_idx"),
            models.Index(fields=["assigned_partner", "status"], name="pkreq_partner_status_idx"),
        ]

    def __str__(self):
        return f"{self.public_id} {self.status}"

    @property
    def seller(self):
        return self.user or self.remaker


class PickupEvent(models.Model):
    class Tone(models.TextChoices):
        GOOD = "good", "Good"
        INFO = "info", "Info"
        WAIT = "wait", "Waiting"
        BAD = "bad", "Bad"
        NEUTRAL = "neutral", "Neutral"

    request = models.ForeignKey(PickupRequest, on_delete=models.CASCADE, related_name="events")
    label = models.CharField(max_length=60)
    detail = models.CharField(max_length=255, blank=True)
    tone = models.CharField(max_length=8, choices=Tone.choices, default=Tone.NEUTRAL)
    actor = models.CharField(max_length=10, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pickup_events"
        ordering = ["created_at", "pk"]
