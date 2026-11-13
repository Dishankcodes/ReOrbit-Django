from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("admins", "0004_adminitem"),
    ]

    operations = [
        migrations.AddField(model_name="adminitem", name="mrp", field=models.DecimalField(blank=True, decimal_places=2, help_text="Original price, shown struck through", max_digits=12, null=True)),
        migrations.AddField(model_name="adminitem", name="condition", field=models.CharField(blank=True, max_length=20)),
        migrations.AddField(model_name="adminitem", name="source", field=models.CharField(default="other", help_text="warehouse | refurbished | other", max_length=12)),
        migrations.AddField(model_name="adminitem", name="inventory_id", field=models.CharField(blank=True, help_text="Warehouse stock this was listed from, if any", max_length=40)),
        migrations.AddField(model_name="adminitem", name="specs", field=models.JSONField(blank=True, default=dict, help_text="material, dimensions, weight (kg), warranty")),
        migrations.AddField(model_name="adminitem", name="delivery", field=models.CharField(default="flat", help_text="free | flat", max_length=8)),
        migrations.AddField(model_name="adminitem", name="view_count", field=models.PositiveIntegerField(default=0, help_text="Times the public product page was opened")),
        migrations.AddField(model_name="adminitem", name="returnable", field=models.BooleanField(default=True)),
    ]
