from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from apps.admins.models import Admins
from apps.remakers.models import ReMakers
from apps.users.models import Users

ACCOUNT_MODELS = {"user": Users, "remaker": ReMakers, "admin": Admins}


class ReOrbitPrincipal:
    """What request.user is for every authenticated request."""

    def __init__(self, account, account_type):
        self.account = account
        self.account_type = account_type
        self.account_id = account.pk
        self.pk = f"{account_type}:{account.pk}"
        self.public_id = getattr(account, "public_id", None)
        # "Active", "Suspended", "Blocked" or "Deleted" (admins: "Active" / "Blocked")
        self.status = account.status

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def __str__(self):
        return f"{self.account_type}:{self.account_id}"


class ReOrbitJWTAuthentication(BaseAuthentication):
    """Loads the account from the table named in the token.

    Suspended, Blocked and Deleted members are still authenticated so the app can
    show them their status and let them contact support. What they may do is decided
    by the permission classes in permissions.py. A blocked admin is refused here.
    """

    def authenticate_header(self, request):
        # Makes "not signed in" answer 401 (not 403), which the frontend uses to refresh the token.
        return 'Bearer realm="api"'

    def authenticate(self, request):
        header = request.headers.get("Authorization", "")
        if not header:
            return None
        if not header.lower().startswith("bearer "):
            raise AuthenticationFailed("Authorization header must use Bearer token.")

        raw_token = header.split(" ", 1)[1].strip()
        try:
            token = AccessToken(raw_token)
        except TokenError:
            raise AuthenticationFailed("Invalid or expired access token.")

        account_type = token.get("account_type")
        account_id = token.get("account_id")
        model = ACCOUNT_MODELS.get(account_type)
        if model is None or not account_id:
            raise AuthenticationFailed("Invalid ReOrbit token.")

        try:
            account = model.objects.get(pk=account_id)
        except model.DoesNotExist:
            raise AuthenticationFailed("Account no longer exists.")

        if account_type == "admin" and account.status != Admins.Status.ACTIVE:
            raise AuthenticationFailed("Admin account is blocked.")

        return ReOrbitPrincipal(account, account_type), token
