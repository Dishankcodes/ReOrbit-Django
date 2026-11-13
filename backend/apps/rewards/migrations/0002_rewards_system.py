import django.db.models.deletion
from django.db import migrations, models


def public_id():
    return models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)


class Migration(migrations.Migration):
    dependencies = [
        ("admins", "0004_adminitem"),
        ("users", "0002_user_profile_bio_and_more"),
        ("rewards", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="RewardRule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("key", models.CharField(max_length=20, unique=True)),
                ("group", models.CharField(max_length=20)),
                ("title", models.CharField(max_length=80)),
                ("description", models.CharField(max_length=200)),
                ("points", models.PositiveIntegerField(default=0)),
                ("unit", models.CharField(max_length=30)),
                ("active", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins")),
            ],
            options={"db_table": "reward_rules", "ordering": ["pk"]},
        ),
        migrations.CreateModel(
            name="RewardOffer",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", public_id()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(max_length=16, unique=True)),
                ("title", models.CharField(max_length=120)),
                ("description", models.CharField(blank=True, max_length=255)),
                ("kind", models.CharField(max_length=6)),
                ("discount_type", models.CharField(default="fixed", max_length=7)),
                ("value", models.PositiveIntegerField()),
                ("min_order", models.PositiveIntegerField(default=0)),
                ("max_discount", models.PositiveIntegerField(default=0)),
                ("points_cost", models.PositiveIntegerField(default=0)),
                ("usage_limit", models.PositiveIntegerField(default=1)),
                ("per_user", models.PositiveSmallIntegerField(default=1)),
                ("audience", models.CharField(default="all", max_length=6)),
                ("min_level", models.PositiveSmallIntegerField(default=0)),
                ("remaker_only", models.BooleanField(default=False)),
                ("valid_from", models.DateField()),
                ("valid_to", models.DateField()),
                ("draft", models.BooleanField(default=False)),
                ("paused", models.BooleanField(default=False)),
            ],
            options={"db_table": "reward_offers", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.AddField(
            model_name="voucher",
            name="offer",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="vouchers", to="rewards.rewardoffer"),
        ),
        migrations.AddField(model_name="voucher", name="discount_type", field=models.CharField(default="fixed", max_length=7)),
        migrations.AddField(model_name="voucher", name="percent", field=models.PositiveSmallIntegerField(default=0)),
        migrations.AddField(model_name="voucher", name="max_discount", field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="voucher", name="points_spent", field=models.PositiveIntegerField(default=0)),
        migrations.AlterField(
            model_name="voucher",
            name="status",
            field=models.CharField(
                choices=[("Active", "Ready to use"), ("Used", "Used"), ("Expired", "Expired"), ("Void", "Cancelled")],
                default="Active", max_length=8,
            ),
        ),
        migrations.CreateModel(
            name="PointsEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("kind", models.CharField(max_length=12)),
                ("points", models.IntegerField()),
                ("title", models.CharField(max_length=120)),
                ("detail", models.CharField(blank=True, max_length=200)),
                ("ref_type", models.CharField(max_length=12)),
                ("ref_id", models.CharField(max_length=24)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("admin", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="points", to="users.users")),
            ],
            options={"db_table": "points_entries", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.AddIndex(model_name="pointsentry", index=models.Index(fields=["user", "-created_at"], name="pts_user_created_idx")),
        migrations.AddConstraint(
            model_name="pointsentry",
            constraint=models.UniqueConstraint(fields=("user", "kind", "ref_type", "ref_id"), name="pts_one_per_ref"),
        ),
    ]
