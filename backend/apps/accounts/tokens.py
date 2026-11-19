import time

from rest_framework_simplejwt.tokens import RefreshToken


def create_token_pair(account_type, account_id):
    # "iat_ms": when the sign-in was issued, to the millisecond. Compared with the account's
    # tokens_valid_after (apps/accounts/sessions.py) to sign out other devices after a password
    # change while the device that changed it keeps its brand-new tokens.
    issued_ms = int(time.time() * 1000)
    refresh = RefreshToken()
    refresh["account_type"] = account_type
    refresh["account_id"] = int(account_id)
    refresh["iat_ms"] = issued_ms

    access = refresh.access_token
    access["account_type"] = account_type
    access["account_id"] = int(account_id)
    access["iat_ms"] = issued_ms

    return {
        "access": str(access),
        "refresh": str(refresh),
    }
