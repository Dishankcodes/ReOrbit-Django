from django.core.management.base import BaseCommand

from apps.payments.wallet import run_auto


class Command(BaseCommand):
    help = "If automatic payouts are ON, create payouts for every seller whose available balance reached the minimum. Run daily (cron)."

    def handle(self, *args, **options):
        r = run_auto()
        self.stdout.write(f"Created {r['created']} payout(s); {r['skipped_no_account']} seller(s) have no payout details yet.")
