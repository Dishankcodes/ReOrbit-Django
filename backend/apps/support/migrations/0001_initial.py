import django.db.models.deletion
from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    initial = True
    dependencies = [("core", "0004_platform_rules"), ("users", "0002_user_profile_bio_and_more"), ("remakers", "0004_remakerproduct_pickup_preference"), ("admins", "0004_adminitem")]

    operations = [
        migrations.CreateModel(name="SupportTicket", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
            ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
            ("subject", models.CharField(max_length=160)), ("category", models.CharField(max_length=60)),
            ("order_id", models.CharField(blank=True, max_length=32)),
            ("status", models.CharField(choices=[("Open", "Open"), ("In progress", "In progress"), ("Resolved", "Resolved"), ("Closed", "Closed")], default="Open", max_length=16)),
            ("priority", models.CharField(choices=[("Normal", "Normal"), ("High", "High"), ("Urgent", "Urgent")], default="Normal", max_length=8)),
            ("closed_at", models.DateTimeField(blank=True, null=True)),
            ("assigned_to", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_tickets", to="admins.admins")),
            ("remaker", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="support_tickets", to="remakers.remakers")),
            ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="support_tickets", to="users.users")),
        ], options={"db_table": "support_tickets", "ordering": ["-updated_at", "-id"]}),
        migrations.AddConstraint(model_name="supportticket", constraint=models.CheckConstraint(condition=Q(user__isnull=False, remaker__isnull=True) | Q(user__isnull=True, remaker__isnull=False), name="ticket_exactly_one_owner")),
        migrations.CreateModel(name="TicketMessage", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
            ("sender_type", models.CharField(choices=[("user", "User"), ("remaker", "ReMaker"), ("admin", "Support"), ("system", "System")], max_length=8)),
            ("text", models.TextField(blank=True)), ("attachment_url", models.URLField(blank=True, max_length=1000)),
            ("read_at", models.DateTimeField(blank=True, null=True)),
            ("admin", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="ticket_messages", to="admins.admins")),
            ("remaker", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="ticket_messages", to="remakers.remakers")),
            ("ticket", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="support.supportticket")),
            ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="ticket_messages", to="users.users")),
        ], options={"db_table": "support_ticket_messages", "ordering": ["created_at", "id"]}),
        migrations.AddConstraint(model_name="ticketmessage", constraint=models.CheckConstraint(condition=Q(sender_type="user", user__isnull=False, remaker__isnull=True, admin__isnull=True) | Q(sender_type="remaker", remaker__isnull=False, user__isnull=True, admin__isnull=True) | Q(sender_type="admin", admin__isnull=False, user__isnull=True, remaker__isnull=True) | Q(sender_type="system", user__isnull=True, remaker__isnull=True, admin__isnull=True), name="ticket_message_one_sender")),
        migrations.AddConstraint(model_name="ticketmessage", constraint=models.CheckConstraint(condition=~Q(text="", attachment_url=""), name="ticket_message_has_content")),
    ]
