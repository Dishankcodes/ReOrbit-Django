from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("remakers", "0004_remakerproduct_pickup_preference"),
    ]

    operations = [
        migrations.AddField(
            model_name="remakerproduct",
            name="delivery_fee",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
