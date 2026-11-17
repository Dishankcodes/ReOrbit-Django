import django.core.validators
from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_platform_rules"),
    ]

    operations = [
        migrations.AddField(
            model_name="platformsettings",
            name="donation_co2_per_kg",
            field=models.DecimalField(
                decimal_places=2, default=Decimal("1.90"), max_digits=4,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),
        migrations.AddField(
            model_name="platformsettings",
            name="donation_voucher_tiers",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
