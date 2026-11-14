"""The Sell products screens: storefront fields, per-product numbers, per-product sales."""

from apps.admins.models import AdminItem
from apps.orders.tests import OrderBase
from apps.social.models import WishlistEntry

STORE = "/api/admins/store/"


class StoreSellTests(OrderBase):
    def make(self, **extra):
        body = {"title": "Teak drawer chest", "category": self.cat.public_id, "price": 7499, "stock": 12,
                "description": "A restored 1970s teak chest of drawers.", **extra}
        r = self.post(STORE, body, as_=self.boss)
        self.assertEqual(r.status_code, 201, r.data)
        return r.data["data"]["product"]

    def test_storefront_fields_round_trip(self):
        p = self.make(mrp=9800, condition="Refurbished", source="refurbished", delivery="free", returnable=False,
                      specs={"material": "Solid teak", "dimensions": "90 x 45 x 100 cm", "weight": "32", "warranty": "6 months"})
        self.assertEqual((p["mrp"], p["condition"], p["source"], p["delivery"], p["returnable"]),
                         ("9800.00", "Refurbished", "refurbished", "free", False))
        self.assertEqual(p["specs"]["material"], "Solid teak")
        r = self.patch(f"{STORE}{p['id']}/", {"mrp": 0, "condition": "Good", "specs": {"weight": "2.5"}}, as_=self.boss)
        self.assertEqual(r.status_code, 200, r.data)
        got = r.data["data"]["product"]
        self.assertIsNone(got["mrp"])
        self.assertEqual((got["condition"], got["specs"]["weight"], got["specs"]["material"]), ("Good", "2.5", ""))

    def test_defaults_for_plain_products(self):
        p = self.make()
        self.assertEqual((p["source"], p["delivery"], p["returnable"], p["specs"]), ("other", "flat", True, {}))
        self.assertEqual(p["condition"], "Good")

    def test_bad_storefront_values_are_refused(self):
        for body, field in (({"condition": "Mint"}, "condition"), ({"source": "garage"}, "source"),
                            ({"delivery": "drone"}, "delivery"), ({"mrp": "abc"}, "mrp"),
                            ({"specs": {"weight": "heavy"}}, "specs"), ({"specs": "x"}, "specs")):
            r = self.post(STORE, {"title": "Jute bag", "category": self.cat.public_id, **body}, as_=self.boss)
            self.assertEqual(r.status_code, 400, (body, r.data))
            self.assertIn(field, r.data["errors"])

    def test_stats_count_sales_and_wishlists(self):
        before = self.get(f"{STORE}stats/", as_=self.boss).data["data"]["stats"]
        self.assertNotIn(self.tote.public_id, before)
        r = self.checkout([{"id": self.tote.public_id, "qty": 2}])
        self.assertEqual(r.status_code, 201, r.data)
        self.post("/api/social/wishlist/", {"id": self.tote.public_id}, as_=self.buyer)
        s = self.get(f"{STORE}stats/", as_=self.boss).data["data"]["stats"][self.tote.public_id]
        self.assertEqual((s["sold"], s["orders"], s["to_handle"], s["revenue"], s["wishlisted"]), (2, 1, 1, 0, 1))
        order = r.data["data"]["orders"][0]["id"]
        self.assertEqual(self.post(f"/api/orders/admin/{order}/cancel/", {"reason": "Customer asked"}, as_=self.boss).status_code, 200)
        s = self.get(f"{STORE}stats/", as_=self.boss).data["data"]["stats"][self.tote.public_id]
        self.assertEqual((s["sold"], s["to_handle"]), (0, 0))

    def test_stats_need_the_products_module(self):
        self.assertEqual(self.get(f"{STORE}stats/", as_=self.buyer).status_code, 403)
        nobody = self.make_admin("n@example.com", modules={"orders": "view"})
        self.assertEqual(self.get(f"{STORE}stats/", as_=nobody).status_code, 403)

    def test_admin_orders_can_be_filtered_to_one_product(self):
        self.checkout([{"id": self.tote.public_id, "qty": 1}, {"id": self.lamp.public_id, "qty": 1}])
        rows = self.get(f"/api/orders/admin/?item={self.tote.public_id}", as_=self.boss).data["data"]["results"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["seller"]["type"], "platform")
        self.assertEqual(self.get("/api/orders/admin/?item=ADI-NOPE", as_=self.boss).data["data"]["count"], 0)

    def test_delete_needs_a_pause_first(self):
        p = self.make()
        pid = p["id"]
        AdminItem.objects.filter(public_id=pid).update(status="Listed")
        self.assertEqual(self.delete(f"{STORE}{pid}/", as_=self.boss).status_code, 409)
        self.assertEqual(self.post(f"{STORE}{pid}/pause/", {}, as_=self.boss).status_code, 200)
        self.assertEqual(self.delete(f"{STORE}{pid}/", as_=self.boss).status_code, 200)
        self.assertFalse(AdminItem.objects.filter(public_id=pid).exists())
        self.assertEqual(WishlistEntry.objects.count(), 0)

    def test_public_page_views_are_counted(self):
        self.assertEqual(self.tote.view_count, 0)
        self.assertEqual(self.client.get(f"/api/marketplace/{self.tote.public_id}/").status_code, 200)
        self.client.get(f"/api/marketplace/{self.tote.public_id}/")
        self.tote.refresh_from_db()
        self.assertEqual(self.tote.view_count, 2)
        self.assertEqual(self.get(f"{STORE}{self.tote.public_id}/", as_=self.boss).data["data"]["product"]["views"], 2)
