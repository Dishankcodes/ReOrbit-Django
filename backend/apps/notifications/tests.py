from apps.core.models import Notification
from apps.core.services import notify
from apps.core.testing import APIBase

URL = "/api/notifications/me/"


class InboxTests(APIBase):
    def setUp(self):
        super().setUp()
        self.user = self.make_user()
        self.other = self.make_user("other@example.com")
        self.maker = self.make_remaker()
        self.admin = self.make_admin()
        self.a = notify(self.user, "Order shipped", "ORD-1001 is on its way", module="orders", target_url="/user-orders/ORD-1001")
        self.b = notify(self.user, "Points added", "+120", module="rewards", target_url="/user-orbit-points")
        self.c = notify(self.user, "Careful", "x", module="orders", target_url="https://evil.example/phish")
        notify(self.other, "Not yours", "secret")
        notify(self.maker, "New sale", "Tote", module="orders", target_url="/remaker-orders")
        notify(self.admin, "New complaint", "C-1", module="complaints", target_url="/admin-complaints")

    def test_list_is_only_my_own_newest_first_with_unread_count(self):
        d = self.get(URL, as_=self.user).data["data"]
        self.assertEqual(d["count"], 3)
        self.assertEqual(d["unread_count"], 3)
        self.assertEqual([r["title"] for r in d["results"]], ["Careful", "Points added", "Order shipped"])
        self.assertEqual(d["modules"], {"orders": 2, "rewards": 1})

    def test_links_are_in_app_paths_only(self):
        rows = {r["title"]: r for r in self.get(URL, as_=self.user).data["data"]["results"]}
        self.assertEqual(rows["Order shipped"]["target_url"], "/user-orders/ORD-1001")
        self.assertEqual(rows["Careful"]["target_url"], "")

    def test_filters(self):
        self.assertEqual(self.get(URL + "?module=rewards", as_=self.user).data["data"]["count"], 1)
        self.post(f"{URL}{self.a.public_id}/read/", as_=self.user)
        self.assertEqual(self.get(URL + "?unread=1", as_=self.user).data["data"]["count"], 2)

    def test_mark_one_read(self):
        r = self.post(f"{URL}{self.a.public_id}/read/", as_=self.user).data["data"]
        self.assertTrue(r["notification"]["is_read"])
        self.assertEqual(r["unread_count"], 2)
        self.assertEqual(self.get(URL + "unread-count/", as_=self.user).data["data"]["unread_count"], 2)

    def test_mark_all_read_and_by_module(self):
        r = self.post(URL + "read-all/?module=rewards", as_=self.user).data["data"]
        self.assertEqual((r["updated"], r["unread_count"]), (1, 2))
        r = self.post(URL + "read-all/", as_=self.user).data["data"]
        self.assertEqual((r["updated"], r["unread_count"]), (2, 0))
        # someone else's inbox is untouched
        self.assertEqual(Notification.objects.filter(user=self.other, is_read=False).count(), 1)

    def test_dismiss_hides_it_and_keeps_the_row(self):
        r = self.delete(f"{URL}{self.a.public_id}/", as_=self.user)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.get(URL, as_=self.user).data["data"]["count"], 2)
        self.assertEqual(self.get(f"{URL}{self.a.public_id}/", as_=self.user).status_code, 404)
        self.assertTrue(Notification.objects.filter(pk=self.a.pk, dismissed_at__isnull=False).exists())

    def test_dismiss_read_only_clears_read_ones(self):
        self.post(f"{URL}{self.a.public_id}/read/", as_=self.user)
        self.assertEqual(self.post(URL + "dismiss-read/", as_=self.user).data["data"]["dismissed"], 1)
        self.assertEqual(self.get(URL, as_=self.user).data["data"]["count"], 2)

    def test_nobody_can_touch_another_accounts_notification(self):
        theirs = Notification.objects.get(user=self.other)
        for call in (
            lambda: self.get(f"{URL}{theirs.public_id}/", as_=self.user),
            lambda: self.post(f"{URL}{theirs.public_id}/read/", as_=self.user),
            lambda: self.delete(f"{URL}{theirs.public_id}/", as_=self.user),
        ):
            self.assertEqual(call().status_code, 404)
        theirs.refresh_from_db()
        self.assertFalse(theirs.is_read)
        self.assertIsNone(theirs.dismissed_at)

    def test_remaker_has_their_own_inbox(self):
        d = self.get(URL, as_=self.maker).data["data"]
        self.assertEqual([r["title"] for r in d["results"]], ["New sale"])

    def test_admin_inbox_is_separate_and_gated(self):
        self.assertEqual(self.get(URL, as_=self.admin).status_code, 403)
        self.assertEqual(self.get("/api/notifications/admin/", as_=self.user).status_code, 403)
        d = self.get("/api/notifications/admin/", as_=self.admin).data["data"]
        self.assertEqual([r["title"] for r in d["results"]], ["New complaint"])
        nid = d["results"][0]["id"]
        self.assertEqual(self.post(f"/api/notifications/admin/{nid}/read/", as_=self.admin).data["data"]["unread_count"], 0)

    def test_login_required(self):
        self.assertEqual(self.get(URL).status_code, 401)
