from django.db import models

from apps.core.ids import PublicIdModel


class Announcement(PublicIdModel):
    """A message an admin sends to every member and/or ReMaker. Delivery writes one
    core.Notification per recipient, so it shows up in their normal inbox."""

    public_id_prefix = "AN"

    class Audience(models.TextChoices):
        USERS = "users", "All users"
        REMAKERS = "remakers", "All ReMakers"
        EVERYONE = "everyone", "Everyone"

    class Kind(models.TextChoices):
        OFFER = "offer", "Offer"
        UPDATE = "update", "Update"
        MAINTENANCE = "maintenance", "Maintenance"
        REMINDER = "reminder", "Reminder"

    title = models.CharField(max_length=150)
    message = models.TextField(max_length=1000)
    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.UPDATE)
    audience = models.CharField(max_length=10, choices=Audience.choices)
    link = models.CharField(max_length=500, blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True, db_index=True)
    recipients = models.PositiveIntegerField(default=0)
    sent_by = models.ForeignKey(
        "admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="announcements"
    )
    sent_by_name = models.CharField(max_length=120, blank=True)
    # taken back after sending: the messages were removed from every inbox (kept here as a record)
    recalled_at = models.DateTimeField(null=True, blank=True)
    recalled_by_name = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        db_table = "announcements"
        ordering = ["-created_at", "-pk"]
