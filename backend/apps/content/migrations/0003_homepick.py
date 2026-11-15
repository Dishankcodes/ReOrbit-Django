import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("admins", "0005_adminitem_sell_fields"),
        ("content", "0002_seed_policies"),
    ]

    operations = [
        migrations.CreateModel(
            name="HomePick",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("surface", models.CharField(max_length=10)),
                ("position", models.PositiveSmallIntegerField()),
                ("kind", models.CharField(max_length=10)),
                ("ref", models.CharField(max_length=24)),
                ("picked_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins")),
            ],
            options={"db_table": "home_picks", "ordering": ["surface", "position"]},
        ),
        migrations.AddConstraint(
            model_name="homepick",
            constraint=models.UniqueConstraint(fields=("surface", "position"), name="home_pick_slot_once"),
        ),
        migrations.AddConstraint(
            model_name="homepick",
            constraint=models.UniqueConstraint(fields=("surface", "ref"), name="home_pick_product_once"),
        ),
    ]
