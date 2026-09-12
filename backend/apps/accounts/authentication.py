from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

from apps.users.models import Users
from apps.remakers.models import ReMakers
from apps.admins.models import Admins


class ReOrbitPrincipal:
    def __init__(self, account, account_type):
        self.account = account
        self.account_type = account_type
        self.account_id = account.pk

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def __str__(self):
        return f"{self.account_type}:{self.account_id}"


class ReOrbitJWTAuthentication(BaseAuthentication):
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
        if account_type not in {"user", "remaker", "admin"} or not account_id:
            raise AuthenticationFailed("Invalid ReOrbit token.")

        try:
            if account_type == "user":
                account = Users.objects.get(pk=account_id)
                if account.status != Users.Status.ACTIVE:
                    raise AuthenticationFailed("User account is not active.")
            elif account_type == "remaker":
                account = ReMakers.objects.get(pk=account_id)
                if account.status != ReMakers.Status.ACTIVE:
                    raise AuthenticationFailed("ReMaker account is not active.")
            else:
                account = Admins.objects.get(pk=account_id)
                if account.status != Admins.Status.ACTIVE:
                    raise AuthenticationFailed("Admin account is not active.")
        except (Users.DoesNotExist, ReMakers.DoesNotExist, Admins.DoesNotExist):
            raise AuthenticationFailed("Account no longer exists.")

        return ReOrbitPrincipal(account, account_type), token
