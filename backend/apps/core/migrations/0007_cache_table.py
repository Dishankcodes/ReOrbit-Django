"""Creates the database cache table (settings.CACHES["shared"]: rate limits and login locks).

The same as running `python manage.py createcachetable`, but done by `migrate`, so nothing extra
has to run on Render. Safe to run again: an existing table is left alone.
"""

from django.core.management import call_command
from django.db import migrations


def create_table(apps, schema_editor):
    call_command("createcachetable", database=schema_editor.connection.alias, verbosity=0)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0006_alter_savedaddress_phone"),
    ]

    operations = [
        migrations.RunPython(create_table, migrations.RunPython.noop),
    ]
