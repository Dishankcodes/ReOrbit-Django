from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="platformsettings",
            name="payout_hold_days",
            field=models.PositiveIntegerField(default=7, help_text="Days after delivery before an earning can be paid out"),
        ),
        migrations.AddField(
            model_name="platformsettings",
            name="payout_min_amount",
            field=models.PositiveIntegerField(default=100, help_text="Smallest payout, in rupees"),
        ),
        migrations.AddField(
            model_name="platformsettings",
            name="payout_auto",
            field=models.BooleanField(default=False, help_text="Create payouts automatically for available balances"),
        ),
    ]
