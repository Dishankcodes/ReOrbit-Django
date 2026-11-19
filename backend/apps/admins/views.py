from django.utils import timezone
from rest_framework.views import APIView

from apps.accounts import login_guard
from apps.accounts.helpers import password_problem as shared_password_problem
from apps.accounts.permissions import IsReOrbitAdmin
from apps.accounts.sessions import end_all_sessions
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
        if not email or not password:
            return fail("Enter your email and password.")
        try:
            login_guard.check("admin", email)
        except login_guard.Locked as exc:
            return login_guard.locked_response(exc)
        admin = Admins.objects.filter(email__iexact=email).first()
        if admin is None:
            login_guard.burn_time(password)
        if not admin or not admin.check_password(password):
            # 5 wrong tries pause this email: 5 minutes, then 15, then 1 hour (the admin is emailed)
            try:
                left = login_guard.failed("admin", email, account=admin, ip=request.META.get("REMOTE_ADDR"))
            except login_guard.Locked as exc:
                return login_guard.locked_response(exc)
            return fail(login_guard.WRONG + login_guard.tries_hint(left), status=401, code="INVALID_CREDENTIALS")
        login_guard.succeeded("admin", email)
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

    password_change_allowed = True  # reachable with a temporary password
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
    password_change_allowed = True  # the one thing an admin with a temporary password must do

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
        if (msg := password_problem(new, admin)):
            return fail(msg, errors={"new_password": [msg]})
        admin.set_password(new)
        admin.must_change_password = False
        admin.save(update_fields=["password", "must_change_password", "updated_at"])
        # other browsers are signed out; this one gets fresh tokens and stays in
        tokens = end_all_sessions(admin, keep="admin")
        security_notice(admin, "Your admin password was changed")
        return ok(tokens, "Password updated. Other devices were signed out and we emailed you a confirmation.")


def password_problem(pw, admin=None):
    """Admins: the member rules (8+ characters, not common, not like the email or name) plus at
    least one letter and one number."""
    pw = pw or ""
    if len(pw) < 8 or not any(c.isalpha() for c in pw) or not any(c.isdigit() for c in pw):
        return "Use at least 8 characters with letters and a number."
    return shared_password_problem(pw, admin)


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
        if (msg := password_problem(new, Admins(email=email))):
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
            admin.must_change_password = False
            admin.save(update_fields=["password", "must_change_password", "updated_at"])
            consume_otp(record)
        end_all_sessions(admin)  # every browser signed in before is signed out
        login_guard.clear("admin", admin.email)  # and a sign-in pause is lifted
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


class LoginLocksView(APIView):
    """GET /api/admins/security/locks/ : emails whose sign-in is paused after 5 wrong attempts.
    DELETE /api/admins/security/locks/<id>/ : lift a pause (the person can sign in again at once).

    Member and ReMaker pauses need the Users / ReMakers area; admin pauses only the super admin."""

    permission_classes = [IsReOrbitAdmin]

    def _visible(self, admin):
        from apps.accounts.models import LoginGuard

        roles = []
        if admin.has_module("users", "view"):
            roles.append(LoginGuard.Role.USER)
        if admin.has_module("remakers", "view"):
            roles.append(LoginGuard.Role.REMAKER)
        if admin.permission_level == Admins.PermissionLevel.SUPER_ADMIN:
            roles.append(LoginGuard.Role.ADMIN)
        return LoginGuard.objects.filter(role__in=roles)

    def get(self, request):
        now = timezone.now()
        rows = self._visible(request.user.account).filter(locked_until__gt=now).order_by("-locked_until")[:200]
        return ok({"locks": [
            {
                "id": r.pk,
                "role": r.role,
                "email": r.email,
                "locked_until": r.locked_until,
                "seconds_left": max(0, int((r.locked_until - now).total_seconds())),
                "times_locked": r.locks,
                "last_ip": r.last_ip,
            }
            for r in rows
        ]})

    def delete(self, request, pk):
        from apps.core.services import audit

        admin = request.user.account
        row = self._visible(admin).filter(pk=pk).first()
        if row is None:
            return fail("Not found.", status=404)
        needed = {"user": "users", "remaker": "remakers"}.get(row.role)
        if needed and not admin.has_module(needed, "edit"):
            return fail("You need edit access to this area to lift a pause.", status=403)
        audit(admin, "security.unlock_sign_in", "account", f"{row.role}:{row.email}",
              ip=request.META.get("REMOTE_ADDR"))
        row.delete()
        return ok(message=f"{row.email} can sign in again.")
