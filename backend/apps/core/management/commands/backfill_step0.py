"""One-off, safe to re-run: give existing rows a public_id and lower-case emails.

    python manage.py backfill_step0
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.admins.models import Admins
from apps.remakers.models import ReMakers
from apps.users.models import Users


class Command(BaseCommand):
    help = "Backfill public_id and normalise emails on existing accounts."

    def handle(self, *args, **options):
        for model in (Users, ReMakers, Admins):
            name = model.__name__
            with transaction.atomic():
                for obj in model.objects.filter(public_id__isnull=True).order_by("pk"):
                    obj.save()  # PublicIdModel.save assigns the id
                for obj in model.objects.all():
                    if obj.email != obj.email.strip().lower():
                        obj.email = obj.email  # save() lower-cases it
                        obj.save(update_fields=["email"])
            self.stdout.write(self.style.SUCCESS(f"{name}: done"))
