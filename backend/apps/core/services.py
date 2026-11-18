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
    """Create one inbox notification for a Users / ReMakers / Admins instance.

    A member who switched a topic off in Settings › Notifications doesn't get it (returns None).
    Account, support and urgent messages always go through."""
    if not wants(recipient, module, severity):
        return None
    if severity == "critical" and hasattr(recipient, "permission_level"):
        _email_admin_alert(recipient, title, body, target_url)
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


def _email_admin_alert(admin, title, body, target_url):
    """Urgent admin alerts also go by email, unless the admin turned "Email urgent alerts" off."""
    prefs = getattr(admin, "notification_preferences", None) or {}
    if prefs.get("email", True) is False:
        return
    try:
        from apps.core import mailer

        mailer.send(admin.email, f"[ReOrbit admin] {title}", heading=title, intro=body[:500],
                    footer="You get these because “Email urgent alerts” is on in Admin › Settings › Notifications.")
    except Exception:  # noqa: BLE001
        pass


# Settings › Notifications topics -> the modules that belong to them
PREF_TOPICS = {
    "orders": ("orders", "sales", "returns", "payments", "earnings", "listings", "products"),
    "donations": ("donations", "pickups"),
    "rewards": ("rewards",),
    "reviews": ("reviews",),
    "messages": ("messages", "social"),
    "offers": ("offers",),
}
ALWAYS = ("account", "support", "complaints", "help", "")


def topic_of(module):
    for topic, modules in PREF_TOPICS.items():
        if module in modules:
            return topic
    return None


def wants(recipient, module, severity="info"):
    """Has this member left notifications for this module's topic on? (Default: yes.)"""
    if module in ALWAYS or severity == "critical":
        return True
    if hasattr(recipient, "admin_id") and hasattr(recipient, "permission_level"):
        # admins pick the modules they hear about (Admin › Settings › Notifications)
        prefs = (getattr(recipient, "notification_preferences", None) or {}).get("modules") or {}
        key = {"listings": "products", "sales": "orders", "payments": "earnings"}.get(module, module)
        return prefs.get(key, True) is not False
    topic = topic_of(module)
    if topic is None:
        return True
    profile = getattr(recipient, "profile", None)
    prefs = getattr(profile, "notification_preferences", None) or {}
    return prefs.get(topic, True) is not False


def notify_many(recipients, title, body, **kwargs):
    return [n for n in (notify(r, title, body, **kwargs) for r in recipients) if n is not None]


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
