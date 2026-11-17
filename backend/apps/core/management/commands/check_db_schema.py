"""List tables whose columns don't match the models.

    python manage.py check_db_schema

Useful when a migration was edited after it had already been applied: Django thinks the
database is up to date, but a column the code writes is missing (a 500 with
'column "..." does not exist').
"""

from django.apps import apps
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Compare every model's columns with the real database tables."

    def handle(self, *args, **options):
        with connection.cursor() as c:
            tables = set(connection.introspection.table_names(c))
            problems = 0
            for model in apps.get_models():
                meta = model._meta
                if not meta.managed or meta.proxy:
                    continue
                table = meta.db_table
                if table not in tables:
                    self.stdout.write(self.style.ERROR(f"{meta.label}: table {table} is missing"))
                    problems += 1
                    continue
                have = {col.name for col in connection.introspection.get_table_description(c, table)}
                wanted = {f.column for f in meta.local_concrete_fields}
                missing, extra = sorted(wanted - have), sorted(have - wanted)
                if missing or extra:
                    problems += 1
                    line = f"{meta.label} ({table}):"
                    if missing:
                        line += f" missing {', '.join(missing)}"
                    if extra:
                        line += f"{';' if missing else ''} old columns {', '.join(extra)}"
                    self.stdout.write(self.style.ERROR(line))
        if problems:
            self.stdout.write(f"\n{problems} table(s) don't match. Run `python manage.py migrate` first; "
                              "if they're still listed, send this output.")
        else:
            self.stdout.write(self.style.SUCCESS("Every table matches the models."))
