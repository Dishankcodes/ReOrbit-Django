from django.db import IntegrityError, transaction
from django.db.models import Count, Exists, OuterRef, Prefetch, Q, Subquery
from django.db.models.functions import Length
from django.utils.dateparse import parse_datetime
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
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
MAX_ATTACHMENT_SIZE = 7_000_000  # the base64 text sent by the app (about a 5 MB photo); saved much smaller
MAX_PHOTO_BYTES = 5_000_000
CHAT_PHOTO_SIDE = 1280


def clean_photo(raw):
    """(data_url, error). A chat photo must be a photo sent from the device (data:image/...;base64),
    never a link to another site. It is opened as a real JPEG, PNG or WebP and saved again: at most
    1280px, without location or camera data, so a phone photo of several MB is stored at a fraction."""
    import base64
    import binascii
    import io

    from apps.core.images import process_image

    raw = (raw or "").strip()
    if not raw:
        return "", ""
    if not raw.startswith("data:image/") or ";base64," not in raw[:64]:
        return None, "Send photos from your device. Links to images on other sites aren't accepted."
    try:
        data = base64.b64decode(raw.split(",", 1)[1], validate=True)
    except (binascii.Error, ValueError):
        return None, "That photo couldn't be read. Try another one."
    if len(data) > MAX_PHOTO_BYTES:
        return None, "Photos can be up to 5 MB."
    try:
        clean = process_image(io.BytesIO(data), max_side=CHAT_PHOTO_SIDE)
    except Exception:  # noqa: BLE001  not a JPEG / PNG / WebP, or a broken file
        return None, "Only JPEG, PNG or WebP photos can be sent."
    ext = clean.name.rsplit(".", 1)[-1]
    mime = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp"}.get(ext, "jpeg")
    return f"data:image/{mime};base64,{base64.b64encode(clean.read()).decode()}", ""


def _safe_url(value, request, *, image=False):
    """A link the chat's "about this item" card may show: a ReOrbit page ("/...") or, for its picture,
    an image on ReOrbit's own server or its photo storage (Cloudinary). Anything else is dropped."""
    from urllib.parse import urlparse

    value = str(value or "").strip()[:500]
    if value.startswith("/") and not value.startswith("//"):
        return value
    if not image:
        return ""
    from django.conf import settings

    u = urlparse(value)
    host = (u.hostname or "").lower()
    own = {h.lstrip(".").lower() for h in settings.ALLOWED_HOSTS if h and h != "*"}
    if request is not None:
        own.add(request.get_host().split(":")[0].lower())
    ok_scheme = u.scheme == "https" or (settings.DEBUG and u.scheme == "http")
    if ok_scheme and host and (host in own or host == "res.cloudinary.com" or host.endswith(".cloudinary.com")):
        return value
    return ""


def clean_context(ctx, request):
    """Only a label, an internal link and a ReOrbit-hosted picture survive."""
    if not isinstance(ctx, dict):
        return {}
    label = " ".join(str(ctx.get("label") or "").split())[:120]
    if not label:
        return {}
    return {"label": label, "to": _safe_url(ctx.get("to"), request), "image": _safe_url(ctx.get("image"), request, image=True)}


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
            # profiles too: every row shows the other person's photo (one query, not one per row)
            queryset=ConversationParticipant.objects.select_related(
                "user", "remaker", "admin", "user__profile", "remaker__profile"),
        )
    )


def _with_latest_message(queryset):
    latest = Message.objects.filter(conversation_id=OuterRef("conversation_id")).order_by(
        "-created_at", "-pk"
    )
    return queryset.annotate(
        _last_message_id=Subquery(latest.values("pk")[:1]),
        _last_message_text=Subquery(latest.values("text")[:1]),
        _last_message_image_len=Subquery(latest.annotate(_n=Length("attachment_url")).values("_n")[:1]),
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
        "image": _photo_url(profile),
    }


def _photo_url(profile):
    """The profile photo's address (the stored file name isn't one: on Cloudinary it needs .url,
    locally it is "/uploads/..." and the app adds the server address). "" when there is no photo."""
    field = getattr(profile, "profile_image", None) if profile else None
    if not field:
        return ""
    try:
        return field.url
    except Exception:  # noqa: BLE001  a missing file must not break the inbox
        return ""


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
    # Photos are stored as base64 and can be megabytes each. Never ship them with the
    # page of messages: only note that one exists. The client fetches each on demand.
    messages = conversation.messages.annotate(_image_len=Length("attachment_url")).defer("attachment_url")
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
        last_has_image = bool(participant._last_message_image_len)
        last_at = participant._last_message_at
        last_sender_type = participant._last_message_sender_type
        last_sender_id = getattr(participant, f"_last_message_sender_{last_sender_type}_id", None) if last_sender_type else None
    else:
        last = conv.messages.order_by("-created_at", "-pk").first()
        if after is not None and message_rows:
            last = message_rows[-1]
        last_id = last.pk if last else None
        last_text = last.text if last else ""
        last_has_image = bool(last and last.attachment_url)
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

    display_kind = _category(participant.account_type, peer.account_type if peer else "", conv.kind)

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
        "context": _public_context(conv, participant),
        "unread": unread,
        "messages_loaded": bool(include_messages),
        "updated_at": conv.updated_at,
        "messages": [],
        "last_message": (
            {"id": last_id, "text": last_text, "image": "", "has_image": last_has_image,
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
                "image": "",
                "has_image": bool(message._image_len),
                "at": message.created_at,
            }
            for message in message_rows
        ]
    return data


PEER_FILTERS = {
    # filter key -> account type of the other person in the chat
    "user": "user", "customer": "user", "seller": "user", "buyer": "user",
    "remaker": "remaker",
    "reorbit": "admin", "support": "admin",
}


def _category(viewer_type, peer_type, conv_kind):
    """The sidebar label/filter for one chat, from the viewer's side.

    It depends only on who the viewer is and who is on the other end, never on
    the `kind` the starter happened to send (that made the same chat look like a
    "seller" to both people and broke the filters).
    """
    if viewer_type == "admin":
        return "remaker" if peer_type == "remaker" else "customer"
    if peer_type == "admin" or conv_kind == "reorbit":
        return "reorbit"
    if peer_type == "remaker":
        return "remaker"
    return "customer" if viewer_type == "remaker" else "user"


def _public_context(conv, participant):
    """Only real "about this thing" contexts are shown, and only the starter owns the link."""
    ctx = conv.context if isinstance(conv.context, dict) else {}
    label = str(ctx.get("label") or "").strip()
    if conv.kind == "reorbit" or not label:
        return None
    owner = f"{participant.account_type}:{getattr(participant, participant.account_type + '_id')}"
    return {
        "label": label,
        "to": _safe_url(ctx.get("to"), None),
        "image": _safe_url(ctx.get("image"), None, image=True),
        "mine": ctx.get("by") == owner,
    }


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
    if isinstance(data.get("context"), dict) and data.get("context", {}).get("label"):
        conv.context = {**data["context"], "by": f"{account_type}:{account.pk}"}
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
        peer_type = PEER_FILTERS.get(category)
        if peer_type is None:
            return participants.none()
        # Match the other participant, never the inbox owner's own row.
        peer_exists = ConversationParticipant.objects.filter(
            conversation_id=OuterRef("conversation_id"),
            account_type=peer_type,
        ).exclude(pk=OuterRef("pk"))
        participants = participants.annotate(_has_peer_type=Exists(peer_exists)).filter(_has_peer_type=True)
        if category in ("reorbit", "support"):
            if kind == "admin":
                participants = participants.filter(conversation__kind="reorbit")
        elif kind != "admin":
            participants = participants.exclude(conversation__kind="reorbit")
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
    def has_peer(account_type):
        return Exists(
            ConversationParticipant.objects.filter(
                conversation_id=OuterRef("conversation_id"), account_type=account_type
            ).exclude(pk=OuterRef("pk"))
        )

    rows = list(
        base.annotate(
            _unread=Count(
                "notifications", filter=Q(notifications__read_at__isnull=True), distinct=True
            ),
            _peer_user=has_peer("user"),
            _peer_remaker=has_peer("remaker"),
            _peer_admin=has_peer("admin"),
        ).values(
            "pk", "conversation_id", "conversation__kind", "_unread",
            "_peer_user", "_peer_remaker", "_peer_admin",
        )
    )
    counts = {
        "all": len(rows),
        "unread": sum(1 for row in rows if row["_unread"]),
        "unread_messages": sum(row["_unread"] for row in rows),
    }
    for row in rows:
        if row["_peer_remaker"]:
            peer_type = "remaker"
        elif row["_peer_user"]:
            peer_type = "user"
        elif row["_peer_admin"]:
            peer_type = "admin"
        else:
            peer_type = ""
        label = _category(kind, peer_type, row["conversation__kind"])
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

    @method_decorator(never_cache)  # same address every check: the browser must never answer from its cache
    def get(self, request):
        account, kind = request.user.account, request.user.account_type
        if kind == "admin":
            raise PermissionDenied("Use the permission-checked admin messages endpoint.")
        if kind not in ("user", "remaker"):
            raise PermissionDenied("This account cannot use direct messages.")

        # A ReOrbit thread is a shared support-team conversation, not a
        # private chat with whichever admin record happened to be first.
        # Incremental polls (`since`) skip this: it is several queries and the
        # thread already exists by then.
        # The app sends the cursor in an X-Since header (a constant address lets the browser reuse
        # its CORS permission instead of an OPTIONS request before every check); ?since= still works.
        since = request.query_params.get("since") or request.headers.get("X-Since") or ""
        if not since:
            _ensure_support_conversation(kind, account)

        query = " ".join(str(request.query_params.get("q") or "").split())[:100]
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
            included = {row.conversation_id for row in page}
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
            conv = _conversation_for_pair(actor_type, account, kind, target,
                                          {**data, "context": clean_context(data.get("context"), request)})
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
            _prefetch_participants(ConversationParticipant.objects.select_related("conversation")),
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
            return fail("Enter a message (up to 5,000 characters) or add a photo (up to 5 MB).")
        attachment, photo_error = clean_photo(attachment)
        if photo_error:
            return fail(photo_error, errors={"image": [photo_error]})

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

    @method_decorator(never_cache)  # same address every check: the browser must never answer from its cache
    def get(self, request):
        account = request.user.account
        kind = "admin"
        # cursor from the X-Since header (the app) or ?since= (older clients), see the member inbox
        since = request.query_params.get("since") or request.headers.get("X-Since") or ""
        if not since:
            _sync_admin_support_inbox(account)
        query = " ".join(str(request.query_params.get("q") or "").split())[:100]
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
            included = {row.conversation_id for row in page}
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
            conversation = _conversation_for_pair("admin", account, kind, target,
                                                  {**data, "context": clean_context(data.get("context"), request)})
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
            _prefetch_participants(ConversationParticipant.objects.select_related("conversation")),
            conversation__public_id=public_id,
            admin=request.user.account,
        )
        if participant.conversation.kind == "reorbit":
            if not _can_view_support(request.user.account):
                raise PermissionDenied("You do not have access to ReOrbit Support.")
        elif not _can_view_direct_messages(request.user.account):
            raise PermissionDenied("You do not have access to direct messages.")
        return participant


class MessageImage(APIView):
    """One photo of a chat, fetched on demand so threads open fast."""

    permission_classes = [IsReOrbitAuthenticated]

    def _participant(self, request, public_id):
        if request.user.account_type == "admin":
            raise PermissionDenied("Use the permission-checked admin messages endpoint.")
        return get_object_or_404(
            ConversationParticipant,
            conversation__public_id=public_id,
            **{request.user.account_type: request.user.account},
        )

    def get(self, request, public_id, message_id):
        participant = self._participant(request, public_id)
        message = get_object_or_404(
            Message.objects.only("attachment_url"), pk=message_id, conversation=participant.conversation
        )
        return ok({"image": message.attachment_url})


class AdminMessageImage(MessageImage):
    permission_classes = [IsReOrbitAdmin, HasAdminMessagesOrSupport]

    def _participant(self, request, public_id):
        return get_object_or_404(
            ConversationParticipant,
            conversation__public_id=public_id,
            admin=request.user.account,
        )
