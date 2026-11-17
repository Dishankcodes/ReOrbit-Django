"""Add vouchers.used_checkout to databases that applied an older 0001_initial.

0001_initial was edited after some databases had already run it, so on those databases the
column the voucher-at-checkout code uses never got created. This adds it only when it's missing;
on a current database it does nothing.
"""

from django.db import migrations


def add_if_missing(apps, schema_editor):
    Voucher = apps.get_model("rewards", "Voucher")
    table = Voucher._meta.db_table
    conn = schema_editor.connection
    with conn.cursor() as c:
        cols = {col.name for col in conn.introspection.get_table_description(c, table)}
    field = Voucher._meta.get_field("used_checkout")
    if field.column not in cols:
        schema_editor.add_field(Voucher, field)


class Migration(migrations.Migration):
    dependencies = [("rewards", "0004_alter_voucher_status")]

    operations = [migrations.RunPython(add_if_missing, migrations.RunPython.noop)]
