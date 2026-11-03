from django.core import mail
from django.test import override_settings

from apps.accounts.models import OTP_Verification
from apps.core.testing import STRONG_PASSWORD, APIBase
from apps.users.models import User_Profile, Users


class UserRegisterTests(APIBase):
    def test_register_success(self):
        r = self.post(
            "/api/users/auth/register/",
            {"full_name": "Asha Rao", "email": "Asha@Example.com", "password": STRONG_PASSWORD},
        )
        self.assertEqual(r.status_code, 201)
        self.assertEnvelope(r)
        data = r.data["data"]
        self.assertIn("access", data)
        self.assertIn("refresh", data)
        self.assertRegex(data["user"]["public_id"], r"^USR-\d+$")
        self.assertNotIn("user_id", data["user"])  # raw ids are never exposed
        self.assertNotIn("password", data["user"])
        user = Users.objects.get()
        self.assertEqual(user.email, "asha@example.com")  # stored lower-case
        self.assertTrue(User_Profile.objects.filter(user=user).exists())
        self.assertTrue(user.password.startswith(("pbkdf2_", "argon2", "bcrypt", "scrypt")))

    def test_any_non_empty_password_is_accepted(self):
        r = self.post(
            "/api/users/auth/register/",
            {"full_name": "Asha", "email": "a@example.com", "password": "123"},
        )
        self.assertEqual(r.status_code, 201)

    def test_validation(self):
        base = {"full_name": "Asha", "email": "a@example.com", "password": STRONG_PASSWORD}
        for key in ("full_name", "email", "password"):
            payload = {k: v for k, v in base.items() if k != key}
            self.assertEqual(self.post("/api/users/auth/register/", payload).status_code, 400, key)
        bad = dict(base, email="not-an-email")
        self.assertEqual(self.post("/api/users/auth/register/", bad).status_code, 400)

    def test_duplicate_email_any_case_is_409(self):
        self.make_user(email="dup@example.com")
        r = self.post(
            "/api/users/auth/register/",
            {"full_name": "Dup", "email": "DUP@example.com", "password": STRONG_PASSWORD},
        )
        self.assertEqual(r.status_code, 409)


class EmailUniqueAcrossRolesTests(APIBase):
    def test_user_cannot_register_with_a_remaker_email(self):
        self.make_remaker(email="shared@example.com")
        r = self.post(
            "/api/users/auth/register/",
            {"full_name": "A", "email": "shared@example.com", "password": "x"},
        )
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.data["code"], "EMAIL_USED_BY_REMAKER")

    def test_remaker_cannot_register_with_a_user_email(self):
        self.make_user(email="shared@example.com")
        r = self.post(
            "/api/remakers/auth/request-otp/",
            {"email": "shared@example.com", "purpose": "remaker_register", "full_name": "A", "username": "Fresh Name"},
        )
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.data["code"], "EMAIL_USED_BY_USER")


class UserLoginTests(APIBase):
    def test_login_success(self):
        self.make_user(email="u@example.com")
        r = self.post("/api/users/auth/login/", {"email": "U@example.com", "password": STRONG_PASSWORD})
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.data["data"])
        self.assertTrue(Users.objects.get().last_login_at)

    def test_wrong_password_and_unknown_email(self):
        self.make_user(email="u@example.com")
        r = self.post("/api/users/auth/login/", {"email": "u@example.com", "password": "nope"})
        self.assertEqual(r.status_code, 401)
        r = self.post("/api/users/auth/login/", {"email": "x@example.com", "password": "nope"})
        self.assertEqual(r.status_code, 404)

    def test_google_account_without_password_cannot_use_password_login(self):
        user = Users(full_name="G", email="g@example.com", auth_provider="google", google_id="g-1")
        user.password = None
        user.save()
        r = self.post("/api/users/auth/login/", {"email": "g@example.com", "password": "anything"})
        self.assertEqual(r.status_code, 401)

    def test_suspended_and_blocked_can_sign_in_to_see_their_status(self):
        for status in ("Suspended", "Blocked"):
            self.make_user(email=f"{status}@example.com", status=status)
            r = self.post(
                "/api/users/auth/login/",
                {"email": f"{status}@example.com", "password": STRONG_PASSWORD},
            )
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.data["data"]["user"]["status"], status)


@override_settings(OTP_RESEND_COOLDOWN_SECONDS=0)
class ForgotPasswordTests(APIBase):
    def _reset_token(self, email="u@example.com"):
        self.post("/api/users/auth/forgot-password/request-otp/", {"email": email})
        r = self.post(
            "/api/users/auth/forgot-password/verify-otp/", {"email": email, "otp": self.last_otp()}
        )
        self.assertEqual(r.status_code, 200)
        return r.data["data"]["reset_token"]

    def test_full_flow_and_token_is_single_use(self):
        user = self.make_user(email="u@example.com")
        token = self._reset_token()
        new_password = "Brand-New-4821!"
        r = self.post(
            "/api/users/auth/forgot-password/reset/",
            {"reset_token": token, "new_password": new_password},
        )
        self.assertEqual(r.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password(new_password))
        again = self.post(
            "/api/users/auth/forgot-password/reset/",
            {"reset_token": token, "new_password": "Another-Pass-9921!"},
        )
        self.assertEqual(again.status_code, 400)

    def test_unknown_email_and_bad_code(self):
        r = self.post("/api/users/auth/forgot-password/request-otp/", {"email": "none@example.com"})
        self.assertEqual(r.status_code, 404)
        self.make_user(email="u@example.com")
        self.post("/api/users/auth/forgot-password/request-otp/", {"email": "u@example.com"})
        right = self.last_otp()
        wrong = "000000" if right != "000000" else "111111"
        r = self.post(
            "/api/users/auth/forgot-password/verify-otp/", {"email": "u@example.com", "otp": wrong}
        )
        self.assertEqual(r.status_code, 400)

    def test_blocked_user_cannot_request_reset(self):
        self.make_user(email="b@example.com", status="Blocked")
        r = self.post("/api/users/auth/forgot-password/request-otp/", {"email": "b@example.com"})
        self.assertEqual(r.status_code, 403)
        self.assertEqual(len(mail.outbox), 0)

    @override_settings(OTP_RESEND_COOLDOWN_SECONDS=60)
    def test_second_request_inside_cooldown_is_429(self):
        self.make_user(email="u@example.com")
        self.post("/api/users/auth/forgot-password/request-otp/", {"email": "u@example.com"})
        r = self.post("/api/users/auth/forgot-password/request-otp/", {"email": "u@example.com"})
        self.assertEqual(r.status_code, 429)
        self.assertEqual(r.data["code"], "OTP_COOLDOWN")


class UserProfileTests(APIBase):
    def test_get_and_update(self):
        user = self.make_user()
        r = self.patch("/api/users/profile/", {"city": "Pune", "bio": "Hi", "pincode": "411001"}, as_=user)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["data"]["profile"]["city"], "Pune")

    def test_counters_cannot_be_written_by_the_browser(self):
        user = self.make_user()
        self.patch(
            "/api/users/profile/",
            {"total_sales": 999, "orbit_points": 99999, "environmental_impact": "500", "total_uploads": 50},
            as_=user,
        )
        profile = User_Profile.objects.get(user=user)
        self.assertEqual(profile.total_sales, 0)
        self.assertEqual(profile.orbit_points, 0)
        self.assertEqual(profile.total_uploads, 0)
        self.assertEqual(float(profile.environmental_impact), 0)

    def test_bad_pincode_is_a_validation_error(self):
        user = self.make_user()
        r = self.patch("/api/users/profile/", {"pincode": "12"}, as_=user)
        self.assertEqual(r.status_code, 400)
        self.assertIn("pincode", r.data["errors"])

    def test_wrong_role_cannot_use_user_profile(self):
        self.assertEqual(self.get("/api/users/profile/", as_=self.make_remaker()).status_code, 403)

    def test_public_id_is_unique_and_sequential(self):
        a, b = self.make_user("a@example.com"), self.make_user("b@example.com")
        self.assertNotEqual(a.public_id, b.public_id)
        self.assertEqual(int(b.public_id.split("-")[1]), int(a.public_id.split("-")[1]) + 1)
