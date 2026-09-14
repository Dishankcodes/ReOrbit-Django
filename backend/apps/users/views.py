import re
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import OTP_Verification
from apps.accounts.otp import create_and_send_otp, verify_otp
from apps.accounts.tokens import create_token_pair
from apps.accounts.permissions import IsReOrbitUser
from apps.accounts.utils import issue_reset_token, read_reset_token

from .models import Users, User_Profile
from .serializers import UserSerializer, UserProfileSerializer


def clean_email(value):
    """Clean and normalize email address."""
    return (value or "").strip().lower()


def is_valid_email(value):
    """Basic email-format validation for authentication endpoints."""
    return bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value or ""))


class RegisterView(APIView):
    """User Registration Endpoint"""

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        full_name = (request.data.get("full_name") or "").strip()
        email = clean_email(request.data.get("email"))
        password = request.data.get("password") or ""

        if not full_name:
            return Response(
                {"success": False, "message": "Full name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not email:
            return Response(
                {"success": False, "message": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not is_valid_email(email):
            return Response(
                {
                    "success": False,
                    "message": "Please enter a valid email address.",
                    "code": "INVALID_EMAIL",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not password:
            return Response(
                {"success": False, "message": "Password is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Users.objects.filter(email__iexact=email).exists():
            return Response(
                {"success": False, "message": "Email is already registered."},
                status=status.HTTP_409_CONFLICT,
            )

        with transaction.atomic():
            user = Users(full_name=full_name, email=email)
            user.set_password(password)
            user.save()
            User_Profile.objects.create(user=user)

        tokens = create_token_pair("user", user.user_id)

        return Response(
            {
                "success": True,
                "message": "Registration successful.",
                "data": {"user": UserSerializer(user).data, **tokens},
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """User Login Endpoint"""

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = clean_email(request.data.get("email"))
        password = request.data.get("password") or ""

        if not email:
            return Response(
                {"success": False, "message": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not is_valid_email(email):
            return Response(
                {
                    "success": False,
                    "message": "Please enter a valid email address.",
                    "code": "INVALID_EMAIL",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not password:
            return Response(
                {"success": False, "message": "Password is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = Users.objects.filter(email__iexact=email).first()

        if not user:
            return Response(
                {
                    "success": False,
                    "message": "No account found with this email. Please create an account first.",
                    "code": "ACCOUNT_NOT_FOUND",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if not user.check_password(password):
            return Response(
                {
                    "success": False,
                    "message": "Invalid password. Please try again.",
                    "code": "INVALID_PASSWORD",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if user.status != Users.Status.ACTIVE:
            return Response(
                {
                    "success": False,
                    "message": f"Account is {user.status.lower()}.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        tokens = create_token_pair("user", user.user_id)

        return Response(
            {
                "success": True,
                "message": "Login successful.",
                "data": {"user": UserSerializer(user).data, **tokens},
            },
            status=status.HTTP_200_OK,
        )


class ForgotPasswordRequestOTPView(APIView):
    """Request Forgot Password OTP."""

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = clean_email(request.data.get("email"))

        if not email:
            return Response(
                {"success": False, "message": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = Users.objects.filter(email__iexact=email).first()

        if not user:
            return Response(
                {"success": False, "message": "No account found with this email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.status != Users.Status.ACTIVE:
            return Response(
                {
                    "success": False,
                    "message": f"Account is {user.status.lower()}.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        result = create_and_send_otp(
            email, OTP_Verification.Purpose.USER_FORGOT_PASSWORD
        )

        return Response(
            {
                "success": True,
                "message": result["message"],
                "data": {"expires_in_minutes": result["expires_in_minutes"]},
            },
            status=status.HTTP_200_OK,
        )


class ForgotPasswordVerifyOTPView(APIView):
    """Verify Forgot Password OTP and generate reset token."""

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = clean_email(request.data.get("email"))
        otp = (request.data.get("otp") or "").strip()

        if not email:
            return Response(
                {"success": False, "message": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not otp:
            return Response(
                {"success": False, "message": "OTP is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        record, error = verify_otp(
            email, otp, OTP_Verification.Purpose.USER_FORGOT_PASSWORD
        )

        if error:
            return Response(
                {"success": False, "message": error},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = Users.objects.filter(email__iexact=email).first()

        if not user:
            return Response(
                {"success": False, "message": "User account not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        reset_token = issue_reset_token(user.user_id, record.otp_id)

        return Response(
            {
                "success": True,
                "message": "OTP verified successfully.",
                "data": {"reset_token": reset_token},
            },
            status=status.HTTP_200_OK,
        )


class ForgotPasswordResetView(APIView):
    """Reset User Password using reset token."""

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        reset_token = request.data.get("reset_token") or ""
        new_password = request.data.get("new_password") or ""

        if not reset_token:
            return Response(
                {"success": False, "message": "Reset token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not new_password:
            return Response(
                {"success": False, "message": "New password is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = read_reset_token(reset_token)
            user_id = payload["user_id"]
            otp_id = payload["otp_id"]
        except Exception:
            return Response(
                {"success": False, "message": "Invalid or expired reset token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        record = OTP_Verification.objects.filter(
            otp_id=otp_id,
            is_verified=True,
            purpose=OTP_Verification.Purpose.USER_FORGOT_PASSWORD,
        ).first()

        if not record:
            return Response(
                {
                    "success": False,
                    "message": "Reset request is invalid or already used.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = Users.objects.filter(user_id=user_id).first()

        if not user:
            return Response(
                {"success": False, "message": "User account not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])
        record.delete()

        return Response(
            {
                "success": True,
                "message": "Password reset successfully. Please login again.",
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    """Get currently authenticated user details."""

    permission_classes = [IsAuthenticated, IsReOrbitUser]

    def get(self, request):
        return Response(
            {
                "success": True,
                "data": {"user": UserSerializer(request.user.account).data},
            },
            status=status.HTTP_200_OK,
        )


class ProfileView(APIView):
    """Get and update authenticated user's profile."""

    permission_classes = [IsAuthenticated, IsReOrbitUser]

    def get(self, request):
        profile = request.user.account.profile
        return Response(
            {"success": True, "data": {"profile": UserProfileSerializer(profile).data}},
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        profile = request.user.account.profile
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "success": True,
                "message": "Profile updated successfully.",
                "data": {"profile": serializer.data},
            },
            status=status.HTTP_200_OK,
        )
