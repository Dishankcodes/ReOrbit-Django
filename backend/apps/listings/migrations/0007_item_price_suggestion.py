import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("admins", "0005_adminitem_sell_fields"),
        ("listings", "0006_portfolio_photos_rollback"),
    ]

    operations = [
        migrations.AddField(
            model_name="item",
            name="suggested_price",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name="item",
            name="suggested_note",
            field=models.CharField(blank=True, max_length=300),
        ),
        migrations.AddField(
            model_name="item",
            name="suggested_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="item",
            name="suggested_by",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name="+", to="admins.admins",
            ),
        ),
        migrations.AddField(
            model_name="item",
            name="suggestion_status",
            field=models.CharField(
                blank=True, default="", max_length=10,
                choices=[("Pending", "Pending"), ("Accepted", "Accepted"), ("Declined", "Declined")],
            ),
        ),
    ]
