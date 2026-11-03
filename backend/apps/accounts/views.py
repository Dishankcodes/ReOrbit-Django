from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework.views import APIView

from apps.core.responses import fail, ok
from apps.core.throttles import AuthThrottle

from .authentication import ACCOUNT_MODELS, ReOrbitJWTAuthentication
from .permissions import IsReOrbitAuthenticated
from .tokens import create_token_pair


class RefreshTokenView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [AuthThrottle]

    def post(self, request):
        raw = request.data.get("refresh")
        if not raw:
            return fail("Refresh token is required.")
        try:
            old = RefreshToken(raw)
            account_type = old.get("account_type")
            account_id = old.get("account_id")
            model = ACCOUNT_MODELS.get(account_type)
            if model is None or not account_id:
                raise TokenError("invalid claims")
            # A deleted account (or a blocked admin) cannot keep refreshing.
            account = model.objects.filter(pk=account_id).first()
            if account is None or (account_type == "admin" and account.status != "Active"):
                raise TokenError("account unavailable")
            old.blacklist()
            return ok(create_token_pair(account_type, account_id), "Token refreshed successfully.")
        except TokenError:
            return fail("Invalid or expired refresh token.", status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    """Works for every account status, so blocked members can still sign out."""

    authentication_classes = [ReOrbitJWTAuthentication]
    permission_classes = [IsReOrbitAuthenticated]
    support_endpoint = True

    def post(self, request):
        raw = request.data.get("refresh")
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass
        return ok(message="Logged out successfully.")
