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
        self.assertEqual(codes[0], 404)
