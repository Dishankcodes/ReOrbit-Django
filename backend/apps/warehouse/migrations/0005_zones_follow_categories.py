"""The warehouse areas now follow the marketplace categories (one area per category, lettered in
the order the categories were created, plus "Other items"). This moves every lot on a shelf to the
area of its category, on the same floor, keeping its rack and level. Lots at the dock, in QC or
already gone are left alone.
"""

from django.db import migrations


def move_lots(apps, schema_editor):
    from apps.warehouse.services import areas_from  # a plain function: no models involved

    Category = apps.get_model("core", "Category")
    WarehouseItem = apps.get_model("warehouse", "WarehouseItem")
    areas = areas_from(list(Category.objects.order_by("pk").values_list("name", flat=True)))
    other = areas[-1][0]
    for item in WarehouseItem.objects.exclude(zone__in=("", "DOCK", "QC")).exclude(warehouse_status="Released"):
        key = (item.category or "").strip().lower()
        letter = next((letter for letter, _name, keys in areas if key in keys), other)
        new = f"{item.zone[:1]}{letter}"
        if new != item.zone:
            item.zone = new
            item.save(update_fields=["zone"])


class Migration(migrations.Migration):

    dependencies = [
        ("warehouse", "0004_purchase_photo"),
        ("core", "0007_cache_table"),
    ]

    operations = [
        migrations.RunPython(move_lots, migrations.RunPython.noop),
    ]
