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
