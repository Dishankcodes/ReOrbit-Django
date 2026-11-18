"""The public "Contact us" form and the admin inbox for it.

POST /api/support/contact/                    {name, email, topic, subject, message, side?}
GET  /api/support/admin/contact/              ?status=New|Replied|Closed&q=  (Support view access)
POST /api/support/admin/contact/<CNT-id>/     {action: reply|close|reopen, message?}  (Support edit)

Every message is saved as a ContactMessage (Admin › Support › Website messages):
- From someone with a member or ReMaker account (blocked or suspended ones too, which is how a
  blocked person appeals) it also becomes a support ticket on that account, linked here.
- From anyone else it stays here and the team replies by email from the inbox.
Admins who handle Support get a notification, the support address gets a branded email, and
the sender gets an "we've got your message" email with their reference.
"""

import logging
import re

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin
from apps.admins.models import Admins
from apps.core import mailer
from apps.core.responses import created, fail, ok
from apps.core.services import audit, notify
from apps.core.support_contacts import support_emails
from apps.remakers.models import ReMakers
from apps.users.models import Users

from .models import ContactMessage, SupportTicket, TicketMessage

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


def _tell_support_team(title, body, url):
    for a in Admins.objects.filter(status=Admins.Status.ACTIVE):
        if a.has_module("support", "view"):
            try:
                with transaction.atomic():
                    notify(a, title, body[:500], module="support", target_url=url)
            except Exception:  # noqa: BLE001
                log.exception("contact notification failed")


def contact_data(m):
    return {
        "id": m.public_id, "name": m.name, "email": m.email, "topic": m.topic, "subject": m.subject,
        "message": m.message, "side": m.side, "status": m.status, "created_at": m.created_at,
        "ticket": m.ticket.public_id if m.ticket_id else None,
        "reply": m.reply, "replied_at": m.replied_at,
        "replied_by": m.replied_by.full_name if m.replied_by_id else None,
    }


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
        side = "remaker" if d.get("side") == "remaker" else "user"

        user = Users.objects.filter(email__iexact=email).exclude(status="Deleted").first()
        maker = ReMakers.objects.filter(email__iexact=email).exclude(status="Deleted").first()
        account = (maker or user) if side == "remaker" else (user or maker)

        with transaction.atomic():
            ticket = None
            if account is not None:
                owner = {"remaker": account} if isinstance(account, ReMakers) else {"user": account}
                ticket = SupportTicket.objects.create(
                    **owner, subject=subject, category=category,
                    priority=SupportTicket.Priority.HIGH if account.status != "Active" else SupportTicket.Priority.NORMAL,
                )
                TicketMessage.objects.create(
                    ticket=ticket, sender_type="remaker" if "remaker" in owner else "user",
                    text=f"{message}\n\n(Sent from the website contact form by {name}.)", **owner)
            m = ContactMessage.objects.create(
                name=name, email=email, topic=category, subject=subject, message=message, side=side, ticket=ticket,
                status=ContactMessage.Status.CLOSED if ticket else ContactMessage.Status.NEW,
            )

        who = f"{account.full_name} ({account.status.lower()} {'ReMaker' if isinstance(account, ReMakers) else 'member'})" \
            if account else f"{name} · no account"
        url = f"/admin-support/{ticket.public_id}" if ticket else f"/admin-support?view=messages&open={m.public_id}"
        _tell_support_team(f"New {'ticket' if ticket else 'website message'}: {subject}", f"{who} · {category}", url)
        mailer.send(
            support_emails(), f"[ReOrbit contact] {subject} ({m.public_id})",
            heading="New message from the website",
            intro=f"{name} wrote in through the contact form. "
                  + (f"They have an account, so it's ticket {ticket.public_id}." if ticket else "They don't have an account: reply from Admin › Support › Website messages."),
            facts=[("Reference", m.public_id), ("From", f"{name} <{email}>"), ("Account", who), ("Topic", category),
                   ("Site", "ReMaker" if side == "remaker" else "Member"), ("Subject", subject)],
            quote=message, footer="Sent by the ReOrbit contact form.",
        )
        mailer.send(
            email, f"We've got your message ({m.public_id})",
            heading=f"Thanks, {name.split()[0]}. We've got your message.",
            intro=("Our support team will reply in your ReOrbit account, usually within one working day."
                   if ticket else "Our team will reply to this email address, usually within one working day."),
            facts=[("Reference", m.public_id), ("Topic", category), ("Subject", subject)],
            quote=message,
            footer="Keep this reference if you contact us again. Didn't send this? You can ignore this email.",
        )
        if ticket:
            return created({"ticket": ticket.public_id, "reference": m.public_id, "linked": True},
                           message="Thanks, your message is with our support team. We'll reply to your account.")
        return created({"reference": m.public_id, "linked": False},
                       message=f"Thanks, your message is with our team (reference {m.public_id}). We'll reply by email.")


class AdminContactMessages(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("support", "view")]

    def get(self, request):
        qs = ContactMessage.objects.select_related("ticket", "replied_by")
        counts = {s: qs.filter(status=s).count() for s in ContactMessage.Status.values}
        st = request.query_params.get("status")
        if st in ContactMessage.Status.values:
            qs = qs.filter(status=st)
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(public_id__iexact=q) | Q(name__icontains=q) | Q(email__icontains=q)
                           | Q(subject__icontains=q) | Q(message__icontains=q))
        return ok({"results": [contact_data(m) for m in qs[:200]], "counts": counts})


class AdminContactMessage(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("support", "edit")]

    def post(self, request, public_id):
        m = get_object_or_404(ContactMessage.objects.select_related("ticket", "replied_by"), public_id=public_id)
        action = str(request.data.get("action") or "")
        admin = request.user.account
        if action == "reply":
            text = str(request.data.get("message") or "").strip()[:4000]
            if len(text) < 5:
                return fail("Write your reply first.", errors={"message": ["Write your reply first."]})
            sent = mailer.send(
                m.email, f"Re: {m.subject} ({m.public_id})",
                heading=f"Hi {m.name.split()[0]}, here's our reply",
                intro=f"{admin.full_name} from the ReOrbit team answered your message.",
                quote=text,
                facts=[("Your message", m.subject), ("Reference", m.public_id)],
                footer="Reply to this email or use the contact form again if you need anything else.",
            )
            if not sent:
                return fail("The email couldn't be sent. Check the email settings and try again.", status=502,
                            code="EMAIL_FAILED")
            m.reply, m.replied_at, m.replied_by, m.status = text, timezone.now(), admin, ContactMessage.Status.REPLIED
            m.save(update_fields=["reply", "replied_at", "replied_by", "status", "updated_at"])
            audit(admin, "contact.reply", "contact", m.public_id, reason=text[:200])
            return ok({"message_item": contact_data(m)}, message="Reply sent by email.")
        if action in ("close", "reopen"):
            m.status = ContactMessage.Status.CLOSED if action == "close" else ContactMessage.Status.NEW
            m.save(update_fields=["status", "updated_at"])
            return ok({"message_item": contact_data(m)}, message="Closed." if action == "close" else "Reopened.")
        return fail("Unknown action.", errors={"action": ["Use reply, close or reopen."]})
