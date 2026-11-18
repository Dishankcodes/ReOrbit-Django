"""The in-app notification inbox, on the existing core.Notification model.

  /api/notifications/me/                    GET     list (member or ReMaker). ?unread=1  ?module=orders  ?page=
  /api/notifications/me/unread-count/       GET     {unread_count}
  /api/notifications/me/read-all/           POST    mark everything read (optionally one ?module=)
  /api/notifications/me/<id>/               GET     one notification
  /api/notifications/me/<id>/read/          POST    mark one read
  /api/notifications/me/<id>/               DELETE  dismiss (hide) one
  /api/notifications/me/dismiss-read/       POST    dismiss every read one
  /api/notifications/admin/...              the same set, for an admin's own inbox

Notifications are created by `apps.core.services.notify()` wherever something happens.
Nobody can read or change another account's notifications: every query starts from the caller.
"""

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView

from django.utils.dateparse import parse_datetime

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitAuthenticated
from apps.core.models import Notification
from apps.core.pagination import StandardPagination
from apps.core.responses import fail, ok
from apps.core.services import audit, mark_read

from . import announcements as ann
from .models import Announcement

FIELD = {"user": "user", "remaker": "remaker", "admin": "admin"}


def _safe_url(url):
    """Only in-app paths are ever sent to the browser as a link."""
    url = (url or "").strip()
    return url if url.startswith("/") and not url.startswith("//") else ""


def notification_data(n):
    return {
        "id": n.public_id,
        "title": n.title,
        "body": n.body,
        "module": n.module,
        "target_url": _safe_url(n.target_url),
        "severity": n.severity,
        "ref_type": n.ref_type,
        "ref_id": n.ref_id,
        "is_read": n.is_read,
        "read_at": n.read_at,
        "created_at": n.created_at,
    }


def _mine(request):
    """This caller's visible (not dismissed) notifications."""
    kind = request.user.account_type
    return (Notification.objects.filter(**{FIELD[kind]: request.user.account}, dismissed_at__isnull=True)
            .order_by("-created_at", "-id"))


def _filtered(request, qs):
    if request.query_params.get("unread") in ("1", "true"):
        qs = qs.filter(is_read=False)
    module = (request.query_params.get("module") or "").strip()
    if module:
        qs = qs.filter(module=module)
    return qs


class _Inbox(APIView):
    """Shared by /me/ and /admin/. `get_object` always starts from the caller's own rows."""

    def one(self, request, public_id):
        return get_object_or_404(_mine(request), public_id=public_id)


class InboxList(_Inbox):
    def get(self, request):
        ann.deliver_due()  # a scheduled announcement lands the first time anyone looks
        base = _mine(request)
        pager = StandardPagination()
        page = pager.paginate_queryset(_filtered(request, base), request)
        resp = pager.get_paginated_response([notification_data(n) for n in page])
        resp.data["data"]["unread_count"] = base.filter(is_read=False).count()
        resp.data["data"]["modules"] = {
            m or "general": c
            for m, c in base.values_list("module").annotate(c=Count("id")).order_by()
        }
        return resp


class UnreadCount(_Inbox):
    def get(self, request):
        ann.deliver_due()
        return ok({"unread_count": _mine(request).filter(is_read=False).count()})


class InboxDetail(_Inbox):
    def get(self, request, public_id):
        return ok({"notification": notification_data(self.one(request, public_id))})

    def delete(self, request, public_id):
        n = self.one(request, public_id)
        n.dismissed_at = timezone.now()
        n.save(update_fields=["dismissed_at"])
        return ok({"unread_count": _mine(request).filter(is_read=False).count()}, "Dismissed.")


class MarkOneRead(_Inbox):
    def post(self, request, public_id):
        n = self.one(request, public_id)
        mark_read(n)
        return ok({"notification": notification_data(n),
                   "unread_count": _mine(request).filter(is_read=False).count()})


class MarkAllRead(_Inbox):
    def post(self, request):
        qs = _filtered(request, _mine(request)).filter(is_read=False)
        n = qs.update(is_read=True, read_at=timezone.now())
        return ok({"updated": n, "unread_count": _mine(request).filter(is_read=False).count()},
                  "All marked as read.")


class DismissRead(_Inbox):
    def post(self, request):
        n = _mine(request).filter(is_read=True).update(dismissed_at=timezone.now())
        return ok({"dismissed": n, "unread_count": _mine(request).filter(is_read=False).count()})


# /me/ is for members and ReMakers; /admin/ is for admins. Same views, different gate.
class _MemberGate:
    permission_classes = [IsReOrbitAuthenticated]

    def initial(self, request, *a, **kw):
        super().initial(request, *a, **kw)
        if request.user.account_type == "admin":
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Admins use /api/notifications/admin/.")


def _pair(view):
    member = type(f"Me{view.__name__}", (_MemberGate, view), {})
    admin = type(f"Admin{view.__name__}", (view,), {"permission_classes": [IsReOrbitAdmin]})
    return member, admin


MeList, AdminList = _pair(InboxList)
MeCount, AdminCount = _pair(UnreadCount)
MeDetail, AdminDetail = _pair(InboxDetail)
MeRead, AdminRead = _pair(MarkOneRead)
MeReadAll, AdminReadAll = _pair(MarkAllRead)
MeDismissRead, AdminDismissRead = _pair(DismissRead)


# --------------------------------------------------------------------------- #
# Admin announcements: one message to every member and/or ReMaker
# --------------------------------------------------------------------------- #
def announcement_data(a, reads=None):
    status = "recalled" if a.recalled_at else "scheduled" if a.sent_at is None else "sent"
    read = (reads or {}).get(a.public_id, 0) if a.sent_at else 0
    return {
        "id": a.public_id,
        "title": a.title,
        "message": a.message,
        "audience": a.audience,
        "type": a.kind,
        "link": a.link,
        "at": a.sent_at or a.scheduled_at or a.created_at,
        "scheduled_at": a.scheduled_at,
        "sent_at": a.sent_at,
        "scheduled": a.sent_at is None,
        "status": status,
        "recipients": a.recipients,
        "read": read,
        "read_pct": round(read * 100 / a.recipients) if a.recipients else 0,
        "recalled_at": a.recalled_at,
        "recalled_by": a.recalled_by_name,
        "by": a.sent_by_name,
    }


def _reads(ids):
    """{announcement id: how many recipients opened it}"""
    from django.db.models import Count

    from apps.core.models import Notification

    return dict(Notification.objects.filter(ref_type="announcement", ref_id__in=ids, is_read=True)
                .values("ref_id").annotate(n=Count("pk")).values_list("ref_id", "n"))


def _clean_announcement(d, partial_of=None):
    """(fields, errors) from a request body. With partial_of, missing keys keep that announcement's values."""
    base = partial_of
    title = str(d.get("title", base.title if base else "") or "").strip()
    message = str(d.get("message", base.message if base else "") or "").strip()
    audience = d.get("audience", base.audience if base else None)
    kind = d.get("type", base.kind if base else None) or Announcement.Kind.UPDATE
    link = str(d.get("link", base.link if base else "") or "").strip()
    errors = {}
    if not title or len(title) > 150:
        errors["title"] = ["Enter a title of up to 150 characters."]
    if not message or len(message) > 1000:
        errors["message"] = ["Enter a message of up to 1,000 characters."]
    if audience not in Announcement.Audience.values:
        errors["audience"] = ["Choose who receives it."]
    if kind not in Announcement.Kind.values:
        errors["type"] = ["Choose a valid type."]
    if link and ann.safe_link(link) != link:
        errors["link"] = ["Use a page inside ReOrbit, like /user-marketplace."]
    when = base.scheduled_at if base else None
    if "scheduleAt" in d:
        when = None
        if d.get("scheduleAt"):
            when = parse_datetime(str(d["scheduleAt"]))
            if when is None:
                errors["scheduleAt"] = ["That date is not valid."]
            elif timezone.is_naive(when):
                when = timezone.make_aware(when)
            if when is not None and when <= timezone.now():
                errors["scheduleAt"] = ["Pick a time in the future."]
    return {"title": title, "message": message, "audience": audience, "kind": kind, "link": link,
            "scheduled_at": when}, errors


class AnnouncementList(APIView):
    """GET the history (newest first). POST sends now, or schedules with `scheduleAt`."""

    permission_classes = [IsReOrbitAdmin, HasAdminModule("notifications")]

    def get(self, request):
        ann.deliver_due()
        rows = list(Announcement.objects.all()[:200])
        reads = _reads([a.public_id for a in rows if a.sent_at])
        return ok({"announcements": [announcement_data(a, reads) for a in rows]})

    def post(self, request):
        fields, errors = _clean_announcement(request.data)
        if errors:
            return fail("Check the announcement and try again.", errors=errors)
        admin = request.user.account
        a = Announcement.objects.create(**fields, sent_by=admin, sent_by_name=f"Admin · {admin.full_name}")
        if a.scheduled_at is None:
            ann.deliver(a.pk)
            a.refresh_from_db()
        audit(admin, "announcement.create", "announcement", a.public_id,
              reason=f"{a.title} → {a.audience}" + (" (scheduled)" if a.scheduled_at and not a.sent_at else ""))
        return ok({"announcement": announcement_data(a)}, "Scheduled." if a.sent_at is None else "Sent.")


class AnnouncementReach(APIView):
    """How many inboxes each audience would reach right now (Active accounts only)."""

    permission_classes = [IsReOrbitAdmin, HasAdminModule("notifications")]

    def get(self, request):
        counts = {a: sum(qs.count() for _, qs in ann._targets(a)) for a in Announcement.Audience.values}
        return ok(counts)


class AnnouncementDetail(APIView):
    """PATCH edits a scheduled announcement. POST {action: send_now | recall}. DELETE cancels a scheduled one.

    recall: takes a sent announcement back out of every inbox (for a mistake); it stays here as a record."""

    permission_classes = [IsReOrbitAdmin, HasAdminModule("notifications")]

    def patch(self, request, public_id):
        a = get_object_or_404(Announcement, public_id=public_id)
        if a.sent_at:
            return fail("This announcement was already sent. Duplicate it to send a new one.", status=409)
        fields, errors = _clean_announcement(request.data, partial_of=a)
        if errors:
            return fail("Check the announcement and try again.", errors=errors)
        if fields["scheduled_at"] is None:
            return fail("Pick when to send it, or use Send now.", errors={"scheduleAt": ["Pick a time."]})
        for k, v in fields.items():
            setattr(a, k, v)
        a.save()
        return ok({"announcement": announcement_data(a)}, "Saved.")

    def post(self, request, public_id):
        from apps.core.models import Notification

        admin = request.user.account
        action = str(request.data.get("action") or "")
        a = get_object_or_404(Announcement, public_id=public_id)
        if action == "send_now":
            if a.sent_at:
                return fail("This announcement was already sent.", status=409)
            ann.deliver(a.pk)
            a.refresh_from_db()
            audit(admin, "announcement.send_now", "announcement", a.public_id)
            return ok({"announcement": announcement_data(a)}, f"Sent to {a.recipients:,} people.")
        if action == "recall":
            if not a.sent_at or a.recalled_at:
                return fail("Only a sent announcement can be taken back.", status=409)
            removed, _ = Notification.objects.filter(ref_type="announcement", ref_id=a.public_id).delete()
            a.recalled_at, a.recalled_by_name = timezone.now(), admin.full_name
            a.save(update_fields=["recalled_at", "recalled_by_name", "updated_at"])
            audit(admin, "announcement.recall", "announcement", a.public_id, reason=f"{removed} removed")
            return ok({"announcement": announcement_data(a)}, "Taken back from every inbox.")
        return fail("Unknown action.", errors={"action": ["Use send_now or recall."]})

    def delete(self, request, public_id):
        a = get_object_or_404(Announcement, public_id=public_id)
        if a.sent_at:
            return fail("This announcement was already sent.", status=409)
        audit(request.user.account, "announcement.cancel", "announcement", a.public_id)
        a.delete()
        return ok(message="Cancelled.")
