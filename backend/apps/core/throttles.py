from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle


class AuthThrottle(AnonRateThrottle):
    """Login / register / refresh / Google. Keyed by IP address."""

    scope = "auth"


class _PerEmailThrottle(SimpleRateThrottle):
    """Counts per email address (falls back to the IP when the request has no email).

    So 5 tries for one person's email cannot be dodged by changing IP, and one
    person's tries do not lock out someone else on the same network."""

    def get_cache_key(self, request, view):
        email = ""
        try:
            email = str(request.data.get("email") or "").strip().lower()
        except Exception:
            pass
        ident = f"email:{email}" if email else f"ip:{self.get_ident(request)}"
        return self.cache_format % {"scope": self.scope, "ident": ident}


class OTPSendThrottle(_PerEmailThrottle):
    """Asking for a code to be emailed, including resend: 5 per minute per email."""

    scope = "otp_send"


class OTPVerifyThrottle(_PerEmailThrottle):
    """Checking a code (or using a reset token): 5 per minute per email."""

    scope = "otp_verify"


class OTPIPThrottle(AnonRateThrottle):
    """Backstop against one IP trying many different emails."""

    scope = "otp_ip"
