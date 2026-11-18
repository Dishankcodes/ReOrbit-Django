from django.utils import timezone
from rest_framework.views import APIView

from apps.accounts.permissions import IsReOrbitAdmin
from apps.accounts.tokens import create_token_pair
from apps.core.responses import fail, ok
from apps.core.mailer import security_notice
from apps.core.throttles import AuthThrottle, OTPIPThrottle, OTPSendThrottle, OTPVerifyThrottle

from .models import Admins
from .serializers import AdminSerializer


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [AuthThrottle]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        admin = Admins.objects.filter(email__iexact=email).first()
        if not admin or not admin.check_password(password):
            return fail("Invalid email or password.", status=401)
        if admin.status != Admins.Status.ACTIVE:
            return fail("Admin account is blocked.", status=403)
        now = timezone.now()
        admin.last_login_at = now
        fields = ["last_login_at"]
        if admin.activated_at is None:  # first sign-in accepts the invite
            admin.activated_at = now
            fields.append("activated_at")
        admin.save(update_fields=fields)
        return ok(
            {
                "admin": AdminSerializer(admin).data,
                **create_token_pair("admin", admin.admin_id),
            },
            "Admin login successful.",
        )


class MeView(APIView):
    """GET /api/admins/me/ : the signed-in admin, including their access level per area."""

    permission_classes = [IsReOrbitAdmin]
    support_endpoint = True

    def get(self, request):
        return ok({"admin": AdminSerializer(request.user.account).data})


class ProfileView(APIView):
    """GET / PATCH /api/admins/profile/ : the admin's own details.

    Only the name can be edited. Email, role and module access are set by a Super Admin.
    """

    permission_classes = [IsReOrbitAdmin]

    def get(self, request):
        return ok({"admin": AdminSerializer(request.user.account).data})

    def patch(self, request):
        admin = request.user.account
        data = request.data
        errors = {}
        sent_email = data.get("email")
        if sent_email is not None and str(sent_email).strip().lower() != admin.email:
            errors["email"] = ["Email cannot be changed."]
        if "full_name" in data:
            name = " ".join(str(data.get("full_name") or "").split())
            if not name:
                errors["full_name"] = ["Name is required."]
            elif len(name) > 150:
                errors["full_name"] = ["Name must be 150 characters or fewer."]
            else:
                admin.full_name = name
        if errors:
            return fail("Please correct the highlighted fields.", errors=errors)
        admin.save(update_fields=["full_name", "updated_at"])
        return ok({"admin": AdminSerializer(admin).data}, "Profile updated successfully.")


class ChangePasswordView(APIView):
    """POST /api/admins/password/change/  {"current_password", "new_password"}"""

    permission_classes = [IsReOrbitAdmin]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        admin = request.user.account
        current = request.data.get("current_password") or ""
        new = request.data.get("new_password") or ""
        if not admin.check_password(current):
            return fail(
                "Current password is incorrect.", errors={"current_password": ["Incorrect password."]}
            )
        if not new:
            return fail("New password is required.", errors={"new_password": ["This field is required."]})
        if current == new:
            return fail(
                "Choose a password different from the current one.",
                errors={"new_password": ["Must differ from the current password."]},
            )
        if (msg := password_problem(new)):
            return fail(msg, errors={"new_password": [msg]})
        admin.set_password(new)
        admin.save(update_fields=["password", "updated_at"])
        security_notice(admin, "Your admin password was changed")
        return ok(message="Password updated successfully. We emailed you a confirmation.")


def password_problem(pw):
    if len(pw) < 8 or not any(c.isalpha() for c in pw) or not any(c.isdigit() for c in pw):
        return "Use at least 8 characters with letters and a number."
    return ""


class ForgotPasswordRequestOTP(APIView):
    """POST /api/admins/auth/forgot-password/request-otp/ {email}  -> a 6-digit code by email.
    The answer is the same whether or not the email is an admin, so emails can't be probed."""

    authentication_classes = []
    permission_classes = []
    throttle_classes = [OTPIPThrottle, OTPSendThrottle]

    def post(self, request):
        from apps.accounts.helpers import clean_email
        from apps.accounts.models import OTP_Verification
        from apps.accounts.otp import create_and_send_otp

        email = clean_email(request.data.get("email"))
        if not email:
            return fail("Email is required.", errors={"email": ["Email is required."]})
        admin = Admins.objects.filter(email__iexact=email, status=Admins.Status.ACTIVE).first()
        minutes = 10
        if admin is not None:
            try:
                minutes = create_and_send_otp(email, OTP_Verification.Purpose.ADMIN_FORGOT_PASSWORD,
                                              OTP_Verification.AccountType.ADMIN)["expires_in_minutes"]
            except Exception as exc:  # noqa: BLE001  cooldown or delivery problem
                return fail(str(exc) or "Couldn't send the code. Try again in a minute.", status=429)
        return ok({"expires_in_minutes": minutes},
                  "If that email belongs to an active admin, a reset code is on its way.")


class ForgotPasswordReset(APIView):
    """POST /api/admins/auth/forgot-password/reset/ {email, otp, new_password, confirm_password}"""

    authentication_classes = []
    permission_classes = []
    throttle_classes = [OTPIPThrottle, OTPVerifyThrottle]

    def post(self, request):
        from django.db import transaction

        from apps.accounts.helpers import clean_email
        from apps.accounts.models import OTP_Verification
        from apps.accounts.otp import consume_otp, verify_otp

        email = clean_email(request.data.get("email"))
        otp = str(request.data.get("otp") or "").strip()
        new = request.data.get("new_password") or ""
        confirm = request.data.get("confirm_password")
        if not email or not otp:
            return fail("Enter your email and the code we sent.")
        if (msg := password_problem(new)):
            return fail(msg, errors={"new_password": [msg]})
        if confirm is not None and confirm != new:
            return fail("The passwords don't match.", errors={"confirm_password": ["The passwords don't match."]})
        record, error = verify_otp(email, otp, OTP_Verification.Purpose.ADMIN_FORGOT_PASSWORD)
        if error:
            return fail(error, errors={"otp": [error]})
        with transaction.atomic():
            admin = Admins.objects.select_for_update().filter(email__iexact=email, status=Admins.Status.ACTIVE).first()
            if admin is None:
                return fail("This admin account can't be reset.", status=404)
            admin.set_password(new)
            admin.save(update_fields=["password", "updated_at"])
            consume_otp(record)
        security_notice(admin, "Your admin password was reset")
        return ok(message="Password reset. Sign in with your new password.")


ADMIN_NOTIFY_MODULES = ("users", "remakers", "products", "orders", "returns", "donations", "pickups", "warehouse",
                        "earnings", "rewards", "reviews", "complaints", "support", "content", "messages")


class NotificationPrefsView(APIView):
    """GET / PUT /api/admins/notification-preferences/  {modules: {orders: bool, ...}, email: bool}
    Only modules the admin can open are listed; account and urgent alerts always come through."""

    permission_classes = [IsReOrbitAdmin]

    def _payload(self, admin):
        prefs = admin.notification_preferences or {}
        mods = prefs.get("modules") or {}
        visible = [m for m in ADMIN_NOTIFY_MODULES if admin.has_module(m, "view") or m in ("messages",)]
        return {"modules": {m: mods.get(m, True) is not False for m in visible}, "email": prefs.get("email", True) is not False}

    def get(self, request):
        return ok(self._payload(request.user.account))

    def put(self, request):
        admin = request.user.account
        mods = request.data.get("modules") or {}
        if not isinstance(mods, dict) or not all(isinstance(v, bool) for v in mods.values()):
            return fail("Send modules as on/off switches.", errors={"modules": ["Use true or false."]})
        clean = {k: v for k, v in mods.items() if k in ADMIN_NOTIFY_MODULES}
        admin.notification_preferences = {"modules": clean, "email": bool(request.data.get("email", True))}
        admin.save(update_fields=["notification_preferences", "updated_at"])
        return ok(self._payload(admin), message="Notification preferences saved.")
