"""The visitor's real IP address, which callers can't fake.

Why this exists
---------------
On Render every request passes through Cloudflare and Render's proxy before it reaches Django, so
REMOTE_ADDR is an internal proxy address. The usual place to look, X-Forwarded-For, can't be trusted
on its own: the proxies *append* to it, so whatever the caller wrote at the start stays there.
DRF's rate limits read that header as-is, and sending a different X-Forwarded-For on every request
used to dodge every IP-based limit (login, OTP, contact form).

What it does
------------
RealClientIPMiddleware runs first and replaces REMOTE_ADDR with the real visitor address, taken from
(in order):

1. A header set by the edge that callers can't forge. Cloudflare overwrites CF-Connecting-IP and
   True-Client-IP on every request. Configured with TRUSTED_IP_HEADERS (default on in production).
2. Otherwise X-Forwarded-For counted from the RIGHT: the entry TRUSTED_PROXY_COUNT places from the
   end is the one added by the first trusted proxy. Anything the caller wrote sits further left and
   is ignored.
3. Otherwise the original REMOTE_ADDR (local development, tests).

The original value is kept in request.META["REMOTE_ADDR_PROXY"]. Settings use NUM_PROXIES = 0 so
DRF reads REMOTE_ADDR and never X-Forwarded-For. Every rate limit and every audit-log "ip" in the
app now records the real visitor.
"""

import ipaddress
import logging

from django.conf import settings

log = logging.getLogger(__name__)
_reported = False


def _valid(value):
    value = (value or "").strip()
    if not value:
        return ""
    # "[2001:db8::1]:443" or "1.2.3.4:5678" -> bare address
    if value.startswith("[") and "]" in value:
        value = value[1:value.index("]")]
    elif value.count(":") == 1:
        value = value.split(":", 1)[0]
    try:
        return str(ipaddress.ip_address(value))
    except ValueError:
        return ""


def _resolve(meta):
    """-> (ip, where it came from)"""
    original = meta.get("REMOTE_ADDR_PROXY") or meta.get("REMOTE_ADDR") or ""

    for header in getattr(settings, "TRUSTED_IP_HEADERS", ()):
        ip = _valid(meta.get(header))
        if ip:
            return ip, header

    hops = int(getattr(settings, "TRUSTED_PROXY_COUNT", 0) or 0)
    xff = meta.get("HTTP_X_FORWARDED_FOR") or ""
    if hops > 0 and xff:
        parts = [p.strip() for p in xff.split(",") if p.strip()]
        if len(parts) >= hops:
            ip = _valid(parts[-hops])
            if ip:
                return ip, f"X-Forwarded-For[-{hops}]"

    return (_valid(original) or original), "REMOTE_ADDR"


def client_ip(request_or_meta):
    return _resolve(getattr(request_or_meta, "META", request_or_meta))[0]


class RealClientIPMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        meta = request.META
        if "REMOTE_ADDR_PROXY" not in meta:
            meta["REMOTE_ADDR_PROXY"] = meta.get("REMOTE_ADDR", "")
            ip, source = _resolve(meta)
            meta["REMOTE_ADDR"] = ip
            global _reported
            if not _reported and not settings.DEBUG:
                # once per worker: shows in the Render log which header gave the visitor's address.
                # "REMOTE_ADDR" here in production means no trusted header arrived (see HOW-TO-APPLY).
                _reported = True
                log.warning("client IP source: %s (proxy said %s)", source, meta["REMOTE_ADDR_PROXY"])
        return self.get_response(request)
