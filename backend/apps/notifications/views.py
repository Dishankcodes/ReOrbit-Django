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
from apps.core.services import mark_read

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
def announcement_data(a):
    return {
        "id": a.public_id,
        "title": a.title,
        "message": a.message,
        "audience": a.audience,
        "type": a.kind,
        "link": a.link,
        "at": a.sent_at or a.scheduled_at or a.created_at,
        "scheduled": a.sent_at is None,
        "recipients": a.recipients,
        "by": a.sent_by_name,
    }


class AnnouncementList(APIView):
    """GET the history (newest first). POST sends now, or schedules with `scheduleAt`."""

    permission_classes = [IsReOrbitAdmin, HasAdminModule("notifications")]

    def get(self, request):
        ann.deliver_due()
        rows = Announcement.objects.all()[:200]
        return ok({"announcements": [announcement_data(a) for a in rows]})

    def post(self, request):
        d = request.data
        title = str(d.get("title") or "").strip()
        message = str(d.get("message") or "").strip()
        audience = d.get("audience")
        kind = d.get("type") or Announcement.Kind.UPDATE
        link = str(d.get("link") or "").strip()
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
        when = None
        if d.get("scheduleAt"):
            when = parse_datetime(str(d["scheduleAt"]))
            if when is None:
                errors["scheduleAt"] = ["That date is not valid."]
            elif timezone.is_naive(when):
                when = timezone.make_aware(when)
            if when is not None and when <= timezone.now():
                errors["scheduleAt"] = ["Pick a time in the future."]
        if errors:
            return fail("Check the announcement and try again.", errors=errors)
        admin = request.user.account
        a = Announcement.objects.create(
            title=title, message=message, kind=kind, audience=audience, link=link,
            scheduled_at=when, sent_by=admin, sent_by_name=f"Admin · {admin.full_name}",
        )
        if when is None:
            ann.deliver(a.pk)
            a.refresh_from_db()
        return ok({"announcement": announcement_data(a)}, "Scheduled." if when else "Sent.")


class AnnouncementReach(APIView):
    """How many inboxes each audience would reach right now (Active accounts only)."""

    permission_classes = [IsReOrbitAdmin, HasAdminModule("notifications")]

    def get(self, request):
        counts = {a: sum(qs.count() for _, qs in ann._targets(a)) for a in Announcement.Audience.values}
        return ok(counts)


class AnnouncementDetail(APIView):
    """DELETE cancels an announcement that has not been sent yet. Sent ones stay as a record."""

    permission_classes = [IsReOrbitAdmin, HasAdminModule("notifications")]

    def delete(self, request, public_id):
        a = get_object_or_404(Announcement, public_id=public_id)
        if a.sent_at:
            return fail("This announcement was already sent.", status=409)
        a.delete()
        return ok(message="Cancelled.")
