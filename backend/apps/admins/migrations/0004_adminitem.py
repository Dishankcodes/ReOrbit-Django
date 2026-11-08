import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("admins", "0003_admins_note_admins_phone_admins_role_key"),
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="AdminItem",
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
                ("sku", models.CharField(max_length=80, unique=True)),
                ("admin", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="store_items", to="admins.admins")),
                ("category", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="%(class)s_set", to="core.category")),
            ],
            options={"db_table": "admin_items", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.AddIndex(model_name="adminitem", index=models.Index(fields=["status", "created_at"], name="aitem_status_created_idx")),
        migrations.AddIndex(model_name="adminitem", index=models.Index(fields=["category"], name="aitem_category_idx")),
    ]
