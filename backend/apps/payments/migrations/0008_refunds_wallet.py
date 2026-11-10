from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("payments", "0007_buyer_guards"),
        ("orders", "0003_buyer_guards"),
        ("admins", "0004_adminitem"),
    ]

    operations = [
        migrations.AlterField("walletentry", "kind", models.CharField(max_length=8, choices=[
            ("Earning", "Sale earning"), ("Payout", "Payout requested"),
            ("Release", "Payout returned to wallet"), ("Reversal", "Earning taken back (refund)")])),
        migrations.AlterField("walletentry", "available_at", models.DateTimeField(
            blank=True, null=True, help_text="When this amount can be paid out. Empty = not clearing yet (cash on delivery not received by ReOrbit)")),
        migrations.CreateModel(
            name="Refund",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("amount", models.PositiveIntegerField(help_text="Whole rupees")),
                ("reason", models.CharField(max_length=16, choices=[
                    ("cancelled", "Order cancelled"), ("late_payment", "Paid after the stock was released"),
                    ("return", "Return accepted"), ("delivery_failed", "Delivery failed"), ("admin", "Goodwill / dispute")])),
                ("note", models.CharField(blank=True, max_length=255)),
                ("method", models.CharField(max_length=8, choices=[
                    ("RAZORPAY", "Back to the original payment (Razorpay)"), ("MANUAL", "Sent by ReOrbit (cash on delivery order)")])),
                ("status", models.CharField(default="Pending", max_length=8, choices=[
                    ("Pending", "Waiting to be sent"), ("Sending", "Being sent"), ("Done", "Refunded"), ("Failed", "Needs attention")])),
                ("razorpay_refund_id", models.CharField(blank=True, max_length=64)),
                ("reference", models.CharField(blank=True, max_length=60, help_text="Bank/UPI reference for manual refunds")),
                ("attempts", models.PositiveIntegerField(default=0)),
                ("last_error", models.CharField(blank=True, max_length=255)),
                ("processed_at", models.DateTimeField(blank=True, null=True)),
                ("order", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="refunds", to="orders.order")),
                ("payment", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="refunds", to="payments.payment")),
                ("processed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins")),
            ],
            options={"db_table": "refunds", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.AddIndex("refund", models.Index(fields=["status", "-created_at"], name="refund_status_idx")),
        migrations.AddConstraint("refund", models.CheckConstraint(condition=models.Q(amount__gte=1), name="refund_amount_gte_1")),
    ]
