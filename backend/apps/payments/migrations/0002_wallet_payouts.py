import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_user_profile_bio_and_more"),
        ("remakers", "0003_remakerproduct"),
        ("admins", "0004_adminitem"),
        ("orders", "0001_initial"),
        ("payments", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="PayoutAccount",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("method", models.CharField(choices=[("bank", "Bank account"), ("upi", "UPI")], max_length=4)),
                ("holder_name", models.CharField(max_length=100)),
                ("bank_name", models.CharField(blank=True, max_length=80)),
                ("account_number", models.CharField(blank=True, max_length=20)),
                ("ifsc", models.CharField(blank=True, max_length=11)),
                ("upi_id", models.CharField(blank=True, max_length=100)),
                ("seller_remaker", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="payout_account", to="remakers.remakers")),
                ("seller_user", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="payout_account", to="users.users")),
            ],
            options={"db_table": "payout_accounts"},
        ),
        migrations.AddConstraint(
            model_name="payoutaccount",
            constraint=models.CheckConstraint(
                    condition=models.Q(
                        models.Q(("seller_remaker__isnull", True), ("seller_user__isnull", False)),
                        models.Q(("seller_remaker__isnull", False), ("seller_user__isnull", True)),
                        _connector="OR",
                    ),
                    name="payacct_one_seller",
                ),
        ),
        migrations.CreateModel(
            name="Payout",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("amount", models.PositiveIntegerField()),
                ("status", models.CharField(choices=[("Pending", "Waiting for ReOrbit to pay"), ("Paid", "Paid"), ("Rejected", "Rejected")], default="Pending", max_length=10)),
                ("source", models.CharField(default="seller", max_length=6)),
                ("account", models.JSONField(help_text="Payout details at the time of the request")),
                ("reference", models.CharField(blank=True, help_text="Bank/UPI transfer reference (UTR)", max_length=60)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("reject_reason", models.CharField(blank=True, max_length=255)),
                ("processed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="admins.admins")),
                ("seller_remaker", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="payouts", to="remakers.remakers")),
                ("seller_user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="payouts", to="users.users")),
            ],
            options={"db_table": "payouts", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.AddIndex(model_name="payout", index=models.Index(fields=["status", "-created_at"], name="payout_status_idx")),
        migrations.AddIndex(model_name="payout", index=models.Index(fields=["seller_user", "-created_at"], name="payout_suser_idx")),
        migrations.AddIndex(model_name="payout", index=models.Index(fields=["seller_remaker", "-created_at"], name="payout_sremaker_idx")),
        migrations.AddConstraint(
            model_name="payout",
            constraint=models.CheckConstraint(
                    condition=models.Q(
                        models.Q(("seller_remaker__isnull", True), ("seller_user__isnull", False)),
                        models.Q(("seller_remaker__isnull", False), ("seller_user__isnull", True)),
                        _connector="OR",
                    ),
                    name="payout_one_seller",
                ),
        ),
        migrations.AddConstraint(
            model_name="payout",
            constraint=models.CheckConstraint(condition=models.Q(("amount__gte", 1)), name="payout_amount_gte_1"),
        ),
        migrations.CreateModel(
            name="WalletEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("kind", models.CharField(choices=[("Earning", "Sale earning"), ("Payout", "Payout requested"), ("Release", "Payout returned to wallet")], max_length=8)),
                ("amount", models.IntegerField(help_text="Rupees. Positive adds to the wallet, negative takes out.")),
                ("available_at", models.DateTimeField(help_text="When this amount can be paid out")),
                ("note", models.CharField(blank=True, max_length=200)),
                ("order", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="wallet_entries", to="orders.order")),
                ("payout", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="entries", to="payments.payout")),
                ("seller_remaker", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="wallet_entries", to="remakers.remakers")),
                ("seller_user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="wallet_entries", to="users.users")),
            ],
            options={"db_table": "wallet_entries", "ordering": ["-created_at", "-pk"]},
        ),
        migrations.AddIndex(model_name="walletentry", index=models.Index(fields=["seller_user", "available_at"], name="wallet_suser_avail_idx")),
        migrations.AddIndex(model_name="walletentry", index=models.Index(fields=["seller_remaker", "available_at"], name="wallet_sremaker_avail_idx")),
        migrations.AddConstraint(
            model_name="walletentry",
            constraint=models.CheckConstraint(
                    condition=models.Q(
                        models.Q(("seller_remaker__isnull", True), ("seller_user__isnull", False)),
                        models.Q(("seller_remaker__isnull", False), ("seller_user__isnull", True)),
                        _connector="OR",
                    ),
                    name="wallet_one_seller",
                ),
        ),
        migrations.AddConstraint(
            model_name="walletentry",
            constraint=models.UniqueConstraint(condition=models.Q(("kind", "Earning")), fields=("order", "kind"), name="wallet_one_earning_per_order"),
        ),
    ]
