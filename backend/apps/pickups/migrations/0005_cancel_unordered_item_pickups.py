"""Pickups now start only when an item is ordered.

Before, a "Managed by ReOrbit" listing got a pickup (PK-I…) as soon as it went live, and then a second
one (PKR-…) when it was ordered: the same item twice in Admin › Pickups. This closes the listing
pickups nobody has scheduled yet (status Requested). Scheduled or finished ones are left alone, so
a team that is already on its way is not affected.
"""

from django.db import migrations
from django.utils import timezone

REASON = "Pickups now start when the item is ordered"


def close_unscheduled(apps, schema_editor):
    PickupRequest = apps.get_model("pickups", "PickupRequest")
    PickupEvent = apps.get_model("pickups", "PickupEvent")
    rows = list(PickupRequest.objects.filter(item__isnull=False, order__isnull=True, status="Requested"))
    for r in rows:
        r.status, r.cancel_reason, r.updated_at = "Cancelled", REASON, timezone.now()
        r.save(update_fields=["status", "cancel_reason", "updated_at"])
        PickupEvent.objects.create(request=r, label="Pickup cancelled", detail=REASON, tone="bad", actor="system")


class Migration(migrations.Migration):

    dependencies = [
        ("pickups", "0004_pickuprequest_order_pickuprequest_remaker_and_more"),
    ]

    operations = [
        migrations.RunPython(close_unscheduled, migrations.RunPython.noop),
    ]
