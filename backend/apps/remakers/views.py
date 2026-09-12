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
from apps.accounts.permissions import IsReOrbitReMaker

from .models import (
    ReMakers,
    ReMaker_Profile,
)
from .serializers import (
    ReMakerSerializer,
    ReMakerProfileSerializer,
)

# HELPER


def clean_email(value):
    """
    Normalize email address.
    """

    return (value or "").strip().lower()


# CHECK RE-MAKER EMAIL


class CheckEmailView(APIView):
    """
    Check whether an email already belongs to a ReMaker.

    POST:
        {
            "email": "remaker@example.com"
        }

    Response:

        Existing:
        {
            "success": true,
            "data": {
                "exists": true
            }
        }

        New:
        {
            "success": true,
            "data": {
                "exists": false
            }
        }
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):

        email = clean_email(request.data.get("email"))

        if not email:

            return Response(
                {"success": False, "message": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        exists = ReMakers.objects.filter(email__iexact=email).exists()

        return Response(
            {"success": True, "data": {"exists": exists}}, status=status.HTTP_200_OK
        )


# REQUEST OTP


class RequestOTPView(APIView):
    """
    Request ReMaker OTP.

    Registration:
        purpose = remaker_register

    Login:
        purpose = remaker_login
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):

        email = clean_email(request.data.get("email"))

        purpose = (request.data.get("purpose") or "").strip()

        # BASIC VALIDATION

        if not email:

            return Response(
                {"success": False, "message": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # CHECK PURPOSE

        valid_purposes = [
            OTP_Verification.Purpose.REMAKER_REGISTER,
            OTP_Verification.Purpose.REMAKER_LOGIN,
        ]

        if purpose not in valid_purposes:

            return Response(
                {"success": False, "message": "Invalid OTP purpose."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # FIND EXISTING REMAKER

        remaker = ReMakers.objects.filter(email__iexact=email).first()

        # REGISTRATION OTP

        if purpose == OTP_Verification.Purpose.REMAKER_REGISTER:

            # Email must NOT already exist.

            if remaker:

                return Response(
                    {
                        "success": False,
                        "message": ("Email is already registered " "as a ReMaker."),
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            # REGISTRATION DATA

            full_name = (request.data.get("full_name") or "").strip()

            username = (request.data.get("username") or "").strip()

            if not full_name:

                return Response(
                    {
                        "success": False,
                        "message": ("Full name is required " "for registration."),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not username:

                return Response(
                    {
                        "success": False,
                        "message": ("Username is required " "for registration."),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # CHECK USERNAME

            if ReMakers.objects.filter(username__iexact=username).exists():

                return Response(
                    {"success": False, "message": ("Username is already taken.")},
                    status=status.HTTP_409_CONFLICT,
                )
        # LOGIN OTP

        if purpose == OTP_Verification.Purpose.REMAKER_LOGIN:

            if not remaker:

                return Response(
                    {
                        "success": False,
                        "message": ("No ReMaker account found " "with this email."),
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # CHECK STATUS

            if remaker.status != ReMakers.Status.ACTIVE:

                return Response(
                    {
                        "success": False,
                        "message": (f"Account is " f"{remaker.status.lower()}."),
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        # SEND SMTP OTP

        result = create_and_send_otp(email, purpose)

        # RESPONSE

        return Response(
            {
                "success": True,
                "message": result["message"],
                "data": {"expires_in_minutes": (result["expires_in_minutes"])},
            },
            status=status.HTTP_200_OK,
        )


# REMAKER REGISTRATION


class RegisterView(APIView):
    """
    Complete ReMaker registration after OTP verification.

    POST:

        {
            "email": "remaker@example.com",
            "otp": "123456",
            "full_name": "Nivya Patel",
            "username": "Messy Mirror"
        }

    Successful registration:

        ReMaker
             +
        ReMaker Profile
             +
        JWT
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):

        email = clean_email(request.data.get("email"))

        otp = (request.data.get("otp") or "").strip()

        full_name = (request.data.get("full_name") or "").strip()

        username = (request.data.get("username") or "").strip()

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

        if not full_name:

            return Response(
                {"success": False, "message": "Full name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not username:

            return Response(
                {"success": False, "message": "Username is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # VERIFY REGISTRATION OTP

        record, error = verify_otp(
            email, otp, OTP_Verification.Purpose.REMAKER_REGISTER
        )

        if error:

            return Response(
                {"success": False, "message": error}, status=status.HTTP_400_BAD_REQUEST
            )

        # DOUBLE CHECK EMAIL

        if ReMakers.objects.filter(email__iexact=email).exists():

            return Response(
                {"success": False, "message": ("Email is already registered.")},
                status=status.HTTP_409_CONFLICT,
            )

        # DOUBLE CHECK USERNAME

        if ReMakers.objects.filter(username__iexact=username).exists():

            return Response(
                {"success": False, "message": ("Username is already taken.")},
                status=status.HTTP_409_CONFLICT,
            )

        # CREATE REMAKER + PROFILE

        with transaction.atomic():

            remaker = ReMakers.objects.create(
                full_name=full_name,
                username=username,
                email=email,
                auth_provider=(ReMakers.AuthProvider.EMAIL),
                status=ReMakers.Status.ACTIVE,
            )

            ReMaker_Profile.objects.create(remaker=remaker)

            # OTP has already been verified by
            # verify_otp().
            #
            # Delete it after successful account creation.

            record.delete()

        # CREATE JWT

        tokens = create_token_pair("remaker", remaker.remaker_id)

        # RESPONSE

        return Response(
            {
                "success": True,
                "message": ("ReMaker registration " "successful."),
                "data": {"remaker": ReMakerSerializer(remaker).data, **tokens},
            },
            status=status.HTTP_201_CREATED,
        )


# REMAKER LOGIN - VERIFY OTP


class LoginVerifyOTPView(APIView):
    """
    Verify ReMaker login OTP.

    POST:

        {
            "email": "remaker@example.com",
            "otp": "123456"
        }
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

        record, error = verify_otp(email, otp, OTP_Verification.Purpose.REMAKER_LOGIN)

        if error:

            return Response(
                {"success": False, "message": error}, status=status.HTTP_400_BAD_REQUEST
            )

        # FIND REMAKER

        remaker = ReMakers.objects.filter(email__iexact=email).first()

        if not remaker:

            return Response(
                {"success": False, "message": ("ReMaker account not found.")},
                status=status.HTTP_404_NOT_FOUND,
            )

        # CHECK ACCOUNT STATUS

        if remaker.status != ReMakers.Status.ACTIVE:

            return Response(
                {
                    "success": False,
                    "message": (f"Account is " f"{remaker.status.lower()}."),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # DELETE USED OTP

        record.delete()

        # CREATE JWT

        tokens = create_token_pair("remaker", remaker.remaker_id)

        # RESPONSE

        return Response(
            {
                "success": True,
                "message": "Login successful.",
                "data": {"remaker": ReMakerSerializer(remaker).data, **tokens},
            },
            status=status.HTTP_200_OK,
        )


# CURRENT REMAKER


class MeView(APIView):
    """
    Get authenticated ReMaker.
    """

    permission_classes = [IsAuthenticated, IsReOrbitReMaker]

    def get(self, request):

        return Response(
            {
                "success": True,
                "data": {"remaker": ReMakerSerializer(request.user.account).data},
            },
            status=status.HTTP_200_OK,
        )


# REMAKER PROFILE


class ProfileView(APIView):
    """
    Get / update authenticated ReMaker profile.
    """

    permission_classes = [IsAuthenticated, IsReOrbitReMaker]

    # GET PROFILE

    def get(self, request):

        profile = request.user.account.profile

        return Response(
            {
                "success": True,
                "data": {"profile": ReMakerProfileSerializer(profile).data},
            },
            status=status.HTTP_200_OK,
        )

    # UPDATE PROFILE

    def patch(self, request):

        profile = request.user.account.profile

        serializer = ReMakerProfileSerializer(profile, data=request.data, partial=True)

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
