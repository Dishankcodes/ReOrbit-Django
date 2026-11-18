"""Two floors: donated items on Floor 1, bought stock on Floor 2.

Zones on the racks gain their floor: "A" becomes "1A" for a donation and "2A" for anything else.
The dock (DOCK), the QC bay (QC) and items that have left (no zone) are untouched."""

from django.db import migrations

AREAS = ("A", "B", "C", "D", "E")


def forwards(apps, schema_editor):
    Item = apps.get_model("warehouse", "WarehouseItem")
    for area in AREAS:
        Item.objects.filter(zone=area, donation__isnull=False).update(zone=f"1{area}")
        Item.objects.filter(zone=area, donation__isnull=True).update(zone=f"2{area}")


def backwards(apps, schema_editor):
    Item = apps.get_model("warehouse", "WarehouseItem")
    for floor in ("1", "2"):
        for area in AREAS:
            Item.objects.filter(zone=f"{floor}{area}").update(zone=area)


class Migration(migrations.Migration):
    dependencies = [("warehouse", "0002_inventory")]

    operations = [migrations.RunPython(forwards, backwards)]
