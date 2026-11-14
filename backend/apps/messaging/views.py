from django.db import IntegrityError, transaction
from django.db.models import Count, Exists, OuterRef, Prefetch, Q, Subquery
from django.utils.dateparse import parse_datetime
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import BasePermission
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitAuthenticated
from apps.core.responses import created, fail, ok
from apps.users.models import Users
from apps.remakers.models import ReMakers
from apps.admins.models import Admins
from .models import Conversation, ConversationParticipant, Message, MessageNotification

MODELS = {"user": Users, "remaker": ReMakers, "admin": Admins}
PAGE_SIZE = 50
MESSAGE_PAGE_SIZE = 50
MAX_MESSAGE_SIZE = 5000
MAX_ATTACHMENT_SIZE = 2_000_000  # Base64 image storage is intentionally unchanged in this pass.


class HasAdminMessagesOrSupport(BasePermission):
    """Lets the assigned support team work shared ReOrbit conversations.

    Direct, non-support conversations still require the separate messages
    module and are filtered again at object level below.
    """

    message = "You do not have access to messages or support."

    def has_permission(self, request, view):
        account = getattr(request.user, "account", None)
        if account is None or getattr(request.user, "account_type", None) != "admin":
            return False
        needed = "view" if request.method in ("GET", "HEAD", "OPTIONS") else "edit"
        return account.has_module("messages", needed) or account.has_module("support", needed)


def _support_team():
    return [
        admin for admin in Admins.objects.filter(status=Admins.Status.ACTIVE).order_by("admin_id")
        if admin.has_module("support", "edit")
    ]


def _support_viewers():
    return [
        admin for admin in Admins.objects.filter(status=Admins.Status.ACTIVE).order_by("admin_id")
        if admin.has_module("support", "view")
    ]


def _can_view_support(account):
    return account.has_module("support", "view")


def _can_view_direct_messages(account):
    return account.has_module("messages", "view")


def _admin_participants(request, account):
    """Return only the inbox rows this Admin is allowed to see.

    A support-only sub-admin must never gain access to ordinary direct
    messages.  Conversely, a messages-only admin must not get the shared
    support queue merely because they can use the messaging screen.
    """
    rows = _queryset_for(request, account, "admin")
    supports = _can_view_support(account)
    directs = _can_view_direct_messages(account)
    if supports and not directs:
        return rows.filter(conversation__kind="reorbit")
    if directs and not supports:
        return rows.exclude(conversation__kind="reorbit")
    return rows


def _prefetch_participants(queryset):
    return queryset.prefetch_related(
        Prefetch(
            "conversation__participants",
            queryset=ConversationParticipant.objects.select_related("user", "remaker", "admin"),
        )
    )


def _with_latest_message(queryset):
    latest = Message.objects.filter(conversation_id=OuterRef("conversation_id")).order_by(
        "-created_at", "-pk"
    )
    return queryset.annotate(
        _last_message_id=Subquery(latest.values("pk")[:1]),
        _last_message_text=Subquery(latest.values("text")[:1]),
        _last_message_image=Subquery(latest.values("attachment_url")[:1]),
        _last_message_at=Subquery(latest.values("created_at")[:1]),
        _last_message_sender_type=Subquery(latest.values("sender_type")[:1]),
        _last_message_sender_user_id=Subquery(latest.values("sender_user_id")[:1]),
        _last_message_sender_remaker_id=Subquery(latest.values("sender_remaker_id")[:1]),
        _last_message_sender_admin_id=Subquery(latest.values("sender_admin_id")[:1]),
    )


def _participant(account, conversation):
    return ConversationParticipant.objects.filter(
        conversation=conversation, **{account.account_type: account}
    ).first()


def _profile(account, kind):
    try:
        profile = account.profile
    except Exception:
        profile = None
    return {
        "id": account.public_id,
        "name": account.full_name,
        "username": getattr(account, "username", ""),
        "type": kind,
        "city": getattr(profile, "city", "") if profile else "",
        "image": str(getattr(profile, "profile_image", "") or "") if profile else "",
    }


def _support_direct_key(kind, account):
    return f"support:{kind}:{account.pk}"


def _sync_support_team(conversation, team=None):
    """Keep a legacy or new ReOrbit thread visible to its current team only."""
    team = team if team is not None else _support_viewers()
    team_ids = [admin.pk for admin in team]
    ConversationParticipant.objects.filter(
        conversation=conversation, account_type="admin"
    ).exclude(admin_id__in=team_ids).delete()
    for admin in team:
        ConversationParticipant.objects.get_or_create(
            conversation=conversation, admin=admin, defaults={"account_type": "admin"}
        )


def _sync_admin_support_inbox(account):
    """Backfill a newly-added agent into every existing shared support thread."""
    if not _can_view_support(account):
        return
    conversations = Conversation.objects.filter(kind="reorbit").only("pk")
    ConversationParticipant.objects.bulk_create(
        [
            ConversationParticipant(conversation=conversation, admin=account, account_type="admin")
            for conversation in conversations
        ],
        ignore_conflicts=True,
    )


def _ensure_support_conversation(kind, account):
    """Create/upgrade a shared ReOrbit support thread for a member.

    The old implementation paired the member with one arbitrary Admin. This
    keeps any existing thread and adds every active support agent as a
    participant, so the support queue is shared without exposing private chats.
    """
    team = _support_team()
    if not team:
        return None
    direct_key = _support_direct_key(kind, account)
    with transaction.atomic():
        participant = ConversationParticipant.objects.select_related("conversation").filter(
            **{kind: account}, conversation__kind="reorbit"
        ).order_by("conversation__created_at", "conversation_id").first()
        if participant:
            conversation = participant.conversation
            if conversation.direct_key != direct_key:
                conflict = Conversation.objects.filter(direct_key=direct_key).exclude(pk=conversation.pk).first()
                if conflict:
                    conversation = conflict
                    participant, _ = ConversationParticipant.objects.get_or_create(
                        conversation=conversation, **{kind: account}, defaults={"account_type": kind}
                    )
                else:
                    conversation.direct_key = direct_key
                    conversation.save(update_fields=["direct_key", "updated_at"])
        else:
            conversation, _ = Conversation.objects.get_or_create(
                direct_key=direct_key,
                defaults={
                    "kind": "reorbit",
                    "subject": "ReOrbit Support",
                    "context": {
                        "label": "ReOrbit Support",
                        "to": "/remaker-help" if kind == "remaker" else "/user-help",
                    },
                },
            )
            participant, _ = ConversationParticipant.objects.get_or_create(
                conversation=conversation, **{kind: account}, defaults={"account_type": kind}
            )
        if participant.is_archived:
            participant.is_archived = False
            participant.save(update_fields=["is_archived", "updated_at"])
        _sync_support_team(conversation, _support_viewers())
        if not conversation.messages.exists():
            welcome = Message.objects.create(
                conversation=conversation, sender_type="admin", sender_admin=team[0],
                text="Welcome to ReOrbit Support. How can we help?",
            )
            MessageNotification.objects.get_or_create(participant=participant, message=welcome)
    return conversation


def _message_page(conversation, before=None, after=None):
    messages = conversation.messages.all()
    if before is not None:
        messages = messages.filter(pk__lt=before).order_by("-created_at", "-pk")
        page = list(messages[: MESSAGE_PAGE_SIZE + 1])
        has_more = len(page) > MESSAGE_PAGE_SIZE
        page = list(reversed(page[:MESSAGE_PAGE_SIZE]))
        return page, has_more
    if after is not None:
        messages = messages.filter(pk__gt=after).order_by("created_at", "pk")
        page = list(messages[: MESSAGE_PAGE_SIZE + 1])
        has_more = len(page) > MESSAGE_PAGE_SIZE
        return page[:MESSAGE_PAGE_SIZE], has_more
    messages = messages.order_by("-created_at", "-pk")
    page = list(messages[: MESSAGE_PAGE_SIZE + 1])
    has_more = len(page) > MESSAGE_PAGE_SIZE
    return list(reversed(page[:MESSAGE_PAGE_SIZE])), has_more


def _row(conv, participant, include_messages=False, before=None, after=None):
    peers = [peer for peer in conv.participants.all() if peer.pk != participant.pk]
    if conv.kind == "reorbit":
        peer = next(
            (candidate for candidate in peers if candidate.account_type != participant.account_type),
            peers[0] if peers else None,
        )
    else:
        peer = peers[0] if peers else None
    account = getattr(peer, peer.account_type) if peer else None
    if include_messages:
        message_rows, has_more = _message_page(conv, before=before, after=after)
    else:
        message_rows, has_more = [], False

    if hasattr(participant, "_last_message_id"):
        last_id = participant._last_message_id
        last_text = participant._last_message_text
        last_image = participant._last_message_image
        last_at = participant._last_message_at
        last_sender_type = participant._last_message_sender_type
        last_sender_id = getattr(participant, f"_last_message_sender_{last_sender_type}_id", None) if last_sender_type else None
    else:
        last = conv.messages.order_by("-created_at", "-pk").first()
        if after is not None and message_rows:
            last = message_rows[-1]
        last_id = last.pk if last else None
        last_text = last.text if last else ""
        last_image = last.attachment_url if last else ""
        last_at = last.created_at if last else None
        last_sender_type = last.sender_type if last else None
        last_sender_id = getattr(last, f"sender_{last.sender_type}_id", None) if last else None
    last_from = (
        "me"
        if last_id
        and last_sender_type == participant.account_type
        and last_sender_id == getattr(participant, f"{last_sender_type}_id")
        else "them"
    )
    unread = getattr(participant, "unread_count", None)
    if unread is None:
        unread = participant.notifications.filter(read_at__isnull=True).count()
    peer_profile = _profile(account, peer.account_type) if account else None

    if participant.account_type == "admin":
        display_kind = (
            "support"
            if conv.kind == "reorbit"
            else "customer"
            if peer and peer.account_type == "user"
            else "remaker"
            if peer and peer.account_type == "remaker"
            else conv.kind
        )
    elif peer and peer.account_type == "admin":
        display_kind = "reorbit"
    elif participant.account_type == "remaker" and peer and peer.account_type == "user":
        display_kind = "customer"
    elif peer and peer.account_type == "remaker":
        display_kind = "remaker"
    else:
        display_kind = conv.kind

    data = {
        "id": conv.public_id,
        "key": f"{peer.account_type}:{account.public_id}" if peer else conv.public_id,
        "kind": display_kind,
        "name": (
            "ReOrbit Support"
            if peer and peer.account_type == "admin"
            else account.full_name
            if account
            else conv.subject
        ),
        "subtitle": peer_profile["city"] if peer_profile else "",
        "image": peer_profile["image"] if peer_profile else "",
        "peer": peer_profile,
        "context": conv.context,
        "unread": unread,
        "messages": [],
        "last_message": (
            {"id": last_id, "text": last_text, "image": last_image,
             "at": last_at, "from": last_from}
            if last_id else None
        ),
        "has_more_messages": has_more,
        "older_cursor": message_rows[0].pk if message_rows else None,
        "newer_cursor": message_rows[-1].pk if message_rows else None,
    }
    if include_messages:
        data["messages"] = [
            {
                "id": message.pk,
                "from": (
                    "me"
                    if message.sender_type == participant.account_type
                    and getattr(message, f"sender_{message.sender_type}_id")
                    == getattr(participant, f"{message.sender_type}_id")
                    else "them"
                ),
                "sender_type": message.sender_type,
                "text": message.text,
                "image": message.attachment_url,
                "at": message.created_at,
            }
            for message in message_rows
        ]
    return data


def _direct_key(account_type, account, target_type, target):
    identities = sorted((f"{account_type}:{account.pk}", f"{target_type}:{target.pk}"))
    return "|".join(identities)


def _matching_direct(account_type, account, target_type, target):
    mine = ConversationParticipant.objects.filter(**{account_type: account})
    theirs = ConversationParticipant.objects.filter(**{target_type: target})
    return (
        Conversation.objects.filter(pk__in=mine.values("conversation_id"))
        .filter(pk__in=theirs.values("conversation_id"))
        .order_by("created_at", "pk")
        .first()
    )


def _conversation_for_pair(account_type, account, target_type, target, data):
    """Create or reuse one pair thread safely when two clients start it together."""
    direct_key = _direct_key(account_type, account, target_type, target)
    existing = _matching_direct(account_type, account, target_type, target)
    defaults = {
        "kind": str(data.get("kind") or "direct")[:16],
        "subject": str(data.get("subject") or "")[:180],
        "context": data.get("context") if isinstance(data.get("context"), dict) else {},
    }

    if existing:
        conv = existing
        if not conv.direct_key:
            try:
                Conversation.objects.filter(pk=conv.pk, direct_key__isnull=True).update(
                    direct_key=direct_key
                )
                conv.refresh_from_db()
            except IntegrityError:
                conv = Conversation.objects.get(direct_key=direct_key)
    else:
        try:
            conv, _ = Conversation.objects.get_or_create(direct_key=direct_key, defaults=defaults)
        except IntegrityError:
            # A concurrent request may have committed the same unique key.
            conv = Conversation.objects.get(direct_key=direct_key)

    ConversationParticipant.objects.get_or_create(
        conversation=conv, **{account_type: account},
        defaults={"account_type": account_type},
    )
    ConversationParticipant.objects.get_or_create(
        conversation=conv, **{target_type: target},
        defaults={"account_type": target_type},
    )
    if isinstance(data.get("context"), dict) and data.get("context"):
        conv.context = data["context"]
        conv.save(update_fields=["context", "updated_at"])
    return conv


def _queryset_for(request, account, kind):
    unread_filter = request.query_params.get("filter") == "unread"
    participants = ConversationParticipant.objects.filter(
        **{kind: account}, is_archived=False
    ).select_related("conversation")
    if unread_filter:
        participants = participants.filter(notifications__read_at__isnull=True).distinct()

    query = " ".join(str(request.query_params.get("q") or "").split())[:100]
    if query:
        text_match = Message.objects.filter(
            conversation_id=OuterRef("conversation_id"), text__icontains=query
        )
        participants = participants.annotate(_has_matching_message=Exists(text_match)).filter(
            Q(conversation__subject__icontains=query)
            | Q(conversation__participants__user__full_name__icontains=query)
            | Q(conversation__participants__user__email__icontains=query)
            | Q(conversation__participants__remaker__full_name__icontains=query)
            | Q(conversation__participants__remaker__email__icontains=query)
            | Q(conversation__participants__admin__full_name__icontains=query)
            | Q(_has_matching_message=True)
        ).distinct()

    category = request.query_params.get("kind")
    if category and category != "all":
        peer_type = {
            "seller": "user", "buyer": "user", "customer": "user",
            "remaker": "remaker", "reorbit": "admin", "support": "admin",
        }.get(category)
        if peer_type:
            participants = participants.filter(
                conversation__participants__account_type=peer_type
            ).distinct()
        if category == "support":
            participants = participants.filter(conversation__kind="reorbit")
        elif category == "reorbit":
            participants = participants.filter(conversation__kind="reorbit")
        elif category == "seller":
            participants = participants.filter(conversation__kind="seller")
        elif category == "buyer":
            participants = participants.filter(conversation__kind="buyer")
        elif category == "customer":
            participants = participants.filter(conversation__kind="customer")
    return participants


def _inbox_counts(account, kind, query=""):
    base = ConversationParticipant.objects.filter(**{kind: account}, is_archived=False)
    if kind == "admin":
        supports = _can_view_support(account)
        directs = _can_view_direct_messages(account)
        if supports and not directs:
            base = base.filter(conversation__kind="reorbit")
        elif directs and not supports:
            base = base.exclude(conversation__kind="reorbit")
    if query:
        text_match = Message.objects.filter(
            conversation_id=OuterRef("conversation_id"), text__icontains=query
        )
        base = base.annotate(_has_matching_message=Exists(text_match)).filter(
            Q(conversation__subject__icontains=query)
            | Q(conversation__participants__user__full_name__icontains=query)
            | Q(conversation__participants__user__email__icontains=query)
            | Q(conversation__participants__remaker__full_name__icontains=query)
            | Q(conversation__participants__remaker__email__icontains=query)
            | Q(conversation__participants__admin__full_name__icontains=query)
            | Q(_has_matching_message=True)
        ).distinct()
    peer_type = ConversationParticipant.objects.filter(
        conversation_id=OuterRef("conversation_id")
    ).exclude(pk=OuterRef("pk")).values("account_type")[:1]
    rows = list(
        base.annotate(
            _unread=Count(
                "notifications", filter=Q(notifications__read_at__isnull=True), distinct=True
            ),
            _peer_type=Subquery(peer_type),
        ).values("pk", "conversation_id", "conversation__kind", "_unread", "_peer_type")
    )
    counts = {
        "all": len(rows),
        "unread": sum(1 for row in rows if row["_unread"]),
        "unread_messages": sum(row["_unread"] for row in rows),
    }
    for row in rows:
        peer_type = row["_peer_type"]
        label = "support" if kind == "admin" and row["conversation__kind"] == "reorbit" else (
            "reorbit" if peer_type == "admin" else
            "customer" if kind == "remaker" and peer_type == "user" else
            "seller" if kind == "user" and peer_type == "user" and row["conversation__kind"] == "seller" else
            "buyer" if kind == "user" and peer_type == "user" and row["conversation__kind"] == "buyer" else
            "remaker" if peer_type == "remaker" else
            "customer" if kind == "admin" and peer_type == "user" else
            row["conversation__kind"]
        )
        counts[label] = counts.get(label, 0) + 1
    return counts


def _unread_conversations(account, kind):
    participants = ConversationParticipant.objects.filter(
        **{kind: account}, is_archived=False,
        notifications__read_at__isnull=True,
    ).annotate(
        unread_count=Count("notifications", filter=Q(notifications__read_at__isnull=True), distinct=True)
    ).select_related("conversation").order_by("-conversation__updated_at", "-conversation_id", "-pk")
    if kind == "admin":
        supports = _can_view_support(account)
        directs = _can_view_direct_messages(account)
        if supports and not directs:
            participants = participants.filter(conversation__kind="reorbit")
        elif directs and not supports:
            participants = participants.exclude(conversation__kind="reorbit")
    participants = _with_latest_message(participants)[:100]
    participants = _prefetch_participants(participants)
    return [_row(row.conversation, row, False) for row in participants]


class ConversationList(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def get(self, request):
        account, kind = request.user.account, request.user.account_type
        if kind == "admin":
            raise PermissionDenied("Use the permission-checked admin messages endpoint.")
        if kind not in ("user", "remaker"):
            raise PermissionDenied("This account cannot use direct messages.")

        # A ReOrbit thread is a shared support-team conversation, not a
        # private chat with whichever admin record happened to be first.
        _ensure_support_conversation(kind, account)

        query = " ".join(str(request.query_params.get("q") or "").split())[:100]
        since = request.query_params.get("since")
        since_at = parse_datetime(since) if since else None
        if since and since_at is None:
            raise ValidationError("The inbox sync cursor is invalid.")
        watermark = timezone.now()
        base = ConversationParticipant.objects.filter(
            **{kind: account}, is_archived=False
        )
        counts = _inbox_counts(account, kind, query)
        rows = _with_latest_message(
            _queryset_for(request, account, kind).annotate(
                unread_count=Count("notifications", filter=Q(notifications__read_at__isnull=True))
            )
        ).order_by("-conversation__updated_at", "-conversation_id", "-pk")
        if since_at:
            if timezone.is_naive(since_at):
                since_at = timezone.make_aware(since_at, timezone.get_current_timezone())
            rows = rows.filter(conversation__updated_at__gte=since_at)
        try:
            offset = max(0, int(request.query_params.get("offset", 0)))
            limit = min(max(1, int(request.query_params.get("limit", PAGE_SIZE))), 100)
        except (TypeError, ValueError):
            raise ValidationError("Inbox page parameters must be integers.")
        total = rows.count()
        page = list(_prefetch_participants(rows[offset:offset + limit]))
        conversations = [_row(p.conversation, p, False) for p in page]
        removed = []
        if since_at:
            included = {row["conversation_id"] for row in page}
            changed = ConversationParticipant.objects.filter(
                **{kind: account}, updated_at__gte=since_at
            ).values_list("conversation_id", "conversation__public_id").distinct()
            removed = [public_id for conversation_id, public_id in changed if conversation_id not in included]
        return ok({
            "conversations": conversations,
            "unread_conversations": _unread_conversations(account, kind),
            "unread_count": counts.get("unread_messages", 0),
            "counts": counts,
            "total": total,
            "offset": offset,
            "next_offset": offset + len(page) if offset + len(page) < total else None,
            "has_more": offset + len(page) < total,
            "removed": removed,
            "server_time": watermark.isoformat(),
        })

    def post(self, request):
        data = request.data
        kind, public_id = str(data.get("target_type") or ""), str(data.get("target_id") or "")
        if kind not in MODELS or not public_id:
            return fail("Choose a valid conversation recipient.")
        account, actor_type = request.user.account, request.user.account_type
        if actor_type == "admin":
            raise PermissionDenied("Use the permission-checked admin messages endpoint.")
        if actor_type not in ("user", "remaker"):
            raise PermissionDenied("This account cannot start direct messages.")
        if kind == "admin" and public_id == "support":
            conv = _ensure_support_conversation(actor_type, account)
            if conv is None:
                return fail("ReOrbit Support is temporarily unavailable.", status=503)
            participant = ConversationParticipant.objects.get(
                conversation=conv, **{actor_type: account}
            )
            return created({"conversation": _row(conv, participant, include_messages=True)})
        target = MODELS[kind].objects.filter(public_id=public_id, status="Active").first()
        if target is None:
            return fail("That account is unavailable.", status=404)
        if actor_type == kind and target.pk == account.pk:
            return fail("You cannot message yourself.")
        if kind == "admin" and public_id != "support":
            return fail("Use ReOrbit Support to contact the team.", status=403)
        with transaction.atomic():
            conv = _conversation_for_pair(actor_type, account, kind, target, data)
            participant = ConversationParticipant.objects.get(
                conversation=conv, **{actor_type: account}
            )
            if participant.is_archived:
                participant.is_archived = False
                participant.save(update_fields=["is_archived", "updated_at"])
        return created({"conversation": _row(conv, participant, include_messages=True)})


class ConversationDetail(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def _get(self, request, public_id):
        if request.user.account_type == "admin":
            raise PermissionDenied("Use the permission-checked admin messages endpoint.")
        return get_object_or_404(
            ConversationParticipant.objects.select_related("conversation").prefetch_related(
                "conversation__participants"
            ),
            conversation__public_id=public_id,
            **{request.user.account_type: request.user.account},
        )

    def get(self, request, public_id):
        participant = self._get(request, public_id)
        before, after = request.query_params.get("before"), request.query_params.get("after")
        if before and after:
            return fail("Use either the before or after message cursor.")
        for cursor in (before, after):
            if cursor is not None and (not cursor.isdigit() or int(cursor) < 1):
                return fail("Message cursor must be a positive message ID.")
        conversation = _row(
            participant.conversation, participant, True,
            before=int(before) if before else None,
            after=int(after) if after else None,
        )
        return ok({"conversation": conversation})

    def post(self, request, public_id):
        participant = self._get(request, public_id)
        action = request.data.get("action")
        if action == "read":
            read_at = timezone.now()
            with transaction.atomic():
                participant.last_read_at = read_at
                participant.save(update_fields=["last_read_at", "updated_at"])
                MessageNotification.objects.filter(
                    participant=participant, read_at__isnull=True,
                    message__created_at__lte=read_at,
                ).update(read_at=read_at)
            return ok({"conversation": _row(participant.conversation, participant)})
        if action == "unread":
            with transaction.atomic():
                participant.last_read_at = None
                participant.save(update_fields=["last_read_at", "updated_at"])
                MessageNotification.objects.filter(participant=participant).update(read_at=None)
            return ok({"conversation": _row(participant.conversation, participant)})
        if action == "archive":
            participant.is_archived = True
            participant.save(update_fields=["is_archived", "updated_at"])
            return ok({"archived": True})
        if action:
            return fail("Unsupported conversation action.")

        text = str(request.data.get("text") or "").strip()
        attachment = str(request.data.get("image") or request.data.get("attachment_url") or "").strip()
        if len(text) > MAX_MESSAGE_SIZE or len(attachment) > MAX_ATTACHMENT_SIZE or (not text and not attachment):
            return fail("Enter a message (up to 5,000 characters) or provide an attachment.")
        if attachment and not (attachment.startswith("https://") or attachment.startswith("data:image/")):
            return fail("Attachments must be secure image URLs or uploaded image data.")

        kind = request.user.account_type
        sender = {f"sender_{kind}": request.user.account}
        with transaction.atomic():
            locked = Conversation.objects.select_for_update().get(pk=participant.conversation_id)
            message = Message.objects.create(
                conversation=locked, sender_type=kind, text=text,
                attachment_url=attachment, **sender,
            )
            recipient_rows = list(
                locked.participants.exclude(pk=participant.pk).select_for_update()
            )
            for recipient in recipient_rows:
                MessageNotification.objects.get_or_create(participant=recipient, message=message)
                if recipient.is_archived:
                    recipient.is_archived = False
                    recipient.save(update_fields=["is_archived", "updated_at"])
            locked.save(update_fields=["updated_at"])
        return created({
            "message": {
                "id": message.pk, "from": "me", "sender_type": kind,
                "text": message.text, "image": message.attachment_url,
                "at": message.created_at,
            }
        })


class AdminInbox(ConversationList):
    permission_classes = [IsReOrbitAdmin, HasAdminMessagesOrSupport]

    def get(self, request):
        account = request.user.account
        kind = "admin"
        _sync_admin_support_inbox(account)
        query = " ".join(str(request.query_params.get("q") or "").split())[:100]
        since = request.query_params.get("since")
        since_at = parse_datetime(since) if since else None
        if since and since_at is None:
            raise ValidationError("The inbox sync cursor is invalid.")
        watermark = timezone.now()
        counts = _inbox_counts(account, kind, query)
        rows = _with_latest_message(
            _admin_participants(request, account).annotate(
                unread_count=Count("notifications", filter=Q(notifications__read_at__isnull=True))
            )
        ).order_by("-conversation__updated_at", "-conversation_id", "-pk")
        if since_at:
            if timezone.is_naive(since_at):
                since_at = timezone.make_aware(since_at, timezone.get_current_timezone())
            rows = rows.filter(conversation__updated_at__gte=since_at)
        try:
            offset = max(0, int(request.query_params.get("offset", 0)))
            limit = min(max(1, int(request.query_params.get("limit", PAGE_SIZE))), 100)
        except (TypeError, ValueError):
            raise ValidationError("Inbox page parameters must be integers.")
        total = rows.count()
        page = list(_prefetch_participants(rows[offset:offset + limit]))
        conversations = [_row(p.conversation, p, False) for p in page]
        removed = []
        if since_at:
            included = {row["conversation_id"] for row in page}
            changed = ConversationParticipant.objects.filter(
                admin=account, updated_at__gte=since_at
            ).values_list("conversation_id", "conversation__public_id").distinct()
            removed = [public_id for conversation_id, public_id in changed if conversation_id not in included]
        return ok({
            "conversations": conversations,
            "unread_conversations": _unread_conversations(account, kind),
            "unread_count": counts.get("unread_messages", 0),
            "counts": counts,
            "total": total,
            "offset": offset,
            "next_offset": offset + len(page) if offset + len(page) < total else None,
            "has_more": offset + len(page) < total,
            "removed": removed,
            "server_time": watermark.isoformat(),
        })

    def post(self, request):
        if not request.user.account.has_module("messages", "edit"):
            raise PermissionDenied("You do not have access to direct messages.")
        data = request.data
        kind = str(data.get("target_type") or "")
        public_id = str(data.get("target_id") or "")
        if kind not in ("user", "remaker") or not public_id:
            return fail("Choose a User or ReMaker recipient.")
        target = MODELS[kind].objects.filter(public_id=public_id, status="Active").first()
        if target is None:
            return fail("That account is unavailable.", status=404)
        account = request.user.account
        with transaction.atomic():
            conversation = _conversation_for_pair("admin", account, kind, target, data)
            participant = ConversationParticipant.objects.get(
                conversation=conversation, admin=account
            )
            if participant.is_archived:
                participant.is_archived = False
                participant.save(update_fields=["is_archived", "updated_at"])
        return created({"conversation": _row(conversation, participant, include_messages=True)})


class AdminConversationDetail(ConversationDetail):
    permission_classes = [IsReOrbitAdmin, HasAdminMessagesOrSupport]

    def _get(self, request, public_id):
        participant = get_object_or_404(
            ConversationParticipant.objects.select_related("conversation").prefetch_related(
                "conversation__participants"
            ),
            conversation__public_id=public_id,
            admin=request.user.account,
        )
        if participant.conversation.kind == "reorbit":
            if not _can_view_support(request.user.account):
                raise PermissionDenied("You do not have access to ReOrbit Support.")
        elif not _can_view_direct_messages(request.user.account):
            raise PermissionDenied("You do not have access to direct messages.")
        return participant
