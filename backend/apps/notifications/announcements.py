"""Admin announcements: write once, deliver to every active member / ReMaker's inbox.

Delivery is one bulk insert of core.Notification rows (module "announcements"). A scheduled
announcement is delivered by `deliver_due()`, which runs whenever someone reads their inbox
and from `python manage.py send_due_announcements`, so it works with or without a cron job.
It is safe to run twice: a row is claimed under a lock and `sent_at` is set in the same transaction.
"""

from django.db import transaction
from django.utils import timezone

from apps.core.ids import PublicIdSequence
from apps.core.models import Notification
from apps.remakers.models import ReMakers
from apps.users.models import Users

from .models import Announcement

BATCH = 500


def safe_link(link):
    link = (link or "").strip()
    return link if link.startswith("/") and not link.startswith("//") else ""


def _reserve_ids(prefix, n):
    """n public ids from one counter update (bulk_create skips save(), so ids are made here)."""
    with transaction.atomic():
        seq, _ = PublicIdSequence.objects.select_for_update().get_or_create(prefix=prefix)
        first = seq.last_value + 1
        seq.last_value += n
        seq.save(update_fields=["last_value"])
    return [f"{prefix}-{i}" for i in range(first, first + n)]


def _targets(audience, kind=None):
    out = []
    if audience in ("users", "everyone"):
        users = Users.objects.filter(status=Users.Status.ACTIVE)
        if kind == Announcement.Kind.OFFER:  # members who turned "Offers and coupons" off don't get offers
            from apps.users.models import User_Profile

            opted_out = User_Profile.objects.filter(notification_preferences__offers=False).values("user_id")
            users = users.exclude(pk__in=opted_out)
        out.append(("user", users.values_list("pk", flat=True)))
    if audience in ("remakers", "everyone"):
        makers = ReMakers.objects.filter(status=ReMakers.Status.ACTIVE)
        if kind == Announcement.Kind.OFFER:  # same switch on the ReMaker side
            from apps.remakers.models import ReMaker_Profile

            opted_out = ReMaker_Profile.objects.filter(notification_preferences__offers=False).values("remaker_id")
            makers = makers.exclude(pk__in=opted_out)
        out.append(("remaker", makers.values_list("pk", flat=True)))
    return out


def deliver(announcement_id):
    """Send one announcement. Returns the number of recipients, or None if it was already sent."""
    with transaction.atomic():
        a = Announcement.objects.select_for_update().get(pk=announcement_id)
        if a.sent_at:
            return None
        severity = "warning" if a.kind == Announcement.Kind.MAINTENANCE else "info"
        total = 0
        for field, pks in _targets(a.audience, a.kind):
            pks = list(pks)
            for i in range(0, len(pks), BATCH):
                chunk = pks[i:i + BATCH]
                ids = _reserve_ids("NTF", len(chunk))
                Notification.objects.bulk_create([
                    Notification(
                        public_id=pid, title=a.title, body=a.message, module="announcements",
                        target_url=safe_link(a.link), severity=severity,
                        ref_type="announcement", ref_id=a.public_id, **{f"{field}_id": pk},
                    )
                    for pid, pk in zip(ids, chunk)
                ])
            total += len(pks)
        a.sent_at, a.recipients = timezone.now(), total
        a.save(update_fields=["sent_at", "recipients"])
        return total


def deliver_due():
    """Deliver every scheduled announcement whose time has come."""
    due = Announcement.objects.filter(sent_at__isnull=True, scheduled_at__lte=timezone.now())
    return sum(1 for pk in list(due.values_list("pk", flat=True)) if deliver(pk) is not None)
