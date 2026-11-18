"""Who members write to for help: the active Super Admins' email addresses.

The first Super Admin's address is the main support email; any other Super Admins (and an address
typed into Settings › Platform, if different) are listed as alternates.
"""

from apps.core.models import DEFAULT_SUPPORT_EMAIL


def support_emails():
    from apps.admins.models import Admins
    from apps.core.models import PlatformSettings

    emails = list(
        Admins.objects.filter(permission_level=Admins.PermissionLevel.SUPER_ADMIN, status=Admins.Status.ACTIVE)
        .order_by("admin_id").values_list("email", flat=True)
    )
    configured = (PlatformSettings.load().support_email or "").strip()
    out = []
    for e in emails + ([configured] if configured else []):
        e = (e or "").strip().lower()
        if e and e not in out:
            out.append(e)
    return out or [DEFAULT_SUPPORT_EMAIL]


def support_email():
    return support_emails()[0]
