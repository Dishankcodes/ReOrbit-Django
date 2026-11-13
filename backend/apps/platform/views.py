"""Platform settings (mounted under /api/platform/).

  GET   admin/settings/   every group + the recent change log   (admin, module "settings")
  PATCH admin/settings/   save one or more groups; each change is audited

Members and the other apps read the public subset from GET /api/core/settings/
(PlatformSettings.as_public_dict), which always reflects the saved values.
"""

from django.db import transaction
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin
from apps.core.models import AuditLog, PlatformSettings
from apps.core.responses import fail, ok
from apps.core.services import audit

from . import settings_api as api

LABELS = {
    "commerce": "Fees and delivery updated",
    "warehouse": "Warehouse rules updated",
    "notifications": "Notification preferences updated",
    "platform": "Platform settings updated",
}
LOG_ACTION = "platform.settings.update"


def _log():
    rows = AuditLog.objects.filter(action=LOG_ACTION).order_by("-created_at")[:20]
    return [{"what": r.reason or "Settings updated", "at": r.created_at} for r in rows]


def _body(s):
    return {**api.current(s), "log": _log(), "rules": s.as_public_dict()}


class AdminSettingsView(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("settings")]

    def get(self, request):
        return ok(_body(PlatformSettings.load()))

    @transaction.atomic
    def patch(self, request):
        s = PlatformSettings.objects.select_for_update().get_or_create(pk=1)[0]
        before = api.current(s)
        values, errors = api.validate(request.data, before)
        if errors:
            return fail("Please correct the highlighted settings.", errors=errors)

        api.apply(s, values, request.user.account)
        after = api.current(s)
        changes = api.diff(before, after, values.keys())
        if not changes:
            return ok(_body(s), "Nothing to change.")

        label = ", ".join(LABELS[g].replace(" updated", "").lower() for g in changes)
        audit(
            request.user.account, LOG_ACTION, "platform_settings", "1",
            before={g: {k: v[0] for k, v in c.items()} for g, c in changes.items()},
            after={g: {k: v[1] for k, v in c.items()} for g, c in changes.items()},
            reason=LABELS[next(iter(changes))] if len(changes) == 1 else f"Updated {label}",
            ip=request.META.get("REMOTE_ADDR"),
        )
        return ok(_body(s), "Settings saved.")
