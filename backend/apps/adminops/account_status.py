"""Suspend, block, reactivate or close a member or ReMaker account.

Used by Admin › Users / ReMakers and by complaint decisions (apps.complaints), so every status
change is stored the same way: status, the reason the member is shown, when it changed, an audit
row and a notification.

What each status does (enforced in apps.accounts.permissions.status_allows):
  Suspended  can sign in and look around; anything that changes data is refused, except support.
  Blocked    signed out by the app and shown a "you are blocked" page; only support/contact work.
  Deleted    same as Blocked, permanently.
"""

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView

from apps.accounts.permissions import IsReOrbitAdmin
from apps.core.responses import fail, ok
from apps.core.services import audit, notify
from apps.remakers.models import ReMakers
from apps.users.models import Users

STATUSES = ("Active", "Suspended", "Blocked", "Deleted")
WORD = {"Active": "reactivated", "Suspended": "suspended", "Blocked": "blocked", "Deleted": "closed"}


class StatusError(Exception):
    def __init__(self, message, code="BAD_STATUS", status=400, errors=None):
        super().__init__(message)
        self.message, self.code, self.status, self.errors = message, code, status, errors or {}


def set_status(account, status, reason, admin, *, ip=None, ref=None):
    """Change one account's status. Raises StatusError. Returns the account."""
    if status not in STATUSES:
        raise StatusError("Choose Active, Suspended, Blocked or Deleted.", errors={"status": ["Unknown status."]})
    reason = " ".join(str(reason or "").split())[:500]
    if status != "Active" and len(reason) < 5:
        raise StatusError("Say why (at least 5 characters). The member sees this.", errors={"reason": ["Say why."]})
    if account.status == status:
        raise StatusError(f"This account is already {status.lower()}.", code="BAD_STATE", status=409)
    if account.status == "Deleted":
        raise StatusError("A closed account can't be changed.", code="BAD_STATE", status=409)
    kind = "remaker" if isinstance(account, ReMakers) else "user"
    with transaction.atomic():
        before = account.status
        account.status = status
        account.status_reason = "" if status == "Active" else reason
        account.status_changed_at = timezone.now()
        account.save(update_fields=["status", "status_reason", "status_changed_at", "updated_at"])
        audit(admin, f"account.{WORD[status]}", kind, account.public_id,
              before={"status": before}, after={"status": status}, reason=reason, ip=ip)
        body = {
            "Active": "Your account is active again. Thanks for your patience.",
            "Suspended": f"You can still sign in and look around, but you can't buy, sell or post until it's "
                         f"lifted. Contact support if you think this is wrong. Reason: {reason}",
            "Blocked": f"You can't use ReOrbit right now. Contact support if you think this is wrong. Reason: {reason}",
            "Deleted": f"Your account was closed. Reason: {reason}",
        }[status]
        try:
            with transaction.atomic():
                kw = {"severity": "info" if status == "Active" else "critical"}
                if ref:
                    kw.update(ref_type=ref[0], ref_id=ref[1])
                notify(account, f"Your account was {WORD[status]}", body, **kw)
        except Exception:  # noqa: BLE001  a failed notification must not undo the decision
            pass
    return account


class AdminAccountStatus(APIView):
    """POST /api/adminops/admin/accounts/<USR-|RMK->/status/  {status, reason}"""
    permission_classes = [IsReOrbitAdmin]

    def post(self, request, public_id):
        pid = str(public_id).upper()
        module, model = ("remakers", ReMakers) if pid.startswith("RMK-") else ("users", Users)
        if not request.user.account.has_module(module, "edit"):
            return fail("You need edit access to change accounts.", status=403, code="NO_ACCESS")
        account = get_object_or_404(model, public_id=pid)
        try:
            set_status(account, request.data.get("status"), request.data.get("reason"), request.user.account,
                       ip=request.META.get("REMOTE_ADDR"))
        except StatusError as e:
            return fail(e.message, errors=e.errors, status=e.status, code=e.code)
        return ok({"id": account.public_id, "status": account.status, "status_reason": account.status_reason,
                   "status_changed_at": account.status_changed_at}, message=f"Account {WORD[account.status]}.")
