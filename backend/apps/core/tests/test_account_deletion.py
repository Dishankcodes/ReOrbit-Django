from datetime import timedelta

from django.core import mail
from django.utils import timezone

from apps.core.models import Notification
from apps.core.services import notify
from apps.core.testing import STRONG_PASSWORD, APIBase
from apps.users.models import Users


class AccountDeletionTests(APIBase):
    def login(self, email):
        return self.post("/api/users/auth/login/", {"email": email, "password": STRONG_PASSWORD})

    def test_delete_then_sign_in_within_30_days_restores(self):
        u = self.make_user("leaving@example.com")
        self.assertEqual(self.get("/api/users/me/delete/", as_=u).data["data"]["blockers"], [])
        self.assertEqual(self.post("/api/users/me/delete/", {"confirm": "nope"}, as_=u).status_code, 400)
        r = self.post("/api/users/me/delete/", {"confirm": "DELETE", "password": STRONG_PASSWORD}, as_=u)
        self.assertEqual(r.status_code, 200, r.data)
        u.refresh_from_db()
        self.assertEqual(u.status, "Deleted")
        self.assertTrue(any("deleted" in m.subject.lower() for m in mail.outbox))
        self.assertEqual(self.login("leaving@example.com").status_code, 200)
        u.refresh_from_db()
        self.assertEqual((u.status, u.deletion_requested_at), ("Active", None))

    def test_after_30_days_the_account_is_purged_and_the_email_is_free(self):
        u = self.make_user("gone@example.com")
        self.post("/api/users/me/delete/", {"confirm": "DELETE", "password": STRONG_PASSWORD}, as_=u)
        Users.objects.filter(pk=u.pk).update(deletion_requested_at=timezone.now() - timedelta(days=31))
        self.assertEqual(self.login("gone@example.com").status_code, 404)
        u.refresh_from_db()
        self.assertEqual(u.full_name, "Deleted member")
        self.assertTrue(u.email.endswith("@deleted.reorbit.invalid"))

    def test_notification_topics_switched_off_are_not_sent(self):
        u = self.make_user()
        u.profile.notification_preferences = {"orders": False}
        u.profile.save()
        self.assertIsNone(notify(u, "Shipped", "x", module="orders"))
        self.assertIsNotNone(notify(u, "Account", "x", module="account"))
        self.assertEqual(Notification.objects.filter(user=u).count(), 1)

    def test_data_export_downloads_json(self):
        u = self.make_user()
        r = self.get("/api/users/me/export/", as_=u)
        self.assertEqual(r.status_code, 200)
        self.assertIn(b'"account"', r.content)
