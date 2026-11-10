from django.db import migrations, models


class Migration(migrations.Migration):
    """Step 1 of 3: add the encrypted columns. (0004 moves the data, 0005 drops the plain columns.)"""

    dependencies = [("payments", "0002_wallet_payouts")]

    operations = [
        migrations.AddField(model_name="payoutaccount", name="account_number_enc", field=models.TextField(blank=True)),
        migrations.AddField(model_name="payoutaccount", name="account_last4", field=models.CharField(blank=True, max_length=4)),
        migrations.AddField(model_name="payoutaccount", name="upi_enc", field=models.TextField(blank=True)),
        migrations.AddField(model_name="payoutaccount", name="upi_hint", field=models.CharField(blank=True, max_length=100)),
        migrations.AddField(
            model_name="payout", name="account_enc",
            field=models.TextField(blank=True, help_text="Encrypted full details, kept only while the payout is pending"),
        ),
        migrations.AlterField(
            model_name="payout", name="account",
            field=models.JSONField(help_text="Masked payout details at the time of the request (safe to show)"),
        ),
    ]
