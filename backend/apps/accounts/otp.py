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
from django.core.mail import send_mail
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
    if purpose == P.USER_REGISTER:
        return (
            "Verify your email for ReOrbit",
            "accounts/email_templates/otp_user_register.html",
        )
    if purpose == P.ADMIN_FORGOT_PASSWORD:
        # was missing: admin "Forgot password" failed with "Invalid OTP purpose." before any email went out
        return (
            "Reset your ReOrbit admin password",
            "accounts/email_templates/otp_user_forgot_password.html",
        )
    if purpose == P.PAYOUT_ACCOUNT:
        return (
            "Confirm your new payout details",
            "accounts/email_templates/otp_payout_account.html",
        )
    raise ValueError("Invalid OTP purpose.")


def _mailjet_configured():
    return bool(
        settings.MAILJET_API_KEY
        and settings.MAILJET_SECRET_KEY
        and (settings.MAILJET_SENDER_EMAIL or settings.EMAIL_SENDER)
    )


def _sender():
    return settings.EMAIL_SENDER or settings.MAILJET_SENDER_EMAIL


def _refused(name, response):
    # The provider's own reason (bad key, sender not verified, quota, account blocked...) goes in
    # the Render log so a failed email can be explained. Responses never contain the API keys.
    return RuntimeError(f"{name} refused the email: HTTP {response.status_code} {response.text[:400]}")


def _send_via_brevo(email, subject, text, html):
    response = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={"api-key": settings.BREVO_API_KEY, "accept": "application/json"},
        json={
            "sender": {"name": settings.EMAIL_SENDER_NAME, "email": _sender()},
            "to": [{"email": email}],
            "subject": subject,
            "htmlContent": html,
            "textContent": text,
        },
        timeout=(5, 20),
    )
    if response.status_code >= 400:
        raise _refused("Brevo", response)


def _send_via_resend(email, subject, text, html):
    response = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
        json={
            "from": f"{settings.EMAIL_SENDER_NAME} <{_sender()}>",
            "to": [email],
            "subject": subject,
            "html": html,
            "text": text,
        },
        timeout=(5, 20),
    )
    if response.status_code >= 400:
        raise _refused("Resend", response)


def _send_via_mailjet(email, subject, text, html):
    payload = {
        "Messages": [
            {
                "From": {"Email": _sender(), "Name": settings.EMAIL_SENDER_NAME},
                "To": [{"Email": email}],
                "Subject": subject,
                "TextPart": text,
                "HTMLPart": html,
            }
        ]
    }
    response = requests.post(
        settings.MAILJET_API_URL,
        auth=(settings.MAILJET_API_KEY, settings.MAILJET_SECRET_KEY),
        json=payload,
        timeout=(5, 20),
    )
    if response.status_code >= 400:
        raise _refused("Mailjet", response)
    messages = response.json().get("Messages", [])
    if not messages or messages[0].get("Status") != "success":
        raise RuntimeError(f"Mailjet did not accept the email: {str(messages)[:400]}")


_SENDERS = {"brevo": _send_via_brevo, "resend": _send_via_resend, "mailjet": _send_via_mailjet}


def email_providers():
    """The HTTPS email services that have keys, in the order they are tried.

    EMAIL_PROVIDERS (e.g. "brevo,mailjet") sets the order; without it: Brevo, Resend, Mailjet.
    If the first one refuses (blocked account, quota used up...), the next one is tried, so a
    second provider's keys work as a backup."""
    configured = {
        "brevo": bool(settings.BREVO_API_KEY and _sender()),
        "resend": bool(settings.RESEND_API_KEY and _sender()),
        "mailjet": _mailjet_configured(),
    }
    order = [p.strip().lower() for p in (settings.EMAIL_PROVIDERS or "brevo,resend,mailjet").split(",")]
    return [p for p in dict.fromkeys(order) if configured.get(p)]


def _deliver(email, subject, text, html):
    """Brevo / Resend / Mailjet over HTTPS when their keys are set (production; Render's free plan
    can't use SMTP). Otherwise Django's EMAIL_BACKEND: the console backend prints the code in the
    terminal locally, and tests read it from mail.outbox."""
    providers = email_providers()
    if not providers:
        send_mail(
            subject, text, settings.DEFAULT_FROM_EMAIL, [email],
            html_message=html, fail_silently=False,
        )
        return
    errors = []
    for name in providers:
        try:
            _SENDERS[name](email, subject, text, html)
        except Exception as exc:  # noqa: BLE001  try the next provider
            errors.append(exc)
            if name != providers[-1]:
                logger.warning("%s failed, trying the next email provider: %s", name, exc)
            continue
        logger.info("email accepted by %s for %s", name, email)
        return
    raise errors[-1] if len(errors) == 1 else RuntimeError(" | ".join(str(e) for e in errors))


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
        html = render_to_string(template_name, context)
        _deliver(email, subject, text, html)
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
