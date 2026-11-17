from django.core.management.base import BaseCommand

from apps.notifications.announcements import deliver_due


class Command(BaseCommand):
    help = "Deliver scheduled admin announcements that are due. Safe to run every minute."

    def handle(self, *args, **opts):
        self.stdout.write(f"Delivered {deliver_due()} announcement(s).")
