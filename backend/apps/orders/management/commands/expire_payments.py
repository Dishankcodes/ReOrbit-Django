from django.core.management.base import BaseCommand

from apps.orders.services import expire_stale


class Command(BaseCommand):
    help = "Release stock held by online payments that were never completed. Run every few minutes (cron)."

    def handle(self, *args, **options):
        n = expire_stale(limit=1000)
        self.stdout.write(f"Released {n} unpaid hold(s).")
