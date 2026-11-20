"""Items already on sale (a ReOrbit product below its MRP) never get a coupon on top, and the cart says
how far it is from free delivery."""

from apps.admins.models import AdminItem
from apps.rewards import services as rewards
from apps.rewards.tests import offer_body

from .models import Order
from .tests import OrderBase


class SaleAndCouponTests(OrderBase):
    def setUp(self):
        super().setUp()
        self.rw = self.make_admin("rws@example.com", modules={"rewards": "edit"})
        AdminItem.objects.filter(pk=self.tote.pk).update(mrp=625)  # ₹500 now, was ₹625: 20% off
        self.tote.refresh_from_db()

    def coupon(self, **over):
        body = offer_body(code="SAVE10", kind="code", points_cost=0, discount_type="percent", value=10,
                          max_discount=300, min_order=1000, usage_limit=5, per_user=1)
        body.update(over)
        return rewards.save_offer(body, self.rw)

    def quote(self, lines, code=""):
        r = self.post("/api/orders/quote/", {"items": lines, "voucher_code": code}, as_=self.buyer)
        self.assertEqual(r.status_code, 200, r.data)
        return r.data["data"]

    def test_marketplace_card_shows_the_sale(self):
        card = self.get(f"/api/marketplace/{self.tote.public_id}/").data["data"]["product"]
        self.assertEqual((card["mrp"], card["off"], card["price"]), (625, 20, 500))

    def test_sale_only_cart_refuses_the_coupon(self):
        self.coupon(min_order=0)
        q = self.quote([{"id": self.tote.public_id, "qty": 2}], "SAVE10")
        self.assertEqual((q["discount"], q["coupon_eligible"], q["sale_items"]), (0, 0, 2))
        self.assertIn("already on sale", q["voucher_error"])
        self.assertTrue(q["groups"][0]["lines"][0]["on_sale"])
        self.assertEqual(q["sale_savings"], 250)

    def test_mixed_cart_discounts_only_full_price_items(self):
        self.coupon()
        lines = [{"id": self.tote.public_id, "qty": 1}, {"id": self.table.public_id, "qty": 1}]
        q = self.quote(lines, "SAVE10")
        self.assertEqual((q["voucher_error"], q["coupon_eligible"], q["discount"]), ("", 2400, 240))  # 10% of ₹2,400 only
        r = self.checkout(lines, voucher_code="SAVE10")
        self.assertEqual(r.status_code, 201, r.data)
        by_seller = {o.seller_type: o.discount for o in Order.objects.all()}
        self.assertEqual(by_seller, {"platform": 0, "remaker": 240})  # the sale item's order gets none of it

    def test_sale_items_do_not_count_towards_the_minimum(self):
        self.coupon(min_order=2600)
        lines = [{"id": self.tote.public_id, "qty": 1}, {"id": self.table.public_id, "qty": 1}]  # ₹2,900 in goods
        q = self.quote(lines, "SAVE10")
        self.assertEqual(q["discount"], 0)
        self.assertIn("₹200 more of full-price items", q["voucher_error"])
        self.assertIn("Sale items don't count", q["voucher_error"])

    def test_free_delivery_gap(self):
        from apps.core.models import PlatformSettings

        s = PlatformSettings.load()  # ReOrbit store items: a delivery fee until admin_item_free_from
        q = self.quote([{"id": self.tote.public_id, "qty": 1}])
        g = q["groups"][0]
        self.assertEqual((g["delivery_fee"], g["free_delivery"]),
                         (s.admin_item_delivery, {"from": s.admin_item_free_from, "gap": s.admin_item_free_from - 500}))
        q = self.quote([{"id": self.tote.public_id, "qty": 1}, {"id": self.lamp.public_id, "qty": 1}])
        member = next(x for x in q["groups"] if x["seller"]["type"] == "user")
        self.assertIsNone(member["free_delivery"])  # flat fee for member items, no limit to reach
