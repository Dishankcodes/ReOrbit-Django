import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("remakers", "0005_remakerproduct_delivery_fee"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductViewDay",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("day", models.DateField()),
                ("source", models.CharField(choices=[("marketplace", "Marketplace"), ("profile", "Your profile page"), ("feed", "Followers' feed"), ("link", "Shared links"), ("other", "Elsewhere on ReOrbit")], max_length=12)),
                ("views", models.PositiveIntegerField(default=0)),
                ("remaker_product", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="view_days", to="remakers.remakerproduct")),
            ],
            options={"db_table": "analytics_product_view_days"},
        ),
        migrations.CreateModel(
            name="ProfileViewDay",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("day", models.DateField()),
                ("views", models.PositiveIntegerField(default=0)),
                ("remaker", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="profile_view_days", to="remakers.remakers")),
            ],
            options={"db_table": "analytics_profile_view_days"},
        ),
        migrations.AddIndex(
            model_name="productviewday",
            index=models.Index(fields=["day"], name="productview_day_idx"),
        ),
        migrations.AddConstraint(
            model_name="productviewday",
            constraint=models.UniqueConstraint(fields=("remaker_product", "day", "source"), name="productview_one_row_per_day_source"),
        ),
        migrations.AddIndex(
            model_name="profileviewday",
            index=models.Index(fields=["day"], name="profileview_day_idx"),
        ),
        migrations.AddConstraint(
            model_name="profileviewday",
            constraint=models.UniqueConstraint(fields=("remaker", "day"), name="profileview_one_row_per_day"),
        ),
    ]
