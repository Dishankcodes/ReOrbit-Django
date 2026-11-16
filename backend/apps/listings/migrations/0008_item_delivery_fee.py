from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0007_item_price_suggestion"),
    ]

    operations = [
        migrations.AddField(
            model_name="item",
            name="delivery_fee",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
