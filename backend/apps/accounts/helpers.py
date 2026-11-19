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
    # signing in within 30 days of deleting your own account brings it back
    from apps.core.account_deletion import restore_if_pending

    try:
        restore_if_pending(account)
    except Exception:  # noqa: BLE001  never block a sign-in over this
        import logging

        logging.getLogger(__name__).exception("restore after sign-in failed")


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


def login_alert(account, request):
    """Settings › Security › Sign-in alerts: email the member or ReMaker when someone signs in."""
    prefs = getattr(getattr(account, "profile", None), "notification_preferences", None) or {}
    if prefs.get("loginAlerts"):
        from apps.core.mailer import security_notice

        agent = (request.META.get("HTTP_USER_AGENT") or "")[:80]
        security_notice(account, "There was a new sign-in to your account" + (f" ({agent})" if agent else ""))


def password_problem(password, account=None):
    """"" when the new password is fine, otherwise one plain sentence saying what to change.

    Rules (settings.AUTH_PASSWORD_VALIDATORS): at least 8 characters, not only numbers, not a
    commonly used password, not too close to the email or name."""
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError

    if len(password or "") > 128:
        return "Use at most 128 characters."
    try:
        validate_password(password or "", user=account)
    except ValidationError as exc:
        return " ".join(exc.messages[:2])
    return ""
