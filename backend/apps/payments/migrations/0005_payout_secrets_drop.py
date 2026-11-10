from django.db import migrations


class Migration(migrations.Migration):
    """Step 3 of 3: the plain-text columns are gone; only the encrypted ones remain."""

    dependencies = [("payments", "0004_payout_secrets_data")]

    operations = [
        migrations.RemoveField(model_name="payoutaccount", name="account_number"),
        migrations.RemoveField(model_name="payoutaccount", name="upi_id"),
    ]
