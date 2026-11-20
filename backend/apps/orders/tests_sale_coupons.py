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


class MemberAndReMakerSaleTests(OrderBase):
    """Members and ReMakers can mark a product down too: same rules as ReOrbit store items, and a
    donation voucher still works on sale items."""
    coupon = SaleAndCouponTests.coupon
    quote = SaleAndCouponTests.quote

    def setUp(self):
        super().setUp()
        self.rw = self.make_admin("rws@example.com", modules={"rewards": "edit"})
        type(self.table).objects.filter(pk=self.table.pk).update(mrp=3000)  # ₹2,400, was ₹3,000: 20% off
        type(self.lamp).objects.filter(pk=self.lamp.pk).update(mrp=1250)  # ₹1,000, was ₹1,250: 20% off
        self.refresh()

    def donation_voucher(self, amount=200, min_order=0):
        from datetime import timedelta

        from django.utils import timezone

        from apps.rewards.models import Voucher

        return Voucher.objects.create(
            owner=self.buyer, code="RO-DONATE01", amount=amount, min_order=min_order, title=f"₹{amount} voucher",
            expires_at=timezone.now() + timedelta(days=30), source_type="donation", source_id="DON-77")

    def test_cards_show_member_and_remaker_sales(self):
        for obj, mrp in ((self.table, 3000), (self.lamp, 1250)):
            card = self.get(f"/api/marketplace/{obj.public_id}/").data["data"]["product"]
            self.assertEqual((card["mrp"], card["off"]), (mrp, 20))

    def test_coupon_skips_member_and_remaker_sale_items(self):
        self.coupon(min_order=0)
        lines = [{"id": self.table.public_id, "qty": 1}, {"id": self.lamp.public_id, "qty": 1}]
        q = self.quote(lines, "SAVE10")
        self.assertEqual((q["discount"], q["sale_items"]), (0, 2))
        self.assertIn("donation voucher", q["voucher_error"])
        q = self.quote(lines + [{"id": self.tote.public_id, "qty": 1}], "SAVE10")
        self.assertEqual((q["coupon_eligible"], q["discount"]), (500, 50))

    def test_donation_voucher_works_on_sale_items(self):
        self.donation_voucher(amount=200, min_order=2000)
        lines = [{"id": self.table.public_id, "qty": 1}, {"id": self.lamp.public_id, "qty": 1}]
        q = self.quote(lines, "RO-DONATE01")
        self.assertEqual((q["voucher_error"], q["discount"]), ("", 200))
        r = self.checkout(lines, voucher_code="RO-DONATE01")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(sum(o.discount for o in Order.objects.all()), 200)
        self.assertTrue(all(o.discount > 0 for o in Order.objects.all()))  # shared across both sale orders

    def test_sellers_set_an_original_price_and_it_is_checked(self):
        type(self.table).objects.filter(pk=self.table.pk).update(status="Draft")  # the fixture has no photos
        type(self.lamp).objects.filter(pk=self.lamp.pk).update(item_status="Draft")
        r = self.client.patch(f"/api/remakers/products/{self.table.public_id}/", {"mrp": 2000}, format="json",
                              **self._headers(self.maker))
        self.assertEqual(r.status_code, 400)
        self.assertIn("more than the selling price", r.data["errors"]["mrp"][0])
        r = self.client.patch(f"/api/remakers/products/{self.table.public_id}/", {"mrp": 99999}, format="json",
                              **self._headers(self.maker))
        self.assertIn("90% off", r.data["errors"]["mrp"][0])
        r = self.client.patch(f"/api/remakers/products/{self.table.public_id}/", {"mrp": 3200}, format="json",
                              **self._headers(self.maker))
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["data"]["product"]["mrp"], "3200.00")
        r = self.client.patch(f"/api/remakers/products/{self.table.public_id}/", {"mrp": ""}, format="json",
                              **self._headers(self.maker))
        self.assertIsNone(r.data["data"]["product"]["mrp"])
        r = self.client.patch(f"/api/listings/me/{self.lamp.public_id}/", {"mrp": 900}, format="json",
                              **self._headers(self.seller))
        self.assertEqual(r.status_code, 400)
        r = self.client.patch(f"/api/listings/me/{self.lamp.public_id}/", {"mrp": 1500}, format="json",
                              **self._headers(self.seller))
        self.assertEqual((r.status_code, r.data["data"]["listing"]["mrp"]), (200, "1500.00"))
