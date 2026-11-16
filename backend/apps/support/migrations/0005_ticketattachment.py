import apps.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("support", "0004_supportticketadminread_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="TicketAttachment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("image", models.ImageField(upload_to="support/", validators=[apps.core.validators.validate_image])),
                ("message", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attachments", to="support.ticketmessage")),
            ],
            options={
                "db_table": "support_ticket_attachments",
                "ordering": ["id"],
            },
        ),
    ]
