"""Safe handling for uploaded pictures (profile photo, cover).

The upload is checked (jpeg/png/webp, 5 MB), turned upright, stripped of
metadata such as GPS location, shrunk to a sensible size and saved under a
random name, so the original file name never reaches the disk.
"""

import io
import uuid

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

EXTENSIONS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}


def process_image(file, max_side=1024):
    """Return a ContentFile with a clean copy of the uploaded image."""
    image = Image.open(file)
    fmt = image.format if image.format in EXTENSIONS else "JPEG"
    image = ImageOps.exif_transpose(image)
    image.thumbnail((max_side, max_side))
    if fmt == "JPEG" and image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    buffer = io.BytesIO()
    save_kwargs = {"quality": 88} if fmt in ("JPEG", "WEBP") else {}
    image.save(buffer, format=fmt, **save_kwargs)  # no exif is written
    return ContentFile(buffer.getvalue(), name=f"{uuid.uuid4().hex}.{EXTENSIONS[fmt]}")


def delete_file(field_file):
    """Remove a stored file (ignored when there is none)."""
    if field_file and field_file.name:
        field_file.storage.delete(field_file.name)
