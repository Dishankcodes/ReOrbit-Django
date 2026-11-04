from django.core.cache import cache
from django.test import override_settings

from apps.core.testing import APIBase
from apps.remakers.models import ReMaker_Profile, ReMakers


@override_settings(OTP_RESEND_COOLDOWN_SECONDS=0)
class ReMakerAuthTests(APIBase):
    def _register(self, email="new@example.com", username="Studio Nova", full_name="Nova Rao"):
        r = self.post(
            "/api/remakers/auth/request-otp/",
            {"email": email, "purpose": "remaker_register", "full_name": full_name, "username": username},
        )
        self.assertEqual(r.status_code, 200, r.data)
        return self.post(
            "/api/remakers/auth/register/",
            {"email": email, "otp": self.last_otp(), "full_name": full_name, "username": username},
        )

    def test_register_flow(self):
        r = self._register()
        self.assertEqual(r.status_code, 201)
        data = r.data["data"]
        self.assertIn("access", data)
        self.assertRegex(data["remaker"]["public_id"], r"^RMK-\d+$")
        self.assertTrue(ReMaker_Profile.objects.filter(remaker__email="new@example.com").exists())

    def test_otp_cannot_be_reused_for_a_second_account(self):
        self._register()
        reuse = self.post(
            "/api/remakers/auth/register/",
            {"email": "other@example.com", "otp": self.last_otp(), "full_name": "X", "username": "Other One"},
        )
        self.assertEqual(reuse.status_code, 400)

    def test_duplicate_email_and_username_any_case(self):
        self.make_remaker(email="m@example.com", username="Maker One")
        r = self.post(
            "/api/remakers/auth/request-otp/",
            {"email": "M@example.com", "purpose": "remaker_register", "full_name": "A", "username": "Fresh Name"},
        )
        self.assertEqual(r.status_code, 409)
        r = self.post(
            "/api/remakers/auth/request-otp/",
            {"email": "z@example.com", "purpose": "remaker_register", "full_name": "A", "username": "maker one"},
        )
        self.assertEqual(r.status_code, 409)

    def test_bad_username_and_missing_fields(self):
        r = self.post(
            "/api/remakers/auth/request-otp/",
            {"email": "z@example.com", "purpose": "remaker_register", "full_name": "A", "username": "x"},
        )
        self.assertEqual(r.status_code, 400)
        r = self.post("/api/remakers/auth/request-otp/", {"email": "z@example.com", "purpose": "weird"})
        self.assertEqual(r.status_code, 400)

    def test_login_flow(self):
        self.make_remaker(email="m@example.com")
        r = self.post("/api/remakers/auth/request-otp/", {"email": "m@example.com", "purpose": "remaker_login"})
        self.assertEqual(r.status_code, 200)
        r = self.post(
            "/api/remakers/auth/login/verify-otp/", {"email": "m@example.com", "otp": self.last_otp()}
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.data["data"])
        # the code is used up
        again = self.post(
            "/api/remakers/auth/login/verify-otp/", {"email": "m@example.com", "otp": self.last_otp()}
        )
        self.assertEqual(again.status_code, 400)

    def test_login_for_unknown_email_is_404(self):
        r = self.post("/api/remakers/auth/request-otp/", {"email": "no@example.com", "purpose": "remaker_login"})
        self.assertEqual(r.status_code, 404)

    def test_five_wrong_codes_burn_the_login_code(self):
        self.make_remaker(email="m@example.com")
        self.post("/api/remakers/auth/request-otp/", {"email": "m@example.com", "purpose": "remaker_login"})
        right = self.last_otp()
        wrong = "000000" if right != "000000" else "111111"
        for _ in range(5):
            self.post("/api/remakers/auth/login/verify-otp/", {"email": "m@example.com", "otp": wrong})
        cache.clear()  # reset the 5-per-minute rate limit so this checks the burned code itself
        r = self.post("/api/remakers/auth/login/verify-otp/", {"email": "m@example.com", "otp": right})
        self.assertEqual(r.status_code, 400)

    def test_check_email(self):
        self.make_remaker(email="m@example.com")
        r = self.post("/api/remakers/auth/check-email/", {"email": "M@example.com"})
        self.assertTrue(r.data["data"]["exists"])
        r = self.post("/api/remakers/auth/check-email/", {"email": "x@example.com"})
        self.assertFalse(r.data["data"]["exists"])

    def test_blocked_remaker_cannot_request_a_login_code(self):
        self.make_remaker(email="m@example.com", status="Blocked")
        r = self.post("/api/remakers/auth/request-otp/", {"email": "m@example.com", "purpose": "remaker_login"})
        self.assertEqual(r.status_code, 403)


class ReMakerProfileTests(APIBase):
    def test_update_profile(self):
        remaker = self.make_remaker()
        r = self.patch(
            "/api/remakers/profile/",
            {"studio_name": "Nova Studio", "speciality": "Furniture", "social_links": {"instagram": "@nova"}},
            as_=remaker,
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["data"]["profile"]["studio_name"], "Nova Studio")

    def test_counters_and_ratings_are_read_only(self):
        remaker = self.make_remaker()
        self.patch(
            "/api/remakers/profile/",
            {"total_sales": 500, "rating_average": "5.00", "rating_count": 900, "remaker": 999},
            as_=remaker,
        )
        profile = ReMaker_Profile.objects.get(remaker=remaker)
        self.assertEqual(profile.total_sales, 0)
        self.assertEqual(float(profile.rating_average), 0)
        self.assertEqual(profile.rating_count, 0)
        self.assertEqual(profile.remaker_id, remaker.remaker_id)

    def test_wrong_role(self):
        self.assertEqual(self.get("/api/remakers/profile/", as_=self.make_user()).status_code, 403)
        self.assertEqual(self.get("/api/remakers/profile/", as_=self.make_admin()).status_code, 403)

    def test_suspended_remaker_is_read_only(self):
        remaker = self.make_remaker(status="Suspended")
        self.assertEqual(self.get("/api/remakers/profile/", as_=remaker).status_code, 200)
        self.assertEqual(self.patch("/api/remakers/profile/", {"bio": "x"}, as_=remaker).status_code, 403)
