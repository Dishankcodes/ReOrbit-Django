from django.core.management.base import BaseCommand

from apps.orders.services import auto_confirm_due


class Command(BaseCommand):
    help = "Remind buyers, then mark shipped courier orders delivered after AUTO_CONFIRM_DAYS (runs by itself hourly)."

    def handle(self, *args, **opts):
        self.stdout.write(f"Auto-confirmed {auto_confirm_due()} order(s).")
