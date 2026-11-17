"""Bring an old donations table up to the current layout.

Commit eeab601 rewrote 0001_initial in place (user -> donor, address -> pickup_address,
contact_phone -> phone, donation_photos -> donation_images, ...). A database that had already
applied the earlier 0001 kept the old columns, so creating a donation failed with
'column "donor_id" of relation "donations" does not exist'.

This migration does nothing on a database built from the current 0001 (it has donor_id).
On an old one it renames the old columns so existing rows are kept, adds the columns that are
missing, and drops the old columns the app no longer writes (some were NOT NULL, which would
make every new donation fail).
"""

from django.db import migrations

RENAMES = {
    "donations": {
        "user_id": "donor_id",
        "address": "pickup_address",
        "contact_phone": "phone",
        "partner": "partner_team",
        "points_awarded": "reward_points",
    },
}
OLD_INDEXES = {"don_user_created_idx": "don_donor_created_idx"}


def _columns(schema_editor, table):
    conn = schema_editor.connection
    with conn.cursor() as c:
        if table not in conn.introspection.table_names(c):
            return None
        return {col.name for col in conn.introspection.get_table_description(c, table)}


def _fit(schema_editor, model):
    """Add the model's missing columns and drop the ones it no longer has."""
    qn = schema_editor.quote_name
    table = model._meta.db_table
    have = _columns(schema_editor, table)
    for old, new in RENAMES.get(table, {}).items():
        if old in have and new not in have:
            schema_editor.execute(f"ALTER TABLE {qn(table)} RENAME COLUMN {qn(old)} TO {qn(new)}")
    have = _columns(schema_editor, table)
    fields = list(model._meta.local_concrete_fields)
    for f in fields:
        if f.column not in have:
            schema_editor.add_field(model, f)
    wanted = {f.column for f in fields}
    cascade = " CASCADE" if schema_editor.connection.vendor == "postgresql" else ""
    for col in sorted(have - wanted):
        schema_editor.execute(f"ALTER TABLE {qn(table)} DROP COLUMN {qn(col)}{cascade}")
    # old text columns were shorter or had no blank default; match the current lengths
    if schema_editor.connection.vendor == "postgresql":
        for f in fields:
            if f.get_internal_type() == "CharField" and f.max_length:
                schema_editor.execute(
                    f"ALTER TABLE {qn(table)} ALTER COLUMN {qn(f.column)} TYPE varchar({int(f.max_length)})"
                    f" USING left({qn(f.column)}, {int(f.max_length)})"
                )


def repair(apps, schema_editor):
    have = _columns(schema_editor, "donations")
    if have is None or "donor_id" in have:
        return  # fresh or already-current database: nothing to do
    qn = schema_editor.quote_name

    # photos table was renamed to donation_images
    if _columns(schema_editor, "donation_images") is None and _columns(schema_editor, "donation_photos") is not None:
        schema_editor.execute(f"ALTER TABLE {qn('donation_photos')} RENAME TO {qn('donation_images')}")

    for name in ("Donation", "DonationImage", "DonationEvent"):
        model = apps.get_model("donations", name)
        if _columns(schema_editor, model._meta.db_table) is None:
            schema_editor.create_model(model)
        else:
            _fit(schema_editor, model)

    if schema_editor.connection.vendor == "postgresql":
        for old, new in OLD_INDEXES.items():
            schema_editor.execute(f"ALTER INDEX IF EXISTS {qn(old)} RENAME TO {qn(new)}")


class Migration(migrations.Migration):
    dependencies = [
        ("donations", "0005_merge_20261117_1957"),
        ("rewards", "0001_initial"),
    ]

    operations = [migrations.RunPython(repair, migrations.RunPython.noop)]
