import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("users", "0002_user_profile_bio_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("method", models.CharField(choices=[("RAZORPAY", "Online (Razorpay)"), ("COD", "Cash on delivery")], max_length=10)),
                ("status", models.CharField(choices=[("Created", "Created"), ("Paid", "Paid"), ("Failed", "Failed"), ("Cancelled", "Cancelled"), ("Expired", "Expired"), ("COD", "Pay on delivery"), ("Refunded", "Refunded")], default="Created", max_length=10)),
                ("amount", models.PositiveIntegerField(help_text="Whole rupees, the grand total of every order in this checkout.")),
                ("currency", models.CharField(default="INR", max_length=3)),
                ("idempotency_key", models.CharField(blank=True, max_length=64, null=True)),
                ("razorpay_order_id", models.CharField(blank=True, max_length=64, null=True, unique=True)),
                ("razorpay_payment_id", models.CharField(blank=True, max_length=64, null=True)),
                ("failure_reason", models.CharField(blank=True, max_length=255)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("buyer", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="payments", to="users.users")),
            ],
            options={"db_table": "payments", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.AddIndex(model_name="payment", index=models.Index(fields=["status", "expires_at"], name="pay_status_expires_idx")),
        migrations.AddIndex(model_name="payment", index=models.Index(fields=["buyer", "created_at"], name="pay_buyer_created_idx")),
        migrations.AddConstraint(
            model_name="payment",
            constraint=models.UniqueConstraint(condition=models.Q(("idempotency_key__isnull", False)), fields=("buyer", "idempotency_key"), name="pay_buyer_idem_unique"),
        ),
        migrations.CreateModel(
            name="WebhookEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_id", models.CharField(max_length=80, unique=True)),
                ("event_type", models.CharField(max_length=60)),
                ("received_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "payment_webhook_events"},
        ),
    ]
