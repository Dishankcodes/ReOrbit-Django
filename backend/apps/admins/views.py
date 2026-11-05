from django.utils import timezone
from rest_framework.views import APIView

from apps.accounts.permissions import IsReOrbitAdmin
from apps.accounts.tokens import create_token_pair
from apps.core.responses import fail, ok
from apps.core.throttles import AuthThrottle

from .models import Admins
from .serializers import AdminSerializer


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [AuthThrottle]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        admin = Admins.objects.filter(email__iexact=email).first()
        if not admin or not admin.check_password(password):
            return fail("Invalid email or password.", status=401)
        if admin.status != Admins.Status.ACTIVE:
            return fail("Admin account is blocked.", status=403)
        admin.last_login_at = timezone.now()
        admin.save(update_fields=["last_login_at"])
        return ok(
            {
                "admin": AdminSerializer(admin).data,
                **create_token_pair("admin", admin.admin_id),
            },
            "Admin login successful.",
        )


class MeView(APIView):
    """GET /api/admins/me/ : the signed-in admin, including their access level per area."""

    permission_classes = [IsReOrbitAdmin]
    support_endpoint = True

    def get(self, request):
        return ok({"admin": AdminSerializer(request.user.account).data})


class ProfileView(APIView):
    """GET / PATCH /api/admins/profile/ : the admin's own details.

    Only the name can be edited. Email, role and module access are set by a Super Admin.
    """

    permission_classes = [IsReOrbitAdmin]

    def get(self, request):
        return ok({"admin": AdminSerializer(request.user.account).data})

    def patch(self, request):
        admin = request.user.account
        data = request.data
        errors = {}
        sent_email = data.get("email")
        if sent_email is not None and str(sent_email).strip().lower() != admin.email:
            errors["email"] = ["Email cannot be changed."]
        if "full_name" in data:
            name = " ".join(str(data.get("full_name") or "").split())
            if not name:
                errors["full_name"] = ["Name is required."]
            elif len(name) > 150:
                errors["full_name"] = ["Name must be 150 characters or fewer."]
            else:
                admin.full_name = name
        if errors:
            return fail("Please correct the highlighted fields.", errors=errors)
        admin.save(update_fields=["full_name", "updated_at"])
        return ok({"admin": AdminSerializer(admin).data}, "Profile updated successfully.")


class ChangePasswordView(APIView):
    """POST /api/admins/password/change/  {"current_password", "new_password"}"""

    permission_classes = [IsReOrbitAdmin]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        admin = request.user.account
        current = request.data.get("current_password") or ""
        new = request.data.get("new_password") or ""
        if not admin.check_password(current):
            return fail(
                "Current password is incorrect.", errors={"current_password": ["Incorrect password."]}
            )
        if not new:
            return fail("New password is required.", errors={"new_password": ["This field is required."]})
        if current == new:
            return fail(
                "Choose a password different from the current one.",
                errors={"new_password": ["Must differ from the current password."]},
            )
        admin.set_password(new)
        admin.save(update_fields=["password", "updated_at"])
        return ok(message="Password updated successfully.")
