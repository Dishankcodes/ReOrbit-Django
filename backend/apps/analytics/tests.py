"""ReMaker analytics: real numbers from orders, wishlist, follows and counted views."""

from datetime import timedelta

from django.utils import timezone

from apps.orders.models import Order
from apps.orders.tests_post_delivery import PostDeliveryBase
from apps.social.models import Follow, WishlistEntry

from .models import ProductViewDay, ProfileViewDay

URL = "/api/analytics/me/"


class AnalyticsTests(PostDeliveryBase):
    def report(self, range_key="30", who=None):
        r = self.get(f"{URL}?range={range_key}", as_=who or self.maker)
        self.assertEqual(r.status_code, 200, r.data)
        return r.data["data"]

    def view(self, product, source="marketplace", who=None, kind="product"):
        body = {"type": kind, "id": product.public_id, "source": source}
        kw = self._headers(who) if who else {}
        return self.client.post("/api/analytics/view/", body, format="json", **kw)

    # ---- access ---------------------------------------------------------- #
    def test_only_a_remaker_can_open_it(self):
        self.assertEqual(self.get(URL, as_=self.buyer).status_code, 403)
        self.assertEqual(self.get(URL, as_=self.boss).status_code, 403)
        self.assertEqual(self.client.get(URL).status_code, 401)

    def test_bad_range_is_refused(self):
        self.assertEqual(self.get(URL + "?range=15", as_=self.maker).status_code, 400)

    def test_a_new_remaker_gets_an_empty_but_valid_report(self):
        d = self.report("30", who=self.make_remaker("new@example.com", "Newbie"))
        self.assertFalse(d["hasData"])
        self.assertEqual((d["current"]["revenue"], d["current"]["orders"], d["current"]["views"]), (0, 0, 0))
        self.assertEqual(len(d["series"]), 30)
        self.assertIsNone(d["heatmap"]["best"])
        self.assertEqual(len(d["funnel"]), 4)
        self.assertEqual(d["products"], [])

    # ---- ranges ---------------------------------------------------------- #
    def test_each_range_has_the_right_chart_points(self):
        self.assertEqual(len(self.report("7")["series"]), 7)
        self.assertEqual(len(self.report("30")["series"]), 30)
        weeks = self.report("90")["series"]
        self.assertTrue(13 <= len(weeks) <= 14)
        months = self.report("365")["series"]
        self.assertTrue(12 <= len(months) <= 13)
        self.assertEqual(self.report("365")["range"]["label"], "12 months")

    # ---- earnings and orders --------------------------------------------- #
    def test_earnings_count_on_delivery_and_orders_on_placing(self):
        oid = self.place(self.table)
        d = self.report("7")
        self.assertEqual((d["current"]["orders"], d["current"]["revenue"]), (1, 0))  # placed, not yet delivered
        self.deliver(oid, self.table)
        d = self.report("7")
        self.assertEqual((d["current"]["orders"], d["current"]["revenue"]), (1, 2400))  # the item price
        self.assertEqual(d["current"]["aov"], 2400)
        self.assertEqual(d["funnel"][2]["value"], 1)
        self.assertEqual(d["funnel"][3]["value"], 1)
        self.assertEqual(sum(p["revenue"] for p in d["series"]), 2400)
        self.assertEqual(sum(p["orders"] for p in d["series"]), 1)

    def test_other_sellers_orders_never_leak_in(self):
        self.deliver(self.place(self.lamp), self.lamp)  # a member's lamp
        d = self.report("30")
        self.assertEqual((d["current"]["orders"], d["current"]["revenue"]), (0, 0))

    def test_a_refunded_return_takes_the_earning_back(self):
        oid = self.place(self.table)
        self.deliver(oid, self.table)
        o = Order.objects.get(public_id=oid)
        from apps.orders.models import ReturnRequest

        ReturnRequest.objects.create(order=o, reason_code="changed_mind", status=ReturnRequest.Status.REFUNDED,
                                     details="Changed my mind about it")
        d = self.report("7")
        self.assertEqual(d["current"]["revenue"], 0)
        self.assertEqual(d["products"][0]["revenue"], 0)

    def test_the_previous_period_gives_the_change(self):
        oid = self.place(self.table)
        self.deliver(oid, self.table)
        Order.objects.filter(public_id=oid).update(
            created_at=timezone.now() - timedelta(days=10), delivered_at=timezone.now() - timedelta(days=10))
        d = self.report("7")  # the order is now in the 7 days before this week
        self.assertEqual(d["current"]["revenue"], 0)
        self.assertEqual(d["previous"]["revenue"], 2400)
        self.assertEqual(d["deltas"]["revenue"], -100.0)
        self.assertIsNone(self.report("30")["deltas"]["revenue"])  # nothing before: no change to show

    # ---- cities, heatmap, categories ------------------------------------- #
    def test_cities_heatmap_and_categories(self):
        self.deliver(self.place(self.table), self.table)
        d = self.report("30")
        self.assertEqual(d["cities"][0]["city"], "Surat")
        self.assertEqual(d["cities"][0]["orders"], 1)
        self.assertEqual(d["cities"][0]["revenue"], 2400)
        self.assertEqual(d["cities"][0]["percent"], 100.0)
        h = d["heatmap"]
        self.assertEqual(sum(sum(row) for row in h["cells"]), 1)
        self.assertEqual(h["best"]["value"], 1)
        self.assertEqual(len(h["cells"]), 7)
        self.assertEqual(len(h["cells"][0]), 6)
        self.assertEqual(d["categories"][0]["revenue"], 2400)
        self.assertEqual(d["categories"][0]["share"], 100.0)

    # ---- views, saves, followers, products -------------------------------- #
    def test_views_are_counted_by_source_and_never_for_the_owner(self):
        for source in ("marketplace", "marketplace", "profile", "made-up"):
            self.assertEqual(self.view(self.table, source).status_code, 200)
        self.assertFalse(self.view(self.table, "marketplace", who=self.maker).data["data"]["counted"])
        self.assertTrue(self.view(self.table, "feed", who=self.buyer).data["data"]["counted"])
        self.assertEqual(ProductViewDay.objects.filter(remaker_product=self.table).count(), 4)
        d = self.report("7")
        self.assertEqual(d["current"]["views"], 5)
        src = {s["key"]: s["value"] for s in d["sources"]}
        self.assertEqual((src["marketplace"], src["profile"], src["feed"], src["other"]), (2, 1, 1, 1))
        self.assertEqual(sum(s["percent"] for s in d["sources"]), 100.0)
        self.assertEqual(d["products"][0]["views"], 5)

    def test_profile_visits_and_unknown_things(self):
        self.assertTrue(self.client.post("/api/analytics/view/", {"type": "profile", "id": self.maker.public_id},
                                         format="json").data["data"]["counted"])
        self.assertEqual(ProfileViewDay.objects.get(remaker=self.maker).views, 1)
        self.assertEqual(self.report("7")["current"]["visits"], 1)
        self.assertEqual(self.client.post("/api/analytics/view/", {"type": "product", "id": "RPR-9999"},
                                          format="json").status_code, 404)
        self.assertEqual(self.client.post("/api/analytics/view/", {"type": "x"}, format="json").status_code, 400)
        # a stale token never breaks the page view
        r = self.client.post("/api/analytics/view/", {"type": "product", "id": self.table.public_id},
                             format="json", HTTP_AUTHORIZATION="Bearer expired")
        self.assertEqual(r.status_code, 200)

    def test_saves_and_followers_and_the_conversion(self):
        WishlistEntry.objects.create(actor_type="user", user=self.buyer, item_kind="remaker", item_ref=self.table.public_id)
        Follow.objects.create(follower_type="user", user=self.buyer, target=self.maker)
        for _ in range(4):
            self.view(self.table)
        self.deliver(self.place(self.table), self.table)
        d = self.report("30")
        self.assertEqual((d["current"]["saves"], d["current"]["followers"]), (1, 1))
        self.assertEqual(d["current"]["conv"], 25.0)  # 1 order from 4 views
        row = d["products"][0]
        self.assertEqual((row["id"], row["views"], row["saves"], row["orders"], row["conv"]),
                         (self.table.public_id, 4, 1, 1, 25.0))

    def test_a_draft_product_is_not_listed_until_it_has_activity(self):
        from apps.remakers.models import RemakerProduct

        RemakerProduct.objects.create(remaker=self.maker, category=self.cat, title="Unfinished",
                                      price=100, stock=1, status="Draft")
        self.assertEqual([p["title"] for p in self.report()["products"]], ["Teak table"])
