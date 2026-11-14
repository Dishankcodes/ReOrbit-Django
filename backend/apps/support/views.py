from urllib.parse import urlparse

from django.db import transaction
from django.db.models import Count, OuterRef, Q, Subquery
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitAuthenticated
from apps.core import buyers
from apps.core.responses import created, fail, ok
from apps.orders.models import Order
from .models import SupportTicket, TicketMessage

ADMIN_PAGE_SIZE = 50


def _owner(account):
    kind = buyers.type_of(account)
    if kind not in ("user", "remaker"):
        return None
    return {kind: account}


def _ticket_queryset(include_message_senders=True):
    queryset = SupportTicket.objects.select_related("user", "remaker", "assigned_to")
    if include_message_senders:
        queryset = queryset.prefetch_related("messages__admin", "messages__user", "messages__remaker")
    return queryset


def _with_message_summary(queryset):
    latest = TicketMessage.objects.filter(ticket_id=OuterRef("pk")).order_by(
        "-created_at", "-pk"
    )
    return queryset.annotate(
        _message_count=Count("messages", distinct=True),
        _last_message_text=Subquery(latest.values("text")[:1]),
        _last_message_at=Subquery(latest.values("created_at")[:1]),
        _last_message_sender=Subquery(latest.values("sender_type")[:1]),
    )


def _ticket_row(ticket, include_messages=True):
    owner = ticket.user or ticket.remaker
    messages = list(ticket.messages.all()) if include_messages else None
    if include_messages:
        last_message = messages[-1] if messages else None
        message_count = len(messages)
    elif hasattr(ticket, "_message_count"):
        last_message = None
        message_count = ticket._message_count
    else:
        last_message = ticket.messages.order_by("-created_at", "-pk").first()
        message_count = ticket.messages.count()
    if not include_messages and hasattr(ticket, "_message_count"):
        last_text = ticket._last_message_text
        last_at = ticket._last_message_at
        last_sender = ticket._last_message_sender
    else:
        last_text = last_message.text if last_message else None
        last_at = last_message.created_at if last_message else None
        last_sender = last_message.sender_type if last_message else None
    result = {
        "id": ticket.public_id,
        "subject": ticket.subject,
        "category": ticket.category,
        "orderId": ticket.order_id,
        "status": ticket.status,
        "priority": ticket.priority,
        "createdAt": ticket.created_at,
        "updatedAt": ticket.updated_at,
        "requester": {
            "id": owner.public_id,
            "name": owner.full_name,
            "email": owner.email,
            "type": "user" if ticket.user_id else "remaker",
        },
        "assignedTo": (
            {"id": ticket.assigned_to.public_id, "name": ticket.assigned_to.full_name}
            if ticket.assigned_to_id else None
        ),
        "messageCount": message_count,
        "lastMessage": (
            {"text": last_text, "at": last_at,
             "from": "team" if last_sender == "admin" else last_sender}
            if last_at else None
        ),
        "messages": [],
        "messagesLoaded": include_messages,
    }
    if include_messages:
        result["messages"] = [
            {
                "id": str(message.pk),
                "from": "team" if message.sender_type == "admin" else message.sender_type,
                "senderType": message.sender_type,
                "senderName": (
                    message.admin.full_name if message.admin_id else
                    message.user.full_name if message.user_id else
                    message.remaker.full_name if message.remaker_id else
                    "ReOrbit Support" if message.sender_type == "system" else ""
                ),
                "text": message.text,
                "at": message.created_at,
                "attachmentUrl": message.attachment_url,
            }
            for message in messages
        ]
    return result


def _message(account, ticket, text, attachment=""):
    kind = buyers.type_of(account)
    kwargs = buyers.owner(account) if kind in ("user", "remaker") else {"admin": account}
    return TicketMessage.objects.create(
        ticket=ticket,
        sender_type="admin" if kind == "admin" else kind,
        text=text,
        attachment_url=attachment,
        **kwargs,
    )


def _attachment(request):
    value = str(request.data.get("attachmentUrl") or "").strip()[:1000]
    if value:
        parsed = urlparse(value)
        if parsed.scheme != "https" or not parsed.netloc:
            return None
    return value


def _validate_related_order(account, order_id):
    if not order_id:
        return ""
    kind = buyers.type_of(account)
    query = Order.objects.filter(public_id=order_id)
    if kind == "remaker":
        query = query.filter(Q(buyer_key=buyers.key_of(account)) | Q(seller_remaker=account))
    else:
        query = query.filter(buyer_key=buyers.key_of(account))
    order = query.only("public_id").first()
    return order.public_id if order else None


def _set_status(ticket, status):
    ticket.status = status
    ticket.closed_at = (
        timezone.now()
        if status in (SupportTicket.Status.RESOLVED, SupportTicket.Status.CLOSED)
        else None
    )


class MyTickets(APIView):
    permission_classes = [IsReOrbitAuthenticated]
    support_endpoint = True

    def get(self, request):
        owner = _owner(request.user.account)
        if owner is None:
            return fail("Support tickets are available to Users and ReMakers.", status=403)
        rows = _with_message_summary(
            _ticket_queryset(include_message_senders=False).filter(**owner)
        )
        return ok({"tickets": [_ticket_row(ticket, include_messages=False) for ticket in rows]})

    def post(self, request):
        owner = _owner(request.user.account)
        if owner is None:
            return fail("Support tickets are available to Users and ReMakers.", status=403)
        subject = " ".join(str(request.data.get("subject") or "").split())[:160]
        category = " ".join(str(request.data.get("category") or "Other").split())[:60]
        text = str(request.data.get("message") or request.data.get("text") or "").strip()
        order_id = str(request.data.get("orderId") or request.data.get("order_id") or "").strip()[:32]
        attachment = _attachment(request)
        priority = request.data.get(
            "priority",
            SupportTicket.Priority.HIGH
            if category == "Payment or refund"
            else SupportTicket.Priority.NORMAL,
        )
        if attachment is None:
            return fail("Attachments must use a secure HTTPS link.")
        if len(subject) < 4 or len(text) < 3 or len(text) > 4000:
            return fail("Add a subject and a message of 3 to 4,000 characters.")
        if priority not in SupportTicket.Priority.values:
            return fail("Choose a valid ticket priority.")
        validated_order = _validate_related_order(request.user.account, order_id)
        if order_id and not validated_order:
            return fail("That order does not belong to your account.", status=404)
        with transaction.atomic():
            ticket = SupportTicket.objects.create(
                **owner,
                subject=subject,
                category=category,
                order_id=validated_order or "",
                priority=priority,
            )
            _message(request.user.account, ticket, text, attachment)
        return created({"ticket": _ticket_row(ticket)}, message="Support ticket created.")


class MyTicketDetail(APIView):
    permission_classes = [IsReOrbitAuthenticated]
    support_endpoint = True

    def _get(self, request, public_id):
        owner = _owner(request.user.account)
        if owner is None:
            return None
        return get_object_or_404(_ticket_queryset(), public_id=public_id, **owner)

    def get(self, request, public_id):
        ticket = self._get(request, public_id)
        return fail("Support tickets are available to Users and ReMakers.", status=403) if ticket is None else ok({"ticket": _ticket_row(ticket)})

    def post(self, request, public_id):
        ticket = self._get(request, public_id)
        if ticket is None:
            return fail("Support tickets are available to Users and ReMakers.", status=403)
        if request.data.get("action") == "close":
            requested_status = request.data.get("status")
            status = (
                SupportTicket.Status.CLOSED
                if ticket.remaker_id and requested_status == SupportTicket.Status.CLOSED
                else SupportTicket.Status.RESOLVED
            )
            _set_status(ticket, status)
            ticket.save(update_fields=["status", "closed_at", "updated_at"])
            return ok({"ticket": _ticket_row(ticket)})

        text = str(request.data.get("message") or request.data.get("text") or "").strip()
        if request.data.get("action") == "reopen" and not text:
            _set_status(ticket, SupportTicket.Status.OPEN)
            ticket.save(update_fields=["status", "closed_at", "updated_at"])
            return ok({"ticket": _ticket_row(ticket)})
        if len(text) < 1 or len(text) > 4000:
            return fail("Enter a reply message of up to 4,000 characters.")
        attachment = _attachment(request)
        if attachment is None:
            return fail("Attachments must use a secure HTTPS link.")
        if ticket.status == SupportTicket.Status.CLOSED:
            return fail("This ticket is closed. Create a new ticket to contact support.", status=409)
        with transaction.atomic():
            ticket = SupportTicket.objects.select_for_update().get(pk=ticket.pk)
            if ticket.status == SupportTicket.Status.RESOLVED:
                _set_status(ticket, SupportTicket.Status.OPEN)
                ticket.save(update_fields=["status", "closed_at", "updated_at"])
            _message(request.user.account, ticket, text, attachment)
        ticket.refresh_from_db()
        return created({"ticket": _ticket_row(ticket)})


class AdminTickets(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("support")]

    def get(self, request, public_id=None):
        if public_id:
            ticket = get_object_or_404(_ticket_queryset(), public_id=public_id)
            return ok({"ticket": _ticket_row(ticket)})

        queryset = _with_message_summary(
            _ticket_queryset(include_message_senders=False)
        )
        status = request.query_params.get("status")
        priority = request.query_params.get("priority")
        requester_type = request.query_params.get("requester")
        search = " ".join(str(request.query_params.get("q") or "").split())[:100]
        if priority:
            if priority not in SupportTicket.Priority.values:
                raise ValidationError("Unsupported ticket priority filter.")
            queryset = queryset.filter(priority=priority)
        if requester_type == "user":
            queryset = queryset.filter(user__isnull=False)
        elif requester_type == "remaker":
            queryset = queryset.filter(remaker__isnull=False)
        elif requester_type:
            raise ValidationError("Unsupported requester filter.")
        if search:
            queryset = queryset.filter(
                Q(public_id__icontains=search)
                | Q(subject__icontains=search)
                | Q(category__icontains=search)
                | Q(order_id__icontains=search)
                | Q(user__full_name__icontains=search)
                | Q(user__email__icontains=search)
                | Q(remaker__full_name__icontains=search)
                | Q(remaker__email__icontains=search)
                | Q(messages__text__icontains=search)
            ).distinct()
        counts = {
            "All": queryset.count(),
            "Open": queryset.filter(status=SupportTicket.Status.OPEN).count(),
            "In progress": queryset.filter(status=SupportTicket.Status.IN_PROGRESS).count(),
            "Waiting": queryset.filter(status=SupportTicket.Status.WAITING).count(),
            "Resolved": queryset.filter(
                status__in=[SupportTicket.Status.RESOLVED, SupportTicket.Status.CLOSED]
            ).count(),
        }
        if status:
            if status == "Waiting":
                queryset = queryset.filter(status=SupportTicket.Status.WAITING)
            elif status == "Resolved":
                queryset = queryset.filter(
                    status__in=[SupportTicket.Status.RESOLVED, SupportTicket.Status.CLOSED]
                )
            elif status in SupportTicket.Status.values:
                queryset = queryset.filter(status=status)
            else:
                raise ValidationError("Unsupported ticket status filter.")
        try:
            offset = max(0, int(request.query_params.get("offset", 0)))
            limit = min(max(1, int(request.query_params.get("limit", ADMIN_PAGE_SIZE))), 100)
        except (TypeError, ValueError):
            raise ValidationError("Ticket page parameters must be integers.")
        total = queryset.count()
        tickets = list(
            _with_message_summary(_ticket_queryset(include_message_senders=False))
            .filter(pk__in=queryset.values("pk"))
            .order_by("-updated_at", "-pk")[offset:offset + limit]
        )
        return ok({
            "tickets": [_ticket_row(ticket, include_messages=False) for ticket in tickets],
            "counts": counts,
            "total": total,
            "offset": offset,
            "next_offset": offset + len(tickets) if offset + len(tickets) < total else None,
            "has_more": offset + len(tickets) < total,
        })

    def post(self, request, public_id):
        with transaction.atomic():
            ticket = get_object_or_404(
                SupportTicket.objects.select_for_update().select_related(
                    "user", "remaker", "assigned_to"
                ).prefetch_related("messages__admin", "messages__user", "messages__remaker"),
                public_id=public_id,
            )
            action = str(request.data.get("action") or "reply")
            if "priority" in request.data and request.data["priority"] not in SupportTicket.Priority.values:
                return fail("Unsupported priority.")
            if action == "reply":
                if ticket.status == SupportTicket.Status.CLOSED:
                    return fail(
                        "Reopen this ticket before sending another reply.", status=409
                    )
                text = str(request.data.get("message") or "").strip()
                if not text or len(text) > 4000:
                    return fail("Enter a reply message of up to 4,000 characters.")
                attachment = _attachment(request)
                if attachment is None:
                    return fail("Attachments must use a secure HTTPS link.")
                requested_status = request.data.get("status")
                if requested_status:
                    if requested_status not in SupportTicket.Status.values:
                        return fail("Unsupported ticket status.")
                _message(request.user.account, ticket, text, attachment)
                if requested_status:
                    _set_status(ticket, requested_status)
                elif ticket.status != SupportTicket.Status.IN_PROGRESS:
                    _set_status(ticket, SupportTicket.Status.IN_PROGRESS)
            elif action in ("in_progress", "waiting", "resolve", "close", "reopen"):
                status = {
                    "in_progress": SupportTicket.Status.IN_PROGRESS,
                    "waiting": SupportTicket.Status.WAITING,
                    "resolve": SupportTicket.Status.RESOLVED,
                    "close": SupportTicket.Status.CLOSED,
                    "reopen": SupportTicket.Status.OPEN,
                }[action]
                _set_status(ticket, status)
            elif action == "assign":
                ticket.assigned_to = request.user.account
            else:
                return fail("Unsupported support action.")
            if "priority" in request.data:
                ticket.priority = request.data["priority"]
            ticket.save()
        ticket.refresh_from_db()
        ticket = _ticket_queryset().get(pk=ticket.pk)
        return ok({"ticket": _ticket_row(ticket)})
