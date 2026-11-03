"""Small helpers shared by the user and ReMaker auth views."""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.utils import timezone

from apps.core.responses import fail

from .otp import OTPCooldown, OTPSendError, create_and_send_otp


def clean_email(value):
    return (value or "").strip().lower()


def is_valid_email(value):
    try:
        validate_email(value or "")
        return True
    except DjangoValidationError:
        return False


def touch_login(account):
    account.last_login_at = timezone.now()
    account.save(update_fields=["last_login_at"])


def send_otp_or_error(email, purpose, account_type):
    """Returns (result, None) or (None, error_response)."""
    try:
        return create_and_send_otp(email, purpose, account_type), None
    except OTPCooldown as exc:
        response = fail(str(exc), status=429, code="OTP_COOLDOWN")
        response.data["retry_after"] = exc.wait_seconds
        return None, response
    except OTPSendError as exc:
        return None, fail(str(exc), status=503, code="EMAIL_FAILED")
