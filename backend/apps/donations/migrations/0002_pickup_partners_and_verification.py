import django.db.models.deletion
from django.db import migrations, models

STATUS = [
    ("Pending", "Under review"), ("Scheduled", "Pickup scheduled"), ("Failed_Pickup", "Pickup attempt failed"),
    ("Picked_Up", "Picked up"), ("Received", "Received"), ("Completed", "Completed"),
    ("Rejected", "Not accepted"), ("Cancelled", "Cancelled"),
]
CONDITION = [("Good", "Good"), ("Medium", "Medium"), ("Worst", "Needs repair")]
PARTNER_STATUS = [("Active", "Active"), ("Inactive", "Inactive")]


class Migration(migrations.Migration):

    dependencies = [
        ("donations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="PickupPartner",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(help_text="Team label, e.g. 'Pickup team A'", max_length=60, unique=True)),
                ("lead_name", models.CharField(blank=True, help_text="The lead's own name, shown to the donor", max_length=120)),
                ("phone", models.CharField(blank=True, max_length=20)),
                ("token", models.CharField(editable=False, max_length=40, unique=True)),
                ("status", models.CharField(choices=PARTNER_STATUS, default="Active", max_length=10)),
            ],
            options={"db_table": "pickup_partners", "ordering": ["name"]},
        ),
        migrations.RemoveField(model_name="donation", name="partner_team"),
        migrations.AddField(
            model_name="donation", name="assigned_partner",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                    related_name="pickups", to="donations.pickuppartner"),
        ),
        migrations.AddField(model_name="donation", name="failed_pickup_count", field=models.PositiveSmallIntegerField(default=0)),
        migrations.AddField(model_name="donation", name="accepted_quantity", field=models.PositiveSmallIntegerField(blank=True, null=True)),
        migrations.AddField(model_name="donation", name="partial_reject_reason", field=models.CharField(blank=True, max_length=255)),
        migrations.AddField(model_name="donation", name="received_quantity", field=models.PositiveSmallIntegerField(blank=True, null=True)),
        migrations.AddField(model_name="donation", name="received_condition", field=models.CharField(blank=True, choices=CONDITION, max_length=10)),
        migrations.AddField(model_name="donation", name="received_note", field=models.CharField(blank=True, max_length=255)),
        migrations.AddField(model_name="donation", name="distributed_quantity", field=models.PositiveSmallIntegerField(blank=True, null=True)),
        migrations.AddField(model_name="donation", name="distributed_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="donation", name="certificate_file", field=models.FileField(blank=True, null=True, upload_to="certificates/")),
        migrations.AlterField(
            model_name="donation", name="status",
            field=models.CharField(choices=STATUS, default="Pending", max_length=14),
        ),
        migrations.AlterField(
            model_name="donation", name="ngo",
            field=models.CharField(blank=True, help_text="Who it was handed on to (free text)", max_length=100),
        ),
        migrations.AddIndex(
            model_name="donation",
            index=models.Index(fields=["assigned_partner", "status"], name="don_partner_status_idx"),
        ),
    ]
