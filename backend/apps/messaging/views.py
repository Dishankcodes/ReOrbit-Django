from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitAuthenticated
from apps.core.responses import created, fail, ok
from apps.users.models import Users
from apps.remakers.models import ReMakers
from apps.admins.models import Admins
from .models import Conversation, ConversationParticipant, Message, MessageNotification

MODELS = {"user": Users, "remaker": ReMakers, "admin": Admins}

def _participant(account, conversation):
    return ConversationParticipant.objects.filter(conversation=conversation, **{account.account_type: account}).first()

def _profile(account, kind):
    try: p = account.profile
    except Exception: p = None
    return {"id": account.public_id, "name": account.full_name,
            "username": getattr(account, "username", ""), "type": kind,
            "city": getattr(p, "city", "") if p else "",
            "image": str(getattr(p, "profile_image", "") or "") if p else ""}

def _row(conv, participant, include_messages=True):
    peers = list(conv.participants.exclude(pk=participant.pk).select_related("user", "remaker", "admin"))
    peer = peers[0] if peers else None
    account = getattr(peer, peer.account_type) if peer else None
    last = conv.messages.last()
    last_from = ("me" if last and last.sender_type == participant.account_type and
                 getattr(last, f"sender_{last.sender_type}_id") ==
                 getattr(participant, f"{last.sender_type}_id") else "them")
    unread = participant.notifications.filter(read_at__isnull=True).count()
    display_kind = (("support" if conv.kind == "reorbit" else
                     "customer" if peer and peer.account_type == "user" else
                     "remaker" if peer and peer.account_type == "remaker" else conv.kind)
                    if participant.account_type == "admin" else
                    "reorbit" if peer and peer.account_type == "admin" else
                    "customer" if participant.account_type == "remaker" and peer and peer.account_type == "user" else
                    "remaker" if peer and peer.account_type == "remaker" else conv.kind)
    data = {"id": conv.public_id, "key": f"{peer.account_type}:{account.public_id}" if peer else conv.public_id,
            "kind": display_kind, "name": ("ReOrbit Support" if peer and peer.account_type == "admin" else account.full_name if account else conv.subject),
            "subtitle": _profile(account, peer.account_type)["city"] if account else "",
            "image": _profile(account, peer.account_type)["image"] if account else "",
            "peer": _profile(account, peer.account_type) if account else None,
            "context": conv.context, "unread": unread, "messages": [],
            "last_message": ({"text": last.text, "at": last.created_at, "from": last_from} if last else None)}
    if include_messages:
        data["messages"] = [{"id": m.pk, "from": "me" if m.sender_type == participant.account_type and getattr(m, f"sender_{m.sender_type}_id") == getattr(participant, f"{m.sender_type}_id") else "them",
                             "sender_type": m.sender_type, "text": m.text, "image": m.attachment_url, "at": m.created_at}
                            for m in conv.messages.all()]
    return data

class ConversationList(APIView):
    permission_classes = [IsReOrbitAuthenticated]
    def get(self, request):
        account, kind = request.user.account, request.user.account_type
        if kind in ("user", "remaker") and not ConversationParticipant.objects.filter(
            **{kind: account}, conversation__kind="reorbit"
        ).exists():
            support = Admins.objects.filter(status="Active").order_by("admin_id").first()
            if support:
                with transaction.atomic():
                    support_path = "/remaker-help" if kind == "remaker" else "/user-help"
                    conv = Conversation.objects.create(kind="reorbit", subject="ReOrbit Support", context={"label": "ReOrbit Support", "to": support_path})
                    mine = ConversationParticipant.objects.create(conversation=conv, account_type=kind, **{kind: account})
                    ConversationParticipant.objects.create(
                        conversation=conv, account_type="admin", admin=support
                    )
                    welcome = Message.objects.create(conversation=conv, sender_type="admin", sender_admin=support, text="Welcome to ReOrbit Support. How can we help?")
                    MessageNotification.objects.create(participant=mine, message=welcome)
        qs = ConversationParticipant.objects.filter(**{kind: account}, is_archived=False).select_related("conversation").prefetch_related("conversation__participants", "conversation__messages", "notifications")
        rows = [_row(p.conversation, p, False) for p in qs]
        return ok({"conversations": rows, "unread_count": sum(row["unread"] for row in rows)})
    def post(self, request):
        data = request.data
        kind, public_id = str(data.get("target_type") or ""), str(data.get("target_id") or "")
        if kind not in MODELS or not public_id:
            return fail("Choose a valid conversation recipient.")
        target = (
            Admins.objects.filter(status=Admins.Status.ACTIVE).order_by("admin_id").first()
            if kind == "admin" and public_id == "support"
            else MODELS[kind].objects.filter(public_id=public_id, status="Active").first()
        )
        if target is None: return fail("That account is unavailable.", status=404)
        account, actor_type = request.user.account, request.user.account_type
        if actor_type == kind and target.pk == account.pk: return fail("You cannot message yourself.")
        with transaction.atomic():
            # Reuse an existing direct thread for the same two accounts.
            mine = ConversationParticipant.objects.filter(**{actor_type: account})
            theirs = ConversationParticipant.objects.filter(**{kind: target})
            conv = Conversation.objects.filter(pk__in=mine.values("conversation_id")).filter(pk__in=theirs.values("conversation_id")).first()
            if conv is None:
                conv = Conversation.objects.create(kind=str(data.get("kind") or "direct")[:16], subject=str(data.get("subject") or "")[:180], context=data.get("context") if isinstance(data.get("context"), dict) else {})
                ConversationParticipant.objects.create(conversation=conv, account_type=actor_type, **{actor_type: account})
                ConversationParticipant.objects.create(conversation=conv, account_type=kind, **{kind: target})
            elif isinstance(data.get("context"), dict) and data.get("context"):
                conv.context = data["context"]
                conv.save(update_fields=["context", "updated_at"])
            participant = ConversationParticipant.objects.get(conversation=conv, **{actor_type: account})
            participant.is_archived = False; participant.save(update_fields=["is_archived", "updated_at"])
        return created({"conversation": _row(conv, participant)})

class ConversationDetail(APIView):
    permission_classes = [IsReOrbitAuthenticated]
    def _get(self, request, public_id):
        if request.user.account_type == "admin" and not request.user.account.has_module("messages", "view"):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have access to messages.")
        p = get_object_or_404(ConversationParticipant.objects.select_related("conversation").prefetch_related("conversation__participants", "conversation__messages"), conversation__public_id=public_id, **{request.user.account_type: request.user.account})
        return p
    def get(self, request, public_id):
        p=self._get(request,public_id); return ok({"conversation":_row(p.conversation,p)})
    def post(self, request, public_id):
        p=self._get(request,public_id); action=request.data.get("action")
        if action == "read":
            p.last_read_at=timezone.now(); p.save(update_fields=["last_read_at","updated_at"])
            MessageNotification.objects.filter(participant=p,read_at__isnull=True).update(read_at=timezone.now())
            return ok({"conversation":_row(p.conversation,p)})
        if action == "unread":
            p.last_read_at=None; p.save(update_fields=["last_read_at","updated_at"])
            MessageNotification.objects.filter(participant=p).update(read_at=None)
            return ok({"conversation":_row(p.conversation,p)})
        if action == "archive":
            p.is_archived=True; p.save(update_fields=["is_archived","updated_at"]); return ok({"archived":True})
        text=str(request.data.get("text") or "").strip(); attachment=str(request.data.get("image") or request.data.get("attachment_url") or "").strip()
        if len(text)>5000 or len(attachment)>2_000_000 or (not text and not attachment): return fail("Enter a message (up to 5,000 characters) or provide an attachment.")
        if attachment and not (attachment.startswith("https://") or attachment.startswith("data:image/")): return fail("Attachments must be secure image URLs or uploaded image data.")
        kind=request.user.account_type; kwargs={f"sender_{kind}":request.user.account}
        with transaction.atomic():
            m=Message.objects.create(conversation=p.conversation,sender_type=kind,text=text,attachment_url=attachment,**kwargs)
            for recipient in p.conversation.participants.exclude(pk=p.pk):
                MessageNotification.objects.get_or_create(participant=recipient,message=m)
                recipient.is_archived=False; recipient.save(update_fields=["is_archived","updated_at"])
            p.conversation.save(update_fields=["updated_at"])
        return created({"message":{"id":m.pk,"from":"me","sender_type":kind,"text":m.text,"image":m.attachment_url,"at":m.created_at}})

class AdminInbox(ConversationList):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("messages")]
