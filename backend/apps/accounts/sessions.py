"""End every sign-in of an account at once.

Each account has `tokens_valid_after`. Any access or refresh token issued before that moment is
refused (apps/accounts/authentication.py and RefreshTokenView), so after a password change or reset
every other phone and browser is signed out within one request, not after 7 days.

    end_all_sessions(account)            # everyone out, e.g. after a password reset
    tokens = end_all_sessions(account, keep="user")   # everyone else out, this device gets new tokens
"""

import time

from django.utils import timezone

from .tokens import create_token_pair


def end_all_sessions(account, keep=None):
    # Tokens are compared to the millisecond; the two tiny pauses keep "before" and "after"
    # from landing in the same millisecond.
    time.sleep(0.002)
    account.tokens_valid_after = timezone.now()
    type(account).objects.filter(pk=account.pk).update(tokens_valid_after=account.tokens_valid_after)
    if keep:
        time.sleep(0.002)
        return create_token_pair(keep, account.pk)
    return None


def token_is_current(account, token):
    """False when the token was issued before the account's last "sign out everywhere"."""
    cutoff = getattr(account, "tokens_valid_after", None)
    if not cutoff:
        return True
    try:
        issued_ms = int(token.get("iat_ms") or 0) or int(token.get("iat") or 0) * 1000
    except (TypeError, ValueError):
        issued_ms = 0
    return issued_ms > int(cutoff.timestamp() * 1000)
