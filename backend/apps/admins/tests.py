from django.core.management import call_command

from apps.admins.models import Admins
from apps.core.testing import STRONG_PASSWORD, APIBase


class AdminLoginTests(APIBase):
    def test_login_success(self):
        self.make_admin(email="a@example.com", modules={"orders": "edit"})
        r = self.post("/api/admins/auth/login/", {"email": "A@example.com", "password": STRONG_PASSWORD})
        self.assertEqual(r.status_code, 200)
        data = r.data["data"]
        self.assertIn("access", data)
        self.assertRegex(data["admin"]["public_id"], r"^ADM-\d+$")
        self.assertEqual(data["admin"]["modules"]["orders"], "edit")
        self.assertNotIn("password", data["admin"])

    def test_bad_password_and_blocked(self):
        self.make_admin(email="a@example.com")
        r = self.post("/api/admins/auth/login/", {"email": "a@example.com", "password": "wrong"})
        self.assertEqual(r.status_code, 401)
        self.make_admin(email="b@example.com", status="Blocked")
        r = self.post("/api/admins/auth/login/", {"email": "b@example.com", "password": STRONG_PASSWORD})
        self.assertEqual(r.status_code, 403)

    def test_user_token_cannot_reach_admin_endpoint(self):
        self.assertEqual(self.get("/api/admins/me/", as_=self.make_user()).status_code, 403)


class CreateAdminCommandTests(APIBase):
    def test_creates_super_admin(self):
        call_command(
            "create_admin", "--name", "Root", "--email", "Root@Example.com",
            "--password", STRONG_PASSWORD, "--permission-level", "Super_Admin",
        )
        admin = Admins.objects.get()
        self.assertEqual(admin.email, "root@example.com")
        self.assertTrue(admin.public_id.startswith("ADM-"))
        self.assertTrue(admin.has_module("settings", "edit"))
