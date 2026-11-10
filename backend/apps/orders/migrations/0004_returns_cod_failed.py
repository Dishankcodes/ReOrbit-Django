import django.db.models.deletion
from django.db import migrations, models

STATUS = [
    ("Pending_Payment", "Waiting for payment"), ("Confirmed", "Confirmed"), ("Packed", "Packed"),
    ("Shipped", "Shipped"), ("Delivered", "Delivered"), ("Cancelled", "Cancelled"),
    ("Delivery_Failed", "Delivery failed"), ("Returned_To_Origin", "Returned to seller"),
]
PAY = [
    ("Pending", "Pending"), ("Paid", "Paid"), ("COD_Due", "Pay on delivery"), ("COD_Collected", "Cash with the courier"),
    ("Refund_Pending", "Refund on its way"), ("Refunded", "Refunded"), ("Refund_Failed", "Refund needs attention"),
    ("Void", "Not charged"),
]


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0003_buyer_guards"),
        ("admins", "0004_adminitem"),
    ]

    operations = [
        migrations.AlterField("order", "status", models.CharField(max_length=24, choices=STATUS, default="Pending_Payment")),
        migrations.AlterField("order", "payment_status", models.CharField(max_length=14, choices=PAY, default="Pending")),
        migrations.AddField("order", "cod_received_at", models.DateTimeField(blank=True, null=True)),
        migrations.AddField("order", "cod_received_by", models.ForeignKey(
            blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins")),
        migrations.AddField("order", "cod_reference", models.CharField(blank=True, max_length=60)),
        migrations.AddField("order", "failed_at", models.DateTimeField(blank=True, null=True)),
        migrations.AddField("order", "fail_reason", models.CharField(blank=True, max_length=24)),
        migrations.AddField("order", "fail_note", models.CharField(blank=True, max_length=255)),
        migrations.AddField("order", "fail_fault", models.CharField(blank=True, max_length=6)),
        migrations.CreateModel(
            name="ReturnRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("status", models.CharField(default="Requested", max_length=10, choices=[
                    ("Requested", "Waiting for the seller"), ("Approved", "Approved, send the item back"),
                    ("Rejected", "Rejected by the seller"), ("Escalated", "With ReOrbit"),
                    ("Refunded", "Refunded"), ("Closed", "Closed, no refund")])),
                ("reason_code", models.CharField(max_length=20)),
                ("details", models.CharField(blank=True, max_length=500)),
                ("fault", models.CharField(blank=True, max_length=6, help_text="seller | buyer: who caused it. Decides who pays shipping and the delivery fee")),
                ("seller_note", models.CharField(blank=True, max_length=300)),
                ("admin_note", models.CharField(blank=True, max_length=300)),
                ("decided_by", models.CharField(blank=True, max_length=6)),
                ("decided_at", models.DateTimeField(blank=True, null=True)),
                ("escalate_until", models.DateTimeField(blank=True, null=True)),
                ("received_at", models.DateTimeField(blank=True, null=True)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("refund_amount", models.PositiveIntegerField(default=0)),
                ("order", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="return_request", to="orders.order")),
            ],
            options={"db_table": "order_returns", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.AddIndex("returnrequest", models.Index(fields=["status", "-created_at"], name="return_status_idx")),
        migrations.CreateModel(
            name="ReturnPhoto",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to="returns/")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("request", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="photos", to="orders.returnrequest")),
            ],
            options={"db_table": "order_return_photos", "ordering": ["pk"]},
        ),
    ]
