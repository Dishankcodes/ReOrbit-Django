from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator

MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}

validate_pincode = RegexValidator(r"^\d{6}$", "Enter a valid 6-digit pincode.")
validate_phone = RegexValidator(
    r"^\+?\d[\d\s-]{6,18}$", "Enter a valid phone number."
)


def validate_image(file):
    """jpeg / png / webp, at most 5 MB. The real file type is checked, not the name."""
    from PIL import Image

    if file.size > MAX_IMAGE_BYTES:
        raise ValidationError("Image must be 5 MB or smaller.")
    try:
        image = Image.open(file)
        image.verify()
        fmt = image.format
    except Exception:
        raise ValidationError("Upload a valid image file.")
    finally:
        file.seek(0)
    if fmt not in ALLOWED_IMAGE_FORMATS:
        raise ValidationError("Only JPEG, PNG or WebP images are allowed.")
