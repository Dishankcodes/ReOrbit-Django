from datetime import timedelta
from unittest import mock

from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework.throttling import SimpleRateThrottle

from apps.accounts.models import OTP_Verification
from apps.accounts.otp import MAX_ATTEMPTS, create_and_send_otp, generate_otp, verify_otp
from apps.accounts.permissions import HasAdminModule
from apps.core.testing import APIBase
from apps.users.models import Users

P = OTP_Verification.Purpose


@override_settings(OTP_RESEND_COOLDOWN_SECONDS=0)
class OTPTests(APIBase):
    def test_code_is_six_digits_and_hash_is_stored(self):
        self.assertRegex(generate_otp(), r"^\d{6}$")
        create_and_send_otp("a@example.com", P.USER_FORGOT_PASSWORD, "user")
        record = OTP_Verification.objects.get()
        self.assertNotIn(self.last_otp(), record.otp_hash)  # raw code never stored
        self.assertTrue(record.otp_hash.startswith("bcrypt_sha256$"))

    def test_correct_code_verifies_once(self):
        create_and_send_otp("a@example.com", P.USER_FORGOT_PASSWORD, "user")
        record, error = verify_otp("a@example.com", self.last_otp(), P.USER_FORGOT_PASSWORD)
        self.assertIsNone(error)
        self.assertTrue(record.is_verified)
        # A verified code cannot be verified again.
        again, error = verify_otp("a@example.com", self.last_otp(), P.USER_FORGOT_PASSWORD)
        self.assertIsNone(again)
        self.assertTrue(error)

    def test_five_wrong_attempts_burn_the_code(self):
        create_and_send_otp("a@example.com", P.USER_FORGOT_PASSWORD, "user")
        right = self.last_otp()
        wrong = "000000" if right != "000000" else "111111"
        for _ in range(MAX_ATTEMPTS):
            record, error = verify_otp("a@example.com", wrong, P.USER_FORGOT_PASSWORD)
            self.assertIsNone(record)
        # Even the right code no longer works.
        record, error = verify_otp("a@example.com", right, P.USER_FORGOT_PASSWORD)
        self.assertIsNone(record)
        self.assertTrue(OTP_Verification.objects.get().consumed_at)

    def test_expired_code_is_refused(self):
        create_and_send_otp("a@example.com", P.USER_FORGOT_PASSWORD, "user")
        OTP_Verification.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        record, error = verify_otp("a@example.com", self.last_otp(), P.USER_FORGOT_PASSWORD)
        self.assertIsNone(record)
        self.assertIn("expired", error.lower())

    def test_new_code_replaces_the_old_one(self):
        create_and_send_otp("a@example.com", P.USER_FORGOT_PASSWORD, "user")
        old = self.last_otp()
        create_and_send_otp("a@example.com", P.USER_FORGOT_PASSWORD, "user")
        new = self.last_otp()
        if old != new:
            record, _ = verify_otp("a@example.com", old, P.USER_FORGOT_PASSWORD)
            self.assertIsNone(record)

    @override_settings(OTP_RESEND_COOLDOWN_SECONDS=60)
    def test_resend_cooldown(self):
        create_and_send_otp("a@example.com", P.USER_FORGOT_PASSWORD, "user")
        from apps.accounts.otp import OTPCooldown

        with self.assertRaises(OTPCooldown):
            create_and_send_otp("a@example.com", P.USER_FORGOT_PASSWORD, "user")
        self.assertEqual(len(mail.outbox), 1)


class TokenAndStatusTests(APIBase):
    def test_not_signed_in_is_401(self):
        r = self.get("/api/users/me/")
        self.assertEqual(r.status_code, 401)
        self.assertEnvelope(r, success=False)

    def test_garbage_token_is_401(self):
        r = self.client.get("/api/users/me/", HTTP_AUTHORIZATION="Bearer nonsense")
        self.assertEqual(r.status_code, 401)

    # ---- wrong role ---------------------------------------------------- #
    def test_wrong_role_is_403(self):
        user, remaker, admin = self.make_user(), self.make_remaker(), self.make_admin()
        self.assertEqual(self.get("/api/users/me/", as_=remaker).status_code, 403)
        self.assertEqual(self.get("/api/users/me/", as_=admin).status_code, 403)
        self.assertEqual(self.get("/api/remakers/me/", as_=user).status_code, 403)
        self.assertEqual(self.get("/api/remakers/me/", as_=admin).status_code, 403)
        self.assertEqual(self.get("/api/admins/me/", as_=user).status_code, 403)
        self.assertEqual(self.get("/api/admins/me/", as_=remaker).status_code, 403)

    def test_right_role_is_200(self):
        self.assertEqual(self.get("/api/users/me/", as_=self.make_user()).status_code, 200)
        self.assertEqual(self.get("/api/remakers/me/", as_=self.make_remaker()).status_code, 200)
        self.assertEqual(self.get("/api/admins/me/", as_=self.make_admin()).status_code, 200)

    def test_token_for_deleted_row_is_401(self):
        user = self.make_user()
        token = self.token_for(user)
        user.delete()
        r = self.client.get("/api/users/me/", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(r.status_code, 401)

    # ---- status rules -------------------------------------------------- #
    def test_suspended_is_read_only(self):
        user = self.make_user(status=Users.Status.SUSPENDED)
        self.assertEqual(self.get("/api/users/profile/", as_=user).status_code, 200)
        r = self.patch("/api/users/profile/", {"bio": "hello"}, as_=user)
        self.assertEqual(r.status_code, 403)
        self.assertEnvelope(r, success=False)

    def test_blocked_and_deleted_only_reach_support_endpoints(self):
        for status in (Users.Status.BLOCKED, Users.Status.DELETED):
            user = self.make_user(email=f"{status}@example.com", status=status)
            me = self.get("/api/users/me/", as_=user)
            self.assertEqual(me.status_code, 200)
            self.assertEqual(me.data["data"]["user"]["status"], status)
            self.assertEqual(self.get("/api/users/profile/", as_=user).status_code, 403)

    def test_blocked_remaker_only_reaches_me(self):
        remaker = self.make_remaker(status="Blocked")
        self.assertEqual(self.get("/api/remakers/me/", as_=remaker).status_code, 200)
        self.assertEqual(self.get("/api/remakers/profile/", as_=remaker).status_code, 403)

    def test_blocked_admin_is_refused(self):
        admin = self.make_admin(status="Blocked")
        self.assertEqual(self.get("/api/admins/me/", as_=admin).status_code, 401)

    # ---- refresh / logout --------------------------------------------- #
    def test_refresh_rotates_and_old_token_dies(self):
        from apps.accounts.tokens import create_token_pair

        user = self.make_user()
        pair = create_token_pair("user", user.user_id)
        first = self.post("/api/auth/token/refresh/", {"refresh": pair["refresh"]})
        self.assertEqual(first.status_code, 200)
        self.assertIn("access", first.data["data"])
        second = self.post("/api/auth/token/refresh/", {"refresh": pair["refresh"]})
        self.assertEqual(second.status_code, 401)

    def test_logout_blacklists_refresh(self):
        from apps.accounts.tokens import create_token_pair

        user = self.make_user()
        pair = create_token_pair("user", user.user_id)
        r = self.post("/api/auth/logout/", {"refresh": pair["refresh"]}, as_=user)
        self.assertEqual(r.status_code, 200)
        again = self.post("/api/auth/token/refresh/", {"refresh": pair["refresh"]})
        self.assertEqual(again.status_code, 401)

    def test_blocked_member_can_log_out(self):
        user = self.make_user(status=Users.Status.BLOCKED)
        self.assertEqual(self.post("/api/auth/logout/", {}, as_=user).status_code, 200)


class AdminModuleTests(APIBase):
    def test_levels(self):
        admin = self.make_admin(modules={"orders": "edit", "users": "view"})
        self.assertTrue(admin.has_module("orders", "edit"))
        self.assertTrue(admin.has_module("users", "view"))
        self.assertFalse(admin.has_module("users", "edit"))
        self.assertFalse(admin.has_module("rewards", "view"))

    def test_super_admin_has_everything(self):
        sa = self.make_admin(email="sa@example.com", permission_level="Super_Admin")
        self.assertTrue(sa.has_module("settings", "edit"))
        self.assertEqual(set(sa.effective_modules().values()), {"edit"})

    def test_permission_class_follows_method(self):
        from rest_framework.test import APIRequestFactory

        admin = self.make_admin(modules={"orders": "view"})
        perm_cls = HasAdminModule("orders")
        factory = APIRequestFactory()

        class Principal:
            account_type = "admin"
            account = admin

        get_req = factory.get("/x")
        get_req.user = Principal()
        post_req = factory.post("/x")
        post_req.user = Principal()
        self.assertTrue(perm_cls().has_permission(get_req, None))
        self.assertFalse(perm_cls().has_permission(post_req, None))

    def test_permission_class_refuses_non_admin(self):
        from rest_framework.test import APIRequestFactory

        class Principal:
            account_type = "user"

        req = APIRequestFactory().get("/x")
        req.user = Principal()
        self.assertFalse(HasAdminModule("orders")().has_permission(req, None))

    def test_admin_me_lists_modules(self):
        admin = self.make_admin(modules={"orders": "edit"})
        r = self.get("/api/admins/me/", as_=admin)
        self.assertEqual(r.data["data"]["admin"]["modules"]["orders"], "edit")
        self.assertEqual(r.data["data"]["admin"]["modules"]["users"], "none")


class ThrottleTests(APIBase):
    def test_login_is_throttled(self):
        rates = dict(SimpleRateThrottle.THROTTLE_RATES, auth="3/min")
        with mock.patch.object(SimpleRateThrottle, "THROTTLE_RATES", rates):
            codes = [
                self.post("/api/users/auth/login/", {"email": "nobody@example.com", "password": "x"}).status_code
                for _ in range(5)
            ]
        self.assertIn(429, codes)
        self.assertEqual(codes[0], 401)  # "Email or password is incorrect", same as a wrong password

    def test_changing_x_forwarded_for_does_not_dodge_the_limit(self):
        rates = dict(SimpleRateThrottle.THROTTLE_RATES, auth="3/min")
        with mock.patch.object(SimpleRateThrottle, "THROTTLE_RATES", rates):
            codes = [
                self.post("/api/users/auth/login/", {"email": f"n{i}@example.com", "password": "x"},
                          HTTP_X_FORWARDED_FOR=f"10.0.0.{i}").status_code
                for i in range(6)
            ]
        self.assertIn(429, codes)


@override_settings(OTP_RESEND_COOLDOWN_SECONDS=0)
class OTPRateLimitTests(APIBase):
    """5 attempts per minute, per email, for every code endpoint."""

    def test_forgot_password_send_and_resend_limited_to_5_per_minute(self):
        self.make_user(email="u@example.com")
        url = "/api/users/auth/forgot-password/request-otp/"
        codes = [self.post(url, {"email": "u@example.com"}).status_code for _ in range(6)]
        self.assertEqual(codes[:5], [200] * 5)
        self.assertEqual(codes[5], 429)
        self.assertEqual(len(mail.outbox), 5)
        last = self.post(url, {"email": "u@example.com"})
        self.assertIn("try again in", last.data["message"])
        self.assertEqual(last.data["code"], "RATE_LIMITED")

    def test_limit_is_per_email(self):
        self.make_user(email="a@example.com")
        self.make_user(email="b@example.com")
        url = "/api/users/auth/forgot-password/request-otp/"
        for _ in range(5):
            self.post(url, {"email": "a@example.com"})
        self.assertEqual(self.post(url, {"email": "a@example.com"}).status_code, 429)
        self.assertEqual(self.post(url, {"email": "b@example.com"}).status_code, 200)

    def test_forgot_password_verify_limited(self):
        self.make_user(email="u@example.com")
        self.post("/api/users/auth/forgot-password/request-otp/", {"email": "u@example.com"})
        right = self.last_otp()
        wrong = "000000" if right != "000000" else "111111"
        url = "/api/users/auth/forgot-password/verify-otp/"
        for _ in range(5):
            self.post(url, {"email": "u@example.com", "otp": wrong})
        r = self.post(url, {"email": "u@example.com", "otp": right})
        self.assertEqual(r.status_code, 429)

    def test_remaker_login_and_register_codes_limited(self):
        self.make_remaker(email="m@example.com")
        url = "/api/remakers/auth/request-otp/"
        body = {"email": "m@example.com", "purpose": "remaker_login"}
        codes = [self.post(url, body).status_code for _ in range(6)]
        self.assertEqual(codes[5], 429)
        reg = {"email": "new@example.com", "purpose": "remaker_register", "full_name": "N", "username": "New One"}
        codes = [self.post(url, reg).status_code for _ in range(6)]
        self.assertEqual(codes[:5], [200] * 5)
        self.assertEqual(codes[5], 429)

    def test_remaker_verify_limited(self):
        self.make_remaker(email="m@example.com")
        wrong = {"email": "m@example.com", "otp": "123456"}
        for _ in range(5):
            self.post("/api/remakers/auth/login/verify-otp/", wrong)
        self.assertEqual(self.post("/api/remakers/auth/login/verify-otp/", wrong).status_code, 429)

    def test_configured_rates_are_5_per_minute(self):
        from django.conf import settings

        self.assertEqual(settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["otp_send"], "5/min")
        self.assertEqual(settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["otp_verify"], "5/min")


class RealClientIPTests(APIBase):
    """apps/core/client_ip.py: the visitor's address can't be faked with X-Forwarded-For."""

    def _ip(self, **meta):
        from django.test import RequestFactory

        from apps.core.client_ip import RealClientIPMiddleware

        seen = {}
        mw = RealClientIPMiddleware(lambda req: seen.setdefault("ip", req.META["REMOTE_ADDR"]))
        mw(RequestFactory().get("/", **meta))
        return seen["ip"]

    def test_local_development_uses_the_socket_address(self):
        self.assertEqual(self._ip(REMOTE_ADDR="127.0.0.1", HTTP_X_FORWARDED_FOR="6.6.6.6"), "127.0.0.1")

    @override_settings(TRUSTED_IP_HEADERS=["HTTP_CF_CONNECTING_IP"], TRUSTED_PROXY_COUNT=2)
    def test_production_trusts_the_edge_header_then_counts_from_the_right(self):
        self.assertEqual(self._ip(REMOTE_ADDR="10.0.0.9", HTTP_CF_CONNECTING_IP="203.0.113.7",
                                  HTTP_X_FORWARDED_FOR="6.6.6.6, 203.0.113.7, 172.68.1.1"), "203.0.113.7")
        # no edge header: "<faked>, <real visitor>, <cloudflare>" -> the real visitor, never the faked one
        self.assertEqual(self._ip(REMOTE_ADDR="10.0.0.9", HTTP_X_FORWARDED_FOR="6.6.6.6, 198.51.100.4, 172.68.1.1"),
                         "198.51.100.4")
        # rubbish in the header is ignored
        self.assertEqual(self._ip(REMOTE_ADDR="10.0.0.9", HTTP_CF_CONNECTING_IP="<script>"), "10.0.0.9")


class AdminLoginLockTests(APIBase):
    def test_admin_pause_and_super_admin_can_lift_it(self):
        from apps.accounts.models import LoginGuard
        from apps.core.testing import STRONG_PASSWORD

        admin = self.make_admin(email="ops@example.com")
        boss = self.make_admin(email="boss@example.com", permission_level="Super_Admin")
        for _ in range(5):
            r = self.post("/api/admins/auth/login/", {"email": "ops@example.com", "password": "nope"})
        self.assertEqual((r.status_code, r.data["code"]), (429, "LOGIN_LOCKED"))
        self.assertEqual(self.post("/api/admins/auth/login/",
                                   {"email": "ops@example.com", "password": STRONG_PASSWORD}).status_code, 429)
        # an ordinary admin doesn't see admin pauses; the super admin does
        self.assertEqual(self.get("/api/admins/security/locks/", as_=admin).data["data"]["locks"], [])
        locks = self.get("/api/admins/security/locks/", as_=boss).data["data"]["locks"]
        self.assertEqual([x["email"] for x in locks], ["ops@example.com"])
        self.assertEqual(self.delete(f"/api/admins/security/locks/{locks[0]['id']}/", as_=boss).status_code, 200)
        self.assertFalse(LoginGuard.objects.exists())
        self.assertEqual(self.post("/api/admins/auth/login/",
                                   {"email": "ops@example.com", "password": STRONG_PASSWORD}).status_code, 200)


class ImageFormatTests(APIBase):
    def _upload(self, fmt):
        import io

        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        from apps.core.validators import validate_image

        buf = io.BytesIO()
        Image.new("RGB", (20, 20), "green").save(buf, format=fmt)
        f = SimpleUploadedFile(f"photo.{fmt.lower()}", buf.getvalue())
        validate_image(f)

    def test_jpg_png_webp_are_accepted_and_other_formats_never_parsed(self):
        from django.core.exceptions import ValidationError

        for fmt in ("JPEG", "PNG", "WEBP"):
            self._upload(fmt)  # no error
        for fmt in ("TIFF", "BMP", "GIF"):
            with self.assertRaises(ValidationError, msg=fmt):
                self._upload(fmt)
