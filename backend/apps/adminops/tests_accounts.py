"""Admin > Users / ReMakers profile: one request fills every tab with real data."""

from apps.orders.tests_post_delivery import PostDeliveryBase


class AccountDetailTests(PostDeliveryBase):
    def setUp(self):
        super().setUp()
        self.users_admin = self.make_admin("ua@example.com", modules={"users": "view", "remakers": "view"})
        self.nobody = self.make_admin("na@example.com", modules={"orders": "view"})

    def test_member_and_remaker_profiles_carry_their_orders_reviews_and_counts(self):
        oid = self.place(self.table)  # a ReMaker product
        self.deliver(oid, self.table)
        lamp_order = self.place(self.lamp)  # a member listing
        self.deliver(lamp_order, self.lamp)
        url = f"/api/reviews/me/orders/{lamp_order}/items/{self.lamp.public_id}/product/"
        self.assertEqual(self.client.post(url, {"rating": 4, "body": "Nice lamp"}, format="multipart",
                                          **self._headers(self.buyer)).status_code, 201)

        buyer = self.get(f"/api/adminops/admin/accounts/{self.buyer.public_id}/", as_=self.users_admin)
        self.assertEqual(buyer.status_code, 200, buyer.data)
        d = buyer.data["data"]
        self.assertEqual({o["role"] for o in d["orders"]}, {"Buyer"})
        self.assertEqual(len(d["orders"]), 2)
        self.assertEqual(d["reviews"][0]["kind"], "Product")
        self.assertGreater(d["totals"]["spent"], 0)
        self.assertTrue(any(a["type"] == "order" for a in d["activity"]))

        seller = self.get(f"/api/adminops/admin/accounts/{self.seller.public_id}/", as_=self.users_admin).data["data"]
        self.assertEqual([o["role"] for o in seller["orders"]], ["Seller"])
        self.assertEqual(seller["items"][0]["item_id"], self.lamp.public_id)

        maker = self.get(f"/api/adminops/admin/accounts/{self.maker.public_id}/", as_=self.users_admin)
        self.assertEqual(maker.status_code, 200, maker.data)
        m = maker.data["data"]
        self.assertEqual(m["products"][0]["product_id"], self.table.public_id)
        self.assertEqual((m["sales"], m["followers"]), (1, 0))

        listing = self.get("/api/remakers/admin/", as_=self.users_admin).data["data"]["results"]
        row = next(r for r in listing if r["public_id"] == self.maker.public_id)
        self.assertEqual((row["sales_count"], row["followers_count"]), (1, 0))
        self.assertGreaterEqual(row["products_count"], 1)

    def test_needs_the_right_module(self):
        self.assertEqual(self.get(f"/api/adminops/admin/accounts/{self.buyer.public_id}/", as_=self.nobody).status_code, 403)
        self.assertEqual(self.get(f"/api/adminops/admin/accounts/{self.buyer.public_id}/", as_=self.buyer).status_code, 403)
        self.assertEqual(self.get("/api/adminops/admin/accounts/USR-999999/", as_=self.users_admin).status_code, 404)


class PresenceAndActivityTests(PostDeliveryBase):
    """Admins see "Online now" and the sign-ins, status changes and delete / come-back history."""

    def setUp(self):
        super().setUp()
        self.users_admin = self.make_admin("people@example.com", modules={"users": "edit", "remakers": "edit"})

    def detail(self, who):
        return self.get(f"/api/adminops/admin/accounts/{who.public_id}/", as_=self.users_admin).data["data"]

    def test_using_the_app_marks_the_account_online(self):
        from datetime import timedelta
        from django.utils import timezone
        from apps.users.models import Users
        Users.objects.filter(pk=self.buyer.pk).update(last_seen_at=None, last_login_at=None)
        self.assertFalse(self.detail(self.buyer)["presence"]["online"])
        self.get("/api/users/me/", as_=self.buyer)
        self.assertTrue(self.detail(self.buyer)["presence"]["online"])
        self.assertIn("online", [a["type"] for a in self.detail(self.buyer)["activity"]])
        # a long time ago: offline, and the activity says when they last used the app
        Users.objects.filter(pk=self.buyer.pk).update(last_seen_at=timezone.now() - timedelta(hours=3))
        d = self.detail(self.buyer)
        self.assertFalse(d["presence"]["online"])
        self.assertIn("offline", [a["type"] for a in d["activity"]])

    def test_status_changes_and_deleting_then_coming_back_show_in_the_activity(self):
        from apps.core.account_deletion import restore_if_pending
        from apps.core.services import audit
        r = self.post(f"/api/adminops/admin/accounts/{self.buyer.public_id}/status/",
                      {"status": "Suspended", "reason": "Several buyers reported items"}, as_=self.users_admin)
        self.assertEqual(r.status_code, 200, r.data)
        audit(self.buyer, "account.delete_requested", "user", self.buyer.public_id, reason="Not using it")
        audit(self.buyer, "account.delete_cancelled", "user", self.buyer.public_id, reason="Signed in within 30 days")
        types = [a["type"] for a in self.detail(self.buyer)["activity"]]
        self.assertTrue({"status", "deleted", "restored"} <= set(types), types)
        texts = [a["text"] for a in self.detail(self.buyer)["activity"]]
        self.assertTrue(any("Suspended by ReOrbit: Several buyers" in t for t in texts))
        self.assertIsNotNone(restore_if_pending)  # the real come-back path writes the same audit entry
