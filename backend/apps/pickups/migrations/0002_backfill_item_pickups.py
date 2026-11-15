from django.db import migrations


def backfill(apps, schema_editor):
    """Listings that are already live with "Managed by ReOrbit" get their pickup request now."""
    from apps.core.ids import next_public_id

    Item = apps.get_model("listings", "Item")
    PickupRequest = apps.get_model("pickups", "PickupRequest")
    PickupEvent = apps.get_model("pickups", "PickupEvent")
    live = Item.objects.filter(pickup_preference="Platform_Pickup", item_status__in=["Listed", "Reserved"],
                               deleted_at__isnull=True, pickup_request__isnull=True).select_related("user")
    for item in live:
        profile = getattr(item.user, "profile", None)
        # historical models skip PublicIdModel.save(), so the id is assigned here
        r = PickupRequest.objects.create(
            public_id=next_public_id("PKR"), item=item, user=item.user,
            address_snapshot={"line": getattr(profile, "address", "") or "", "city": getattr(profile, "city", "") or "",
                              "state": getattr(profile, "state", "") or "", "pincode": getattr(profile, "pincode", "") or "",
                              "phone": getattr(profile, "phone", "") or ""})
        PickupEvent.objects.create(request=r, label="Pickup requested",
                                   detail=f"{item.user.full_name} chose “Managed by ReOrbit”", actor="user")


class Migration(migrations.Migration):

    dependencies = [("pickups", "0001_initial")]

    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
