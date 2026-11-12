"""Remove portfolio works that were deleted more than 7 days ago, with their photos.

    python manage.py purge_portfolio          (run it daily, e.g. from a scheduler)
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.core.images import delete_file
from apps.portfolio.models import PortfolioEntry
from apps.portfolio.views import RESTORE_DAYS


class Command(BaseCommand):
    help = "Permanently remove portfolio works deleted more than a week ago."

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=RESTORE_DAYS)
        removed = 0
        for entry in PortfolioEntry.objects.filter(deleted_at__lt=cutoff).prefetch_related("images"):
            with transaction.atomic():
                files = [image.image for image in entry.images.all()]
                entry.delete()  # the photo rows go with it
                for field_file in files:
                    transaction.on_commit(lambda f=field_file: delete_file(f))
            removed += 1
        self.stdout.write(f"Removed {removed} deleted portfolio work(s).")
