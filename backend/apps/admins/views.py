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
