import django.db.models.deletion
from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("donations", "0004_pickup_team_details"),
        ("listings", "0007_item_price_suggestion"),
        ("users", "0002_user_profile_bio_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="PickupTeamMember",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=120)),
                ("phone", models.CharField(max_length=20)),
                ("role", models.CharField(choices=[("Lead", "Lead"), ("Driver", "Driver"), ("Helper", "Helper")], default="Helper", max_length=10)),
                ("status", models.CharField(choices=[("Active", "Active"), ("On leave", "On leave")], default="Active", max_length=10)),
                ("team", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="members", to="donations.pickuppartner")),
            ],
            options={"db_table": "pickup_team_members", "ordering": ["pk"]},
        ),
        migrations.AddConstraint(
            model_name="pickupteammember",
            constraint=models.UniqueConstraint(condition=Q(role="Lead"), fields=("team",), name="one_lead_per_pickup_team"),
        ),
        migrations.CreateModel(
            name="PickupRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("status", models.CharField(choices=[("Requested", "Requested"), ("Scheduled", "Scheduled"), ("Picked_Up", "Picked up"), ("Completed", "Completed"), ("Cancelled", "Cancelled")], default="Requested", max_length=10)),
                ("pickup_date", models.DateField(blank=True, null=True)),
                ("pickup_slot", models.CharField(blank=True, max_length=30)),
                ("address_snapshot", models.JSONField(default=dict)),
                ("cancel_reason", models.CharField(blank=True, max_length=255)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("assigned_partner", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="item_pickups", to="donations.pickuppartner")),
                ("item", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="pickup_request", to="listings.item")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="item_pickups", to="users.users")),
            ],
            options={"db_table": "pickup_requests", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.AddIndex(
            model_name="pickuprequest",
            index=models.Index(fields=["status", "pickup_date"], name="pkreq_status_date_idx"),
        ),
        migrations.AddIndex(
            model_name="pickuprequest",
            index=models.Index(fields=["assigned_partner", "status"], name="pkreq_partner_status_idx"),
        ),
        migrations.CreateModel(
            name="PickupEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("label", models.CharField(max_length=60)),
                ("detail", models.CharField(blank=True, max_length=255)),
                ("tone", models.CharField(choices=[("good", "Good"), ("info", "Info"), ("wait", "Waiting"), ("bad", "Bad"), ("neutral", "Neutral")], default="neutral", max_length=8)),
                ("actor", models.CharField(blank=True, max_length=10)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("request", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="pickups.pickuprequest")),
            ],
            options={"db_table": "pickup_events", "ordering": ["created_at", "pk"]},
        ),
    ]
