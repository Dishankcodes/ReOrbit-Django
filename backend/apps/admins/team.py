"""Team & Roles: the Super Admin adds, edits, blocks and removes other admins.

GET    /api/admins/team/                      all admins (small list, not paged)
POST   /api/admins/team/                      add an admin -> returns a temporary password once
PATCH  /api/admins/team/<public_id>/          change details / role / module access
DELETE /api/admins/team/<public_id>/          remove an admin
POST   /api/admins/team/<public_id>/status/   {"status": "Active" | "Blocked"}
POST   /api/admins/team/<public_id>/reset-password/   new temporary password (resend invite)
GET    /api/admins/team/activity/             recent team changes (from the audit log)

Only Super Admins can use these. Super Admin accounts are never changed here.
"""

import re
import secrets

from django.db import transaction
from django.db.models import ProtectedError
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView

from apps.accounts.permissions import IsSuperAdmin
from apps.core.models import AuditLog
from apps.core.responses import created, fail, ok
from apps.core.services import audit

from .models import ADMIN_MODULES, MODULE_LEVELS, Admins
from .serializers import TeamMemberSerializer

ROLE_KEYS = {"warehouse", "support", "catalog", "finance", "viewer", "custom"}
ROLE_LABELS = {
    "warehouse": "Warehouse staff",
    "support": "Support agent",
    "catalog": "Catalog manager",
    "finance": "Finance",
    "viewer": "Viewer / auditor",
    "custom": "Custom",
}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def temp_password():
    return f"Reo-{secrets.token_hex(2)}{secrets.randbelow(9000) + 1000}"


def _clean(data, *, existing=None):
    """Validate the body. Returns (values, errors)."""
    values, errors = {}, {}

    if existing is None or "full_name" in data:
        name = " ".join(str(data.get("full_name") or "").split())
        if len(name) < 2:
            errors["full_name"] = ["Enter the person's full name."]
        elif len(name) > 150:
            errors["full_name"] = ["Name must be 150 characters or fewer."]
        else:
            values["full_name"] = name

    if existing is None or "email" in data:
        email = str(data.get("email") or "").strip().lower()
        if not EMAIL_RE.match(email) or len(email) > 255:
            errors["email"] = ["Enter a valid email address."]
        elif (
            Admins.objects.filter(email__iexact=email)
            .exclude(pk=getattr(existing, "pk", None))
            .exists()
        ):
            errors["email"] = ["Someone on the team already uses this email."]
        else:
            values["email"] = email

    if existing is None or "phone" in data:
        phone = " ".join(str(data.get("phone") or "").split())
        if len(re.sub(r"\D", "", phone)) < 10 or len(phone) > 20:
            errors["phone"] = ["Enter a valid phone number."]
        else:
            values["phone"] = phone

    if "note" in data:
        note = " ".join(str(data.get("note") or "").split())
        if len(note) > 255:
            errors["note"] = ["Note must be 255 characters or fewer."]
        else:
            values["note"] = note

    if existing is None or "role_key" in data:
        role = str(data.get("role_key") or "custom")
        values["role_key"] = role if role in ROLE_KEYS else "custom"

    if existing is None or "modules" in data:
        raw = data.get("modules")
        if not isinstance(raw, dict):
            errors["modules"] = ["Send the access level for each module."]
        else:
            modules = {}
            for key, level in raw.items():
                if key not in ADMIN_MODULES or level not in MODULE_LEVELS:
                    errors["modules"] = [f"Bad module setting: {key}"]
                    break
                if level != "none":
                    modules[key] = level
            else:
                modules["dashboard"] = "view"  # always on, view only
                if not any(k != "dashboard" for k in modules):
                    errors["modules"] = ["Give access to at least one module."]
                else:
                    values["modules"] = modules
    return values, errors


def _snapshot(admin):
    return {
        "full_name": admin.full_name,
        "email": admin.email,
        "role_key": admin.role_key,
        "modules": admin.modules,
        "status": admin.status,
    }


class TeamBase(APIView):
    permission_classes = [IsSuperAdmin]

    def target(self, public_id):
        """The admin being changed. Super Admins (including yourself) are off limits."""
        admin = get_object_or_404(Admins, public_id=public_id)
        return admin

    @staticmethod
    def locked(admin):
        return admin.is_super


class TeamListView(TeamBase):
    def get(self, request):
        rows = Admins.objects.select_related("created_by").order_by("created_at", "pk")
        return ok({"members": TeamMemberSerializer(rows, many=True).data})

    @transaction.atomic
    def post(self, request):
        values, errors = _clean(request.data)
        if errors:
            return fail("Please correct the highlighted fields.", errors=errors)
        me = request.user.account
        password = temp_password()
        admin = Admins(
            **values,
            permission_level=Admins.PermissionLevel.ADMIN,
            status=Admins.Status.ACTIVE,
            created_by=me,
        )
        admin.set_password(password)
        admin.save()
        audit(
            me,
            "admin.create",
            "admin",
            admin.public_id,
            after=_snapshot(admin),
            ip=request.META.get("REMOTE_ADDR"),
        )
        return created(
            {"member": TeamMemberSerializer(admin).data, "temporary_password": password},
            "Admin added.",
        )


class TeamDetailView(TeamBase):
    @transaction.atomic
    def patch(self, request, public_id):
        admin = self.target(public_id)
        if self.locked(admin):
            return fail("Super Admin accounts can't be changed here.", status=403)
        values, errors = _clean(request.data, existing=admin)
        if errors:
            return fail("Please correct the highlighted fields.", errors=errors)
        before = _snapshot(admin)
        for key, value in values.items():
            setattr(admin, key, value)
        admin.save()
        audit(
            request.user.account,
            "admin.update",
            "admin",
            admin.public_id,
            before=before,
            after=_snapshot(admin),
            ip=request.META.get("REMOTE_ADDR"),
        )
        return ok({"member": TeamMemberSerializer(admin).data}, "Access updated.")

    @transaction.atomic
    def delete(self, request, public_id):
        admin = self.target(public_id)
        if self.locked(admin):
            return fail("Super Admin accounts can't be removed here.", status=403)
        before = _snapshot(admin)
        try:
            with transaction.atomic():
                admin.delete()
        except ProtectedError:
            return fail(
                "This admin already has activity on the platform. Block them instead.",
                status=409,
            )
        audit(
            request.user.account,
            "admin.delete",
            "admin",
            public_id,
            before=before,
            ip=request.META.get("REMOTE_ADDR"),
        )
        return ok(message="Admin removed.")


class TeamStatusView(TeamBase):
    @transaction.atomic
    def post(self, request, public_id):
        admin = self.target(public_id)
        if self.locked(admin):
            return fail("Super Admin accounts can't be blocked here.", status=403)
        status = request.data.get("status")
        if status not in (Admins.Status.ACTIVE, Admins.Status.BLOCKED):
            return fail("Status must be Active or Blocked.", errors={"status": ["Invalid."]})
        before = admin.status
        admin.status = status
        admin.save(update_fields=["status", "updated_at"])
        audit(
            request.user.account,
            "admin.block" if status == Admins.Status.BLOCKED else "admin.unblock",
            "admin",
            admin.public_id,
            before={"status": before},
            after={"status": status},
            ip=request.META.get("REMOTE_ADDR"),
        )
        return ok({"member": TeamMemberSerializer(admin).data}, f"Admin is now {status}.")


class TeamResetPasswordView(TeamBase):
    @transaction.atomic
    def post(self, request, public_id):
        admin = self.target(public_id)
        if self.locked(admin):
            return fail("Super Admin accounts can't be changed here.", status=403)
        password = temp_password()
        admin.set_password(password)
        admin.save(update_fields=["password", "updated_at"])
        audit(
            request.user.account,
            "admin.reset_password",
            "admin",
            admin.public_id,
            ip=request.META.get("REMOTE_ADDR"),
        )
        return ok({"temporary_password": password}, "New temporary password created.")


class TeamActivityView(TeamBase):
    LABELS = {
        "admin.create": "Added {name}",
        "admin.update": "Changed access for {name}",
        "admin.block": "Suspended {name}",
        "admin.unblock": "Re-activated {name}",
        "admin.delete": "Removed {name}",
        "admin.reset_password": "Issued a new temporary password for {name}",
    }

    def get(self, request):
        rows = list(AuditLog.objects.filter(entity_type="admin").order_by("-created_at")[:50])
        names = dict(
            Admins.objects.filter(
                public_id__in={r.entity_id for r in rows} | {r.actor_public_id for r in rows}
            ).values_list("public_id", "full_name")
        )
        out = []
        for r in rows:
            snap = r.after_data or r.before_data or {}
            who_name = names.get(r.entity_id) or snap.get("full_name") or r.entity_id
            template = self.LABELS.get(r.action, r.action)
            out.append(
                {
                    "id": r.pk,
                    "at": r.created_at,
                    "who": names.get(r.actor_public_id, r.actor_public_id or "System"),
                    "what": template.format(name=who_name),
                }
            )
        return ok({"activity": out})
