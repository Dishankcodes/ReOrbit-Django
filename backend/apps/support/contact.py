"""POST /api/support/contact/  Public "Contact us" form (no login needed).

{name, email, topic, subject, message, side?: "user" | "remaker"}

- If the email belongs to a member or ReMaker account (blocked or suspended ones too, which is
  how a blocked person appeals), it becomes a normal support ticket from that account and shows up
  in Admin › Help & Support.
- Otherwise every admin who handles Support gets a notification with the message, and it is
  emailed to the support address (the Super Admins) when email is set up. It is also written to
  the audit log, so nothing is lost.
"""

import logging
import re

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.admins.models import Admins
from apps.core.responses import created, fail
from apps.core.services import audit, notify
from apps.core.support_contacts import support_emails
from apps.remakers.models import ReMakers
from apps.users.models import Users

from .models import SupportTicket, TicketMessage

log = logging.getLogger(__name__)
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
TOPICS = {
    "marketplace": "Marketplace", "purchase": "Orders and shipping", "listing": "Selling", "donation": "Donations",
    "pickup": "Pickup or delivery", "remaker": "ReMaker", "account": "Account access", "blocked": "Account access",
    "technical": "Technical issue", "payment": "Payment or refund", "other": "Other",
}


class ContactThrottle(AnonRateThrottle):
    scope = "contact"  # its own counter: browsing the site must not use up contact attempts
    rate = "5/hour"


def _clean(v, n):
    return " ".join(str(v or "").split())[:n]


def _tell_support_team(title, body):
    for a in Admins.objects.filter(status=Admins.Status.ACTIVE):
        if a.has_module("support", "view"):
            try:
                with transaction.atomic():
                    notify(a, title, body[:500], module="support", target_url="/admin-support")
            except Exception:  # noqa: BLE001
                log.exception("contact notification failed")


class PublicContact(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ContactThrottle]

    def post(self, request):
        d = request.data
        name, email = _clean(d.get("name"), 100), _clean(d.get("email"), 254).lower()
        topic_key = _clean(d.get("topic"), 20).lower()
        subject = _clean(d.get("subject"), 160)
        message = str(d.get("message") or "").strip()[:4000]
        errors = {}
        if len(name) < 2:
            errors["name"] = ["Tell us your name."]
        if not EMAIL.match(email):
            errors["email"] = ["Enter a valid email address."]
        if topic_key not in TOPICS:
            errors["topic"] = ["Choose a topic."]
        if len(subject) < 4:
            errors["subject"] = ["Add a short subject (at least 4 characters)."]
        if len(message) < 10:
            errors["message"] = ["Tell us a little more (at least 10 characters)."]
        if errors:
            return fail("Please fix the highlighted fields.", errors=errors)
        category = TOPICS[topic_key]

        prefer_remaker = d.get("side") == "remaker"
        user = Users.objects.filter(email__iexact=email).exclude(status="Deleted").first()
        maker = ReMakers.objects.filter(email__iexact=email).exclude(status="Deleted").first()
        account = (maker or user) if prefer_remaker else (user or maker)
        if account is not None:
            owner = {"remaker": account} if isinstance(account, ReMakers) else {"user": account}
            with transaction.atomic():
                ticket = SupportTicket.objects.create(
                    **owner, subject=subject, category=category,
                    priority=SupportTicket.Priority.HIGH if account.status != "Active" else SupportTicket.Priority.NORMAL,
                )
                TicketMessage.objects.create(
                    ticket=ticket, sender_type="remaker" if "remaker" in owner else "user",
                    text=f"{message}\n\n(Sent from the website contact form by {name}.)", **owner)
            _tell_support_team(
                f"New ticket {ticket.public_id} from the contact form",
                f"{account.full_name} ({account.status.lower()} account) · {subject}")
            return created({"ticket": ticket.public_id, "linked": True},
                           message="Thanks, your message is with our support team. We'll reply to your account.")

        body = f"From {name} <{email}> · {category}\n{subject}\n\n{message}"
        audit(None, "contact.message", "contact", email[:40], after={"name": name, "topic": category, "subject": subject,
                                                               "message": message, "at": timezone.now().isoformat()})
        _tell_support_team(f"Website message: {subject}", body)
        try:
            send_mail(f"[ReOrbit contact] {subject}", body, settings.DEFAULT_FROM_EMAIL, support_emails(),
                      fail_silently=True)
        except Exception:  # noqa: BLE001
            log.exception("contact email failed")
        return created({"linked": False}, message="Thanks, your message is with our team. We'll reply by email.")
