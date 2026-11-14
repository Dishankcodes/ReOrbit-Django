import django.db.models.deletion
from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("users", "0002_user_profile_bio_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Voucher",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(max_length=20, unique=True)),
                ("title", models.CharField(max_length=120)),
                ("amount", models.PositiveIntegerField(help_text="Rupees taken off the order")),
                ("min_order", models.PositiveIntegerField(default=0, help_text="Smallest goods total (rupees) the voucher works on")),
                ("expires_at", models.DateTimeField()),
                ("status", models.CharField(choices=[("Active", "Active"), ("Used", "Used")], default="Active", max_length=10)),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                ("used_checkout", models.CharField(blank=True, help_text="public_id of the Payment that spent it. Cleared if that checkout is given up", max_length=24)),
                ("source_type", models.CharField(max_length=20)),
                ("source_id", models.CharField(max_length=24)),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="vouchers", to="users.users")),
            ],
            options={"db_table": "vouchers", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.AddIndex(
            model_name="voucher",
            index=models.Index(fields=["owner", "status"], name="voucher_owner_status_idx"),
        ),
        migrations.AddConstraint(
            model_name="voucher",
            constraint=models.UniqueConstraint(fields=("source_type", "source_id"), name="voucher_one_per_source"),
        ),
        migrations.AddConstraint(
            model_name="voucher",
            constraint=models.CheckConstraint(condition=Q(("amount__gt", 0)), name="voucher_amount_gt_0"),
        ),
    ]
