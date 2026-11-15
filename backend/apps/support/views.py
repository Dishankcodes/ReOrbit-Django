from urllib.parse import urlparse

from django.db import transaction
from django.db.models import Count, F, OuterRef, Q, Subquery
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitAuthenticated
from apps.core import buyers
from apps.core.responses import created, fail, ok
from apps.admins.models import Admins
from apps.orders.models import Order
from apps.orders.serializers import media_url
from .models import SupportTicket, SupportTicketAdminRead, TicketMessage

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


def _with_message_summary(queryset, viewer=None):
    latest = TicketMessage.objects.filter(ticket_id=OuterRef("pk")).exclude(
        sender_type="system"
    ).order_by("-created_at", "-pk")
    latest_member = TicketMessage.objects.filter(
        ticket_id=OuterRef("pk"), sender_type__in=("user", "remaker")
    ).order_by("-created_at", "-pk")
    latest_admin = TicketMessage.objects.filter(
        ticket_id=OuterRef("pk"), sender_type="admin"
    ).order_by("-created_at", "-pk")
    result = queryset.annotate(
        _message_count=Count("messages", filter=~Q(messages__sender_type="system"), distinct=True),
        _last_message_text=Subquery(latest.values("text")[:1]),
        _last_message_at=Subquery(latest.values("created_at")[:1]),
        _last_message_sender=Subquery(latest.values("sender_type")[:1]),
        _last_member_at=Subquery(latest_member.values("created_at")[:1]),
        _last_admin_at=Subquery(latest_admin.values("created_at")[:1]),
    )
    if viewer and buyers.type_of(viewer) == "admin":
        receipt = SupportTicketAdminRead.objects.filter(
            ticket_id=OuterRef("pk"), admin=viewer
        )
        result = result.annotate(_viewer_read_at=Subquery(receipt.values("last_read_at")[:1]))
    return result


def _member_unread(ticket):
    last_admin_at = getattr(ticket, "_last_admin_at", None)
    if last_admin_at is None:
        last_admin_at = ticket.messages.filter(sender_type="admin").order_by("-created_at", "-pk").values_list("created_at", flat=True).first()
    return bool(last_admin_at and (ticket.member_last_read_at is None or last_admin_at > ticket.member_last_read_at))


def _admin_unread(ticket, admin):
    last_member_at = getattr(ticket, "_last_member_at", None)
    if last_member_at is None:
        last_member_at = ticket.messages.filter(sender_type__in=("user", "remaker")).order_by("-created_at", "-pk").values_list("created_at", flat=True).first()
    receipt = getattr(ticket, "_viewer_read_at", None)
    if receipt is None and not hasattr(ticket, "_viewer_read_at"):
        receipt = SupportTicketAdminRead.objects.filter(ticket=ticket, admin=admin).values_list("last_read_at", flat=True).first()
    return bool(last_member_at and (receipt is None or last_member_at > receipt))


def _mark_member_read(ticket):
    ticket.member_last_read_at = timezone.now()
    ticket.save(update_fields=["member_last_read_at", "updated_at"])


def _mark_admin_read(ticket, admin):
    now = timezone.now()
    SupportTicketAdminRead.objects.update_or_create(
        ticket=ticket, admin=admin, defaults={"last_read_at": now}
    )
    return now


def _support_agents():
    """Active admins who can actively work tickets, including Super Admins."""
    return [
        admin for admin in Admins.objects.filter(status=Admins.Status.ACTIVE).order_by("full_name", "admin_id")
        if admin.has_module("support", "edit")
    ]


def _support_agent_rows():
    return [
        {"id": admin.public_id, "name": admin.full_name, "email": admin.email}
        for admin in _support_agents()
    ]


def _party(kind, user, remaker, admin=None):
    account = user if kind == "user" else remaker if kind == "remaker" else admin
    if account is None:
        return {"type": "platform" if kind == "admin" or kind == "platform" else kind, "name": "ReOrbit", "id": ""}
    return {"type": kind, "name": account.full_name, "id": account.public_id}


def _order_summary(order_id, viewer=None, request=None):
    """What a ticket's order looks like, so nobody has to look it up: status, money, items, who sold it."""
    if not order_id:
        return None
    order = (
        Order.objects.select_related(
            "buyer_user", "buyer_remaker", "buyer_admin", "seller_user", "seller_remaker", "payment"
        )
        .prefetch_related("lines")
        .filter(public_id=order_id)
        .first()
    )
    if order is None:
        return {"id": order_id, "missing": True}
    role = ""
    if viewer is not None and buyers.type_of(viewer) != "admin":
        role = "buyer" if order.buyer_key == buyers.key_of(viewer) else "seller"
    lines = list(order.lines.all())
    ret = getattr(order, "return_request", None)
    return {
        "id": order.public_id,
        "status": order.status,
        "statusLabel": order.get_status_display(),
        "paymentStatus": order.payment_status,
        "paymentMethod": order.payment.method if order.payment_id else "",
        "total": order.total,
        "subtotal": order.subtotal,
        "deliveryFee": order.delivery_fee,
        "placedAt": order.created_at,
        "deliveredAt": order.delivered_at,
        "courier": order.courier_name,
        "tracking": order.tracking_no,
        "role": role,
        "buyer": _party(order.buyer_type, order.buyer_user, order.buyer_remaker, order.buyer_admin),
        "seller": _party(order.seller_type, order.seller_user, order.seller_remaker),
        "itemCount": sum(line.qty for line in lines),
        "items": [
            {"title": line.title, "qty": line.qty, "price": line.unit_price,
             "image": media_url(request, line.cover) if line.cover else None}
            for line in lines[:4]
        ],
        "return": ({"id": ret.public_id, "status": ret.status} if ret is not None else None),
    }


def _ticket_row(ticket, include_messages=True, viewer=None, request=None):
    owner = ticket.user or ticket.remaker
    messages = list(ticket.messages.all()) if include_messages else None
    if include_messages:
        spoken = [m for m in messages if m.sender_type != "system"]
        last_message = spoken[-1] if spoken else None
        message_count = len(spoken)
    elif hasattr(ticket, "_message_count"):
        last_message = None
        message_count = ticket._message_count
    else:
        spoken = ticket.messages.exclude(sender_type="system")
        last_message = spoken.order_by("-created_at", "-pk").first()
        message_count = spoken.count()
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
    if include_messages and ticket.order_id:
        result["order"] = _order_summary(ticket.order_id, viewer, request)
    if viewer:
        viewer_type = buyers.type_of(viewer)
        result["unread"] = (
            _admin_unread(ticket, viewer)
            if viewer_type == "admin"
            else _member_unread(ticket)
        )
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


def _event(ticket, text):
    """A line in the conversation that records what happened (assigned, resolved...), for both sides."""
    return TicketMessage.objects.create(ticket=ticket, sender_type="system", text=text[:500])


def _agent_name(account):
    return account.full_name if account is not None else "nobody"


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
        query = query.filter(Q(buyer_key=buyers.key_of(account)) | Q(seller_user=account))
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
            _ticket_queryset(include_message_senders=False).filter(**owner), request.user.account
        )
        tickets = [_ticket_row(ticket, include_messages=False, viewer=request.user.account, request=request) for ticket in rows]
        return ok({
            "tickets": tickets,
            "unread_count": sum(1 for ticket in tickets if ticket["unread"]),
        })

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
        if validated_order:
            open_one = SupportTicket.objects.filter(**owner, order_id=validated_order).exclude(
                status__in=[SupportTicket.Status.RESOLVED, SupportTicket.Status.CLOSED]
            ).order_by("-created_at").first()
            if open_one is not None:
                return fail(
                    f"You already have an open ticket for this order ({open_one.public_id}). "
                    "Reply there and the team will pick it up.",
                    status=409, code="ticket_exists", errors={"ticket_id": open_one.public_id},
                )
        with transaction.atomic():
            ticket = SupportTicket.objects.create(
                **owner,
                subject=subject,
                category=category,
                order_id=validated_order or "",
                priority=priority,
            )
            _message(request.user.account, ticket, text, attachment)
            ticket.member_last_read_at = timezone.now()
            ticket.save(update_fields=["member_last_read_at"])
        return created({"ticket": _ticket_row(ticket, viewer=request.user.account, request=request)}, message="Support ticket created.")


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
        if ticket is None:
            return fail("Support tickets are available to Users and ReMakers.", status=403)
        _mark_member_read(ticket)
        return ok({"ticket": _ticket_row(ticket, viewer=request.user.account, request=request)})

    def post(self, request, public_id):
        ticket = self._get(request, public_id)
        if ticket is None:
            return fail("Support tickets are available to Users and ReMakers.", status=403)
        if request.data.get("action") == "read":
            _mark_member_read(ticket)
            return ok({"ticket": _ticket_row(ticket, viewer=request.user.account, request=request)})
        if request.data.get("action") == "close":
            requested_status = request.data.get("status")
            status = (
                SupportTicket.Status.CLOSED
                if ticket.remaker_id and requested_status == SupportTicket.Status.CLOSED
                else SupportTicket.Status.RESOLVED
            )
            if ticket.status != status:
                _set_status(ticket, status)
                ticket.save(update_fields=["status", "closed_at", "updated_at"])
                _event(ticket, f"{request.user.account.full_name} marked this ticket as "
                               f"{'closed' if status == SupportTicket.Status.CLOSED else 'resolved'}.")
            _mark_member_read(ticket)
            ticket = _ticket_queryset().get(pk=ticket.pk)
            return ok({"ticket": _ticket_row(ticket, viewer=request.user.account, request=request)})

        text = str(request.data.get("message") or request.data.get("text") or "").strip()
        if request.data.get("action") == "reopen" and not text:
            _set_status(ticket, SupportTicket.Status.OPEN)
            ticket.save(update_fields=["status", "closed_at", "updated_at"])
            _event(ticket, f"{request.user.account.full_name} reopened this ticket.")
            _mark_member_read(ticket)
            ticket = _ticket_queryset().get(pk=ticket.pk)
            return ok({"ticket": _ticket_row(ticket, viewer=request.user.account, request=request)})
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
                _event(ticket, "Ticket reopened by a new reply.")
            _message(request.user.account, ticket, text, attachment)
            ticket.member_last_read_at = timezone.now()
            ticket.save(update_fields=["member_last_read_at", "updated_at"])
        ticket.refresh_from_db()
        return created({"ticket": _ticket_row(ticket, viewer=request.user.account, request=request)})


class AdminTickets(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("support")]

    def get(self, request, public_id=None):
        if public_id:
            ticket = get_object_or_404(_ticket_queryset(), public_id=public_id)
            _mark_admin_read(ticket, request.user.account)
            return ok({"ticket": _ticket_row(ticket, viewer=request.user.account, request=request)})

        queryset = _with_message_summary(
            _ticket_queryset(include_message_senders=False), request.user.account
        )
        status = request.query_params.get("status")
        priority = request.query_params.get("priority")
        requester_type = request.query_params.get("requester")
        assigned = request.query_params.get("assigned")
        search = " ".join(str(request.query_params.get("q") or "").split())[:100]
        if priority:
            if priority not in SupportTicket.Priority.values:
                raise ValidationError("Unsupported ticket priority filter.")
            queryset = queryset.filter(priority=priority)
        if assigned == "me":
            queryset = queryset.filter(assigned_to=request.user.account)
        elif assigned == "none":
            queryset = queryset.filter(assigned_to__isnull=True)
        elif assigned:
            queryset = queryset.filter(assigned_to__public_id=assigned)
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
        unread_count = queryset.filter(_last_member_at__isnull=False).filter(
            Q(_viewer_read_at__isnull=True) | Q(_last_member_at__gt=F("_viewer_read_at"))
        ).count()
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
            _with_message_summary(
                _ticket_queryset(include_message_senders=False), request.user.account
            )
            .filter(pk__in=queryset.values("pk"))
            .order_by("-updated_at", "-pk")[offset:offset + limit]
        )
        return ok({
            "tickets": [
                _ticket_row(ticket, include_messages=False, viewer=request.user.account, request=request)
                for ticket in tickets
            ],
            "counts": counts,
            "unread_count": unread_count,
            "support_agents": _support_agent_rows(),
            "total": total,
            "offset": offset,
            "next_offset": offset + len(tickets) if offset + len(tickets) < total else None,
            "has_more": offset + len(tickets) < total,
        })

    def post(self, request, public_id):
        with transaction.atomic():
            ticket = get_object_or_404(
                SupportTicket.objects.select_for_update(of=("self",)).select_related(
                    "user", "remaker", "assigned_to"
                ).prefetch_related("messages__admin", "messages__user", "messages__remaker"),
                public_id=public_id,
            )
            action = str(request.data.get("action") or "reply")
            actor = request.user.account
            if "priority" in request.data and request.data["priority"] not in SupportTicket.Priority.values:
                return fail("Unsupported priority.")
            before_status = ticket.status
            before_assignee = ticket.assigned_to
            events = []
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
                _message(actor, ticket, text, attachment)
                if ticket.assigned_to_id is None:
                    ticket.assigned_to = actor  # whoever answers first owns the ticket
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
                assignee_id = str(request.data.get("assignee_id") or "").strip()
                if not assignee_id:
                    ticket.assigned_to = actor
                elif assignee_id.lower() in ("none", "unassigned"):
                    ticket.assigned_to = None
                else:
                    ticket.assigned_to = next(
                        (agent for agent in _support_agents() if agent.public_id == assignee_id),
                        None,
                    )
                    if ticket.assigned_to is None:
                        return fail("Choose an active support agent.")
            elif action == "priority":
                if "priority" not in request.data:
                    return fail("Choose a priority.")
            elif action == "read":
                _mark_admin_read(ticket, actor)
                return ok({"ticket": _ticket_row(ticket, viewer=actor, request=request)})
            else:
                return fail("Unsupported support action.")
            if "priority" in request.data and request.data["priority"] != ticket.priority:
                events.append(f"{actor.full_name} changed the priority from {ticket.priority} to {request.data['priority']}.")
                ticket.priority = request.data["priority"]
            # A plain reply already says it all (who answered, what it is set to), so it adds no note.
            if action != "reply" and ticket.assigned_to_id != (before_assignee.pk if before_assignee else None):
                if ticket.assigned_to is None:
                    events.append(f"{actor.full_name} unassigned this ticket.")
                elif ticket.assigned_to_id == actor.pk:
                    events.append(f"{actor.full_name} took this ticket.")
                else:
                    events.append(f"{actor.full_name} assigned this ticket to {_agent_name(ticket.assigned_to)}.")
            if action != "reply" and ticket.status != before_status:
                events.append(f"{actor.full_name} set the status to {ticket.status}.")
            ticket.save()
            for line in events:
                _event(ticket, line)
            _mark_admin_read(ticket, actor)
        ticket.refresh_from_db()
        ticket = _ticket_queryset().get(pk=ticket.pk)
        return ok({"ticket": _ticket_row(ticket, viewer=request.user.account, request=request)})
