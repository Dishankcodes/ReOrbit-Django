from apps.core.models import Notification
from apps.core.services import notify
from apps.core.testing import APIBase


class ReMakerSettingsTests(APIBase):
    def test_remaker_notification_topics_are_saved_and_respected(self):
        m = self.make_remaker()
        r = self.patch("/api/remakers/profile/", {"notification_preferences": {"orders": False, "loginAlerts": True}},
                       as_=m)
        self.assertEqual(r.status_code, 200, r.data)
        m.profile.refresh_from_db()
        self.assertEqual(m.profile.notification_preferences, {"orders": False, "loginAlerts": True})
        self.assertIsNone(notify(m, "New order", "x", module="orders"))
        self.assertIsNotNone(notify(m, "New review", "x", module="reviews"))
        self.assertEqual(Notification.objects.filter(remaker=m).count(), 1)

    def test_preferences_must_be_on_off_switches(self):
        m = self.make_remaker()
        r = self.patch("/api/remakers/profile/", {"notification_preferences": {"orders": "yes"}}, as_=m)
        self.assertEqual(r.status_code, 400)

    def test_admin_certificate_needs_a_completed_donation(self):
        from apps.donations.models import Donation

        admin = self.make_admin(modules={"donations": "view"})
        u = self.make_user()
        d = Donation.objects.create(donor=u, title="Books", quantity=1, pickup_address="1 Road")
        r = self.get(f"/api/donations/admin/{d.public_id}/certificate/", as_=admin)
        self.assertEqual(r.status_code, 404)
        self.assertEqual(self.get(f"/api/donations/admin/{d.public_id}/certificate/", as_=u).status_code, 403)
