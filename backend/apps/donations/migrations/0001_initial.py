import django.db.models.deletion
from django.db import migrations, models
from django.db.models import Q

STATUS = [
    ("Pending", "Under review"), ("Scheduled", "Pickup scheduled"), ("Picked_Up", "Picked up"),
    ("Received", "Received"), ("Completed", "Completed"), ("Rejected", "Not accepted"), ("Cancelled", "Cancelled"),
]
CONDITION = [("Good", "Good"), ("Medium", "Medium"), ("Worst", "Needs repair")]
TONE = [("good", "Good"), ("info", "Info"), ("wait", "Waiting"), ("bad", "Bad"), ("neutral", "Neutral")]


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("users", "0002_user_profile_bio_and_more"),
        ("rewards", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Donation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=100)),
                ("category", models.CharField(help_text="Category name at the time of donating", max_length=100)),
                ("description", models.TextField(max_length=1000)),
                ("condition", models.CharField(choices=CONDITION, max_length=10)),
                ("quantity", models.PositiveSmallIntegerField(default=1)),
                ("weight_kg", models.DecimalField(decimal_places=1, default=0, max_digits=7)),
                ("status", models.CharField(choices=STATUS, default="Pending", max_length=12)),
                ("pickup_date", models.DateField(blank=True, null=True)),
                ("pickup_slot", models.CharField(blank=True, max_length=30)),
                ("pickup_address", models.JSONField(help_text="Copy of the donor's address at donation time")),
                ("contact_name", models.CharField(max_length=120)),
                ("phone", models.CharField(max_length=20)),
                ("note", models.CharField(blank=True, max_length=200)),
                ("partner_team", models.CharField(blank=True, max_length=60)),
                ("handover_code", models.CharField(blank=True, max_length=4)),
                ("reschedule_count", models.PositiveSmallIntegerField(default=0)),
                ("reject_reason", models.CharField(blank=True, max_length=255)),
                ("cancel_reason", models.CharField(blank=True, max_length=255)),
                ("ngo", models.CharField(blank=True, max_length=100)),
                ("certificate_id", models.CharField(blank=True, max_length=24)),
                ("received_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("reward_points", models.PositiveIntegerField(default=0)),
                ("donor", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="donations", to="users.users")),
                ("reward_voucher", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="rewards.voucher")),
            ],
            options={"db_table": "donations", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.CreateModel(
            name="DonationImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to="donations/")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("donation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="images", to="donations.donation")),
            ],
            options={"db_table": "donation_images", "ordering": ["pk"]},
        ),
        migrations.CreateModel(
            name="DonationEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("label", models.CharField(max_length=60)),
                ("detail", models.CharField(blank=True, max_length=255)),
                ("tone", models.CharField(choices=TONE, default="neutral", max_length=8)),
                ("actor", models.CharField(blank=True, max_length=10)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("donation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="donations.donation")),
            ],
            options={"db_table": "donation_events", "ordering": ["created_at", "pk"]},
        ),
        migrations.AddIndex(
            model_name="donation",
            index=models.Index(fields=["donor", "-created_at"], name="don_donor_created_idx"),
        ),
        migrations.AddIndex(
            model_name="donation",
            index=models.Index(fields=["status", "created_at"], name="don_status_created_idx"),
        ),
        migrations.AddConstraint(
            model_name="donation",
            constraint=models.CheckConstraint(condition=Q(("quantity__gte", 1)), name="donation_quantity_gte_1"),
        ),
        migrations.AddIndex(
            model_name="donationevent",
            index=models.Index(fields=["donation", "created_at"], name="don_event_idx"),
        ),
    ]
