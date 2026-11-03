"""Role and status permissions. Every endpoint uses one of these.

Account status rules (enforced here, on the server):
  Active     everything the role allows
  Suspended  read-only: only GET / HEAD / OPTIONS
  Blocked    only endpoints marked `support_endpoint = True`
  Deleted    only endpoints marked `support_endpoint = True`
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission

LEVELS = {"none": 0, "view": 1, "edit": 2}


def status_allows(request, view):
    status = getattr(request.user, "status", "Active")
    if status == "Active":
        return True
    if getattr(view, "support_endpoint", False):
        return True
    if status == "Suspended":
        return request.method in SAFE_METHODS
    return False  # Blocked / Deleted


def _status_message(request):
    status = getattr(request.user, "status", "")
    if status == "Suspended":
        return "Your account is suspended. You can view your account but not make changes."
    return f"Your account is {status.lower()}. Please contact support."


class _AccountPermission(BasePermission):
    account_type = None

    def has_permission(self, request, view):
        principal = request.user
        if not principal or getattr(principal, "account_type", None) != self.account_type:
            self.message = "You do not have permission to use this endpoint."
            return False
        if not status_allows(request, view):
            self.message = _status_message(request)
            return False
        return True


class IsReOrbitAuthenticated(BasePermission):
    """Default permission: any logged-in account (any role), status rules applied."""

    def has_permission(self, request, view):
        principal = request.user
        if not principal or not getattr(principal, "is_authenticated", False):
            return False
        if not status_allows(request, view):
            self.message = _status_message(request)
            return False
        return True


class IsReOrbitUser(_AccountPermission):
    account_type = "user"


class IsReOrbitReMaker(_AccountPermission):
    account_type = "remaker"


class IsReOrbitAdmin(_AccountPermission):
    account_type = "admin"


class IsSuperAdmin(IsReOrbitAdmin):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.account.permission_level == "Super_Admin"


def HasAdminModule(module, level=None):
    """Permission class factory: HasAdminModule("orders", "edit").

    `level` is the level required: "view" or "edit". If left out, safe methods (GET)
    need "view" and everything else needs "edit". Super admins pass every check.
    Use together with IsReOrbitAdmin:

        permission_classes = [IsReOrbitAdmin, HasAdminModule("orders")]
    """

    class _HasAdminModule(BasePermission):
        message = "You do not have access to this area."

        def has_permission(self, request, view):
            principal = request.user
            if not principal or getattr(principal, "account_type", None) != "admin":
                return False
            needed = level or ("view" if request.method in SAFE_METHODS else "edit")
            return principal.account.has_module(module, needed)

    _HasAdminModule.__name__ = f"HasAdminModule_{module}"
    return _HasAdminModule
