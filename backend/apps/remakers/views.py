import re

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView

from apps.accounts.google import (
    GoogleAuthError,
    issue_signup_token,
    profile_from_code,
    read_signup_token,
)
from apps.accounts.helpers import clean_email, is_valid_email, send_otp_or_error, touch_login
from apps.accounts.models import OTP_Verification
from apps.accounts.otp import consume_otp, verify_otp
from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitReMaker
from apps.core.admin_accounts import AdminAccountDetail, AdminAccountList
from apps.accounts.tokens import create_token_pair
from apps.core.profile import BaseImageView, BaseProfileView
from apps.core.responses import created, fail, ok
from apps.core.throttles import AuthThrottle, OTPIPThrottle, OTPSendThrottle, OTPVerifyThrottle

from apps.users.models import Users

from .models import ReMaker_Profile, ReMakers
from .serializers import (
    AdminReMakerSerializer,
    ReMakerProfileSerializer,
    ReMakerSerializer,
)

USERNAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 _.-]{2,99}$")


def _username_error(username):
    if not username:
        return "Username is required."
    if not USERNAME_RE.match(username):
        return "Username must be 3-100 characters: letters, numbers, spaces, dots, dashes or underscores."
    return None


class CheckEmailView(APIView):
    """POST /api/remakers/auth/check-email/  {"email"} -> {"exists": bool}"""

    authentication_classes = []
    permission_classes = []
    throttle_classes = [AuthThrottle]

    def post(self, request):
        email = clean_email(request.data.get("email"))
        if not email:
            return fail("Email is required.")
        return ok({"exists": ReMakers.objects.filter(email__iexact=email).exists()})


class RequestOTPView(APIView):
    """POST /api/remakers/auth/request-otp/  purpose = remaker_register | remaker_login"""

    authentication_classes = []
    permission_classes = []
    throttle_classes = [OTPIPThrottle, OTPSendThrottle]

    def post(self, request):
        email = clean_email(request.data.get("email"))
        purpose = (request.data.get("purpose") or "").strip()

        if not email:
            return fail("Email is required.")
        if not is_valid_email(email):
            return fail("Please enter a valid email address.", code="INVALID_EMAIL")

        P = OTP_Verification.Purpose
        if purpose not in (P.REMAKER_REGISTER, P.REMAKER_LOGIN):
            return fail("Invalid OTP purpose.")

        remaker = ReMakers.objects.filter(email__iexact=email).first()

        if purpose == P.REMAKER_REGISTER:
            if remaker:
                return fail("Email is already registered as a ReMaker.", status=status.HTTP_409_CONFLICT)
            if Users.objects.filter(email__iexact=email).exists():
                return fail(
                    "This email is already registered as a user. Use a different email.",
                    status=status.HTTP_409_CONFLICT,
                    code="EMAIL_USED_BY_USER",
                )
            full_name = (request.data.get("full_name") or "").strip()
            username = (request.data.get("username") or "").strip()
            if not full_name:
                return fail("Full name is required for registration.")
            error = _username_error(username)
            if error:
                return fail(error)
            if ReMakers.objects.filter(username__iexact=username).exists():
                return fail("Username is already taken.", status=status.HTTP_409_CONFLICT)
        else:
            if not remaker:
                return fail("No ReMaker account found with this email.", status=status.HTTP_404_NOT_FOUND)
            if remaker.status in (ReMakers.Status.BLOCKED, ReMakers.Status.DELETED):
                return fail(f"Account is {remaker.status.lower()}.", status=status.HTTP_403_FORBIDDEN)

        result, error = send_otp_or_error(email, purpose, OTP_Verification.AccountType.REMAKER)
        if error:
            return error
        return ok({"expires_in_minutes": result["expires_in_minutes"]}, result["message"])


class RegisterView(APIView):
    """POST /api/remakers/auth/register/ : creates the ReMaker after the emailed code is right."""

    authentication_classes = []
    permission_classes = []
    throttle_classes = [OTPIPThrottle, OTPVerifyThrottle]

    def post(self, request):
        email = clean_email(request.data.get("email"))
        otp = (request.data.get("otp") or "").strip()
        full_name = (request.data.get("full_name") or "").strip()
        username = (request.data.get("username") or "").strip()

        if not email:
            return fail("Email is required.")
        if not otp:
            return fail("OTP is required.")
        if not full_name:
            return fail("Full name is required.")
        error = _username_error(username)
        if error:
            return fail(error)

        # Check availability first so a taken name does not use up a correct code.
        if ReMakers.objects.filter(email__iexact=email).exists():
            return fail("Email is already registered.", status=status.HTTP_409_CONFLICT)
        if Users.objects.filter(email__iexact=email).exists():
            return fail(
                "This email is already registered as a user. Use a different email.",
                status=status.HTTP_409_CONFLICT,
                code="EMAIL_USED_BY_USER",
            )
        if ReMakers.objects.filter(username__iexact=username).exists():
            return fail("Username is already taken.", status=status.HTTP_409_CONFLICT)

        record, error = verify_otp(email, otp, OTP_Verification.Purpose.REMAKER_REGISTER)
        if error:
            return fail(error)

        with transaction.atomic():
            remaker = ReMakers.objects.create(
                full_name=full_name,
                username=username,
                email=email,
                auth_provider=ReMakers.AuthProvider.EMAIL,
                status=ReMakers.Status.ACTIVE,
                email_verified_at=timezone.now(),
            )
            ReMaker_Profile.objects.create(remaker=remaker)
            consume_otp(record)

        touch_login(remaker)
        return created(
            {
                "remaker": ReMakerSerializer(remaker).data,
                **create_token_pair("remaker", remaker.remaker_id),
            },
            "ReMaker registration successful.",
        )


class LoginVerifyOTPView(APIView):
    """POST /api/remakers/auth/login/verify-otp/

    Suspended, Blocked and Deleted ReMakers can sign in so the app can show their
    status and let them reach support; the permission classes limit what they can do.
    """

    authentication_classes = []
    permission_classes = []
    throttle_classes = [OTPIPThrottle, OTPVerifyThrottle]

    def post(self, request):
        email = clean_email(request.data.get("email"))
        otp = (request.data.get("otp") or "").strip()
        if not email:
            return fail("Email is required.")
        if not otp:
            return fail("OTP is required.")

        record, error = verify_otp(email, otp, OTP_Verification.Purpose.REMAKER_LOGIN)
        if error:
            return fail(error)

        remaker = ReMakers.objects.filter(email__iexact=email).first()
        if not remaker:
            return fail("ReMaker account not found.", status=status.HTTP_404_NOT_FOUND)

        consume_otp(record)
        touch_login(remaker)
        return ok(
            {
                "remaker": ReMakerSerializer(remaker).data,
                **create_token_pair("remaker", remaker.remaker_id),
            },
            "Login successful.",
        )


class GoogleAuthView(APIView):
    """POST /api/remakers/auth/google/

    Step 1: {"code"}                          -> sign in if the account exists.
            A brand-new person gets {"needs_registration": true, "google_token", "full_name", "email"}
            because a ReMaker must choose a username.
    Step 2: {"google_token", "username"}      -> creates the account and signs in.
    An email that belongs to a normal user is refused (409).
    """

    authentication_classes = []
    permission_classes = []
    throttle_classes = [AuthThrottle]

    def post(self, request):
        google_token = request.data.get("google_token")
        try:
            g = read_signup_token(google_token) if google_token else profile_from_code(request.data.get("code"))
        except GoogleAuthError as exc:
            return fail(exc.message, status=exc.status, code="GOOGLE_AUTH_FAILED")

        remaker = (
            ReMakers.objects.filter(google_id=g["sub"]).first()
            or ReMakers.objects.filter(email__iexact=g["email"]).first()
        )

        if remaker is not None:
            if remaker.google_id and remaker.google_id != g["sub"]:
                return fail(
                    "This email is linked to a different Google account.",
                    status=status.HTTP_409_CONFLICT,
                )
            if not remaker.google_id:
                remaker.google_id = g["sub"]
                remaker.email_verified_at = remaker.email_verified_at or timezone.now()
                remaker.save(update_fields=["google_id", "email_verified_at", "updated_at"])
            touch_login(remaker)
            return ok(
                {"remaker": ReMakerSerializer(remaker).data, **create_token_pair("remaker", remaker.remaker_id)},
                "Login successful.",
            )

        if Users.objects.filter(email__iexact=g["email"]).exists():
            return fail(
                "This email is already registered as a user. Use a different Google account.",
                status=status.HTTP_409_CONFLICT,
                code="EMAIL_USED_BY_USER",
            )

        username = (request.data.get("username") or "").strip()
        if not google_token or not username:
            return ok(
                {
                    "needs_registration": True,
                    "google_token": issue_signup_token(g),
                    "email": g["email"],
                    "full_name": g["full_name"],
                },
                "Choose a username to finish creating your ReMaker account.",
            )

        error = _username_error(username)
        if error:
            return fail(error)
        if ReMakers.objects.filter(username__iexact=username).exists():
            return fail("Username is already taken.", status=status.HTTP_409_CONFLICT)
        # The name comes from Google but the person may change it on the profile step.
        full_name = (request.data.get("full_name") or g["full_name"]).strip()[:150]
        if not full_name:
            return fail("Full name is required.")

        with transaction.atomic():
            remaker = ReMakers.objects.create(
                full_name=full_name,
                username=username,
                email=g["email"],
                google_id=g["sub"],
                auth_provider=ReMakers.AuthProvider.GOOGLE,
                email_verified_at=timezone.now(),
            )
            ReMaker_Profile.objects.create(remaker=remaker)

        touch_login(remaker)
        return created(
            {"remaker": ReMakerSerializer(remaker).data, **create_token_pair("remaker", remaker.remaker_id)},
            "ReMaker account created with Google.",
        )


class MeView(APIView):
    """GET /api/remakers/me/ : works for every account status."""

    permission_classes = [IsReOrbitReMaker]
    support_endpoint = True

    def get(self, request):
        return ok({"remaker": ReMakerSerializer(request.user.account, context={"request": request}).data})


class ProfileView(BaseProfileView):
    """GET / PATCH /api/remakers/profile/ : name, username + studio profile. Counters, ratings and images are read-only here."""

    permission_classes = [IsReOrbitReMaker]
    profile_serializer = ReMakerProfileSerializer
    account_serializer = ReMakerSerializer

    def clean_account(self, request, data):
        changes, errors = super().clean_account(request, data)
        if "username" in data:
            username = (data.get("username") or "").strip()
            error = _username_error(username)
            if not error and ReMakers.objects.filter(username__iexact=username).exclude(
                pk=request.user.account.pk
            ).exists():
                error = "This username is already taken."
            if error:
                errors["username"] = [error]
            else:
                changes["username"] = username
        return changes, errors


class ProfilePhotoView(BaseImageView):
    """POST / DELETE /api/remakers/profile/photo/ : the profile picture."""

    permission_classes = [IsReOrbitReMaker]
    profile_serializer = ReMakerProfileSerializer
    field = "profile_image"
    max_side = 1024
    label = "Profile photo"


class ProfileCoverView(BaseImageView):
    """POST / DELETE /api/remakers/profile/cover/ : the studio cover picture."""

    permission_classes = [IsReOrbitReMaker]
    profile_serializer = ReMakerProfileSerializer
    field = "cover_image"
    max_side = 1920
    label = "Cover image"


class AdminReMakerList(AdminAccountList):
    """GET /api/remakers/admin/  (admin with the "remakers" module, view level)."""

    permission_classes = [IsReOrbitAdmin, HasAdminModule("remakers")]
    queryset = ReMakers.objects.all()
    serializer_class = AdminReMakerSerializer
    search_fields = (
        "username",
        "full_name",
        "email",
        "public_id",
        "profile__studio_name",
        "profile__city",
        "profile__phone",
    )


class AdminReMakerDetail(AdminAccountDetail):
    """GET /api/remakers/admin/<public_id>/"""

    permission_classes = [IsReOrbitAdmin, HasAdminModule("remakers")]
    queryset = ReMakers.objects.all()
    serializer_class = AdminReMakerSerializer
