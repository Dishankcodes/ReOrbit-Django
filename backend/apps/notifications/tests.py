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


class EventNotificationTests(APIBase):
    """The actions that used to leave no trace now put something in the inbox."""

    def test_new_follower_notifies_the_remaker_once(self):
        user, maker = self.make_user(), self.make_remaker()
        for _ in range(2):  # following twice must not notify twice
            self.post("/api/social/follow/", {"id": maker.public_id}, as_=user)
        rows = Notification.objects.filter(remaker=maker, module="social")
        self.assertEqual(rows.count(), 1)
        self.assertEqual(rows.first().target_url, "/remaker-followers")

    def test_password_change_notifies_the_member(self):
        from apps.core.testing import STRONG_PASSWORD

        user = self.make_user()
        r = self.post("/api/users/password/change/",
                      {"current_password": STRONG_PASSWORD, "new_password": "An0ther!Strong#Pass9"}, as_=user)
        self.assertEqual(r.status_code, 200, r.data)
        n = Notification.objects.get(user=user, module="account")
        self.assertEqual((n.title, n.severity), ("Your password was changed", "warning"))


class AnnouncementTests(APIBase):
    URL = "/api/notifications/admin/announcements/"

    def setUp(self):
        super().setUp()
        self.admin = self.make_admin(modules={"notifications": "edit"})
        self.user = self.make_user()
        self.blocked = self.make_user("blocked@example.com", status="Blocked")
        self.maker = self.make_remaker()

    def send(self, **extra):
        body = {"title": "Diwali sale", "message": "15% off from 23 Oct.", "audience": "everyone",
                "type": "offer", "link": "/user-marketplace", **extra}
        return self.post(self.URL, body, as_=self.admin)

    def test_send_to_everyone_reaches_active_members_and_remakers_only(self):
        r = self.send()
        self.assertEqual(r.status_code, 200, r.data)
        self.assertFalse(r.data["data"]["announcement"]["scheduled"])
        self.assertEqual(r.data["data"]["announcement"]["recipients"], 2)
        for who, field in ((self.user, "user"), (self.maker, "remaker")):
            n = Notification.objects.get(**{field: who}, module="announcements")
            self.assertEqual((n.title, n.target_url), ("Diwali sale", "/user-marketplace"))
        self.assertFalse(Notification.objects.filter(user=self.blocked).exists())
        self.assertFalse(Notification.objects.filter(admin=self.admin).exists())
        # and it is in the member's own inbox
        d = self.get("/api/notifications/me/", as_=self.user).data["data"]
        self.assertEqual([x["title"] for x in d["results"]], ["Diwali sale"])

    def test_audience_is_respected(self):
        self.send(audience="remakers")
        self.assertEqual(Notification.objects.filter(module="announcements").count(), 1)
        self.assertTrue(Notification.objects.filter(remaker=self.maker, module="announcements").exists())

    def test_public_ids_are_unique_across_a_broadcast(self):
        self.send()
        ids = list(Notification.objects.values_list("public_id", flat=True))
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(all(i and i.startswith("NTF-") for i in ids))

    def test_scheduled_waits_until_due_then_lands_once(self):
        from datetime import timedelta
        from django.utils import timezone
        from apps.notifications.models import Announcement

        when = (timezone.now() + timedelta(days=1)).isoformat()
        r = self.send(scheduleAt=when)
        self.assertTrue(r.data["data"]["announcement"]["scheduled"])
        self.assertEqual(self.get("/api/notifications/me/unread-count/", as_=self.user).data["data"]["unread_count"], 0)
        Announcement.objects.update(scheduled_at=timezone.now() - timedelta(minutes=1))
        self.assertEqual(self.get("/api/notifications/me/unread-count/", as_=self.user).data["data"]["unread_count"], 1)
        self.get("/api/notifications/me/", as_=self.maker)  # delivering again changes nothing
        self.assertEqual(Notification.objects.filter(module="announcements").count(), 2)

    def test_validation(self):
        for bad in ({"title": ""}, {"audience": "nobody"}, {"link": "https://evil.example"},
                    {"scheduleAt": "2001-01-01T00:00:00Z"}, {"type": "spam"}):
            self.assertEqual(self.send(**bad).status_code, 400, bad)
        self.assertFalse(Notification.objects.filter(module="announcements").exists())

    def test_a_time_that_just_passed_sends_it_now(self):
        from datetime import timedelta
        from django.utils import timezone
        r = self.send(scheduleAt=(timezone.now() - timedelta(minutes=1)).isoformat())
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["data"]["announcement"]["status"], "sent")

    def test_cancel_only_before_it_is_sent(self):
        from datetime import timedelta
        from django.utils import timezone

        later = self.send(scheduleAt=(timezone.now() + timedelta(days=2)).isoformat()).data["data"]["announcement"]["id"]
        self.assertEqual(self.delete(f"{self.URL}{later}/", as_=self.admin).status_code, 200)
        sent = self.send().data["data"]["announcement"]["id"]
        self.assertEqual(self.delete(f"{self.URL}{sent}/", as_=self.admin).status_code, 409)

    def test_history_and_gate(self):
        self.send()
        rows = self.get(self.URL, as_=self.admin).data["data"]["announcements"]
        self.assertEqual([a["title"] for a in rows], ["Diwali sale"])
        self.assertEqual(self.get(self.URL, as_=self.user).status_code, 403)
        self.assertEqual(self.post(self.URL, {}, as_=self.user).status_code, 403)

    def test_reach_counts_active_accounts_only(self):
        d = self.get(self.URL + "reach/", as_=self.admin).data["data"]
        self.assertEqual((d["users"], d["remakers"], d["everyone"]), (1, 1, 2))


class AnnouncementFlowTests(APIBase):
    URL = "/api/notifications/admin/announcements/"

    def setUp(self):
        super().setUp()
        self.admin = self.make_admin(modules={"notifications": "edit"})
        self.u = self.make_user()

    def body(self, **over):
        b = {"title": "Big green sale", "message": "Everything pre-loved is 10% off this weekend.",
             "audience": "users", "type": "offer", "link": "/user-marketplace"}
        b.update(over)
        return b

    def test_schedule_edit_send_now_read_and_recall(self):
        from datetime import timedelta

        from django.utils import timezone

        later = (timezone.now() + timedelta(days=1)).isoformat()
        a = self.post(self.URL, self.body(scheduleAt=later), as_=self.admin).data["data"]["announcement"]
        self.assertEqual(a["status"], "scheduled")
        r = self.client.patch(f"{self.URL}{a['id']}/", {"title": "Bigger green sale"}, format="json",
                              **self._headers(self.admin))
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["data"]["announcement"]["title"], "Bigger green sale")
        r = self.post(f"{self.URL}{a['id']}/", {"action": "send_now"}, as_=self.admin)
        self.assertEqual(r.data["data"]["announcement"]["recipients"], 1)
        Notification.objects.filter(user=self.u, module="announcements").update(is_read=True)
        rows = self.get(self.URL, as_=self.admin).data["data"]["announcements"]
        self.assertEqual((rows[0]["read"], rows[0]["read_pct"]), (1, 100))
        r = self.post(f"{self.URL}{a['id']}/", {"action": "recall"}, as_=self.admin)
        self.assertEqual(r.data["data"]["announcement"]["status"], "recalled")
        self.assertFalse(Notification.objects.filter(module="announcements").exists())
        self.assertEqual(self.post(f"{self.URL}{a['id']}/", {"action": "recall"}, as_=self.admin).status_code, 409)
