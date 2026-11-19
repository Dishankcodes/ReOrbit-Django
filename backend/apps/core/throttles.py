"""Rate limits for sign-in, codes and public forms.

These counters live in the shared database cache (settings.CACHES["shared"]), so both gunicorn
workers count together and a restart, deploy or free-tier sleep doesn't reset them. The general
limits (120 a minute per visitor, 600 per signed-in account) stay in each worker's memory: they run
on every request, and a database round trip there would slow the whole app down.

"IP address" here is the real visitor (apps/core/client_ip.py), not X-Forwarded-For.
"""

from django.core.cache import caches
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle


class _Shared:
    @property
    def cache(self):
        return caches["shared"]


class AuthThrottle(_Shared, AnonRateThrottle):
    """Login / register / refresh / Google. Keyed by IP address."""

    scope = "auth"


class _PerEmailThrottle(_Shared, SimpleRateThrottle):
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


class OTPIPThrottle(_Shared, AnonRateThrottle):
    """Backstop against one IP trying many different emails."""

    scope = "otp_ip"
