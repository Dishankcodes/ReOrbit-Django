"""Share tracking: a signed link that shows the delivery to anyone, without signing in, and nothing private."""

from datetime import timedelta
from unittest import mock

from django.core import signing

from . import share
from .tests_post_delivery import PostDeliveryBase


class ShareTrackingTests(PostDeliveryBase):
    def token(self, oid, who=None, path="me"):
        r = self.post(f"/api/orders/{path}/{oid}/share/", {}, as_=who or self.buyer)
        self.assertEqual(r.status_code, 200, r.data)
        return r.data["data"]["token"]

    def track(self, token):
        self.client.credentials()  # no login at all
        return self.client.get(f"/api/orders/track/{token}/")

    def test_buyer_and_seller_share_a_public_link_with_nothing_private(self):
        oid = self.place(self.table)
        self.act(oid, self.table, "pack", who=self.maker)
        self.act(oid, self.table, "ship", {"courier_name": "Delhivery", "tracking_no": "14903981265"}, who=self.maker)
        for t in (self.token(oid), self.token(oid, who=self.maker, path="sales")):
            r = self.track(t)
            self.assertEqual(r.status_code, 200, r.data)
            o = r.data["data"]["order"]
            self.assertEqual((o["id"], o["status"]), (oid, "Shipped"))
            self.assertEqual(o["courier"]["tracking_no"], "14903981265")
            self.assertIn("delhivery", o["courier"]["tracking_url"])
            self.assertEqual(set(o["to"]), {"city", "pincode"})  # no street, name or phone
            flat = str(o)
            for private in ("address_line1", "phone", "total", "payment", self.buyer.email, self.buyer.full_name):
                self.assertNotIn(private, flat)
            self.assertTrue(any(e["label"] == "Shipped" for e in o["events"]))

    def test_only_the_buyer_or_seller_can_make_a_link(self):
        oid = self.place(self.table)
        stranger = self.make_user("stranger@example.com")
        self.assertEqual(self.post(f"/api/orders/me/{oid}/share/", {}, as_=stranger).status_code, 404)
        self.assertEqual(self.post(f"/api/orders/sales/{oid}/share/", {}, as_=stranger).status_code, 404)

    def test_edited_fake_or_old_links_fail(self):
        oid = self.place(self.table)
        t = self.token(oid)
        self.assertEqual(self.track(t[:-2] + "xx").status_code, 404)
        self.assertEqual(self.track(signing.dumps({"o": oid}, salt="other")).status_code, 404)
        with mock.patch("django.core.signing.time.time", return_value=signing.time.time()
                        + timedelta(days=share.TRACK_DAYS + 1).total_seconds()):
            self.assertEqual(self.track(t).status_code, 404)
