import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("admins", "0007_alter_adminitem_condition_alter_adminitem_mrp"),
    ]

    operations = [
        migrations.CreateModel(
            name="Announcement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("title", models.CharField(max_length=150)),
                ("message", models.TextField(max_length=1000)),
                ("kind", models.CharField(
                    choices=[("offer", "Offer"), ("update", "Update"), ("maintenance", "Maintenance"), ("reminder", "Reminder")],
                    default="update", max_length=12)),
                ("audience", models.CharField(
                    choices=[("users", "All users"), ("remakers", "All ReMakers"), ("everyone", "Everyone")], max_length=10)),
                ("link", models.CharField(blank=True, max_length=500)),
                ("scheduled_at", models.DateTimeField(blank=True, null=True)),
                ("sent_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("recipients", models.PositiveIntegerField(default=0)),
                ("sent_by_name", models.CharField(blank=True, max_length=120)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("sent_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="announcements", to="admins.admins")),
            ],
            options={"db_table": "announcements", "ordering": ["-created_at", "-pk"]},
        ),
    ]
