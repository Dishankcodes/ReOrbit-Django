"""Razorpay, kept in one small module so the rest of the code never touches the SDK.

Keys come from the environment (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET /
RAZORPAY_WEBHOOK_SECRET). Nothing here runs unless they are set.
Signature checks use only the standard library, so they work (and are tested) offline.
"""

import hashlib
import hmac
import logging

from django.conf import settings


logger = logging.getLogger(__name__)


def _log_gateway_failure(operation, exc):
    """Log safe provider diagnostics without exposing exception text or credentials."""
    status_code = getattr(exc, "status_code", None) or getattr(exc, "http_status_code", None)
    provider_code = getattr(exc, "code", None) or getattr(exc, "error_code", None)
    if not isinstance(status_code, (int, str)):
        status_code = "unknown"
    if not isinstance(provider_code, (int, str)):
        provider_code = "unknown"
    logger.error(
        "Razorpay %s failed: exception_type=%s http_status=%s provider_code=%s",
        operation,
        type(exc).__name__,
        str(status_code)[:32],
        str(provider_code)[:64],
    )


class GatewayError(Exception):
    pass


def is_configured():
    return bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)


def public_config():
    """What the browser may know. NEVER include the secret."""
    return {"enabled": is_configured(), "key_id": settings.RAZORPAY_KEY_ID if is_configured() else ""}


def _client():
    if not is_configured():
        raise GatewayError("Online payment is not set up yet.")
    import razorpay  # imported lazily so the app starts without the SDK

    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    client.set_app_details({"title": "ReOrbit", "version": "1"})
    return client


def create_order(amount_rupees, receipt, notes=None):
    """Create a Razorpay order (amount is sent in paise). Returns the Razorpay order dict."""
    try:
        return _client().order.create(
            {"amount": int(amount_rupees) * 100, "currency": "INR", "receipt": receipt, "notes": notes or {}}
        )
    except GatewayError:
        raise
    except Exception as exc:  # network, bad keys, SDK errors
        _log_gateway_failure("order creation", exc)
        raise GatewayError("Could not reach the payment provider. Please try again.") from exc


def fetch_payment(razorpay_payment_id):
    """Ask Razorpay what really happened to this payment (never trust the browser)."""
    try:
        return _client().payment.fetch(razorpay_payment_id)
    except GatewayError:
        raise
    except Exception as exc:
        _log_gateway_failure("payment fetch", exc)
        raise GatewayError("Could not check the payment with the provider. Please try again.") from exc


def capture_payment(razorpay_payment_id, amount_rupees):
    """Capture an authorized payment (only needed when the account is not on auto-capture)."""
    try:
        return _client().payment.capture(razorpay_payment_id, int(amount_rupees) * 100, {"currency": "INR"})
    except GatewayError:
        raise
    except Exception as exc:
        _log_gateway_failure("payment capture", exc)
        raise GatewayError("The payment could not be captured.") from exc


def entity_problem(entity, payment):
    """Compare Razorpay's payment record with what we stored. Returns "" when it all matches,
    otherwise a short reason. `payment` is our payments.Payment row."""
    if not isinstance(entity, dict):
        return "no payment record"
    if not payment.razorpay_order_id or entity.get("order_id") != payment.razorpay_order_id:
        return "payment belongs to a different Razorpay order"
    if entity.get("currency") != "INR" or payment.currency != "INR":
        return "currency is not INR"
    try:
        paid = int(entity.get("amount"))
    except (TypeError, ValueError):
        return "amount missing"
    if paid != int(payment.amount) * 100:
        return "amount does not match the checkout"
    if entity.get("status") != "captured":
        return f"payment is {entity.get('status') or 'unknown'}, not captured"
    return ""


def refund(razorpay_payment_id, amount_rupees, receipt=""):
    """Partial or full refund to the original payment. `receipt` is our refund id, so a retry
    can first look for an earlier attempt that did go through (find_refund)."""
    body = {"amount": int(amount_rupees) * 100}
    if receipt:
        body["receipt"] = receipt
        body["notes"] = {"reorbit_refund": receipt}
    try:
        return _client().payment.refund(razorpay_payment_id, body)
    except GatewayError:
        raise
    except Exception as exc:
        _log_gateway_failure("refund", exc)
        raise GatewayError("Refund could not be sent.") from exc


def find_refund(razorpay_payment_id, receipt):
    """An earlier refund of this payment that carries our receipt, or None."""
    try:
        rows = _client().payment.fetch_multiple_refund(razorpay_payment_id, {"count": 100}).get("items", [])
    except GatewayError:
        raise
    except Exception as exc:
        _log_gateway_failure("refund lookup", exc)
        raise GatewayError("Could not check earlier refunds.") from exc
    for r in rows:
        if r.get("status") == "failed":
            continue  # a refund Razorpay rejected does not count as sent
        if receipt and (r.get("receipt") == receipt or (r.get("notes") or {}).get("reorbit_refund") == receipt):
            return r
    return None


def _hmac(secret, message):
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


def verify_checkout_signature(razorpay_order_id, razorpay_payment_id, signature):
    """Razorpay signs "order_id|payment_id" with the key secret after a successful payment."""
    if not (settings.RAZORPAY_KEY_SECRET and signature):
        return False
    expected = _hmac(settings.RAZORPAY_KEY_SECRET, f"{razorpay_order_id}|{razorpay_payment_id}".encode())
    return hmac.compare_digest(expected.encode(), str(signature).encode())


def verify_webhook_signature(raw_body, signature):
    if not (settings.RAZORPAY_WEBHOOK_SECRET and signature):
        return False
    return hmac.compare_digest(_hmac(settings.RAZORPAY_WEBHOOK_SECRET, raw_body).encode(), str(signature).encode())
