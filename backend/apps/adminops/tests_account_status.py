from apps.core.models import Notification
from apps.core.testing import APIBase

URL = "/api/adminops/admin/accounts/{}/status/"


class AccountStatusTests(APIBase):
    def setUp(self):
        super().setUp()
        self.boss = self.make_admin("boss@example.com", modules={"users": "edit", "remakers": "edit"})
        self.viewer = self.make_admin("view@example.com", modules={"users": "view"})
        self.member = self.make_user("m@example.com")
        self.maker = self.make_remaker()

    def test_suspend_is_saved_and_member_becomes_view_only(self):
        u = URL.format(self.member.public_id)
        self.assertEqual(self.post(u, {"status": "Suspended", "reason": "Spam"}, as_=self.viewer).status_code, 403)
        self.assertEqual(self.post(u, {"status": "Suspended"}, as_=self.boss).status_code, 400)  # reason needed
        r = self.post(u, {"status": "Suspended", "reason": "Repeated spam listings"}, as_=self.boss)
        self.assertEqual(r.status_code, 200, r.data)
        self.member.refresh_from_db()
        self.assertEqual((self.member.status, self.member.status_reason), ("Suspended", "Repeated spam listings"))
        self.assertTrue(Notification.objects.filter(user=self.member).exists())
        me = self.get("/api/users/me/", as_=self.member).data["data"]["user"]
        self.assertEqual((me["status"], me["status_reason"]), ("Suspended", "Repeated spam listings"))
        # can look, can't change: the refusal says why
        w = self.post("/api/orders/addresses/", {"label": "Home"}, as_=self.member)
        self.assertEqual((w.status_code, w.data["code"]), (403, "ACCOUNT_SUSPENDED"))

    def test_block_and_reactivate_a_remaker(self):
        u = URL.format(self.maker.public_id)
        self.assertEqual(self.post(u, {"status": "Blocked", "reason": "Fake products"}, as_=self.boss).status_code, 200)
        r = self.get("/api/orders/addresses/", as_=self.maker)
        self.assertEqual((r.status_code, r.data["code"]), (403, "ACCOUNT_BLOCKED"))
        self.assertEqual(self.get("/api/remakers/me/", as_=self.maker).status_code, 200)  # the app can still read its status
        self.assertEqual(self.post(u, {"status": "Active"}, as_=self.boss).status_code, 200)
        self.maker.refresh_from_db()
        self.assertEqual((self.maker.status, self.maker.status_reason), ("Active", ""))
