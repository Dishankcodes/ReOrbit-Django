"""Encryption for sensitive fields at rest (bank account numbers, UPI ids).

Uses Fernet (AES-128-CBC + HMAC) from the `cryptography` package. The key comes from
FIELD_ENCRYPTION_KEY. Generate one with:

    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

Keep it in the environment, never in the database or git. If you lose it the encrypted
values cannot be read again. In DEBUG only, a key is derived from SECRET_KEY so local
development works without setup.
"""

import base64
import hashlib
import json

from django.conf import settings


class CryptoError(Exception):
    pass


def _fernet():
    from cryptography.fernet import Fernet

    key = (getattr(settings, "FIELD_ENCRYPTION_KEY", "") or "").strip()
    if not key:
        if not settings.DEBUG:
            raise CryptoError("FIELD_ENCRYPTION_KEY is not configured.")
        digest = hashlib.sha256(("reorbit-field-key:" + settings.SECRET_KEY).encode()).digest()
        key = base64.urlsafe_b64encode(digest).decode()
    try:
        return Fernet(key.encode())
    except Exception as exc:
        raise CryptoError("FIELD_ENCRYPTION_KEY is not a valid Fernet key.") from exc


def encrypt(text):
    return _fernet().encrypt(str(text).encode()).decode()


def decrypt(token):
    from cryptography.fernet import InvalidToken

    try:
        return _fernet().decrypt(str(token).encode()).decode()
    except InvalidToken as exc:
        raise CryptoError("Stored value could not be decrypted (wrong key?).") from exc


def encrypt_json(data):
    return encrypt(json.dumps(data, separators=(",", ":")))


def decrypt_json(token):
    return json.loads(decrypt(token))
