"""Short-lived, signed password-reset token (the OTP logic lives in otp.py)."""

from django.core import signing

RESET_TOKEN_MAX_AGE_SECONDS = 600


def issue_reset_token(user_id, otp_id):
    return signing.dumps(
        {"user_id": user_id, "otp_id": otp_id},
        salt="reorbit.password-reset",
    )


def read_reset_token(token):
    return signing.loads(
        token, salt="reorbit.password-reset", max_age=RESET_TOKEN_MAX_AGE_SECONDS
    )
