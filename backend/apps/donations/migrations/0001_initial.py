import django.db.models.deletion
from django.db import migrations, models

STATUS = [
    ("Pending", "Under review"), ("Scheduled", "Pickup scheduled"), ("Picked_Up", "Picked up"),
    ("Received", "Received at the warehouse"), ("Completed", "Completed"), ("Rejected", "Not accepted"),
    ("Cancelled", "Cancelled"),
]
CONDITION = [("Good", "Good"), ("Medium", "Medium"), ("Worst", "Needs repair")]
TONE = [("neutral", "neutral"), ("good", "good"), ("bad", "bad"), ("wait", "wait"), ("info", "info")]


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("users", "0002_user_profile_bio_and_more"),
        ("admins", "0004_adminitem"),
    ]

    operations = [
        migrations.CreateModel(
            name="Donation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=120)),
                ("category", models.CharField(max_length=100)),
                ("description", models.TextField(max_length=1000)),
                ("condition", models.CharField(choices=CONDITION, max_length=10)),
                ("quantity", models.PositiveSmallIntegerField(default=1)),
                ("weight_kg", models.DecimalField(decimal_places=1, default=0, max_digits=7)),
                ("status", models.CharField(choices=STATUS, default="Pending", max_length=10)),
                ("address", models.JSONField(default=dict)),
                ("contact_name", models.CharField(max_length=120)),
                ("contact_phone", models.CharField(max_length=20)),
                ("note", models.CharField(blank=True, max_length=200)),
                ("pickup_date", models.DateField(blank=True, null=True)),
                ("pickup_slot", models.CharField(blank=True, max_length=30)),
                ("reschedule_count", models.PositiveSmallIntegerField(default=0)),
                ("partner", models.CharField(blank=True, max_length=80)),
                ("handover_code", models.CharField(blank=True, max_length=4)),
                ("reject_reason", models.CharField(blank=True, max_length=255)),
                ("cancel_reason", models.CharField(blank=True, max_length=255)),
                ("ngo", models.CharField(blank=True, max_length=120)),
                ("certificate_id", models.CharField(blank=True, max_length=24)),
                ("picked_up_at", models.DateTimeField(blank=True, null=True)),
                ("received_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("points_awarded", models.PositiveIntegerField(default=0)),
                ("voucher_code", models.CharField(blank=True, max_length=16)),
                ("voucher_amount", models.PositiveIntegerField(default=0)),
                ("reviewed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="donations", to="users.users")),
            ],
            options={"db_table": "donations", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.AddIndex(model_name="donation", index=models.Index(fields=["user", "-created_at"], name="don_user_created_idx")),
        migrations.AddIndex(model_name="donation", index=models.Index(fields=["status", "-created_at"], name="don_status_created_idx")),
        migrations.CreateModel(
            name="DonationPhoto",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to="donations/")),
                ("display_order", models.SmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("donation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="photos", to="donations.donation")),
            ],
            options={"db_table": "donation_photos", "ordering": ["display_order", "pk"]},
        ),
        migrations.CreateModel(
            name="DonationEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("label", models.CharField(max_length=120)),
                ("detail", models.CharField(blank=True, max_length=255)),
                ("tone", models.CharField(choices=TONE, default="neutral", max_length=8)),
                ("actor", models.CharField(default="system", max_length=8)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("donation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="donations.donation")),
            ],
            options={"db_table": "donation_events", "ordering": ["created_at", "pk"]},
        ),
    ]
