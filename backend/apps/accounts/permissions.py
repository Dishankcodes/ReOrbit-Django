from rest_framework.permissions import BasePermission


class IsReOrbitUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and getattr(request.user, "account_type", None) == "user"
        )


class IsReOrbitReMaker(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and getattr(request.user, "account_type", None) == "remaker"
        )


class IsReOrbitAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and getattr(request.user, "account_type", None) == "admin"
        )


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        if not request.user or getattr(request.user, "account_type", None) != "admin":
            return False
        return request.user.account.permission_level == "Super_Admin"
