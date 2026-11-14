from django.db import models
from django.db.models import Q
from apps.core.ids import PublicIdModel
from apps.core.models import TimeStampedModel


class Conversation(PublicIdModel, TimeStampedModel):
    public_id_prefix = "CON"
    # Unique identity for a direct pair. NULL is retained for existing rows and
    # non-direct/group conversations; new direct threads always set this value.
    direct_key = models.CharField(max_length=80, blank=True, null=True, unique=True)
    subject = models.CharField(max_length=180, blank=True)
    kind = models.CharField(max_length=16, default="direct")
    context = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    class Meta:
        db_table = "conversations"
        ordering = ["-updated_at", "-pk"]
        indexes = [models.Index(fields=["-updated_at", "-id"], name="conv_updated_pk_idx")]


class ConversationParticipant(TimeStampedModel):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="participants")
    account_type = models.CharField(max_length=8, choices=[("user", "User"), ("remaker", "ReMaker"), ("admin", "Admin")])
    user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.CASCADE, related_name="message_participations")
    remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.CASCADE, related_name="message_participations")
    admin = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.CASCADE, related_name="message_participations")
    last_read_at = models.DateTimeField(null=True, blank=True)
    is_muted = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    class Meta:
        db_table = "conversation_participants"
        indexes = [
            models.Index(fields=["conversation", "is_archived"], name="convpart_archived_idx"),
            models.Index(fields=["user", "is_archived"], name="convpart_user_arch_idx"),
            models.Index(fields=["remaker", "is_archived"], name="convpart_maker_arch_idx"),
            models.Index(fields=["admin", "is_archived"], name="convpart_admin_arch_idx"),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(account_type="user", user__isnull=False, remaker__isnull=True, admin__isnull=True) | Q(account_type="remaker", remaker__isnull=False, user__isnull=True, admin__isnull=True) | Q(account_type="admin", admin__isnull=False, user__isnull=True, remaker__isnull=True), name="conversation_participant_one_account"),
            models.UniqueConstraint(fields=["conversation", "user"], condition=Q(user__isnull=False), name="conv_unique_user_participant"),
            models.UniqueConstraint(fields=["conversation", "remaker"], condition=Q(remaker__isnull=False), name="conv_unique_remaker_participant"),
            models.UniqueConstraint(fields=["conversation", "admin"], condition=Q(admin__isnull=False), name="conv_unique_admin_participant"),
        ]


class Message(TimeStampedModel):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender_type = models.CharField(max_length=8, choices=[("user", "User"), ("remaker", "ReMaker"), ("admin", "Admin")])
    sender_user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.SET_NULL, related_name="sent_messages")
    sender_remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.SET_NULL, related_name="sent_messages")
    sender_admin = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="sent_messages")
    text = models.TextField(blank=True)
    attachment_url = models.TextField(blank=True)
    class Meta:
        db_table = "messages"
        ordering = ["created_at", "pk"]
        indexes = [models.Index(fields=["conversation", "-id"], name="message_conv_pk_idx")]
        constraints = [models.CheckConstraint(condition=Q(sender_type="user", sender_user__isnull=False, sender_remaker__isnull=True, sender_admin__isnull=True) | Q(sender_type="remaker", sender_remaker__isnull=False, sender_user__isnull=True, sender_admin__isnull=True) | Q(sender_type="admin", sender_admin__isnull=False, sender_user__isnull=True, sender_remaker__isnull=True), name="message_one_sender"), models.CheckConstraint(condition=~Q(text="", attachment_url=""), name="message_content_required")]


class MessageNotification(TimeStampedModel):
    participant = models.ForeignKey(ConversationParticipant, on_delete=models.CASCADE, related_name="notifications")
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="notifications")
    read_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        db_table = "message_notifications"
        indexes = [
            models.Index(fields=["participant", "read_at"], name="msgnotif_unread_idx"),
        ]
        constraints = [models.UniqueConstraint(fields=["participant", "message"], name="message_notification_once")]
