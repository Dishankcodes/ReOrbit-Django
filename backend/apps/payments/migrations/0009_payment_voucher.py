import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("payments", "0008_refunds_wallet"),
        ("rewards", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="payment",
            name="discount",
            field=models.PositiveIntegerField(default=0, help_text="Voucher discount already taken off `amount`."),
        ),
        migrations.AddField(
            model_name="payment",
            name="voucher",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="payments", to="rewards.voucher"),
        ),
    ]
