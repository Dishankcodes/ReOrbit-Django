from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from urllib.parse import urlparse

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitAuthenticated
from apps.core import buyers
from apps.core.responses import created, fail, ok
from apps.orders.models import Order
from .models import SupportTicket, TicketMessage


def _owner(account):
    kind = buyers.type_of(account)
    if kind not in ("user", "remaker"):
        return None
    return {kind: account}


def _ticket_row(ticket, include_messages=True):
    owner = ticket.user or ticket.remaker
    result = {"id": ticket.public_id, "subject": ticket.subject, "category": ticket.category,
              "orderId": ticket.order_id, "status": ticket.status, "priority": ticket.priority,
              "createdAt": ticket.created_at, "updatedAt": ticket.updated_at,
              "requester": {"id": owner.public_id, "name": owner.full_name, "email": owner.email,
                            "type": "user" if ticket.user_id else "remaker"},
              "assignedTo": ({"id": ticket.assigned_to.public_id, "name": ticket.assigned_to.full_name}
                             if ticket.assigned_to_id else None),
              "messages": []}
    if include_messages:
        result["messages"] = [{"id": str(m.pk), "from": m.sender_type if m.sender_type != "admin" else "team",
                               "text": m.text, "at": m.created_at, "attachmentUrl": m.attachment_url}
                              for m in ticket.messages.all()]
    return result


def _message(request, ticket, text, attachment=""):
    account = getattr(request.user, "account", None)
    kind = buyers.type_of(account) if account else "admin"
    kwargs = buyers.owner(account) if account and kind in ("user", "remaker") else ({"admin": account} if kind == "admin" else {})
    msg = TicketMessage.objects.create(ticket=ticket, sender_type=kind, text=text, attachment_url=attachment, **kwargs)
    ticket.save(update_fields=["updated_at"])
    return msg


def _attachment(request):
    value = str(request.data.get("attachmentUrl") or "").strip()[:1000]
    if value:
        parsed = urlparse(value)
        if parsed.scheme != "https" or not parsed.netloc:
            return None
    return value


class MyTickets(APIView):
    permission_classes = [IsReOrbitAuthenticated]
    support_endpoint = True

    def get(self, request):
        owner = _owner(request.user.account)
        if owner is None:
            return fail("Support tickets are available to Users and ReMakers.", status=403)
        rows = SupportTicket.objects.filter(**owner).prefetch_related("messages")
        return ok({"tickets": [_ticket_row(t) for t in rows]})

    def post(self, request):
        owner = _owner(request.user.account)
        if owner is None:
            return fail("Support tickets are available to Users and ReMakers.", status=403)
        subject = " ".join(str(request.data.get("subject") or "").split())[:160]
        category = " ".join(str(request.data.get("category") or "Other").split())[:60]
        text = str(request.data.get("message") or request.data.get("text") or "").strip()
        order_id = str(request.data.get("orderId") or request.data.get("order_id") or "").strip()[:32]
        attachment = _attachment(request)
        if attachment is None:
            return fail("Attachments must use a secure HTTPS link.")
        if len(subject) < 4 or len(text) < 3 or len(text) > 4000:
            return fail("Add a subject and a message of 3 to 4,000 characters.")
        if order_id:
            try:
                order = Order.objects.get(public_id=order_id, buyer_key=buyers.key_of(request.user.account))
            except Order.DoesNotExist:
                return fail("That order does not belong to your account.", status=404)
            order_id = order.public_id
        with transaction.atomic():
            ticket = SupportTicket.objects.create(**owner, subject=subject, category=category, order_id=order_id)
            _message(request, ticket, text, attachment)
        return created({"ticket": _ticket_row(ticket)}, message="Support ticket created.")


class MyTicketDetail(APIView):
    permission_classes = [IsReOrbitAuthenticated]
    support_endpoint = True

    def _get(self, request, public_id):
        owner = _owner(request.user.account)
        if owner is None:
            return None
        return get_object_or_404(SupportTicket.objects.prefetch_related("messages"), public_id=public_id, **owner)

    def get(self, request, public_id):
        ticket = self._get(request, public_id)
        return fail("Support tickets are available to Users and ReMakers.", status=403) if ticket is None else ok({"ticket": _ticket_row(ticket)})

    def post(self, request, public_id):
        ticket = self._get(request, public_id)
        if ticket is None:
            return fail("Support tickets are available to Users and ReMakers.", status=403)
        if request.data.get("action") == "close":
            ticket.status = SupportTicket.Status.RESOLVED
            ticket.closed_at = timezone.now()
            ticket.save(update_fields=["status", "closed_at", "updated_at"])
            return ok({"ticket": _ticket_row(ticket)})
        if ticket.status in (SupportTicket.Status.CLOSED, SupportTicket.Status.RESOLVED):
            if request.data.get("action") != "reopen":
                return fail("Reopen a resolved case before adding a reply.", status=409)
            ticket.status = SupportTicket.Status.OPEN
        text = str(request.data.get("message") or request.data.get("text") or "").strip()
        if len(text) < 1 or len(text) > 4000:
            return fail("Enter a reply message of up to 4,000 characters.")
        attachment = _attachment(request)
        if attachment is None:
            return fail("Attachments must use a secure HTTPS link.")
        _message(request, ticket, text, attachment)
        return created({"ticket": _ticket_row(ticket)})


class AdminTickets(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("support")]

    def get(self, request, public_id=None):
        if public_id:
            ticket = get_object_or_404(SupportTicket.objects.prefetch_related("messages"), public_id=public_id)
            return ok({"ticket": _ticket_row(ticket)})
        qs = SupportTicket.objects.select_related("user", "remaker", "assigned_to").prefetch_related("messages")
        status = request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)
        return ok({"tickets": [_ticket_row(t) for t in qs[:200]]})

    def post(self, request, public_id):
        ticket = get_object_or_404(SupportTicket.objects.prefetch_related("messages"), public_id=public_id)
        action = str(request.data.get("action") or "reply")
        if "priority" in request.data and request.data["priority"] not in SupportTicket.Priority.values:
            return fail("Unsupported priority.")
        if action == "reply":
            text = str(request.data.get("message") or "").strip()
            if not text or len(text) > 4000:
                return fail("Enter a reply message of up to 4,000 characters.")
            attachment = _attachment(request)
            if attachment is None:
                return fail("Attachments must use a secure HTTPS link.")
            _message(request, ticket, text, attachment)
            if ticket.status == SupportTicket.Status.OPEN:
                ticket.status = SupportTicket.Status.IN_PROGRESS
        elif action in ("in_progress", "resolve", "close", "reopen"):
            ticket.status = {"in_progress": SupportTicket.Status.IN_PROGRESS, "resolve": SupportTicket.Status.RESOLVED,
                             "close": SupportTicket.Status.CLOSED, "reopen": SupportTicket.Status.OPEN}[action]
            ticket.closed_at = timezone.now() if action in ("resolve", "close") else None
        elif action == "assign":
            ticket.assigned_to = request.user.account
        else:
            return fail("Unsupported support action.")
        if "priority" in request.data:
            ticket.priority = request.data["priority"]
        ticket.save()
        return ok({"ticket": _ticket_row(ticket)})
