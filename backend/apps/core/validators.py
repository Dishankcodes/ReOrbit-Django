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
