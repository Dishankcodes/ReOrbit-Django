"""GET /api/adminops/admin/system-status/  Live health of the things the panel depends on.

Each check is {key, label, state: ok | warn | down, detail}. Nothing here changes data except a
tiny test file written to and removed from file storage.
"""

import time

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import connection
from django.db.models import Q
from django.utils import timezone
from rest_framework.views import APIView

from apps.accounts.permissions import IsReOrbitAdmin
from apps.core.models import PlatformSettings
from apps.core.responses import ok
from apps.core.support_contacts import support_emails


def _check(key, label, fn):
    try:
        state, detail = fn()
    except Exception as e:  # noqa: BLE001  a failing check is reported, never raised
        state, detail = "down", f"{type(e).__name__}: {str(e)[:120]}"
    return {"key": key, "label": label, "state": state, "detail": detail}


def _database():
    t = time.perf_counter()
    with connection.cursor() as c:
        c.execute("SELECT 1")
        c.fetchone()
    ms = round((time.perf_counter() - t) * 1000)
    return ("ok" if ms < 300 else "warn"), f"{connection.vendor.title()} answered in {ms} ms"


def _email():
    if settings.MAILJET_API_KEY and settings.MAILJET_SECRET_KEY and settings.MAILJET_SENDER_EMAIL:
        return "ok", f"Mailjet, sending as {settings.MAILJET_SENDER_EMAIL}"
    backend = settings.EMAIL_BACKEND.rsplit(".", 2)[-2]
    if backend == "smtp" and getattr(settings, "EMAIL_HOST_USER", ""):
        return "ok", f"SMTP via {settings.EMAIL_HOST}"
    if backend in ("console", "locmem", "dummy"):
        return "warn", f"Emails are not really sent ({backend} backend). Codes show in the server log."
    return "warn", "Email is not fully set up"


def _payments():
    if getattr(settings, "RAZORPAY_KEY_ID", "") and getattr(settings, "RAZORPAY_KEY_SECRET", ""):
        live = settings.RAZORPAY_KEY_ID.startswith("rzp_live")
        return "ok", f"Razorpay {'live' if live else 'test'} keys set"
    return "warn", "Razorpay keys missing: only pay on delivery works"


def _storage():
    name = default_storage.save(f"health/{int(time.time() * 1000)}.txt", ContentFile(b"ok"))
    default_storage.delete(name)
    return "ok", f"Uploads can be saved ({type(default_storage).__name__})"


def _maintenance():
    s = PlatformSettings.load()
    on = s.maintenance
    return ("warn", "Maintenance mode is ON: members can't buy, sell or donate") if on else ("ok", "Off: everything is open")


def _money():
    from apps.payments.models import Refund
    from apps.payments.schedule import due_counts

    due = due_counts()
    stuck = Refund.objects.filter(Q(status="Failed")).count()
    bits = []
    if due["overdue"]:
        bits.append(f"{due['overdue']} payout(s) overdue")
    if stuck:
        bits.append(f"{stuck} refund(s) failed")
    return ("warn", ", ".join(bits)) if bits else ("ok", "No overdue payouts or failed refunds")


def _queues():
    from apps.donations.models import Donation
    from apps.support.models import SupportTicket

    tickets = SupportTicket.objects.filter(status__in=("Open", "In progress")).count()
    unassigned = SupportTicket.objects.filter(status="Open", assigned_to__isnull=True).count()
    donations = Donation.objects.filter(status="Pending").count()
    state = "warn" if unassigned > 10 or donations > 25 else "ok"
    return state, f"{tickets} open ticket(s) ({unassigned} unassigned), {donations} donation(s) to review"


class AdminSystemStatus(APIView):
    permission_classes = [IsReOrbitAdmin]

    def get(self, request):
        checks = [
            _check("database", "Database", _database),
            _check("storage", "File uploads", _storage),
            _check("email", "Email (OTP, notices)", _email),
            _check("payments", "Online payments", _payments),
            _check("maintenance", "Maintenance mode", _maintenance),
            _check("money", "Payouts & refunds", _money),
            _check("queues", "Support & donation queues", _queues),
        ]
        worst = "down" if any(c["state"] == "down" for c in checks) else (
            "warn" if any(c["state"] == "warn" for c in checks) else "ok")
        from apps.orders.serializers import reorbit_store

        store = reorbit_store()
        return ok({
            "overall": worst, "checks": checks, "checked_at": timezone.now(),
            "debug": settings.DEBUG,
            "support": {"emails": support_emails(), "phone": store.get("phone", "")},
        })
