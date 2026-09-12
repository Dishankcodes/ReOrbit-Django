import secrets
from datetime import timedelta
from django.conf import settings
from django.core import signing
from django.core.mail import send_mail
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from .models import OTP_Verification

OTP_EXPIRY_MINUTES = 5


def generate_otp():
    return f"{secrets.randbelow(1_000_000):06d}"


def create_and_send_otp(email, purpose):
    OTP_Verification.objects.filter(
        email__iexact=email,
        purpose=purpose,
        is_verified=False,
    ).delete()

    otp = generate_otp()
    record = OTP_Verification.objects.create(
        email=email.lower().strip(),
        otp_hash=make_password(otp, hasher="bcrypt_sha256"),
        purpose=purpose,
        expires_at=timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES),
    )

    send_mail(
        subject="ReOrbit OTP Verification",
        message=f"Your ReOrbit OTP is {otp}. It expires in {OTP_EXPIRY_MINUTES} minutes.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )
    return record


def get_valid_otp(email, otp, purpose):
    record = (
        OTP_Verification.objects.filter(
            email__iexact=email.strip(),
            purpose=purpose,
            is_verified=False,
        )
        .order_by("-created_at")
        .first()
    )
    if not record:
        return None, "Invalid or expired OTP."
    if record.expires_at <= timezone.now():
        return None, "OTP has expired."
    if not check_password(otp, record.otp_hash):
        return None, "Invalid OTP."
    return record, None


def issue_reset_token(user_id, otp_id):
    return signing.dumps(
        {"user_id": user_id, "otp_id": otp_id},
        salt="reorbit.password-reset",
    )


def read_reset_token(token):
    return signing.loads(token, salt="reorbit.password-reset", max_age=600)
