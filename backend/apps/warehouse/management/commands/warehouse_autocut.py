"""Cut the price of slow-moving listed stock, when Admin > Settings > Warehouse has
"automatic price cuts" switched on. Run once a day:

    python manage.py warehouse_autocut
"""

from django.core.management.base import BaseCommand

from apps.warehouse import services


class Command(BaseCommand):
    help = "Apply automatic price cuts to slow-moving warehouse stock."

    def handle(self, *args, **options):
        cut = services.auto_price_cuts()
        self.stdout.write(f"Cut the price of {len(cut)} item(s)." if cut else "Nothing to cut.")
