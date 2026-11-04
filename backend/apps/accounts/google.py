"""Sign in with Google (authorization-code flow).

The browser opens Google's popup and gets a one-time `code`. We send it to our
server; the server exchanges it with Google (using the client secret, which never
reaches the browser), verifies the returned ID token, and reads the verified email.

Settings needed (backend/.env): GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
"""

import logging

import requests
from django.conf import settings
from django.core import signing

logger = logging.getLogger(__name__)

TOKEN_URL = "https://oauth2.googleapis.com/token"
SIGNUP_SALT = "reorbit.google-signup"
SIGNUP_MAX_AGE_SECONDS = 600


class GoogleAuthError(Exception):
    def __init__(self, message, status=401):
        self.message = message
        self.status = status
        super().__init__(message)


def _configured():
    return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)


def _verify_id_token(raw_id_token):
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    try:
        # Checks the signature, expiry, issuer and that it was issued for OUR client id.
        info = id_token.verify_oauth2_token(
            raw_id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
    except ValueError as exc:
        logger.warning("Google ID token rejected: %s", exc)
        raise GoogleAuthError("Google sign-in could not be verified.")
    return info


def profile_from_code(code):
    """Exchange the popup `code` for the person's verified Google profile.

    Returns {"sub", "email", "full_name"}. Raises GoogleAuthError.
    """
    if not _configured():
        raise GoogleAuthError("Google sign-in is not set up yet.", status=503)
    if not code:
        raise GoogleAuthError("Google sign-in code is missing.", status=400)

    try:
        response = requests.post(
            TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": "postmessage",  # required for the popup flow
                "grant_type": "authorization_code",
            },
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.error("Google token exchange unreachable: %s", exc)
        raise GoogleAuthError("Could not reach Google. Please try again.", status=503)

    if response.status_code != 200:
        logger.warning("Google token exchange failed: %s %s", response.status_code, response.text[:300])
        raise GoogleAuthError("Google sign-in failed. Please try again.")

    raw_id_token = response.json().get("id_token")
    if not raw_id_token:
        raise GoogleAuthError("Google sign-in failed. Please try again.")

    info = _verify_id_token(raw_id_token)
    email = (info.get("email") or "").strip().lower()
    if not email or not info.get("email_verified"):
        raise GoogleAuthError("Your Google email is not verified.")

    return {
        "sub": info["sub"],
        "email": email,
        "full_name": (info.get("name") or email.split("@")[0]).strip()[:150],
    }


# A new ReMaker must still choose a username. Their Google proof is carried in a signed,
# 10-minute token (the one-time code cannot be used twice).
def issue_signup_token(profile):
    return signing.dumps(profile, salt=SIGNUP_SALT)


def read_signup_token(token):
    try:
        return signing.loads(token, salt=SIGNUP_SALT, max_age=SIGNUP_MAX_AGE_SECONDS)
    except signing.BadSignature:
        raise GoogleAuthError("Your Google sign-in expired. Please try again.")
