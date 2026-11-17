from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("donations", "0003_seed_pickup_partners"),
    ]

    operations = [
        migrations.AddField(
            model_name="donation", name="admin_points",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="donation", name="admin_voucher_amount",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
