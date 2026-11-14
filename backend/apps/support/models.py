from django.db import models
from django.db.models import Q

from apps.core.models import PublicIdModel, TimeStampedModel


class SupportTicket(PublicIdModel, TimeStampedModel):
    class Status(models.TextChoices):
        OPEN = "Open", "Open"
        IN_PROGRESS = "In progress", "In progress"
        WAITING = "Waiting for you", "Waiting for you"
        RESOLVED = "Resolved", "Resolved"
        CLOSED = "Closed", "Closed"

    class Priority(models.TextChoices):
        LOW = "Low", "Low"
        NORMAL = "Normal", "Normal"
        HIGH = "High", "High"
        URGENT = "Urgent", "Urgent"

    public_id_prefix = "TKT"
    user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.CASCADE, related_name="support_tickets")
    remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.CASCADE, related_name="support_tickets")
    subject = models.CharField(max_length=160)
    category = models.CharField(max_length=60)
    order_id = models.CharField(max_length=32, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    priority = models.CharField(max_length=8, choices=Priority.choices, default=Priority.NORMAL)
    assigned_to = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_tickets")
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "support_tickets"
        ordering = ["-updated_at", "-id"]
        constraints = [models.CheckConstraint(condition=(Q(user__isnull=False, remaker__isnull=True) | Q(user__isnull=True, remaker__isnull=False)), name="ticket_exactly_one_owner")]


class TicketMessage(TimeStampedModel):
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name="messages")
    sender_type = models.CharField(max_length=8, choices=[("user", "User"), ("remaker", "ReMaker"), ("admin", "Support"), ("system", "System")])
    user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.SET_NULL, related_name="ticket_messages")
    remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.SET_NULL, related_name="ticket_messages")
    admin = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="ticket_messages")
    text = models.TextField(blank=True)
    attachment_url = models.URLField(max_length=1000, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "support_ticket_messages"
        ordering = ["created_at", "id"]
        constraints = [models.CheckConstraint(condition=(
            Q(sender_type="user", user__isnull=False, remaker__isnull=True, admin__isnull=True)
            | Q(sender_type="remaker", remaker__isnull=False, user__isnull=True, admin__isnull=True)
            | Q(sender_type="admin", admin__isnull=False, user__isnull=True, remaker__isnull=True)
            | Q(sender_type="system", user__isnull=True, remaker__isnull=True, admin__isnull=True)
        ), name="ticket_message_one_sender"), models.CheckConstraint(condition=~Q(text="", attachment_url=""), name="ticket_message_has_content")]
