from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("orders", "0004_returns_cod_failed")]

    operations = [
        migrations.AddField(
            model_name="order",
            name="discount",
            field=models.PositiveIntegerField(default=0, help_text="Voucher discount taken off the goods; ReOrbit carries it, the seller is paid in full."),
        ),
    ]
