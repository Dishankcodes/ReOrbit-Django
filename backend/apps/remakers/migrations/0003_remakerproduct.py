import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("admins", "0003_admins_note_admins_phone_admins_role_key"),
        ("core", "0001_initial"),
        ("listings", "0001_initial"),
        ("remakers", "0002_remaker_profile_cover_image_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="RemakerProduct",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=150)),
                ("description", models.TextField(blank=True)),
                ("price", models.DecimalField(decimal_places=2, max_digits=12)),
                ("stock", models.PositiveIntegerField(default=0)),
                ("status", models.CharField(choices=[("Draft", "Draft"), ("Listed", "Listed"), ("Sold_Out", "Sold out"), ("Inactive", "Inactive")], default="Draft", max_length=10)),
                ("materials", models.TextField(blank=True)),
                ("dimensions", models.CharField(blank=True, max_length=150)),
                ("customization_available", models.BooleanField(default=False)),
                ("deactivation_reason", models.TextField(blank=True)),
                ("deactivated_at", models.DateTimeField(blank=True, null=True)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                ("category", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="%(class)s_set", to="core.category")),
                ("deactivated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins")),
                ("remaker", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="products", to="remakers.remakers")),
                ("source_item", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="remaker_products", to="listings.item")),
            ],
            options={"db_table": "remaker_products", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.AddIndex(model_name="remakerproduct", index=models.Index(fields=["status", "created_at"], name="rprod_status_created_idx")),
        migrations.AddIndex(model_name="remakerproduct", index=models.Index(fields=["remaker", "status"], name="rprod_remaker_status_idx")),
        migrations.AddIndex(model_name="remakerproduct", index=models.Index(fields=["category"], name="rprod_category_idx")),
    ]
