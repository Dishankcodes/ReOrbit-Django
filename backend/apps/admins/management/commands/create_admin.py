from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.admins.models import ADMIN_MODULES, Admins


class Command(BaseCommand):
    help = "Create a ReOrbit admin account."

    def add_arguments(self, parser):
        parser.add_argument("--name", required=True)
        parser.add_argument("--email", required=True)
        parser.add_argument("--password", required=True)
        parser.add_argument(
            "--permission-level", choices=["Admin", "Super_Admin"], default="Admin"
        )
        parser.add_argument(
            "--modules",
            default="",
            help="Comma list like orders:edit,users:view (ignored for Super_Admin).",
        )

    def handle(self, *args, **opts):
        email = opts["email"].strip().lower()
        if Admins.objects.filter(email__iexact=email).exists():
            raise CommandError("Admin email already exists.")
        try:
            validate_password(opts["password"])
        except ValidationError as exc:
            raise CommandError(" ".join(exc.messages))

        modules = {}
        for part in filter(None, (p.strip() for p in opts["modules"].split(","))):
            name, _, level = part.partition(":")
            if name not in ADMIN_MODULES or level not in ("none", "view", "edit"):
                raise CommandError(f"Bad module setting: {part}")
            modules[name] = level

        admin = Admins(
            full_name=opts["name"].strip(),
            email=email,
            permission_level=opts["permission_level"],
            modules=modules,
            activated_at=timezone.now(),
        )
        admin.set_password(opts["password"])
        admin.save()
        self.stdout.write(self.style.SUCCESS(f"Admin created: {admin.public_id} {email}"))
