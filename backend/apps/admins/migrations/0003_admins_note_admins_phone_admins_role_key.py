from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("admins", "0002_admins_created_by_admins_last_login_at_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="admins",
            name="role_key",
            field=models.CharField(blank=True, default="custom", max_length=20),
        ),
        migrations.AddField(
            model_name="admins",
            name="phone",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.AddField(
            model_name="admins",
            name="note",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
