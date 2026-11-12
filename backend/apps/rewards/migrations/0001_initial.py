import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [("users", "0002_user_profile_bio_and_more")]

    operations = [
        migrations.CreateModel(
            name="Voucher",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(max_length=16, unique=True)),
                ("amount", models.PositiveIntegerField()),
                ("min_order", models.PositiveIntegerField(default=0)),
                ("status", models.CharField(choices=[("Active", "Ready to use"), ("Used", "Used"), ("Expired", "Expired")], default="Active", max_length=8)),
                ("title", models.CharField(blank=True, max_length=120)),
                ("expires_at", models.DateTimeField()),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                ("source_type", models.CharField(blank=True, max_length=20)),
                ("source_id", models.CharField(blank=True, max_length=24)),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="vouchers", to="users.users")),
            ],
            options={"db_table": "vouchers", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.AddIndex(model_name="voucher", index=models.Index(fields=["owner", "status"], name="vch_owner_status_idx")),
        migrations.AddConstraint(
            model_name="voucher",
            constraint=models.UniqueConstraint(condition=models.Q(("source_id", ""), _negated=True), fields=("source_type", "source_id"), name="vch_one_per_source"),
        ),
    ]
