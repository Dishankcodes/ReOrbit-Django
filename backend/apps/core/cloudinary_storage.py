"""Uploads on Cloudinary (production). Development keeps saving to the local uploads/ folder.

Switched on in settings when DJANGO_ENV=production and the Cloudinary keys are set
(CLOUDINARY_URL, or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET).

How names map to Cloudinary
---------------------------
The database keeps the same kind of name as before ("listings/chair_a1b2c3.jpg"), so nothing
else in the app changes and old rows keep working.

  image (jpg, png, webp, ...)  ->  public id "<folder>/listings/chair_a1b2c3", format jpg
  anything else (pdf, txt)     ->  "raw" file, public id "<folder>/certificates/CERT-1.pdf"

<folder> is CLOUDINARY_FOLDER (default "reorbit"), so ReOrbit's files sit together in the
Media Library. URLs are built locally (no API call per image), e.g.
https://res.cloudinary.com/<cloud>/image/upload/reorbit/listings/chair_a1b2c3.jpg

Existing local files can be copied up once with `python manage.py upload_media_to_cloudinary`;
they keep their names, so the database needs no change.
"""

import io
import logging
import mimetypes
import os
import uuid

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible

log = logging.getLogger(__name__)

IMAGE_EXTS = {"jpg", "jpeg", "png", "webp", "gif", "avif", "bmp", "tif", "tiff", "heic", "heif", "svg"}


def _configure():
    import cloudinary

    url = (getattr(settings, "CLOUDINARY_URL", "") or "").strip()
    if url:
        os.environ.setdefault("CLOUDINARY_URL", url)
        cloudinary.reset_config()
        cloudinary.config(secure=True)
    else:
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )


def split(name):
    """Stored name -> (public_id, resource_type, format)."""
    name = str(name).replace("\\", "/").lstrip("/")
    root = (getattr(settings, "CLOUDINARY_FOLDER", "reorbit") or "").strip("/")
    full = f"{root}/{name}" if root else name
    base, dot, ext = full.rpartition(".")
    ext = ext.lower() if dot else ""
    if dot and ext in IMAGE_EXTS:
        return base, "image", ("jpg" if ext == "jpeg" else ext)
    return full, "raw", ""


@deconstructible
class CloudinaryMediaStorage(Storage):
    """Django storage for user uploads (listings, donations, profiles, returns, certificates...)."""

    def __init__(self):
        self._ready = False

    def _sdk(self):
        if not self._ready:
            _configure()
            self._ready = True
        import cloudinary.uploader
        import cloudinary.utils

        return cloudinary

    # ----------------------------------------------------------------- names
    def get_available_name(self, name, max_length=None):
        """Every new upload gets a short random suffix, so a name is never taken and Django doesn't
        have to ask Cloudinary whether it exists (one API call saved per upload)."""
        name = str(name).replace("\\", "/")
        folder, _, filename = name.rpartition("/")
        stem, dot, ext = filename.rpartition(".")
        if not dot:
            stem, ext = filename, ""
        tag = uuid.uuid4().hex[:8]
        keep = (max_length or 255) - len(folder) - len(ext) - len(tag) - 4
        stem = (stem or "file")[: max(8, keep)]
        new = f"{stem}_{tag}" + (f".{ext}" if ext else "")
        return f"{folder}/{new}" if folder else new

    # ----------------------------------------------------------------- write / delete
    def _save(self, name, content):
        sdk = self._sdk()
        public_id, rtype, _fmt = split(name)
        if hasattr(content, "seek"):
            content.seek(0)
        data = content.read()
        sdk.uploader.upload(
            io.BytesIO(data),
            public_id=public_id,
            resource_type=rtype,
            type="upload",
            overwrite=True,
            invalidate=True,
            unique_filename=False,
            use_filename=False,
        )
        return str(name).replace("\\", "/")

    def delete(self, name):
        if not name:
            return
        sdk = self._sdk()
        public_id, rtype, _fmt = split(name)
        try:
            sdk.uploader.destroy(public_id, resource_type=rtype, invalidate=True)
        except Exception:  # noqa: BLE001 - a missing file is not an error worth stopping for
            log.warning("cloudinary: could not delete %s", name, exc_info=True)

    # ----------------------------------------------------------------- read
    def url(self, name):
        if not name:
            return ""
        if str(name).startswith(("http://", "https://")):
            return str(name)
        sdk = self._sdk()
        public_id, rtype, fmt = split(name)
        opts = {"resource_type": rtype, "type": "upload", "secure": True}
        if fmt:
            opts["format"] = fmt
        return sdk.utils.cloudinary_url(public_id, **opts)[0]

    def _open(self, name, mode="rb"):
        """Download the file (certificate PDFs are streamed back through the API)."""
        import requests

        r = requests.get(self.url(name), timeout=20)
        r.raise_for_status()
        f = ContentFile(r.content, name=os.path.basename(str(name)))
        f.content_type = r.headers.get("Content-Type") or mimetypes.guess_type(str(name))[0]
        return f

    def exists(self, name):
        """Only asked for names we didn't generate ourselves; check with one API call."""
        if not name:
            return False
        sdk = self._sdk()
        public_id, rtype, _fmt = split(name)
        try:
            import cloudinary.api

            cloudinary.api.resource(public_id, resource_type=rtype)
            return True
        except Exception:  # noqa: BLE001 - "not found" and network trouble both mean "go ahead"
            return False

    def size(self, name):
        sdk = self._sdk()  # noqa: F841 - makes sure the SDK is configured
        public_id, rtype, _fmt = split(name)
        import cloudinary.api

        return int(cloudinary.api.resource(public_id, resource_type=rtype).get("bytes") or 0)

    def path(self, name):
        raise NotImplementedError("Files on Cloudinary have no local path; use .url or .open().")
