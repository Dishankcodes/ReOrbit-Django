import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [("donations", "0001_initial")]

    operations = [
        migrations.CreateModel(
            name="WarehouseItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=120)),
                ("category", models.CharField(max_length=100)),
                ("quantity", models.PositiveIntegerField(default=1)),
                ("condition", models.CharField(blank=True, max_length=10)),
                ("weight_kg", models.DecimalField(decimal_places=1, default=0, max_digits=7)),
                ("status", models.CharField(choices=[("In_Stock", "In the warehouse"), ("Given_Out", "Given to a partner")], default="In_Stock", max_length=10)),
                ("location", models.CharField(default="Main warehouse", max_length=80)),
                ("given_to", models.CharField(blank=True, max_length=120)),
                ("received_at", models.DateTimeField()),
                ("given_at", models.DateTimeField(blank=True, null=True)),
                ("donation", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="warehouse_item", to="donations.donation")),
            ],
            options={"db_table": "warehouse_items", "ordering": ["-received_at", "-pk"]},
        ),
        migrations.AddIndex(model_name="warehouseitem", index=models.Index(fields=["status", "-received_at"], name="wh_status_recv_idx")),
    ]
