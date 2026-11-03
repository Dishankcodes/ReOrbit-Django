"""Shared services the two domains call: notify() and audit()."""

from django.utils import timezone

from .models import AuditLog, Notification


def _recipient_kwargs(recipient):
    label = type(recipient)._meta.label  # e.g. "users.Users"
    mapping = {
        "users.Users": "user",
        "remakers.ReMakers": "remaker",
        "admins.Admins": "admin",
    }
    try:
        return {mapping[label]: recipient}
    except KeyError:
        raise ValueError(f"Cannot notify {label}: expected a Users, ReMakers or Admins row.")


def notify(
    recipient,
    title,
    body,
    *,
    module="",
    target_url="",
    severity=Notification.Severity.INFO,
    ref_type="",
    ref_id="",
):
    """Create one inbox notification for a Users / ReMakers / Admins instance."""
    return Notification.objects.create(
        title=title,
        body=body,
        module=module,
        target_url=target_url,
        severity=severity,
        ref_type=ref_type,
        ref_id=str(ref_id),
        **_recipient_kwargs(recipient),
    )


def notify_many(recipients, title, body, **kwargs):
    return [notify(r, title, body, **kwargs) for r in recipients]


def mark_read(notification):
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=["is_read", "read_at"])


def audit(actor, action, entity_type, entity_id, *, before=None, after=None, reason="", ip=None):
    """Write an audit row. `actor` is a Users/ReMakers/Admins instance or None (system).

    Call it inside the same transaction.atomic() block as the business action.
    """
    actor_type, actor_public_id = AuditLog.ActorType.SYSTEM, ""
    if actor is not None:
        actor_type = {
            "users.Users": AuditLog.ActorType.USER,
            "remakers.ReMakers": AuditLog.ActorType.REMAKER,
            "admins.Admins": AuditLog.ActorType.ADMIN,
        }[type(actor)._meta.label]
        actor_public_id = actor.public_id or ""
    return AuditLog.objects.create(
        actor_type=actor_type,
        actor_public_id=actor_public_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        before_data=before,
        after_data=after,
        reason=reason,
        ip_address=ip,
    )
