from apps.admins.models import Admins
from apps.core.testing import APIBase
from apps.users.models import Users


class AdminAccountListTests(APIBase):
    def setUp(self):
        super().setUp()
        self.admin = self.make_admin(permission_level=Admins.PermissionLevel.SUPER_ADMIN)
        self.u1 = self.make_user("asha@example.com")
        self.u1.full_name = "Asha Rao"
        self.u1.save()
        self.u1.profile.city = "Surat"
        self.u1.profile.save()
        self.u2 = self.make_user("bhavin@example.com")
        self.u2.status = Users.Status.SUSPENDED
        self.u2.save()
        self.rm = self.make_remaker("maker@example.com", "Messy Mirror")

    def test_users_list(self):
        r = self.get("/api/users/admin/", as_=self.admin)
        self.assertEqual(r.status_code, 200, r.data)
        data = r.data["data"]
        self.assertEqual(data["count"], 2)
        row = data["results"][0]
        self.assertIn("public_id", row)
        self.assertIn("profile", row)
        self.assertNotIn("password", row)
        self.assertNotIn("user_id", row)

    def test_users_filters(self):
        r = self.get("/api/users/admin/?status=Suspended", as_=self.admin)
        self.assertEqual([x["email"] for x in r.data["data"]["results"]], ["bhavin@example.com"])
        r = self.get("/api/users/admin/?search=surat", as_=self.admin)
        self.assertEqual(r.data["data"]["count"], 1)
        r = self.get("/api/users/admin/?search=ASHA", as_=self.admin)
        self.assertEqual(r.data["data"]["count"], 1)
        r = self.get("/api/users/admin/?page_size=1&page=2", as_=self.admin)
        self.assertEqual(len(r.data["data"]["results"]), 1)
        self.assertEqual(r.data["data"]["total_pages"], 2)

    def test_user_detail(self):
        r = self.get(f"/api/users/admin/{self.u1.public_id}/", as_=self.admin)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["data"]["account"]["email"], "asha@example.com")
        self.assertEqual(self.get("/api/users/admin/USR-9999/", as_=self.admin).status_code, 404)

    def test_remakers_list(self):
        r = self.get("/api/remakers/admin/", as_=self.admin)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["data"]["count"], 1)
        self.assertEqual(r.data["data"]["results"][0]["username"], "Messy Mirror")
        r = self.get("/api/remakers/admin/?search=messy", as_=self.admin)
        self.assertEqual(r.data["data"]["count"], 1)

    def test_only_admins(self):
        self.assertEqual(self.get("/api/users/admin/").status_code, 401)
        self.assertEqual(self.get("/api/users/admin/", as_=self.u1).status_code, 403)
        self.assertEqual(self.get("/api/users/admin/", as_=self.rm).status_code, 403)
        self.assertEqual(self.get("/api/remakers/admin/", as_=self.u1).status_code, 403)

    def test_module_access(self):
        no_access = self.make_admin("na@example.com", modules={"orders": "edit"})
        self.assertEqual(self.get("/api/users/admin/", as_=no_access).status_code, 403)
        viewer = self.make_admin("v@example.com", modules={"users": "view"})
        self.assertEqual(self.get("/api/users/admin/", as_=viewer).status_code, 200)
        self.assertEqual(self.get("/api/remakers/admin/", as_=viewer).status_code, 403)
