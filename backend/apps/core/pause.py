"""Pause switches (Super Admin › System): turn a whole side of ReOrbit off and on again.

    user     members and the public shop (guests): every member screen shows "paused"
    remaker  ReMakers
    admin    every admin except Super Admins

Stored in PlatformSettings.platform_settings["paused"]. While a side is paused its API calls get
503 {"code": "PAUSED"} straight from this middleware: no sign-in lookup and no database query, so
a paused side costs Render and Neon nothing. The apps also stop calling the server themselves and
show a "paused" screen (frontend: shared/pause.js).

Always open, whatever is paused: the pause status itself, token refresh / sign out, admin sign-in
(a Super Admin must always be able to get in) and the Razorpay webhook (payments already made must
still be recorded).

The switches are read from memory and re-read from the database at most every CACHE_SECONDS per
server process (and right away in the process that changed them), so turning a side off or on
reaches every server process within that time.
"""

import re
import threading
import time

from django.http import JsonResponse

SIDES = ("user", "remaker", "admin")
CACHE_SECONDS = 20
MESSAGE = {
    "user": "ReOrbit is paused for a short while. Please come back a little later.",
    "remaker": "The ReMaker studio is paused for a short while. Please come back a little later.",
    "admin": "The admin panel is paused by a Super Admin. Please check back later.",
}

ALWAYS_OPEN = (
    "/api/core/status/",
    "/api/auth/token/refresh/",
    "/api/auth/logout/",
    "/api/payments/webhook/",
    "/api/admins/auth/",
)

_lock = threading.Lock()
_cache = {"at": -1e9, "flags": {s: False for s in SIDES}, "ver": 0}
_supers = {}  # admin pk -> (checked_at, is_super)


def _read():
    from apps.core.models import PlatformSettings

    row = PlatformSettings.objects.filter(pk=1).values_list("platform_settings", flat=True).first() or {}
    stored = (row or {}).get("paused") or {}
    return {s: bool(stored.get(s)) for s in SIDES}


def flags(force=False):
    """{"user": bool, "remaker": bool, "admin": bool}"""
    now = time.monotonic()
    if force or now - _cache["at"] > CACHE_SECONDS:
        try:
            value = _read()
        except Exception:  # noqa: BLE001 - no database answer: keep the last known switches
            value = _cache["flags"]
        with _lock:
            _cache.update(at=now, flags=value)
    return dict(_cache["flags"])


def forget():
    """Called when the settings row is saved, so this process sees new switches at once."""
    with _lock:
        _cache["at"] = -1e9
        _cache["ver"] += 1


def version():
    """Changes every time the settings row is saved in this process (lets other caches notice)."""
    return _cache["ver"]


def any_paused():
    return any(flags().values())


def _token_side(request):
    """(account_type, account_id) from the access token, checked but without a database lookup."""
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return None, None
    try:
        from rest_framework_simplejwt.tokens import AccessToken

        token = AccessToken(header.split(" ", 1)[1].strip())
        return token.get("account_type"), token.get("account_id")
    except Exception:  # noqa: BLE001 - a bad token is the sign-in check's business, not ours
        return None, None


def _is_super(admin_id):
    now = time.monotonic()
    hit = _supers.get(admin_id)
    if hit and now - hit[0] < 60:
        return hit[1]
    from apps.admins.models import Admins

    level = Admins.objects.filter(pk=admin_id).values_list("permission_level", flat=True).first()
    value = level == Admins.PermissionLevel.SUPER_ADMIN
    _supers[admin_id] = (now, value)
    return value


_PATH_SIDE = (
    (re.compile(r"^/api/admins/"), "admin"),
    (re.compile(r"^/api/remakers/"), "remaker"),
    (re.compile(r"^/api/users/"), "user"),
)


def side_of(request):
    """Which side a request belongs to: user, remaker, admin, or "public" (guest browsing)."""
    kind, account_id = _token_side(request)
    if kind in SIDES:
        request._reorbit_token = (kind, account_id)
        return kind
    for rx, side in _PATH_SIDE:
        if rx.match(request.path):
            return side
    return "public"


def blocked_side(request):
    """The paused side this request belongs to, or None if it may go ahead."""
    path = request.path
    if not path.startswith("/api/") or path.startswith(ALWAYS_OPEN):
        return None
    f = flags()
    if not any(f.values()):
        return None
    side = side_of(request)
    if side == "public":
        # the guest shop is shared by both member apps: closed only when both are paused
        return "user" if f["user"] and f["remaker"] else None
    if not f.get(side):
        return None
    if side == "admin":
        token = getattr(request, "_reorbit_token", None)
        if token and token[1] and _is_super(token[1]):
            return None
    return side


class PauseMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            side = blocked_side(request)
        except Exception:  # noqa: BLE001 - the switch must never take the site down by itself
            side = None
        if side:
            request._usage_side = side
            return JsonResponse(
                {"success": False, "code": "PAUSED", "side": side, "message": MESSAGE[side], "paused": flags()},
                status=503,
                headers={"Retry-After": "300"},
            )
        return self.get_response(request)
