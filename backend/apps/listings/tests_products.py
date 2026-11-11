import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import override_settings
from django.test.utils import CaptureQueriesContext
from PIL import Image

from apps.admins.models import AdminItem
from apps.core.models import Category
from apps.core.testing import APIBase
from apps.remakers.models import RemakerProduct

from .models import Item


def png():
    buf = io.BytesIO()
    Image.new("RGB", (40, 40), "red").save(buf, "PNG")
    return SimpleUploadedFile("p.png", buf.getvalue(), content_type="image/png")


BODY = {"title": "Teak side table", "description": "Made from an old teak door, oiled and sealed.",
        "price": 2400, "stock": 3, "materials": "Reclaimed teak", "dimensions": "40 x 40 x 55 cm",
        "customization_available": True}


@override_settings(MEDIA_ROOT="/tmp/reorbit_test_media")
class ProductBase(APIBase):
    def setUp(self):
        super().setUp()
        self.cat = Category.objects.create(name="Furniture", slug="furniture", applies_to="Both")
        self.item_only = Category.objects.create(name="Books", slug="books", applies_to="Item")
        self.maker = self.make_remaker()
        self.other_maker = self.make_remaker("m2@example.com", "Maker Two")
        self.boss = self.make_admin("boss@example.com", modules={"products": "edit"})

    def up(self, base, pid, who, *files):
        return self.client.post(f"{base}{pid}/images/", {"images": list(files) or [png()]},
                                format="multipart", **self._headers(who))


class RemakerProductTests(ProductBase):
    B = "/api/remakers/products/"

    def draft(self, **over):
        return self.post(self.B, {**BODY, "category": self.cat.public_id, **over}, as_=self.maker)

    def live(self, **over):
        pid = self.draft(**over).data["data"]["product"]["id"]
        self.up(self.B, pid, self.maker)
        r = self.post(f"{self.B}{pid}/publish/", {}, as_=self.maker)
        self.assertEqual(r.status_code, 200, r.data)
        return pid

    def test_full_flow(self):
        r = self.draft()
        self.assertEqual(r.status_code, 201, r.data)
        p = r.data["data"]["product"]
        self.assertEqual((p["status"], p["stock"], p["remaker"]["username"]), ("Draft", 3, "Maker One"))
        pid = p["id"]
        r = self.post(f"{self.B}{pid}/publish/", {}, as_=self.maker)
        self.assertEqual(r.status_code, 400)
        self.assertIn("images", r.data["errors"])
        self.assertEqual(self.up(self.B, pid, self.maker).status_code, 201)
        r = self.post(f"{self.B}{pid}/publish/", {}, as_=self.maker)
        self.assertEqual(r.data["data"]["product"]["status"], "Listed")
        self.assertIsNotNone(r.data["data"]["product"]["cover"])

    def test_pickup_preference_round_trips(self):
        r = self.draft(pickup_preference="Platform_Pickup")
        self.assertEqual(r.status_code, 201, r.data)
        product = r.data["data"]["product"]
        self.assertEqual(product["pickup_preference"], "Platform_Pickup")

        pid = product["id"]
        r = self.patch(f"{self.B}{pid}/", {"pickup_preference": "Seller_Handover"}, as_=self.maker)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["data"]["product"]["pickup_preference"], "Seller_Handover")

        r = self.patch(f"{self.B}{pid}/", {"pickup_preference": "Unknown"}, as_=self.maker)
        self.assertEqual(r.status_code, 400, r.data)
        self.assertIn("pickup_preference", r.data["errors"])

    def test_validation(self):
        self.assertEqual(self.draft(title="a").status_code, 400)
        self.assertEqual(self.draft(category=self.item_only.public_id).status_code, 400)  # items-only category
        self.assertEqual(self.draft(price=0).status_code, 400)
        self.assertEqual(self.draft(price=9.5).status_code, 400)
        self.assertEqual(self.draft(stock=-1).status_code, 400)
        self.assertEqual(self.draft(stock="many").status_code, 400)

    def test_stock_moves_status(self):
        pid = self.live()
        url = f"{self.B}{pid}/"
        r = self.patch(url, {"stock": 0}, as_=self.maker)
        self.assertEqual(r.data["data"]["product"]["status"], "Sold_Out")
        r = self.patch(url, {"stock": 5}, as_=self.maker)
        self.assertEqual(r.data["data"]["product"]["status"], "Listed")
        # a paused product is not revived by restocking
        self.post(f"{url}pause/", {}, as_=self.maker)
        r = self.patch(url, {"stock": 9}, as_=self.maker)
        self.assertEqual(r.data["data"]["product"]["status"], "Inactive")
        self.assertEqual(self.post(f"{url}publish/", {}, as_=self.maker).status_code, 200)

    def test_publish_needs_stock(self):
        pid = self.draft(stock=0).data["data"]["product"]["id"]
        self.up(self.B, pid, self.maker)
        r = self.post(f"{self.B}{pid}/publish/", {}, as_=self.maker)
        self.assertIn("stock", r.data["errors"])

    def test_ownership_and_roles(self):
        pid = self.draft().data["data"]["product"]["id"]
        self.assertEqual(self.get(f"{self.B}{pid}/", as_=self.other_maker).status_code, 404)
        self.assertEqual(self.patch(f"{self.B}{pid}/", {"title": "Mine now"}, as_=self.other_maker).status_code, 404)
        self.assertEqual(self.get(self.B).status_code, 401)
        self.assertEqual(self.get(self.B, as_=self.make_user()).status_code, 403)
        self.assertEqual(self.get(self.B, as_=self.boss).status_code, 403)
        self.assertEqual(len(self.get(self.B, as_=self.other_maker).data["data"]["results"]), 0)

    def test_photos(self):
        pid = self.draft().data["data"]["product"]["id"]
        for _ in range(8):
            self.up(self.B, pid, self.maker)
        self.assertEqual(self.up(self.B, pid, self.maker).status_code, 400)  # 9th
        imgs = self.get(f"{self.B}{pid}/", as_=self.maker).data["data"]["product"]["images"]
        ids = [i["id"] for i in imgs]
        r = self.post(f"{self.B}{pid}/images/order/", {"order": ids[::-1]}, as_=self.maker)
        self.assertEqual(r.data["data"]["product"]["images"][0]["id"], ids[-1])
        bad = SimpleUploadedFile("x.png", b"nope", content_type="image/png")
        self.assertEqual(self.up(self.B, pid, self.maker, bad).status_code, 400)
        self.assertEqual(self.delete(f"{self.B}{pid}/images/{ids[0]}/", as_=self.maker).status_code, 200)

    def test_cannot_remove_last_photo_when_live(self):
        pid = self.live()
        img = self.get(f"{self.B}{pid}/", as_=self.maker).data["data"]["product"]["images"][0]["id"]
        self.assertEqual(self.delete(f"{self.B}{pid}/images/{img}/", as_=self.maker).status_code, 409)

    def test_delete_rules(self):
        pid = self.live()
        self.assertEqual(self.delete(f"{self.B}{pid}/", as_=self.maker).status_code, 409)
        self.post(f"{self.B}{pid}/pause/", {}, as_=self.maker)
        self.assertEqual(self.delete(f"{self.B}{pid}/", as_=self.maker).status_code, 200)
        self.assertEqual(self.get(f"{self.B}{pid}/", as_=self.maker).status_code, 404)

    def test_admin_deactivate_and_reactivate(self):
        pid = self.live()
        viewer = self.make_admin("v@example.com", modules={"products": "view"})
        a = f"{self.B}admin/{pid}/"
        self.assertEqual(self.get(f"{self.B}admin/", as_=viewer).status_code, 200)
        self.assertEqual(self.post(f"{a}deactivate/", {"reason": "Not allowed"}, as_=viewer).status_code, 403)
        self.assertEqual(self.post(f"{a}deactivate/", {}, as_=self.boss).status_code, 400)
        r = self.post(f"{a}deactivate/", {"reason": "Counterfeit materials"}, as_=self.boss)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["data"]["product"]["deactivation"]["reason"], "Counterfeit materials")
        # hidden from buyers; the maker can neither edit nor republish
        self.assertEqual(self.client.get(f"/api/marketplace/{pid}/").status_code, 404)
        self.assertEqual(self.patch(f"{self.B}{pid}/", {"title": "Sneaky"}, as_=self.maker).status_code, 403)
        self.assertEqual(self.post(f"{self.B}{pid}/publish/", {}, as_=self.maker).status_code, 403)
        self.assertTrue(self.maker.notifications.filter(title="Your product was turned off").exists())
        r = self.post(f"{a}reactivate/", {}, as_=self.boss)
        self.assertEqual(r.data["data"]["product"]["status"], "Listed")
        self.assertEqual(self.client.get(f"/api/marketplace/{pid}/").status_code, 200)
        self.assertEqual(self.post(f"{a}reactivate/", {}, as_=self.boss).status_code, 409)  # already on


class AdminStoreTests(ProductBase):
    B = "/api/admins/store/"

    def test_flow_and_sku(self):
        r = self.post(self.B, {**BODY, "category": self.cat.public_id, "title": "ReOrbit tote"}, as_=self.boss)
        self.assertEqual(r.status_code, 201, r.data)
        p = r.data["data"]["product"]
        self.assertTrue(p["sku"].startswith("RO-"))
        pid = p["id"]
        self.up(self.B, pid, self.boss)
        self.assertEqual(self.post(f"{self.B}{pid}/publish/", {}, as_=self.boss).data["data"]["product"]["status"], "Listed")
        r = self.patch(f"{self.B}{pid}/", {"sku": "tote-001", "stock": 0}, as_=self.boss)
        self.assertEqual((r.data["data"]["product"]["sku"], r.data["data"]["product"]["status"]), ("TOTE-001", "Sold_Out"))
        dup = self.post(self.B, {**BODY, "category": self.cat.public_id, "sku": "TOTE-001"}, as_=self.boss)
        self.assertEqual(dup.status_code, 400)

    def test_permissions(self):
        viewer = self.make_admin("v@example.com", modules={"products": "view"})
        none = self.make_admin("n@example.com", modules={"users": "edit"})
        self.assertEqual(self.get(self.B, as_=viewer).status_code, 200)
        self.assertEqual(self.post(self.B, {**BODY, "category": self.cat.public_id}, as_=viewer).status_code, 403)
        self.assertEqual(self.get(self.B, as_=none).status_code, 403)
        self.assertEqual(self.get(self.B, as_=self.maker).status_code, 403)
        self.assertEqual(self.get(self.B).status_code, 401)


class MarketplaceTests(ProductBase):
    def setUp(self):
        super().setUp()
        seller = self.make_user("seller@example.com")
        item = Item.objects.create(user=seller, category=self.cat, title="Walnut shelf",
                                   description="Solid walnut shelf", condition="Good",
                                   quantity=1, listing_price=3800, pickup_preference="Seller_Handover",
                                   item_status="Listed", city="Surat", pincode="395003")
        self.item = item
        self.prod = RemakerProduct.objects.create(remaker=self.maker, category=self.cat, title="Teak table",
                                                  description="Made from an old door", price=2400, stock=2, status="Listed")
        self.store = AdminItem.objects.create(admin=self.boss, category=self.cat, title="Jute tote",
                                              description="Hand-stitched tote", price=599, stock=0,
                                              status="Sold_Out", sku="RO-1")
        RemakerProduct.objects.create(remaker=self.maker, category=self.cat, title="Draft thing",
                                      description="not live yet", price=1, stock=1, status="Draft")

    def browse(self, qs=""):
        return self.client.get("/api/marketplace/" + qs).data["data"]

    def test_all_three_kinds_together(self):
        d = self.browse()
        self.assertEqual(d["count"], 3)
        kinds = sorted(r["kind"] for r in d["results"])
        self.assertEqual(kinds, ["admin", "remaker", "user"])
        row = {r["kind"]: r for r in d["results"]}
        self.assertEqual(row["admin"]["seller"]["name"], "ReOrbit")
        self.assertTrue(row["admin"]["sold_out"])
        self.assertEqual(row["remaker"]["seller"]["username"], "Maker One")
        self.assertNotIn("email", str(d))

    def test_filters_and_ordering(self):
        self.assertEqual([r["kind"] for r in self.browse("?sold_by=remaker")["results"]], ["remaker"])
        self.assertEqual(self.browse("?q=walnut")["count"], 1)
        self.assertEqual(self.browse("?min_price=1000&max_price=3000")["count"], 1)
        self.assertEqual(self.browse("?condition=Good")["count"], 1)  # only user listings have one
        prices = [float(r["price"]) for r in self.browse("?ordering=price_asc")["results"]]
        self.assertEqual(prices, sorted(prices))
        self.assertEqual(self.browse("?category=furniture")["count"], 3)

    def test_hidden_when_not_public(self):
        Item.objects.filter(pk=self.item.pk).update(moderation_status="Disabled")
        self.assertEqual(self.browse()["count"], 2)
        self.maker.status = "Suspended"
        self.maker.save()
        self.assertEqual(self.browse()["count"], 1)

    def test_detail_by_prefix(self):
        for pid, kind in ((self.item.public_id, "user"), (self.prod.public_id, "remaker"), (self.store.public_id, "admin")):
            r = self.client.get(f"/api/marketplace/{pid}/")
            self.assertEqual(r.status_code, 200, pid)
            self.assertEqual(r.data["data"]["product"]["kind"], kind)
        self.assertEqual(self.client.get("/api/marketplace/XXX-1/").status_code, 404)
        self.assertEqual(self.client.get("/api/marketplace/categories/").status_code, 200)

    def test_query_count_is_flat(self):
        # one page of 20 mixed rows must not cost a query per row
        for n in range(15):
            RemakerProduct.objects.create(remaker=self.maker, category=self.cat, title=f"P{n}",
                                          description="long enough text", price=100 + n, stock=1, status="Listed")
        with CaptureQueriesContext(connection) as ctx:
            d = self.browse()
        self.assertEqual(d["count"], 18)
        self.assertLessEqual(len(ctx), 10, [q["sql"][:80] for q in ctx.captured_queries])
