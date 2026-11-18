"""Copy every file in the local uploads/ folder to Cloudinary, keeping its name.

Run once when you switch production to Cloudinary, from a machine that has the old files:

    USE_CLOUDINARY=True python manage.py upload_media_to_cloudinary --dry-run   # see what would go up
    USE_CLOUDINARY=True python manage.py upload_media_to_cloudinary

Names stay the same ("listings/chair.jpg"), so every database row keeps working. Safe to run
again: a file is simply uploaded over itself.
"""

from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError

from apps.core.cloudinary_storage import CloudinaryMediaStorage

SKIP_DIRS = {"health"}  # the system-status check's throwaway files


class Command(BaseCommand):
    help = "Upload the local uploads/ folder to Cloudinary, keeping file names."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Only list what would be uploaded.")
        parser.add_argument("--only", default="", help="Only this top folder, e.g. listings")

    def handle(self, *args, dry_run=False, only="", **opts):
        if not settings.CLOUDINARY_READY:
            raise CommandError("Set CLOUDINARY_URL (or the three CLOUDINARY_* keys) first.")
        root = Path(settings.MEDIA_ROOT)
        if not root.exists():
            raise CommandError(f"No local uploads folder at {root}.")
        storage = CloudinaryMediaStorage()
        done = failed = 0
        for path in sorted(p for p in root.rglob("*") if p.is_file()):
            name = path.relative_to(root).as_posix()
            top = name.split("/", 1)[0]
            if top in SKIP_DIRS or (only and top != only) or path.name.startswith("."):
                continue
            if dry_run:
                self.stdout.write(f"would upload {name}")
                done += 1
                continue
            try:
                with path.open("rb") as fh:
                    storage._save(name, File(fh, name=path.name))  # same name, no random suffix
                done += 1
                self.stdout.write(f"uploaded {name}")
            except Exception as e:  # noqa: BLE001 - keep going, report at the end
                failed += 1
                self.stderr.write(f"failed {name}: {e}")
        verb = "would upload" if dry_run else "uploaded"
        self.stdout.write(self.style.SUCCESS(f"{verb} {done} file(s)" + (f", {failed} failed" if failed else "")))
