from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("remakers", "0003_remakerproduct"),
    ]

    operations = [
        migrations.AddField(
            model_name="remakerproduct",
            name="pickup_preference",
            field=models.CharField(
                choices=[
                    ("Seller_Handover", "Seller hands over to courier"),
                    ("Platform_Pickup", "Managed by ReOrbit"),
                ],
                default="Seller_Handover",
                max_length=20,
            ),
        ),
    ]
