from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.accounts.models import OTP_Verification
from apps.accounts.utils import create_and_send_otp, get_valid_otp
from apps.accounts.tokens import create_token_pair
from apps.accounts.permissions import IsReOrbitReMaker
from .models import ReMakers, ReMaker_Profile
from .serializers import ReMakerSerializer, ReMakerProfileSerializer


def email(v):
    return (v or "").strip().lower()


class CheckEmailView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        e = email(request.data.get("email"))
        if not e:
            return Response(
                {"success": False, "message": "Email is required."}, status=400
            )
        exists = ReMakers.objects.filter(email__iexact=e).exists()
        return Response({"success": True, "data": {"exists": exists}})


class RequestOTPView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        e = email(request.data.get("email"))
        purpose = request.data.get("purpose")
        if purpose not in [
            OTP_Verification.Purpose.REMAKER_REGISTER,
            OTP_Verification.Purpose.REMAKER_LOGIN,
        ]:
            return Response(
                {"success": False, "message": "Invalid OTP purpose."}, status=400
            )
        remaker = ReMakers.objects.filter(email__iexact=e).first()
        if purpose == OTP_Verification.Purpose.REMAKER_REGISTER and remaker:
            return Response(
                {
                    "success": False,
                    "message": "Email is already registered as a ReMaker.",
                },
                status=409,
            )
        if purpose == OTP_Verification.Purpose.REMAKER_LOGIN:
            if not remaker:
                return Response(
                    {
                        "success": False,
                        "message": "No ReMaker account found with this email.",
                    },
                    status=404,
                )
            if remaker.status != ReMakers.Status.ACTIVE:
                return Response(
                    {
                        "success": False,
                        "message": f"Account is {remaker.status.lower()}.",
                    },
                    status=403,
                )
        if purpose == OTP_Verification.Purpose.REMAKER_REGISTER:
            if not request.data.get("full_name") or not request.data.get("username"):
                return Response(
                    {
                        "success": False,
                        "message": "Full name and username are required for registration.",
                    },
                    status=400,
                )
            if ReMakers.objects.filter(
                username__iexact=request.data["username"].strip()
            ).exists():
                return Response(
                    {"success": False, "message": "Username is already taken."},
                    status=409,
                )
        create_and_send_otp(e, purpose)
        return Response({"success": True, "message": "OTP sent successfully."})


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        e = email(request.data.get("email"))
        otp = (request.data.get("otp") or "").strip()
        full = (request.data.get("full_name") or "").strip()
        username = (request.data.get("username") or "").strip()
        record, error = get_valid_otp(e, otp, OTP_Verification.Purpose.REMAKER_REGISTER)
        if error:
            return Response({"success": False, "message": error}, status=400)
        if ReMakers.objects.filter(email__iexact=e).exists():
            return Response(
                {"success": False, "message": "Email is already registered."},
                status=409,
            )
        if ReMakers.objects.filter(username__iexact=username).exists():
            return Response(
                {"success": False, "message": "Username is already taken."}, status=409
            )
        with transaction.atomic():
            r = ReMakers.objects.create(full_name=full, username=username, email=e)
            ReMaker_Profile.objects.create(remaker=r)
            record.delete()
        return Response(
            {
                "success": True,
                "message": "ReMaker registration successful.",
                "data": {
                    "remaker": ReMakerSerializer(r).data,
                    **create_token_pair("remaker", r.remaker_id),
                },
            },
            status=201,
        )


class LoginVerifyOTPView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        e = email(request.data.get("email"))
        otp = (request.data.get("otp") or "").strip()
        record, error = get_valid_otp(e, otp, OTP_Verification.Purpose.REMAKER_LOGIN)
        if error:
            return Response({"success": False, "message": error}, status=400)
        r = ReMakers.objects.filter(email__iexact=e).first()
        if not r:
            return Response(
                {"success": False, "message": "ReMaker account not found."}, status=404
            )
        record.delete()
        return Response(
            {
                "success": True,
                "message": "Login successful.",
                "data": {
                    "remaker": ReMakerSerializer(r).data,
                    **create_token_pair("remaker", r.remaker_id),
                },
            }
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated, IsReOrbitReMaker]

    def get(self, request):
        return Response(
            {
                "success": True,
                "data": {"remaker": ReMakerSerializer(request.user.account).data},
            }
        )


class ProfileView(APIView):
    permission_classes = [IsAuthenticated, IsReOrbitReMaker]

    def get(self, request):
        return Response(
            {
                "success": True,
                "data": {
                    "profile": ReMakerProfileSerializer(
                        request.user.account.profile
                    ).data
                },
            }
        )

    def patch(self, request):
        s = ReMakerProfileSerializer(
            request.user.account.profile, data=request.data, partial=True
        )
        s.is_valid(raise_exception=True)
        s.save()
        return Response(
            {
                "success": True,
                "message": "Profile updated successfully.",
                "data": {"profile": s.data},
            }
        )
