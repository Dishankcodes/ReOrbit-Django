import secrets

from django.db import migrations


TEAMS = [
    ("PTR-SEED-A", "Pickup team A", "Ravi Kumar", "+91 98250 41011"),
    ("PTR-SEED-B", "Pickup team B", "Imran Qureshi", "+91 98251 52021"),
    ("PTR-SEED-C", "Pickup team C", "Sunita Devi", "+91 98252 63031"),
]


def seed(apps, schema_editor):
    # No longer seeds anything: the three made-up teams were placeholders from before Admin > Pickup teams
    # could create real ones. Existing databases that already got them are cleaned up by
    # pickups.0003_remove_unused_seed_teams. (Left as a no-op so migration history stays valid.)
    return
    PickupPartner = apps.get_model("donations", "PickupPartner")
    # apps.get_model gives a historical model: neither the custom save() override nor
    # PublicIdModel's save() (which assigns public_id from the shared counter) run here, so
    # both the token and a fixed public_id are set explicitly instead of left to defaults.
    for public_id, name, lead_name, phone in TEAMS:
        if not PickupPartner.objects.filter(name=name).exists():
            PickupPartner.objects.create(
                public_id=public_id, name=name, lead_name=lead_name, phone=phone,
                token=secrets.token_urlsafe(24), status="Active")


def unseed(apps, schema_editor):
    PickupPartner = apps.get_model("donations", "PickupPartner")
    PickupPartner.objects.filter(name__in=[name for _, name, _, _ in TEAMS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("donations", "0002_pickup_partners_and_verification"),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
