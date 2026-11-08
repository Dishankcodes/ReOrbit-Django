from apps.admins.models import Admins
from apps.core.models import AuditLog
from apps.core.testing import APIBase

SUPER = Admins.PermissionLevel.SUPER_ADMIN
BODY = {
    "full_name": "Kavya Menon",
    "email": "Kavya@Reorbit.in",
    "phone": "+91 98250 11122",
    "role_key": "warehouse",
    "note": "Morning shift",
    "modules": {"warehouse": "edit", "pickups": "edit", "orders": "view"},
}


class TeamTests(APIBase):
    def setUp(self):
        self.boss = self.make_admin("boss@example.com", permission_level=SUPER)

    def add(self, **over):
        return self.post("/api/admins/team/", {**BODY, **over}, as_=self.boss)

    def test_only_super_admin(self):
        plain = self.make_admin("plain@example.com", modules={"users": "edit"})
        self.assertEqual(self.get("/api/admins/team/", as_=plain).status_code, 403)
        self.assertEqual(self.post("/api/admins/team/", BODY, as_=plain).status_code, 403)
        self.assertEqual(self.get("/api/admins/team/").status_code, 401)
        self.assertEqual(self.get("/api/admins/team/", as_=self.make_user()).status_code, 403)

    def test_add_then_sign_in(self):
        r = self.add()
        self.assertEqual(r.status_code, 201, r.data)
        data = r.data["data"]
        member = data["member"]
        self.assertEqual(member["email"], "kavya@reorbit.in")
        self.assertEqual(member["permission_level"], "Admin")
        self.assertTrue(member["invited"])
        self.assertEqual(member["modules"]["dashboard"], "view")
        self.assertEqual(member["modules"]["warehouse"], "edit")
        self.assertEqual(member["modules"]["users"], "none")
        self.assertTrue(data["temporary_password"])
        # the new admin can sign in with it, and that accepts the invite
        login = self.client.post(
            "/api/admins/auth/login/",
            {"email": "kavya@reorbit.in", "password": data["temporary_password"]},
            format="json",
        )
        self.assertEqual(login.status_code, 200, login.data)
        row = Admins.objects.get(email="kavya@reorbit.in")
        self.assertIsNotNone(row.activated_at)
        self.assertEqual(row.created_by_id, self.boss.pk)
        self.assertTrue(AuditLog.objects.filter(action="admin.create").exists())

    def test_cannot_create_a_super_admin(self):
        r = self.add(permission_level="Super_Admin")
        self.assertEqual(r.data["data"]["member"]["permission_level"], "Admin")

    def test_validation(self):
        self.assertEqual(self.add(full_name="A").status_code, 400)
        self.assertEqual(self.add(email="nope").status_code, 400)
        self.assertEqual(self.add(phone="123").status_code, 400)
        self.assertEqual(self.add(modules={}).status_code, 400)
        self.assertEqual(self.add(modules={"dashboard": "view"}).status_code, 400)
        self.assertEqual(self.add(modules={"nonsense": "edit"}).status_code, 400)
        self.assertEqual(self.add(modules={"orders": "owner"}).status_code, 400)
        self.assertEqual(self.add(email="BOSS@example.com").status_code, 400)
        self.assertEqual(self.add().status_code, 201)
        self.assertEqual(self.add().status_code, 400)  # same email again

    def test_edit_access_takes_effect_immediately(self):
        member = self.add().data["data"]["member"]
        admin = Admins.objects.get(public_id=member["public_id"])
        self.assertEqual(self.get("/api/users/admin/", as_=admin).status_code, 403)
        r = self.patch(
            f"/api/admins/team/{admin.public_id}/",
            {"modules": {"users": "view"}, "role_key": "custom"},
            as_=self.boss,
        )
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(self.get("/api/users/admin/", as_=admin).status_code, 200)
        self.assertEqual(self.get("/api/remakers/admin/", as_=admin).status_code, 403)
        # a partial patch leaves the rest alone
        r = self.patch(f"/api/admins/team/{admin.public_id}/", {"note": "Night"}, as_=self.boss)
        admin.refresh_from_db()
        self.assertEqual(admin.note, "Night")
        self.assertEqual(admin.modules["users"], "view")

    def test_block_and_unblock(self):
        member = self.add().data["data"]["member"]
        admin = Admins.objects.get(public_id=member["public_id"])
        url = f"/api/admins/team/{admin.public_id}/status/"
        self.assertEqual(self.post(url, {"status": "Blocked"}, as_=self.boss).status_code, 200)
        # blocked: token refused and cannot log in
        self.assertIn(self.get("/api/admins/me/", as_=admin).status_code, (401, 403))
        login = self.client.post(
            "/api/admins/auth/login/",
            {"email": admin.email, "password": "whatever"},
            format="json",
        )
        self.assertIn(login.status_code, (401, 403))
        self.assertEqual(self.post(url, {"status": "Active"}, as_=self.boss).status_code, 200)
        self.assertEqual(self.get("/api/admins/me/", as_=admin).status_code, 200)
        self.assertEqual(self.post(url, {"status": "Weird"}, as_=self.boss).status_code, 400)

    def test_super_admins_are_protected(self):
        other = self.make_admin("boss2@example.com", permission_level=SUPER)
        for method, url, body in (
            ("patch", f"/api/admins/team/{other.public_id}/", {"note": "x"}),
            ("post", f"/api/admins/team/{other.public_id}/status/", {"status": "Blocked"}),
            ("post", f"/api/admins/team/{other.public_id}/reset-password/", {}),
            ("delete", f"/api/admins/team/{other.public_id}/", None),
            ("post", f"/api/admins/team/{self.boss.public_id}/status/", {"status": "Blocked"}),
            ("delete", f"/api/admins/team/{self.boss.public_id}/", None),
        ):
            args = (url,) if method == "delete" else (url, body)
            r = getattr(self, method)(*args, as_=self.boss)
            self.assertEqual(r.status_code, 403, (method, url, r.data))
        self.assertEqual(Admins.objects.filter(permission_level=SUPER).count(), 2)

    def test_reset_password_and_remove(self):
        member = self.add().data["data"]["member"]
        pid = member["public_id"]
        r = self.post(f"/api/admins/team/{pid}/reset-password/", {}, as_=self.boss)
        self.assertEqual(r.status_code, 200)
        new = r.data["data"]["temporary_password"]
        self.assertEqual(
            self.client.post(
                "/api/admins/auth/login/",
                {"email": "kavya@reorbit.in", "password": new},
                format="json",
            ).status_code,
            200,
        )
        self.assertEqual(self.delete(f"/api/admins/team/{pid}/", as_=self.boss).status_code, 200)
        self.assertFalse(Admins.objects.filter(public_id=pid).exists())
        self.assertEqual(self.delete(f"/api/admins/team/{pid}/", as_=self.boss).status_code, 404)

    def test_list_and_activity(self):
        self.add()
        rows = self.get("/api/admins/team/", as_=self.boss).data["data"]["members"]
        self.assertEqual([m["email"] for m in rows], ["boss@example.com", "kavya@reorbit.in"])
        self.assertNotIn("password", rows[0])
        log = self.get("/api/admins/team/activity/", as_=self.boss).data["data"]["activity"]
        self.assertEqual(log[0]["what"], "Added Kavya Menon")
        self.assertEqual(log[0]["who"], "Test Admin")
