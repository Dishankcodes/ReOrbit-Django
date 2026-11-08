"""One-time codes: generate, hash, email, verify.

Rules: secrets-based generator, bcrypt-hashed in the database, expires in 5
minutes, at most 5 wrong attempts then the code is burned, 60 second resend
cooldown, single use.
"""

import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
import requests
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone

from apps.accounts.models import OTP_Verification

logger = logging.getLogger(__name__)

OTP_EXPIRY_MINUTES = 5
MAX_ATTEMPTS = 5


class OTPCooldown(Exception):
    def __init__(self, wait_seconds):
        self.wait_seconds = wait_seconds
        super().__init__(f"Please wait {wait_seconds} seconds before requesting another code.")


class OTPSendError(Exception):
    pass


def _cooldown_seconds():
    return getattr(settings, "OTP_RESEND_COOLDOWN_SECONDS", 60)


def generate_otp():
    """Cryptographically secure 6-digit code."""
    return f"{secrets.randbelow(1_000_000):06d}"


def get_email_details(purpose):
    P = OTP_Verification.Purpose
    if purpose == P.REMAKER_REGISTER:
        return (
            "Verify your ReOrbit ReMaker account",
            "accounts/email_templates/otp_remaker_register.html",
        )
    if purpose == P.REMAKER_LOGIN:
        return (
            "Your ReOrbit ReMaker login code",
            "accounts/email_templates/otp_remaker_login.html",
        )
    if purpose == P.USER_FORGOT_PASSWORD:
        return (
            "Reset your ReOrbit password",
            "accounts/email_templates/otp_user_forgot_password.html",
        )
    raise ValueError("Invalid OTP purpose.")


def create_and_send_otp(email, purpose, account_type):
    """Create a code, email it, return {"message", "expires_in_minutes"}.

    Raises OTPCooldown if a code was sent less than 60 seconds ago and OTPSendError
    if the email could not be delivered.
    """
    email = email.strip().lower()
    now = timezone.now()

    cooldown = _cooldown_seconds()
    last = (
        OTP_Verification.objects.filter(email=email, purpose=purpose)
        .order_by("-created_at")
        .first()
    )
    if cooldown and last:
        elapsed = (now - last.created_at).total_seconds()
        if elapsed < cooldown:
            raise OTPCooldown(int(cooldown - elapsed) + 1)

    # Older unused codes for this email and purpose stop working.
    OTP_Verification.objects.filter(
        email=email, purpose=purpose, consumed_at__isnull=True
    ).update(consumed_at=now, expires_at=now)

    otp = generate_otp()
    record = OTP_Verification.objects.create(
        email=email,
        account_type=account_type,
        purpose=purpose,
        otp_hash=make_password(otp, hasher="bcrypt_sha256"),
        expires_at=now + timedelta(minutes=OTP_EXPIRY_MINUTES),
    )

    subject, template_name = get_email_details(purpose)
    context = {"otp": otp, "expiry_minutes": OTP_EXPIRY_MINUTES}
    text = (
        f"Your ReOrbit verification code is {otp}.\n\n"
        f"This code is valid for {OTP_EXPIRY_MINUTES} minutes.\n\n"
        "If you did not request this code, you can safely ignore this email."
    )
    try:
        if not settings.MAILJET_API_KEY or not settings.MAILJET_SECRET_KEY:
            raise RuntimeError("Mailjet API credentials are not configured.")

        if not settings.MAILJET_SENDER_EMAIL:
            raise RuntimeError("Mailjet sender email is not configured.")

        html = render_to_string(template_name, context)
        payload = {
            "Messages": [
                {
                    "From": {
                        "Email": settings.MAILJET_SENDER_EMAIL,
                        "Name": "ReOrbit",
                    },
                    "To": [{"Email": email}],
                    "Subject": subject,
                    "TextPart": text,
                    "HTMLPart": html,
                }
            ]
        }

        response = requests.post(
            settings.MAILJET_API_URL,
            auth=(
                settings.MAILJET_API_KEY,
                settings.MAILJET_SECRET_KEY,
            ),
            json=payload,
            timeout=(5, 20),
        )
        response.raise_for_status()

        result = response.json()
        messages = result.get("Messages", [])
        if not messages or messages[0].get("Status") != "success":
            raise RuntimeError("Mailjet did not accept the OTP email.")

        logger.info("OTP email accepted by Mailjet for %s", email)

    except Exception as exc:
        logger.exception("Could not send OTP email to %s: %s", email, exc)
        record.delete()
        raise OTPSendError("We could not send the email. Please try again.") from exc

    return {"message": "OTP sent successfully.", "expires_in_minutes": OTP_EXPIRY_MINUTES}


def verify_otp(email, otp, purpose):
    """Check the latest code. Returns (record, None) or (None, error_message).

    A correct code is marked verified (not yet consumed); call consume_otp() when
    the action it unlocks has succeeded.
    """
    email = email.strip().lower()
    otp = str(otp).strip()
    now = timezone.now()

    with transaction.atomic():
        record = (
            OTP_Verification.objects.select_for_update()
            .filter(
                email=email,
                purpose=purpose,
                is_verified=False,
                consumed_at__isnull=True,
            )
            .order_by("-created_at")
            .first()
        )
        if not record:
            return None, "Invalid or expired OTP."
        if now >= record.expires_at:
            return None, "OTP has expired. Please request a new OTP."

        if not check_password(otp, record.otp_hash):
            record.attempts += 1
            if record.attempts >= MAX_ATTEMPTS:
                record.consumed_at = now  # burned
                record.save(update_fields=["attempts", "consumed_at"])
                return None, "Too many wrong attempts. Please request a new OTP."
            record.save(update_fields=["attempts"])
            left = MAX_ATTEMPTS - record.attempts
            return None, f"Invalid OTP. {left} attempt{'s' if left != 1 else ''} left."

        record.is_verified = True
        record.save(update_fields=["is_verified"])
        return record, None


def consume_otp(record):
    """Mark a verified code as used. It can never be used again."""
    record.consumed_at = timezone.now()
    record.save(update_fields=["consumed_at"])
