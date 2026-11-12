from django.db import migrations


def drop_portfolio_photos(apps, schema_editor):
    apps.get_model("listings", "MediaImage").objects.filter(portfolio__isnull=False).delete()


class Migration(migrations.Migration):
    """Does nothing going forward. It only matters if you roll listings back below 0005:
    the old schema has no place for a photo that belongs to a portfolio work, so those
    rows are removed first (the image files stay on disk). It is its own migration so
    PostgreSQL does not mix this delete with the schema changes in one transaction."""

    dependencies = [("listings", "0005_mediaimage_portfolio")]

    operations = [migrations.RunPython(migrations.RunPython.noop, drop_portfolio_photos)]
