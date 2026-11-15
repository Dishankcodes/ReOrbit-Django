from django.db import migrations


def tidy(apps, schema_editor):
    PickupPartner = apps.get_model("donations", "PickupPartner")
    Donation = apps.get_model("donations", "Donation")
    Member = apps.get_model("pickups", "PickupTeamMember")
    # 1. the three made-up teams an earlier migration put in every database: drop the ones nobody used
    for t in PickupPartner.objects.filter(public_id__startswith="PTR-SEED-"):
        if not Donation.objects.filter(assigned_partner=t).exists():
            t.delete()
    # 2. every remaining team keeps its lead as a crew member, so the Pickup teams screen shows them
    for t in PickupPartner.objects.all():
        if t.lead_name and not Member.objects.filter(team=t).exists():
            Member.objects.create(team=t, name=t.lead_name, phone=t.phone or "", role="Lead", status="Active")


class Migration(migrations.Migration):

    dependencies = [("pickups", "0002_backfill_item_pickups")]

    operations = [migrations.RunPython(tidy, migrations.RunPython.noop)]
