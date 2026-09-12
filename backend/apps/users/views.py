from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from apps.accounts.models import OTP_Verification
from apps.accounts.tokens import create_token_pair
from apps.accounts.utils import create_and_send_otp, get_valid_otp, issue_reset_token, read_reset_token
from apps.accounts.permissions import IsReOrbitUser
from .models import Users, User_Profile
from .serializers import UserSerializer, UserProfileSerializer


def clean_email(value):
    return (value or '').strip().lower()

class RegisterView(APIView):
    authentication_classes = []
    permission_classes = []
    def post(self, request):
        full_name = (request.data.get('full_name') or '').strip()
        email = clean_email(request.data.get('email'))
        password = request.data.get('password') or ''
        if not full_name or not email or not password:
            return Response({'success':False,'message':'Full name, email and password are required.'}, status=400)
        if Users.objects.filter(email__iexact=email).exists():
            return Response({'success':False,'message':'Email is already registered.'}, status=409)
        with transaction.atomic():
            user = Users(full_name=full_name, email=email)
            user.set_password(password)
            user.save()
            User_Profile.objects.create(user=user)
        return Response({'success':True,'message':'Registration successful.','data':{'user':UserSerializer(user).data, **create_token_pair('user', user.user_id)}}, status=201)

class LoginView(APIView):
    authentication_classes = []
    permission_classes = []
    def post(self, request):
        email = clean_email(request.data.get('email'))
        password = request.data.get('password') or ''
        user = Users.objects.filter(email__iexact=email).first()
        if not user or not user.check_password(password):
            return Response({'success':False,'message':'Invalid email or password.'}, status=401)
        if user.status != Users.Status.ACTIVE:
            return Response({'success':False,'message':f'Account is {user.status.lower()}.'}, status=403)
        return Response({'success':True,'message':'Login successful.','data':{'user':UserSerializer(user).data, **create_token_pair('user', user.user_id)}})

class ForgotPasswordRequestOTPView(APIView):
    authentication_classes = []
    permission_classes = []
    def post(self, request):
        email = clean_email(request.data.get('email'))
        user = Users.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'success':False,'message':'No account found with this email.'}, status=404)
        if user.status != Users.Status.ACTIVE:
            return Response({'success':False,'message':f'Account is {user.status.lower()}.'}, status=403)
        create_and_send_otp(email, OTP_Verification.Purpose.USER_FORGOT_PASSWORD)
        return Response({'success':True,'message':'OTP sent successfully.'})

class ForgotPasswordVerifyOTPView(APIView):
    authentication_classes = []
    permission_classes = []
    def post(self, request):
        email = clean_email(request.data.get('email'))
        otp = (request.data.get('otp') or '').strip()
        record, error = get_valid_otp(email, otp, OTP_Verification.Purpose.USER_FORGOT_PASSWORD)
        if error:
            return Response({'success':False,'message':error}, status=400)
        user = Users.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'success':False,'message':'User account not found.'}, status=404)
        record.is_verified = True
        record.save(update_fields=['is_verified'])
        return Response({'success':True,'message':'OTP verified successfully.','data':{'reset_token':issue_reset_token(user.user_id, record.otp_id)}})

class ForgotPasswordResetView(APIView):
    authentication_classes = []
    permission_classes = []
    def post(self, request):
        token = request.data.get('reset_token') or ''
        new_password = request.data.get('new_password') or ''
        if not token or not new_password:
            return Response({'success':False,'message':'Reset token and new password are required.'}, status=400)
        try:
            payload = read_reset_token(token)
            user_id = payload['user_id']; otp_id = payload['otp_id']
        except Exception:
            return Response({'success':False,'message':'Invalid or expired reset token.'}, status=400)
        record = OTP_Verification.objects.filter(otp_id=otp_id, is_verified=True, purpose=OTP_Verification.Purpose.USER_FORGOT_PASSWORD).first()
        if not record:
            return Response({'success':False,'message':'Reset request is invalid or already used.'}, status=400)
        user = Users.objects.filter(user_id=user_id).first()
        if not user:
            return Response({'success':False,'message':'User account not found.'}, status=404)
        user.set_password(new_password); user.save(update_fields=['password','updated_at'])
        record.delete()
        return Response({'success':True,'message':'Password reset successfully. Please login again.'})

class MeView(APIView):
    permission_classes = [IsAuthenticated, IsReOrbitUser]
    def get(self, request): return Response({'success':True,'data':{'user':UserSerializer(request.user.account).data}})

class ProfileView(APIView):
    permission_classes = [IsAuthenticated, IsReOrbitUser]
    def get(self, request): return Response({'success':True,'data':{'profile':UserProfileSerializer(request.user.account.profile).data}})
    def patch(self, request):
        serializer = UserProfileSerializer(request.user.account.profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True); serializer.save()
        return Response({'success':True,'message':'Profile updated successfully.','data':{'profile':serializer.data}})
