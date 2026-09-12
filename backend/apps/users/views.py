from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import OTP_Verification
from apps.accounts.otp import (
    create_and_send_otp,
    verify_otp,
)
from apps.accounts.tokens import create_token_pair
from apps.accounts.permissions import IsReOrbitUser
from apps.accounts.utils import (
    issue_reset_token,
    read_reset_token,
)

from .models import Users, User_Profile
from .serializers import (
    UserSerializer,
    UserProfileSerializer,
)

# HELPERS


def clean_email(value):
    """
    Clean and normalize email address.
    """
    return (value or "").strip().lower()


# USER REGISTRATION


class RegisterView(APIView):
    """
    User Registration

    POST:
        {
            "full_name": "John Doe",
            "email": "john@example.com",
            "password": "password123"
        }

    Registration does NOT require OTP.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):

        full_name = (request.data.get("full_name") or "").strip()

        email = clean_email(request.data.get("email"))

        password = request.data.get("password") or ""

        # VALIDATION

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

        if not password:
            return Response(
                {"success": False, "message": "Password is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # CHECK EXISTING USER

        if Users.objects.filter(email__iexact=email).exists():

            return Response(
                {"success": False, "message": "Email is already registered."},
                status=status.HTTP_409_CONFLICT,
            )

        # CREATE USER + PROFILE

        with transaction.atomic():

            user = Users(
                full_name=full_name,
                email=email,
            )

            user.set_password(password)
            user.save()

            User_Profile.objects.create(user=user)

        # CREATE JWT TOKENS

        tokens = create_token_pair("user", user.user_id)

        return Response(
            {
                "success": True,
                "message": "Registration successful.",
                "data": {"user": UserSerializer(user).data, **tokens},
            },
            status=status.HTTP_201_CREATED,
        )


# USER LOGIN


class LoginView(APIView):
    """
    User Login

    POST:
        {
            "email": "john@example.com",
            "password": "password123"
        }
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):

        email = clean_email(request.data.get("email"))

        password = request.data.get("password") or ""

        # VALIDATION

        if not email:
            return Response(
                {"success": False, "message": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not password:
            return Response(
                {"success": False, "message": "Password is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # FIND USER

        user = Users.objects.filter(email__iexact=email).first()

        # CHECK CREDENTIALS

        if not user or not user.check_password(password):

            return Response(
                {"success": False, "message": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # CHECK ACCOUNT STATUS

        if user.status != Users.Status.ACTIVE:

            return Response(
                {
                    "success": False,
                    "message": (f"Account is " f"{user.status.lower()}."),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # CREATE TOKENS

        tokens = create_token_pair("user", user.user_id)

        return Response(
            {
                "success": True,
                "message": "Login successful.",
                "data": {"user": UserSerializer(user).data, **tokens},
            },
            status=status.HTTP_200_OK,
        )


# FORGOT PASSWORD - REQUEST OTP


class ForgotPasswordRequestOTPView(APIView):
    """
    Request Forgot Password OTP.

    POST:
        {
            "email": "john@example.com"
        }

    Flow:
        Email
          ↓
        Generate OTP
          ↓
        Hash OTP
          ↓
        Store hash in database
          ↓
        Send real SMTP email
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):

        email = clean_email(request.data.get("email"))

        # VALIDATION

        if not email:

            return Response(
                {"success": False, "message": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # FIND USER

        user = Users.objects.filter(email__iexact=email).first()

        if not user:

            return Response(
                {"success": False, "message": ("No account found with " "this email.")},
                status=status.HTTP_404_NOT_FOUND,
            )

        # CHECK USER STATUS

        if user.status != Users.Status.ACTIVE:

            return Response(
                {
                    "success": False,
                    "message": (f"Account is " f"{user.status.lower()}."),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # SEND OTP USING SMTP OTP SERVICE

        result = create_and_send_otp(
            email, OTP_Verification.Purpose.USER_FORGOT_PASSWORD
        )

        # RESPONSE

        return Response(
            {
                "success": True,
                "message": result["message"],
                "data": {"expires_in_minutes": (result["expires_in_minutes"])},
            },
            status=status.HTTP_200_OK,
        )


# FORGOT PASSWORD - VERIFY OTP


class ForgotPasswordVerifyOTPView(APIView):
    """
    Verify Forgot Password OTP.

    POST:
        {
            "email": "john@example.com",
            "otp": "123456"
        }

    Successful verification creates a temporary
    reset token.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):

        email = clean_email(request.data.get("email"))

        otp = (request.data.get("otp") or "").strip()

        # VALIDATION

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

        # VERIFY OTP

        record, error = verify_otp(
            email, otp, OTP_Verification.Purpose.USER_FORGOT_PASSWORD
        )

        # OTP FAILED

        if error:

            return Response(
                {"success": False, "message": error}, status=status.HTTP_400_BAD_REQUEST
            )

        # FIND USER

        user = Users.objects.filter(email__iexact=email).first()

        if not user:

            return Response(
                {"success": False, "message": "User account not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # CREATE PASSWORD RESET TOKEN

        reset_token = issue_reset_token(user.user_id, record.otp_id)

        # RESPONSE

        return Response(
            {
                "success": True,
                "message": ("OTP verified successfully."),
                "data": {"reset_token": reset_token},
            },
            status=status.HTTP_200_OK,
        )


# FORGOT PASSWORD - RESET PASSWORD


class ForgotPasswordResetView(APIView):
    """
    Reset User Password.

    POST:
        {
            "reset_token": "...",
            "new_password": "NewPassword123"
        }
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):

        reset_token = request.data.get("reset_token") or ""

        new_password = request.data.get("new_password") or ""

        # VALIDATION

        if not reset_token:

            return Response(
                {"success": False, "message": ("Reset token is required.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not new_password:

            return Response(
                {"success": False, "message": ("New password is required.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # READ RESET TOKEN

        try:

            payload = read_reset_token(reset_token)

            user_id = payload["user_id"]
            otp_id = payload["otp_id"]

        except Exception:

            return Response(
                {"success": False, "message": ("Invalid or expired " "reset token.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # VALIDATE OTP RECORD

        record = OTP_Verification.objects.filter(
            otp_id=otp_id,
            is_verified=True,
            purpose=(OTP_Verification.Purpose.USER_FORGOT_PASSWORD),
        ).first()

        if not record:

            return Response(
                {
                    "success": False,
                    "message": ("Reset request is invalid " "or already used."),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # FIND USER

        user = Users.objects.filter(user_id=user_id).first()

        if not user:

            return Response(
                {"success": False, "message": ("User account not found.")},
                status=status.HTTP_404_NOT_FOUND,
            )

        # UPDATE PASSWORD

        user.set_password(new_password)

        user.save(update_fields=["password", "updated_at"])

        # DELETE USED OTP

        record.delete()

        # RESPONSE

        return Response(
            {
                "success": True,
                "message": ("Password reset successfully. " "Please login again."),
            },
            status=status.HTTP_200_OK,
        )


# CURRENT USER


class MeView(APIView):
    """
    Get currently authenticated user.
    """

    permission_classes = [IsAuthenticated, IsReOrbitUser]

    def get(self, request):

        return Response(
            {
                "success": True,
                "data": {"user": UserSerializer(request.user.account).data},
            },
            status=status.HTTP_200_OK,
        )


# USER PROFILE


class ProfileView(APIView):
    """
    Get and update authenticated user's profile.
    """

    permission_classes = [IsAuthenticated, IsReOrbitUser]

    # GET PROFILE

    def get(self, request):

        profile = request.user.account.profile

        return Response(
            {"success": True, "data": {"profile": UserProfileSerializer(profile).data}},
            status=status.HTTP_200_OK,
        )

    # UPDATE PROFILE

    def patch(self, request):

        profile = request.user.account.profile

        serializer = UserProfileSerializer(profile, data=request.data, partial=True)

        serializer.is_valid(raise_exception=True)

        serializer.save()

        return Response(
            {
                "success": True,
                "message": ("Profile updated successfully."),
                "data": {"profile": serializer.data},
            },
            status=status.HTTP_200_OK,
        )
