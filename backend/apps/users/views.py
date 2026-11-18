from django.db import transaction
from django.utils import timezone
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView

from apps.accounts.google import GoogleAuthError, profile_from_code
from apps.core.account_deletion import DeleteMyAccount as _DeleteMyAccount, is_past_grace, purge
from apps.accounts.helpers import clean_email, is_valid_email, send_otp_or_error, touch_login
from apps.accounts.models import OTP_Verification
from apps.accounts.otp import consume_otp, verify_otp
from apps.accounts.permissions import IsReOrbitUser
from apps.accounts.tokens import create_token_pair
from apps.accounts.utils import issue_reset_token, read_reset_token
from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin
from apps.core.admin_accounts import AdminAccountDetail, AdminAccountList
from apps.core.profile import BaseImageView, BaseProfileView
from apps.core.responses import created, fail, ok
from apps.core.throttles import AuthThrottle, OTPIPThrottle, OTPSendThrottle, OTPVerifyThrottle

from apps.remakers.models import ReMakers

from .models import User_Profile, Users
from .serializers import AdminUserSerializer, UserProfileSerializer, UserSerializer


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
        if user is not None and is_past_grace(user):
            purge(user)  # deleted more than 30 days ago: gone for good, the email is free again
            user = None
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
        _login_alert(user, request)
        return ok(
            {"user": UserSerializer(user).data, **create_token_pair("user", user.user_id)},
            "Login successful.",
        )


class GoogleAuthView(APIView):
    """POST /api/users/auth/google/  {"code"}  ->  sign in, or create the account.

    * Known Google account                -> sign in.
    * Same email already registered here  -> link Google to it, sign in.
      If that email was never verified, the old password is removed, because it may
      have been set by someone who does not own the email. The owner can set a new
      one with "Forgot password".
    * Email belongs to a ReMaker          -> 409 (one email, one role).
    * Otherwise                           -> create a new user.
    """

    authentication_classes = []
    permission_classes = []
    throttle_classes = [AuthThrottle]

    def post(self, request):
        try:
            g = profile_from_code(request.data.get("code"))
        except GoogleAuthError as exc:
            return fail(exc.message, status=exc.status, code="GOOGLE_AUTH_FAILED")

        new_account = False
        with transaction.atomic():
            user = Users.objects.filter(google_id=g["sub"]).first()
            if user is None:
                user = Users.objects.filter(email__iexact=g["email"]).first()
                if user is not None:
                    if user.google_id and user.google_id != g["sub"]:
                        return fail(
                            "This email is linked to a different Google account.",
                            status=status.HTTP_409_CONFLICT,
                        )
                    if user.email_verified_at is None:
                        user.password = None
                    user.google_id = g["sub"]
                    user.email_verified_at = user.email_verified_at or timezone.now()
                    user.save(update_fields=["google_id", "password", "email_verified_at", "updated_at"])
                else:
                    if ReMakers.objects.filter(email__iexact=g["email"]).exists():
                        return fail(
                            "This email is already registered as a ReMaker. Use a different Google account.",
                            status=status.HTTP_409_CONFLICT,
                            code="EMAIL_USED_BY_REMAKER",
                        )
                    user = Users(
                        full_name=g["full_name"],
                        email=g["email"],
                        google_id=g["sub"],
                        auth_provider=Users.AuthProvider.GOOGLE,
                        password=None,
                        email_verified_at=timezone.now(),
                    )
                    user.save()
                    User_Profile.objects.create(user=user)
                    new_account = True

        touch_login(user)
        body = {"user": UserSerializer(user).data, **create_token_pair("user", user.user_id)}
        if new_account:
            return created(body, "Account created with Google.")
        return ok(body, "Login successful.")


class ForgotPasswordRequestOTPView(APIView):
    """POST /api/users/auth/forgot-password/request-otp/"""

    authentication_classes = []
    permission_classes = []
    throttle_classes = [OTPIPThrottle, OTPSendThrottle]

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
    throttle_classes = [OTPIPThrottle, OTPVerifyThrottle]

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
    throttle_classes = [OTPIPThrottle, OTPVerifyThrottle]

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
            _tell_password(user)

        return ok(message="Password reset successfully. Please login again.")


class MeView(APIView):
    """GET /api/users/me/ : works for every account status (the app needs it to show the status)."""

    permission_classes = [IsReOrbitUser]
    support_endpoint = True

    def get(self, request):
        return ok({"user": UserSerializer(request.user.account, context={"request": request}).data})


class ProfileView(BaseProfileView):
    """GET / PATCH /api/users/profile/ : name + profile fields. Counters and images are read-only here."""

    permission_classes = [IsReOrbitUser]
    profile_serializer = UserProfileSerializer
    account_serializer = UserSerializer


class ProfilePhotoView(BaseImageView):
    """POST / DELETE /api/users/profile/photo/ : the profile picture."""

    permission_classes = [IsReOrbitUser]
    profile_serializer = UserProfileSerializer
    field = "profile_image"
    max_side = 1024
    label = "Profile photo"


class ChangePasswordView(APIView):
    """POST /api/users/password/change/  {"current_password", "new_password"}

    Google-only accounts have no password yet, so they can set one without the current one.
    """

    permission_classes = [IsReOrbitUser]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        user = request.user.account
        current = request.data.get("current_password") or ""
        new = request.data.get("new_password") or ""
        if user.password and not user.check_password(current):
            return fail(
                "Current password is incorrect.", errors={"current_password": ["Incorrect password."]}
            )
        if not new:
            return fail("New password is required.", errors={"new_password": ["This field is required."]})
        if user.password and current == new:
            return fail(
                "Choose a password different from the current one.",
                errors={"new_password": ["Must differ from the current password."]},
            )
        user.set_password(new)
        user.save(update_fields=["password", "updated_at"])
        _tell_password(user)
        return ok(message="Password updated successfully.")


def _with_counts(qs):
    """Real numbers for the admin list: listings uploaded, orders sold (delivered) and orders bought."""
    from django.db.models import Count, IntegerField, OuterRef, Subquery
    from django.db.models.functions import Coalesce

    from apps.listings.models import Item
    from apps.orders.models import Order

    def counted(model_qs):
        return Coalesce(Subquery(model_qs.order_by().values("n")[:1], output_field=IntegerField()), 0)

    uploads = (Item.objects.filter(user=OuterRef("pk"), deleted_at__isnull=True).exclude(item_status="Draft")
               .values("user").annotate(n=Count("pk")))
    sold = (Order.objects.filter(seller_user=OuterRef("pk"), status=Order.Status.DELIVERED)
            .values("seller_user").annotate(n=Count("pk")))
    bought = (Order.objects.filter(buyer_user=OuterRef("pk"))
              .exclude(status__in=(Order.Status.CANCELLED, Order.Status.PENDING_PAYMENT))
              .values("buyer_user").annotate(n=Count("pk")))
    return qs.annotate(uploads_count=counted(uploads), sold_count=counted(sold), bought_count=counted(bought))


class AdminUserList(AdminAccountList):
    """GET /api/users/admin/  (admin with the "users" module, view level).
    Each row carries uploads_count, sold_count (delivered sales) and bought_count."""

    permission_classes = [IsReOrbitAdmin, HasAdminModule("users")]
    queryset = Users.objects.all()
    serializer_class = AdminUserSerializer

    def get_queryset(self):
        return _with_counts(super().get_queryset())
    search_fields = ("full_name", "email", "public_id", "profile__city", "profile__phone")


class AdminUserDetail(AdminAccountDetail):
    """GET /api/users/admin/<public_id>/"""

    permission_classes = [IsReOrbitAdmin, HasAdminModule("users")]

    def get_queryset(self):
        return _with_counts(super().get_queryset())
    queryset = Users.objects.all()
    serializer_class = AdminUserSerializer


def _tell_password(user):
    """A security notice: if it wasn't them, they can see it straight away."""
    from apps.core.services import notify

    from apps.core.mailer import security_notice

    notify(user, "Your password was changed", "If this wasn't you, reset it now and contact support.",
           module="account", target_url="/user-settings", severity="warning", ref_type="account", ref_id=user.public_id)
    security_notice(user, "Your password was changed")


def _login_alert(user, request):
    from apps.accounts.helpers import login_alert

    login_alert(user, request)


class DeleteMyAccount(_DeleteMyAccount):
    """GET / POST /api/users/me/delete/ : delete my account (30 days to undo by signing in)."""

    permission_classes = [IsReOrbitUser]
