from django.core.management.base import BaseCommand

from apps.core.account_deletion import purge_due


class Command(BaseCommand):
    help = "Remove personal details of accounts deleted more than 30 days ago (run daily)."

    def handle(self, *args, **opts):
        self.stdout.write(f"Purged {purge_due()} account(s).")
