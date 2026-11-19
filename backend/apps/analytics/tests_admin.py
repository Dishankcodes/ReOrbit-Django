"""Admin Reports, admin Earnings and the ReMaker Dashboard, all read from the real orders."""

from apps.orders.models import Order
from apps.orders.tests_post_delivery import PostDeliveryBase

REPORT = "/api/analytics/admin/report/"
EARN = "/api/analytics/admin/earnings/"
DASH = "/api/analytics/me/dashboard/"


class AdminNumbersBase(PostDeliveryBase):
    def setUp(self):
        super().setUp()
        self.viewer = self.make_admin("viewer@example.com", modules={"reports": "view", "earnings": "view"})
        self.nobody = self.make_admin("nobody@example.com", modules={"orders": "edit"})


class AdminAccessTests(AdminNumbersBase):
    def test_only_admins_with_the_module_can_open_them(self):
        for url in (REPORT, EARN):
            self.assertEqual(self.client.get(url).status_code, 401)
            self.assertEqual(self.get(url, as_=self.buyer).status_code, 403)
            self.assertEqual(self.get(url, as_=self.maker).status_code, 403)
            self.assertEqual(self.get(url, as_=self.nobody).status_code, 403)
            self.assertEqual(self.get(url, as_=self.viewer).status_code, 200)

    def test_each_module_opens_only_its_own_page(self):
        reports_only = self.make_admin("r@example.com", modules={"reports": "view"})
        self.assertEqual(self.get(REPORT, as_=reports_only).status_code, 200)
        self.assertEqual(self.get(EARN, as_=reports_only).status_code, 403)

    def test_a_bad_range_is_refused(self):
        self.assertEqual(self.get(REPORT + "?range=7", as_=self.viewer).status_code, 400)
        self.assertEqual(self.get(EARN + "?range=nope", as_=self.viewer).status_code, 400)

    def test_every_range_answers(self):
        for key in ("30d", "90d", "6m", "12m", "all"):
            self.assertEqual(self.get(f"{REPORT}?range={key}", as_=self.viewer).status_code, 200, key)
            self.assertEqual(self.get(f"{EARN}?range={key}", as_=self.viewer).status_code, 200, key)


class AdminReportTests(AdminNumbersBase):
    def report(self, key="90d"):
        r = self.get(f"{REPORT}?range={key}", as_=self.viewer)
        self.assertEqual(r.status_code, 200, r.data)
        return r.data["data"]

    def test_an_empty_platform_has_a_valid_report(self):
        d = self.report()
        for section in ("orders", "donations", "warehouse", "community", "payouts"):
            self.assertIn(section, d)
        self.assertEqual((d["orders"]["kpi"]["revenue"], d["orders"]["kpi"]["orders"]), (0, 0))
        self.assertEqual(d["range"]["key"], "90d")

    def test_orders_and_members_are_counted(self):
        oid = self.place(self.table)
        d = self.report()
        self.assertEqual(d["orders"]["kpi"]["orders"], 1)
        self.assertGreaterEqual(d["community"]["kpi"]["users"], 1)
        self.deliver(oid, self.table)
        d = self.report()
        order = Order.objects.get(public_id=oid)
        self.assertEqual(d["orders"]["kpi"]["revenue"], order.total)
        self.assertEqual(d["orders"]["kpi"]["fees"], order.platform_fee)
        self.assertEqual(len(d["orders"]["trend"]) > 0, True)


class AdminEarningsTests(AdminNumbersBase):
    def earnings(self, key="90d"):
        r = self.get(f"{EARN}?range={key}", as_=self.viewer)
        self.assertEqual(r.status_code, 200, r.data)
        return r.data["data"]

    def test_an_empty_platform_earns_nothing(self):
        d = self.earnings()
        self.assertEqual(d["cur"]["earnings"], 0)
        self.assertEqual(d["entries"], [])
        self.assertEqual(len(d["flow"]), 8)
        self.assertEqual(d["takeRate"], 0)

    def test_the_buyer_fee_is_platform_income_and_the_seller_price_is_not(self):
        oid = self.place(self.table)  # a ReMaker's product: ReOrbit earns only the fee
        order = Order.objects.get(public_id=oid)
        d = self.earnings()
        self.assertEqual(d["pending"]["orders"], 1)  # cash on delivery: still to come in
        self.assertEqual(d["cur"]["earnings"], 0)
        self.deliver(oid, self.table)
        d = self.earnings()
        self.assertEqual(d["cur"]["fees"], order.platform_fee)
        self.assertEqual(d["cur"]["sales"], 0)
        self.assertEqual(d["cur"]["earnings"], order.platform_fee)
        self.assertEqual(d["feeOrders"], 1)
        self.assertEqual(d["feeBySeller"][0]["label"], "ReMaker products")
        self.assertEqual([e["type"] for e in d["entries"]], ["Platform fee"])

    def test_the_stores_own_product_earns_the_price_and_delivery_but_no_fee(self):
        oid = self.place(self.tote)  # ReOrbit's own product
        self.deliver(oid, self.tote)
        order = Order.objects.get(public_id=oid)
        d = self.earnings()
        self.assertEqual(d["cur"]["sales"], order.subtotal)
        self.assertEqual(d["cur"]["delivery"], order.delivery_fee)
        self.assertEqual(d["cur"]["earnings"], order.platform_fee + order.subtotal + order.delivery_fee)
        self.assertEqual(order.platform_fee, 0)  # nobody pays ReOrbit a fee on ReOrbit's own product
        self.assertEqual(d["feeBySeller"], [])
        self.assertEqual({e["type"] for e in d["entries"]} - {"Delivery fee"}, {"Product sale"})

    def test_voucher_discounts_are_money_out_and_delivery_shows_on_its_own(self):
        oid = self.place(self.tote)
        self.deliver(oid, self.tote)
        Order.objects.filter(public_id=oid).update(discount=50)  # a donation voucher took ₹50 off
        order = Order.objects.get(public_id=oid)
        d = self.earnings()
        by = {row["key"]: row["value"] for row in d["flow"]}
        self.assertEqual((by["delivery"], by["vouchers"]), (order.delivery_fee, -50))
        self.assertEqual(d["cur"]["earnings"], order.subtotal + order.delivery_fee - 50)
        self.assertIn(("Voucher discount", -50), {(e["type"], e["amount"]) for e in d["entries"]})

    def test_the_waterfall_adds_up(self):
        self.deliver(self.place(self.tote), self.tote)
        d = self.earnings()
        by = {row["key"]: row["value"] for row in d["flow"]}
        self.assertEqual(by["fees"] + by["sales"] + by["delivery"] + by["vouchers"] + by["refunds"], by["earnings"])
        self.assertEqual(by["earnings"] + by["purchases"], by["net"])
        self.assertEqual(d["trend"][-1]["cumulative"], d["cur"]["earnings"])


class RemakerDashboardTests(PostDeliveryBase):
    def dash(self, who=None):
        r = self.get(DASH, as_=who or self.maker)
        self.assertEqual(r.status_code, 200, r.data)
        return r.data["data"]

    def test_only_a_remaker_can_open_it(self):
        self.assertEqual(self.get(DASH, as_=self.buyer).status_code, 403)
        self.assertEqual(self.client.get(DASH).status_code, 401)

    def test_a_new_remaker_sees_zeros_not_sample_numbers(self):
        d = self.dash(self.make_remaker("fresh@example.com", "Fresh"))
        self.assertEqual(d["stats"]["sales"]["value"], 0)
        self.assertIsNone(d["stats"]["sales"]["change"])
        self.assertEqual(len(d["revenue"]["series"]), 12)
        self.assertEqual([p["value"] for p in d["pipeline"]], [0, 0, 0, 0])
        self.assertEqual((d["topProducts"], d["recentOrders"], d["activity"]), ([], [], []))
        self.assertIsNone(d["performance"]["score"])
        self.assertEqual(d["impact"], {"items": 0, "co2": 0})

    def test_a_sale_moves_the_pipeline_then_the_money(self):
        oid = self.place(self.table)
        d = self.dash()
        self.assertEqual(d["pipeline"][0]["value"], 1)  # new
        self.assertEqual(d["stats"]["orders"]["value"], 1)
        self.assertEqual(d["stats"]["sales"]["value"], 0)  # not delivered yet
        self.assertEqual(d["recentOrders"][0]["id"], oid)
        self.assertEqual(d["activity"][0]["title"], "New order received")
        self.deliver(oid, self.table)
        order = Order.objects.get(public_id=oid)
        d = self.dash()
        self.assertEqual(d["pipeline"][3]["value"], 1)
        self.assertEqual(d["stats"]["sales"]["value"], order.subtotal)
        self.assertEqual(d["revenue"]["total"], order.subtotal)
        self.assertEqual(d["revenue"]["series"][-1]["value"], order.subtotal)
        self.assertEqual(d["topProducts"][0]["sales"], 1)
        self.assertEqual(d["impact"]["items"], 1)

    def test_other_sellers_sales_never_show(self):
        self.deliver(self.place(self.lamp), self.lamp)  # a member's lamp, not this ReMaker's
        d = self.dash()
        self.assertEqual(d["stats"]["sales"]["value"], 0)
        self.assertEqual(d["recentOrders"], [])
