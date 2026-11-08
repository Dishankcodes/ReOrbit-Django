from django.db import migrations, models


class Migration(migrations.Migration):
    """A sold-out member item now keeps its history with quantity 0 instead of an
    unsellable 1, so stock can be given back exactly when an order is cancelled."""

    dependencies = [
        ("listings", "0002_mediaimage_parents"),
    ]

    operations = [
        migrations.RemoveConstraint(model_name="item", name="item_quantity_gte_1"),
        migrations.AddConstraint(
            model_name="item",
            constraint=models.CheckConstraint(condition=models.Q(("quantity__gte", 0)), name="item_quantity_gte_0"),
        ),
    ]
