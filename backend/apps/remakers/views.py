import re

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView

from apps.accounts.helpers import clean_email, is_valid_email, send_otp_or_error, touch_login
from apps.accounts.models import OTP_Verification
from apps.accounts.otp import consume_otp, verify_otp
from apps.accounts.permissions import IsReOrbitReMaker
from apps.accounts.tokens import create_token_pair
from apps.core.responses import created, fail, ok
from apps.core.throttles import AuthThrottle, OTPSendThrottle, OTPVerifyThrottle

from apps.users.models import Users

from .models import ReMaker_Profile, ReMakers
from .serializers import ReMakerProfileSerializer, ReMakerSerializer

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
    throttle_classes = [OTPSendThrottle]

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
    throttle_classes = [OTPVerifyThrottle]

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
    throttle_classes = [OTPVerifyThrottle]

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


class MeView(APIView):
    """GET /api/remakers/me/ : works for every account status."""

    permission_classes = [IsReOrbitReMaker]
    support_endpoint = True

    def get(self, request):
        return ok({"remaker": ReMakerSerializer(request.user.account).data})


class ProfileView(APIView):
    """GET / PATCH /api/remakers/profile/ : counters and ratings are read-only."""

    permission_classes = [IsReOrbitReMaker]

    def get(self, request):
        return ok({"profile": ReMakerProfileSerializer(request.user.account.profile).data})

    def patch(self, request):
        serializer = ReMakerProfileSerializer(
            request.user.account.profile, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return ok({"profile": serializer.data}, "Profile updated successfully.")
