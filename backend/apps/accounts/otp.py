import random
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import (
    make_password,
    check_password,
)
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

from apps.accounts.models import OTP_Verification

#
# OTP CONFIGURATION
#

OTP_EXPIRY_MINUTES = 5


#
# OTP GENERATION
#


def generate_otp():
    """
    Generate a secure 6-digit OTP.

    Example:
        483921
    """

    return f"{random.randint(100000, 999999)}"


#
# EMAIL DETAILS
#


def get_email_details(purpose):
    """
    Return the email subject and HTML template
    according to the OTP purpose.
    """

    if purpose == OTP_Verification.Purpose.REMAKER_REGISTER:
        return (
            "Verify your ReOrbit ReMaker account",
            "accounts/email_templates/otp_remaker_register.html",
        )

    if purpose == OTP_Verification.Purpose.REMAKER_LOGIN:
        return (
            "Your ReOrbit ReMaker login code",
            "accounts/email_templates/otp_remaker_login.html",
        )

    if purpose == OTP_Verification.Purpose.USER_FORGOT_PASSWORD:
        return (
            "Reset your ReOrbit password",
            "accounts/email_templates/otp_user_forgot_password.html",
        )

    raise ValueError("Invalid OTP purpose.")


#
# CREATE + STORE + SEND OTP
#


def create_and_send_otp(email, purpose):
    """
    Generate, hash, store and send an OTP through SMTP.

    OTP itself is NEVER stored in the database.
    Only the hashed OTP is stored.

    Returns:
        {
            "message": "OTP sent successfully.",
            "expires_in_minutes": 5
        }
    """

    # Normalize email

    email = email.strip().lower()

    # Invalidate previous unverified OTPs
    # for the same email and purpose

    OTP_Verification.objects.filter(
        email=email,
        purpose=purpose,
        is_verified=False,
    ).update(expires_at=timezone.now())

    # Generate OTP

    otp = generate_otp()

    # Hash OTP

    otp_hash = make_password(
        otp,
        hasher="bcrypt_sha256",
    )

    # Calculate expiry

    expires_at = timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    # Store OTP verification record

    OTP_Verification.objects.create(
        email=email,
        otp_hash=otp_hash,
        purpose=purpose,
        expires_at=expires_at,
        is_verified=False,
    )

    # Get email subject + template

    subject, template_name = get_email_details(purpose)

    # Email template context

    context = {
        "otp": otp,
        "expiry_minutes": OTP_EXPIRY_MINUTES,
    }

    # Render HTML email

    html_message = render_to_string(
        template_name,
        context,
    )

    # Plain-text fallback

    text_message = (
        f"Your ReOrbit verification code is {otp}.\n\n"
        f"This code is valid for "
        f"{OTP_EXPIRY_MINUTES} minutes.\n\n"
        "If you did not request this code, "
        "you can safely ignore this email."
    )

    # Create email

    email_message = EmailMultiAlternatives(
        subject=subject,
        body=text_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email],
    )

    # Attach HTML version

    email_message.attach_alternative(
        html_message,
        "text/html",
    )

    # Send through SMTP

    email_message.send(fail_silently=False)

    # Response

    return {
        "message": "OTP sent successfully.",
        "expires_in_minutes": OTP_EXPIRY_MINUTES,
    }


# VERIFY OTP


def verify_otp(email, otp, purpose):
    """
    Verify the latest valid OTP.

    Returns:

        Success:
            (otp_record, None)

        Failure:
            (None, error_message)
    """

    # Normalize values

    email = email.strip().lower()
    otp = str(otp).strip()

    # Find latest unverified OTP

    otp_record = (
        OTP_Verification.objects.filter(
            email=email,
            purpose=purpose,
            is_verified=False,
        )
        .order_by("-created_at")
        .first()
    )

    # OTP does not exist

    if not otp_record:
        return (
            None,
            "Invalid or expired OTP.",
        )

    # Check expiry

    if timezone.now() >= otp_record.expires_at:
        return (
            None,
            "OTP has expired. Please request a new OTP.",
        )

    # Compare entered OTP with stored hash

    if not check_password(
        otp,
        otp_record.otp_hash,
    ):
        return (
            None,
            "Invalid OTP.",
        )

    # Mark OTP as verified

    otp_record.is_verified = True

    otp_record.save(
        update_fields=[
            "is_verified",
        ]
    )

    # Return verified OTP record

    return (
        otp_record,
        None,
    )
