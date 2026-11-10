from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_platformsettings_payouts"),
        ("admins", "0004_adminitem"),
    ]

    operations = [
        migrations.RemoveConstraint("savedaddress", "saved_address_exactly_one_owner"),
        migrations.AddField("savedaddress", "admin", models.ForeignKey(
            blank=True, null=True, on_delete=models.deletion.CASCADE, related_name="saved_addresses", to="admins.admins")),
        migrations.AddConstraint("savedaddress", models.CheckConstraint(condition=(
            (models.Q(user__isnull=False) & models.Q(remaker__isnull=True) & models.Q(admin__isnull=True))
            | (models.Q(user__isnull=True) & models.Q(remaker__isnull=False) & models.Q(admin__isnull=True))
            | (models.Q(user__isnull=True) & models.Q(remaker__isnull=True) & models.Q(admin__isnull=False))),
            name="saved_address_exactly_one_owner")),
        migrations.AddConstraint("savedaddress", models.UniqueConstraint(
            fields=["admin"], condition=models.Q(is_default=True, admin__isnull=False),
            name="saved_address_one_default_per_admin")),
    ]
