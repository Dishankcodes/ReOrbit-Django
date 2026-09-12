from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from .authentication import ReOrbitJWTAuthentication
from .tokens import create_token_pair


class RefreshTokenView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        raw = request.data.get("refresh")
        if not raw:
            return Response(
                {"success": False, "message": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            old = RefreshToken(raw)
            account_type = old.get("account_type")
            account_id = old.get("account_id")
            if account_type not in {"user", "remaker", "admin"} or not account_id:
                raise TokenError("invalid claims")
            old.blacklist()
            tokens = create_token_pair(account_type, account_id)
            return Response(
                {
                    "success": True,
                    "message": "Token refreshed successfully.",
                    "data": tokens,
                }
            )
        except TokenError:
            return Response(
                {"success": False, "message": "Invalid or expired refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class LogoutView(APIView):
    authentication_classes = [ReOrbitJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        raw = request.data.get("refresh")
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass
        return Response({"success": True, "message": "Logged out successfully."})
