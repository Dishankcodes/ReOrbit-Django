"""Super Admin › System: pause switches (apps/core/pause.py) and the usage log (apps/core/usage.py)."""

from django.db import connection
from django.test.utils import CaptureQueriesContext

from apps.admins.models import Admins
from apps.core import pause, usage
from apps.core.models import PlatformSettings, UsageHour
from apps.core.testing import APIBase

PAUSE = "/api/adminops/admin/system/pause/"


class PauseSwitchTests(APIBase):
    def setUp(self):
        super().setUp()
        pause.forget()
        self.super = self.make_admin("boss@example.com", permission_level=Admins.PermissionLevel.SUPER_ADMIN)
        self.admin = self.make_admin("staff@example.com", modules={"dashboard": "view"})
        self.user = self.make_user()
        self.maker = self.make_remaker()

    def tearDown(self):
        pause.forget()
        super().tearDown()

    def test_only_a_super_admin_can_pause(self):
        self.assertEqual(self.post(PAUSE, {"user": True}, as_=self.admin).status_code, 403)
        self.assertEqual(self.post(PAUSE, {"user": True}, as_=self.super).status_code, 200)

    def test_bad_body_is_refused(self):
        self.assertEqual(self.post(PAUSE, {"everyone": True}, as_=self.super).status_code, 400)
        self.assertEqual(self.post(PAUSE, {"user": "yes"}, as_=self.super).status_code, 400)

    def test_paused_members_get_503_without_touching_the_database(self):
        self.post(PAUSE, {"user": True}, as_=self.super)
        pause.flags()  # switches now in memory
        with CaptureQueriesContext(connection) as q:
            r = self.get("/api/users/me/", as_=self.user)
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()["code"], "PAUSED")
        self.assertEqual(len(q.captured_queries), 0)
        # the other sides keep working, and so does the guest shop (only one member side is paused)
        self.assertEqual(self.get("/api/remakers/me/", as_=self.maker).status_code, 200)
        self.assertEqual(self.get("/api/admins/me/", as_=self.admin).status_code, 200)
        self.assertEqual(self.get("/api/core/settings/").status_code, 200)
        # sign-in for members is closed too
        self.assertEqual(self.post("/api/users/auth/login/", {"email": "a@b.c", "password": "x"}).status_code, 503)

    def test_guest_shop_closes_when_both_member_sides_are_paused(self):
        self.post(PAUSE, {"user": True, "remaker": True}, as_=self.super)
        self.assertEqual(self.get("/api/core/settings/").status_code, 503)
        status = self.get("/api/core/status/")
        self.assertEqual(status.status_code, 200)
        self.assertEqual(status.data["data"]["paused"], {"user": True, "remaker": True, "admin": False})

    def test_pausing_admins_never_locks_out_super_admins(self):
        self.post(PAUSE, {"admin": True}, as_=self.super)
        self.assertEqual(self.get("/api/admins/me/", as_=self.admin).status_code, 503)
        self.assertEqual(self.get("/api/admins/me/", as_=self.super).status_code, 200)
        # admin sign-in stays open, and the super admin can start it again
        self.assertNotEqual(self.post("/api/admins/auth/login/", {"email": "x@y.z", "password": "x"}).status_code, 503)
        self.post(PAUSE, {"admin": False}, as_=self.super)
        self.assertEqual(self.get("/api/admins/me/", as_=self.admin).status_code, 200)

    def test_webhook_and_refresh_stay_open(self):
        self.post(PAUSE, {"user": True, "remaker": True, "admin": True}, as_=self.super)
        self.assertNotEqual(self.client.post("/api/payments/webhook/", {}, format="json").status_code, 503)
        self.assertNotEqual(self.client.post("/api/auth/token/refresh/", {}, format="json").status_code, 503)

    def test_settings_screen_save_keeps_the_switches(self):
        self.post(PAUSE, {"remaker": True}, as_=self.super)
        from apps.platform import settings_api

        s = PlatformSettings.load()
        settings_api.apply(s, {"platform": {"supportEmail": "", "minDonationItems": 1, "donationCo2PerKg": 1.9,
                                            "donationVoucherTiers": [], "maintenance": False,
                                            "sessionMinutes": 60}}, self.super)
        self.assertTrue(PlatformSettings.load().paused["remaker"])


class UsageLogTests(APIBase):
    def setUp(self):
        super().setUp()
        usage._buf.clear()
        self.super = self.make_admin("boss@example.com", permission_level=Admins.PermissionLevel.SUPER_ADMIN)
        self.user = self.make_user()

    def test_requests_are_counted_by_endpoint_and_side(self):
        self.get("/api/users/me/", as_=self.user)
        self.get("/api/users/me/", as_=self.user)
        self.client.get("/api/core/settings/", HTTP_USER_AGENT="UptimeRobot/2.0")
        self.assertEqual(usage.flush() >= 2, True)
        me = UsageHour.objects.get(route="/api/users/me/", side="user")
        self.assertEqual(me.requests, 2)
        self.assertGreater(me.queries, 0)
        bot = UsageHour.objects.get(route="/api/core/settings/", side="bot")
        self.assertEqual(bot.agent, "UptimeRobot/2.0")
        # a second flush adds to the same row instead of making a new one
        self.get("/api/users/me/", as_=self.user)
        usage.flush()
        self.assertEqual(UsageHour.objects.get(route="/api/users/me/", side="user").requests, 3)

    def test_system_page_report(self):
        self.get("/api/users/me/", as_=self.user)
        r = self.get("/api/adminops/admin/system/?days=1", as_=self.super)
        self.assertEqual(r.status_code, 200)
        u = r.data["data"]["usage"]
        self.assertGreaterEqual(u["totals"]["requests"], 1)
        self.assertTrue(any(x["route"] == "/api/users/me/" for x in u["routes"]))
        self.assertEqual(self.get("/api/adminops/admin/system/", as_=self.user).status_code, 403)
