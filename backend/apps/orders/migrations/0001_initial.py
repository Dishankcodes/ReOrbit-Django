import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("users", "0002_user_profile_bio_and_more"),
        ("remakers", "0003_remakerproduct"),
        ("admins", "0004_adminitem"),
        ("listings", "0002_mediaimage_parents"),
        ("payments", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Order",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("seller_type", models.CharField(choices=[("user", "Member"), ("remaker", "ReMaker"), ("platform", "ReOrbit")], max_length=10)),
                ("status", models.CharField(choices=[("Pending_Payment", "Waiting for payment"), ("Confirmed", "Confirmed"), ("Packed", "Packed"), ("Shipped", "Shipped"), ("Delivered", "Delivered"), ("Cancelled", "Cancelled")], default="Pending_Payment", max_length=16)),
                ("payment_status", models.CharField(choices=[("Pending", "Pending"), ("Paid", "Paid"), ("COD_Due", "Pay on delivery"), ("Refunded", "Refunded"), ("Refund_Failed", "Refund needs attention"), ("Void", "Not charged")], default="Pending", max_length=14)),
                ("subtotal", models.PositiveIntegerField()),
                ("platform_fee", models.PositiveIntegerField(default=0)),
                ("delivery_fee", models.PositiveIntegerField(default=0)),
                ("total", models.PositiveIntegerField()),
                ("address", models.JSONField(help_text="Copy of the delivery address at purchase time.")),
                ("note", models.CharField(blank=True, max_length=300)),
                ("courier_name", models.CharField(blank=True, max_length=60)),
                ("tracking_no", models.CharField(blank=True, max_length=60)),
                ("confirmed_at", models.DateTimeField(blank=True, null=True)),
                ("shipped_at", models.DateTimeField(blank=True, null=True)),
                ("delivered_at", models.DateTimeField(blank=True, null=True)),
                ("cancelled_at", models.DateTimeField(blank=True, null=True)),
                ("cancel_reason", models.CharField(blank=True, max_length=255)),
                ("cancelled_by", models.CharField(blank=True, max_length=10)),
                ("buyer", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="orders", to="users.users")),
                ("payment", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="orders", to="payments.payment")),
                ("seller_remaker", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="sales", to="remakers.remakers")),
                ("seller_user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="sales", to="users.users")),
            ],
            options={"db_table": "orders", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.CreateModel(
            name="OrderItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("kind", models.CharField(choices=[("item", "Member item"), ("remaker_product", "ReMaker product"), ("admin_item", "ReOrbit store item")], max_length=16)),
                ("ref_id", models.CharField(help_text="public_id of the thing bought, kept as text", max_length=24)),
                ("title", models.CharField(max_length=150)),
                ("cover", models.CharField(blank=True, help_text="Image path at purchase time", max_length=255)),
                ("unit_price", models.PositiveIntegerField()),
                ("qty", models.PositiveIntegerField()),
                ("line_total", models.PositiveIntegerField()),
                ("took_stock", models.PositiveIntegerField(default=0)),
                ("closed_lot", models.BooleanField(default=False, help_text="Member item: the whole listing was sold out by this line")),
                ("admin_item", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.adminitem")),
                ("item", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="listings.item")),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lines", to="orders.order")),
                ("remaker_product", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="remakers.remakerproduct")),
            ],
            options={"db_table": "order_items", "ordering": ["pk"]},
        ),
        migrations.CreateModel(
            name="OrderEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("label", models.CharField(max_length=40)),
                ("detail", models.CharField(blank=True, max_length=255)),
                ("actor", models.CharField(blank=True, max_length=10)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="events", to="orders.order")),
            ],
            options={"db_table": "order_events", "ordering": ["created_at", "pk"]},
        ),
        migrations.AddIndex(model_name="order", index=models.Index(fields=["buyer", "-created_at"], name="ord_buyer_created_idx")),
        migrations.AddIndex(model_name="order", index=models.Index(fields=["seller_user", "status"], name="ord_suser_status_idx")),
        migrations.AddIndex(model_name="order", index=models.Index(fields=["seller_remaker", "status"], name="ord_sremaker_status_idx")),
        migrations.AddIndex(model_name="order", index=models.Index(fields=["status", "seller_type"], name="ord_status_type_idx")),
        migrations.AddConstraint(
            model_name="order",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    models.Q(("seller_remaker__isnull", True), ("seller_type", "user"), ("seller_user__isnull", False)),
                    models.Q(("seller_remaker__isnull", False), ("seller_type", "remaker"), ("seller_user__isnull", True)),
                    models.Q(("seller_remaker__isnull", True), ("seller_type", "platform"), ("seller_user__isnull", True)),
                    _connector="OR",
                ),
                name="order_seller_matches_type",
            ),
        ),
        migrations.AddIndex(model_name="orderitem", index=models.Index(fields=["order"], name="oitem_order_idx")),
        migrations.AddConstraint(model_name="orderitem", constraint=models.CheckConstraint(condition=models.Q(("qty__gte", 1)), name="order_item_qty_gte_1")),
        migrations.AddIndex(model_name="orderevent", index=models.Index(fields=["order", "created_at"], name="oevent_order_idx")),
    ]
