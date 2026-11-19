from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator

MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}

validate_pincode = RegexValidator(r"^\d{6}$", "Enter a valid 6-digit pincode.")
# An Indian mobile: 10 digits starting 6-9, optionally after +91 / 91 / 0 (spaces and dashes allowed).
# Same rule as frontend/src/shared/phone.js, which saves "+91 98765 43210".
validate_phone = RegexValidator(
    r"^(?:(?:\+?91)[\s-]?|0)?[6-9](?:[\s-]?\d){9}$", "Enter a 10-digit mobile number."
)


# Photos larger than this many pixels are refused before they are decoded (a tiny file can claim
# to be 50,000 x 50,000 pixels and eat the server's memory). 40 MP covers every phone camera.
MAX_IMAGE_PIXELS = 40_000_000


def validate_image(file):
    """JPEG (.jpg / .jpeg), PNG or WebP, at most 5 MB. The real file type is checked, not the name.

    Only the JPEG, PNG and WebP readers are allowed to look at the file (formats=...), so an upload
    never reaches Pillow's TIFF, BMP, GIF... readers, where most image-library security bugs live."""
    from PIL import Image

    if file.size > MAX_IMAGE_BYTES:
        raise ValidationError("Image must be 5 MB or smaller.")
    try:
        image = Image.open(file, formats=sorted(ALLOWED_IMAGE_FORMATS))
        width, height = image.size
        if width * height > MAX_IMAGE_PIXELS:
            raise ValidationError("This photo is too large. Please use a photo under 40 megapixels.")
        image.verify()
        fmt = image.format
    except ValidationError:
        raise
    except Exception:
        raise ValidationError("Only JPEG (.jpg), PNG or WebP images are allowed.")
    finally:
        file.seek(0)
    if fmt not in ALLOWED_IMAGE_FORMATS:
        raise ValidationError("Only JPEG (.jpg), PNG or WebP images are allowed.")


# ReOrbit serves Gujarat only. Gujarat pincodes run 360001-396590; 396210-396240
# is Daman / Dadra & Nagar Haveli (not Gujarat).
GUJARAT_PINCODE_RANGE = (360001, 396590)
NON_GUJARAT_PINCODE_RANGE = (396210, 396240)
GUJARAT_ONLY_MESSAGE = "ReOrbit is available inside Gujarat only. Enter a Gujarat pincode."


def is_gujarat_pincode(value):
    value = str(value or "").strip()
    if not value.isdigit() or len(value) != 6:
        return False
    number = int(value)
    low, high = GUJARAT_PINCODE_RANGE
    bad_low, bad_high = NON_GUJARAT_PINCODE_RANGE
    return low <= number <= high and not (bad_low <= number <= bad_high)


def validate_gujarat_pincode(value):
    """Empty is allowed (the field is optional); anything filled in must be Gujarat."""
    if value in (None, ""):
        return value
    if not str(value).strip().isdigit() or len(str(value).strip()) != 6:
        raise ValidationError("Enter a valid 6-digit pincode.")
    if not is_gujarat_pincode(value):
        raise ValidationError(GUJARAT_ONLY_MESSAGE)
    return str(value).strip()


def validate_gujarat_state(value):
    if value in (None, ""):
        return value
    if str(value).strip().lower() != "gujarat":
        raise ValidationError(GUJARAT_ONLY_MESSAGE)
    return "Gujarat"


def validate_gujarat_city(value):
    from apps.core.gujarat import canonical_city

    if value in (None, ""):
        return value
    city = canonical_city(value)
    if not city:
        raise ValidationError("Choose one of the Gujarat cities from the list.")
    return city
