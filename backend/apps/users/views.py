from django.db import transaction
from rest_framework import status
from rest_framework.views import APIView

from apps.accounts.helpers import clean_email, is_valid_email, send_otp_or_error, touch_login
from apps.accounts.models import OTP_Verification
from apps.accounts.otp import consume_otp, verify_otp
from apps.accounts.permissions import IsReOrbitUser
from apps.accounts.tokens import create_token_pair
from apps.accounts.utils import issue_reset_token, read_reset_token
from apps.core.responses import created, fail, ok
from apps.core.throttles import AuthThrottle, OTPSendThrottle, OTPVerifyThrottle

from apps.remakers.models import ReMakers

from .models import User_Profile, Users
from .serializers import UserProfileSerializer, UserSerializer


class RegisterView(APIView):
    """POST /api/users/auth/register/"""

    authentication_classes = []
    permission_classes = []
    throttle_classes = [AuthThrottle]

    def post(self, request):
        full_name = (request.data.get("full_name") or "").strip()
        email = clean_email(request.data.get("email"))
        password = request.data.get("password") or ""

        if not full_name:
            return fail("Full name is required.")
        if not email:
            return fail("Email is required.")
        if not is_valid_email(email):
            return fail("Please enter a valid email address.", code="INVALID_EMAIL")
        if not password:
            return fail("Password is required.")
        if Users.objects.filter(email__iexact=email).exists():
            return fail("Email is already registered.", status=status.HTTP_409_CONFLICT)
        if ReMakers.objects.filter(email__iexact=email).exists():
            return fail(
                "This email is already registered as a ReMaker. Use a different email.",
                status=status.HTTP_409_CONFLICT,
                code="EMAIL_USED_BY_REMAKER",
            )

        with transaction.atomic():
            user = Users(full_name=full_name, email=email)
            user.set_password(password)
            user.save()
            User_Profile.objects.create(user=user)

        touch_login(user)
        return created(
            {"user": UserSerializer(user).data, **create_token_pair("user", user.user_id)},
            "Registration successful.",
        )


class LoginView(APIView):
    """POST /api/users/auth/login/

    Suspended, Blocked and Deleted members can sign in so the app can show their
    status and let them reach support; the permission classes limit what they can do.
    """

    authentication_classes = []
    permission_classes = []
    throttle_classes = [AuthThrottle]

    def post(self, request):
        email = clean_email(request.data.get("email"))
        password = request.data.get("password") or ""

        if not email:
            return fail("Email is required.")
        if not is_valid_email(email):
            return fail("Please enter a valid email address.", code="INVALID_EMAIL")
        if not password:
            return fail("Password is required.")

        user = Users.objects.filter(email__iexact=email).first()
        if not user:
            return fail(
                "No account found with this email. Please create an account first.",
                status=status.HTTP_404_NOT_FOUND,
                code="ACCOUNT_NOT_FOUND",
            )
        if not user.check_password(password):
            return fail(
                "Invalid password. Please try again.",
                status=status.HTTP_401_UNAUTHORIZED,
                code="INVALID_PASSWORD",
            )

        touch_login(user)
        return ok(
            {"user": UserSerializer(user).data, **create_token_pair("user", user.user_id)},
            "Login successful.",
        )


class ForgotPasswordRequestOTPView(APIView):
    """POST /api/users/auth/forgot-password/request-otp/"""

    authentication_classes = []
    permission_classes = []
    throttle_classes = [OTPSendThrottle]

    def post(self, request):
        email = clean_email(request.data.get("email"))
        if not email:
            return fail("Email is required.")

        user = Users.objects.filter(email__iexact=email).first()
        if not user:
            return fail("No account found with this email.", status=status.HTTP_404_NOT_FOUND)
        if user.status in (Users.Status.BLOCKED, Users.Status.DELETED):
            return fail(f"Account is {user.status.lower()}.", status=status.HTTP_403_FORBIDDEN)

        result, error = send_otp_or_error(
            email,
            OTP_Verification.Purpose.USER_FORGOT_PASSWORD,
            OTP_Verification.AccountType.USER,
        )
        if error:
            return error
        return ok({"expires_in_minutes": result["expires_in_minutes"]}, result["message"])


class ForgotPasswordVerifyOTPView(APIView):
    """POST /api/users/auth/forgot-password/verify-otp/"""

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

        record, error = verify_otp(email, otp, OTP_Verification.Purpose.USER_FORGOT_PASSWORD)
        if error:
            return fail(error)

        user = Users.objects.filter(email__iexact=email).first()
        if not user:
            return fail("User account not found.", status=status.HTTP_404_NOT_FOUND)

        return ok(
            {"reset_token": issue_reset_token(user.user_id, record.otp_id)},
            "OTP verified successfully.",
        )


class ForgotPasswordResetView(APIView):
    """POST /api/users/auth/forgot-password/reset/ : single use, valid 10 minutes."""

    authentication_classes = []
    permission_classes = []
    throttle_classes = [OTPVerifyThrottle]

    def post(self, request):
        reset_token = request.data.get("reset_token") or ""
        new_password = request.data.get("new_password") or ""
        if not reset_token:
            return fail("Reset token is required.")
        if not new_password:
            return fail("New password is required.")

        try:
            payload = read_reset_token(reset_token)
            user_id, otp_id = payload["user_id"], payload["otp_id"]
        except Exception:
            return fail("Invalid or expired reset token.")

        with transaction.atomic():
            record = (
                OTP_Verification.objects.select_for_update()
                .filter(
                    otp_id=otp_id,
                    is_verified=True,
                    consumed_at__isnull=True,
                    purpose=OTP_Verification.Purpose.USER_FORGOT_PASSWORD,
                )
                .first()
            )
            if not record:
                return fail("Reset request is invalid or already used.")

            user = Users.objects.filter(user_id=user_id).first()
            if not user:
                return fail("User account not found.", status=status.HTTP_404_NOT_FOUND)

            user.set_password(new_password)
            user.save(update_fields=["password", "updated_at"])
            consume_otp(record)

        return ok(message="Password reset successfully. Please login again.")


class MeView(APIView):
    """GET /api/users/me/ : works for every account status (the app needs it to show the status)."""

    permission_classes = [IsReOrbitUser]
    support_endpoint = True

    def get(self, request):
        return ok({"user": UserSerializer(request.user.account).data})


class ProfileView(APIView):
    """GET / PATCH /api/users/profile/ : counters are read-only."""

    permission_classes = [IsReOrbitUser]

    def get(self, request):
        return ok({"profile": UserProfileSerializer(request.user.account.profile).data})

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user.account.profile, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return ok({"profile": serializer.data}, "Profile updated successfully.")
