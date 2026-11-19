"""Lock sign-in for an email after 5 wrong passwords (or wrong codes).

    5 wrong tries  -> locked 5 minutes
    5 more         -> locked 15 minutes
    5 more         -> locked 1 hour (and 1 hour for every lock after that)

The lock history is forgotten after a correct sign-in, a password reset, an admin unlock, or a
quiet day (no wrong tries for 24 hours).

It works per email + role ("user", "admin", "remaker"), stored in the database, so:
- both gunicorn workers see the same count and a restart doesn't reset it;
- changing IP address doesn't help an attacker;
- an email with no account is counted and locked the same way, so the answers never reveal
  which emails are registered.
While locked, even the right password is refused: otherwise the lock would mean nothing.

    with_guard = login_guard.check("user", email)   # raises Locked
    ...
    login_guard.failed("user", email, account=user, ip=...)   # returns tries left
    login_guard.succeeded("user", email)
"""

import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import LoginGuard

log = logging.getLogger(__name__)

TRIES = 5
LOCKS = (timedelta(minutes=5), timedelta(minutes=15), timedelta(hours=1))
FORGET_AFTER = timedelta(hours=24)


class Locked(Exception):
    def __init__(self, seconds):
        self.seconds = max(1, int(seconds))
        super().__init__(self.message)

    @property
    def message(self):
        mins = -(-self.seconds // 60)  # round up
        when = f"{mins} minute{'s' if mins != 1 else ''}" if self.seconds >= 60 else f"{self.seconds} seconds"
        return f"Too many wrong attempts. For your security, sign-in is paused. Try again in {when}."


def _key(email):
    return (email or "").strip().lower()[:255]


def check(role, email):
    """Raise Locked if this email can't try right now."""
    row = LoginGuard.objects.filter(role=role, email=_key(email)).only("locked_until").first()
    if row and row.locked_until and row.locked_until > timezone.now():
        raise Locked((row.locked_until - timezone.now()).total_seconds())


def failed(role, email, account=None, ip=None):
    """Count one wrong try. Returns how many tries are left before a lock (0 = just locked).
    Raises Locked when this try caused the lock, so the caller can answer with the wait time."""
    email = _key(email)
    if not email:
        return TRIES
    now = timezone.now()
    with transaction.atomic():
        row, _ = LoginGuard.objects.select_for_update().get_or_create(role=role, email=email)
        if row.last_failure_at and now - row.last_failure_at > FORGET_AFTER:
            row.failures, row.locks = 0, 0
        if row.locked_until and row.locked_until <= now:
            row.locked_until = None
        row.failures += 1
        row.last_failure_at = now
        row.last_ip = ip or None
        just_locked = False
        if row.failures >= TRIES:
            wait = LOCKS[min(row.locks, len(LOCKS) - 1)]
            row.locked_until = now + wait
            row.locks += 1
            row.failures = 0
            just_locked = True
        row.save()
        left = 0 if just_locked else TRIES - row.failures
        locked_until = row.locked_until

    if just_locked:
        log.warning("login locked: %s %s until %s (ip %s)", role, email, locked_until, ip)
        if account is not None:
            _tell_owner(account, locked_until)
        raise Locked((locked_until - now).total_seconds())
    return left


def succeeded(role, email):
    LoginGuard.objects.filter(role=role, email=_key(email)).delete()


def clear(role, email):
    """After a password reset or an admin unlock."""
    succeeded(role, email)


def _tell_owner(account, until):
    try:
        from apps.core.mailer import security_notice

        security_notice(
            account,
            "Sign-in to your account was paused after 5 wrong attempts",
            cta=None,
        )
    except Exception:  # noqa: BLE001 - email trouble must never break sign-in
        log.exception("could not send the sign-in lock notice")


def tries_hint(left):
    """A short line for the error message once tries are running out."""
    if 0 < left <= 2:
        return f" {left} attempt{'s' if left != 1 else ''} left before sign-in is paused for a few minutes."
    return ""


_DUMMY_HASH = None


def burn_time(password):
    """Check the password against a throwaway hash when the email has no account, so a wrong email
    takes as long to answer as a wrong password (nothing to learn from the timing either)."""
    global _DUMMY_HASH
    from django.contrib.auth.hashers import check_password, make_password

    if _DUMMY_HASH is None:
        _DUMMY_HASH = make_password("reorbit-not-a-real-password")
    check_password(password or "", _DUMMY_HASH)


def locked_response(exc):
    """The API answer while locked: 429 with retry_after (seconds) for the sign-in button countdown."""
    from apps.core.responses import fail

    response = fail(exc.message, status=429, code="LOGIN_LOCKED")
    response.data["retry_after"] = exc.seconds
    return response


WRONG = "Email or password is incorrect."
