from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("donations", "0003_seed_pickup_partners"),
    ]

    operations = [
        migrations.AddField(
            model_name="pickuppartner", name="area",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="pickuppartner", name="vehicle",
            field=models.CharField(blank=True, max_length=60),
        ),
        migrations.AddField(
            model_name="pickuppartner", name="capacity",
            field=models.PositiveSmallIntegerField(default=5, help_text="Pickups a day this team can take"),
        ),
        migrations.AddField(
            model_name="pickuppartner", name="note",
            field=models.CharField(blank=True, max_length=300),
        ),
        migrations.AddField(
            model_name="pickuppartner", name="paused_reason",
            field=models.CharField(blank=True, max_length=200),
        ),
    ]
