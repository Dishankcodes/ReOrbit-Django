from rest_framework.response import Response
from rest_framework.views import APIView
from apps.accounts.tokens import create_token_pair
from .models import Admins
from .serializers import AdminSerializer


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        admin = Admins.objects.filter(email__iexact=email).first()
        if not admin or not admin.check_password(password):
            return Response(
                {"success": False, "message": "Invalid email or password."}, status=401
            )
        if admin.status != Admins.Status.ACTIVE:
            return Response(
                {"success": False, "message": "Admin account is blocked."}, status=403
            )
        return Response(
            {
                "success": True,
                "message": "Admin login successful.",
                "data": {
                    "admin": AdminSerializer(admin).data,
                    **create_token_pair("admin", admin.admin_id),
                },
            }
        )
