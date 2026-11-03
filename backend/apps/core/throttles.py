from rest_framework.throttling import AnonRateThrottle


class AuthThrottle(AnonRateThrottle):
    """Login / register / refresh. Keyed by IP address."""

    scope = "auth"



class OTPSendThrottle(AnonRateThrottle):
    """Asking for a code to be emailed. Keyed by IP address."""

    scope = "otp_send"


class OTPVerifyThrottle(AnonRateThrottle):
    """Checking a code or using a reset token. Keyed by IP address."""

    scope = "otp_verify"
