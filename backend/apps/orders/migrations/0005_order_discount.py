from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0004_returns_cod_failed"),
    ]

    operations = [
        migrations.AddField(
            "order", "discount",
            models.PositiveIntegerField(default=0, help_text="Rupees a donation voucher took off. total already has it taken off"),
        ),
    ]
