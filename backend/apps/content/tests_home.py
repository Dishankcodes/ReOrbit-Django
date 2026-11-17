"""Banner pictures and live numbers, the Home spotlight, and what the Home pages are served."""

import io
import shutil
import tempfile

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image

from apps.orders.tests import OrderBase

from .models import Banner, HomePick

BANNER = {"title": "Festive sale", "subtitle": "Up to 40% off", "cta": "Shop now", "link": "/user-marketplace",
          "placement": "Home hero", "audience": "Everyone", "image": "https://example.com/a.jpg"}


def png(w=40, h=20):
    buf = io.BytesIO()
    Image.new("RGB", (w, h), (30, 90, 60)).save(buf, format="PNG")
    return buf.getvalue()


class HomeBase(OrderBase):
    def setUp(self):
        super().setUp()
        cache.clear()  # the public Home page is cached; start every test from a cold cache
        self.addCleanup(cache.clear)
        self.editor = self.make_admin("ed@example.com", modules={"content": "edit"})
        self.viewer = self.make_admin("vw@example.com", modules={"content": "view"})

    def put(self, url, data, as_=None):
        return self.client.put(url, data, format="json", **self._headers(as_))

    def pick(self, surface, ids, as_=None):
        return self.put("/api/content/admin/spotlight/", {"surface": surface, "ids": ids}, as_=as_ or self.editor)

    def home(self):
        r = self.get("/api/public/home/")
        self.assertEqual(r.status_code, 200, r.data)
        return r.data["data"]


class BannerUploadTests(HomeBase):
    def setUp(self):
        super().setUp()
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        patcher = override_settings(MEDIA_ROOT=self.tmp)
        patcher.enable()
        self.addCleanup(patcher.disable)

    def upload(self, content, name="hero.png", ctype="image/png", as_=None):
        f = SimpleUploadedFile(name, content, content_type=ctype)
        return self.client.post("/api/content/admin/banners/upload/", {"file": f}, format="multipart",
                                **self._headers(as_ or self.editor))

    def test_a_real_picture_is_stored_and_can_be_used_on_a_banner(self):
        r = self.upload(png())
        self.assertEqual(r.status_code, 201, r.data)
        url = r.data["data"]["url"]
        self.assertIn("/banners/", url)
        self.assertNotIn("hero", url)  # the original name never reaches the disk
        b = self.post("/api/content/admin/banners/", {**BANNER, "image": url}, as_=self.editor)
        self.assertEqual(b.status_code, 201, b.data)

    def test_only_pictures_under_5mb_are_accepted(self):
        self.assertEqual(self.upload(b"not a picture", "x.png").status_code, 400)
        big = png() + b"0" * (5 * 1024 * 1024)
        self.assertEqual(self.upload(big).status_code, 400)
        self.assertEqual(self.client.post("/api/content/admin/banners/upload/", {}, format="multipart",
                                          **self._headers(self.editor)).status_code, 400)

    def test_uploading_needs_edit_access_to_content(self):
        self.assertEqual(self.upload(png(), as_=self.viewer).status_code, 403)
        self.assertEqual(self.upload(png(), as_=self.buyer).status_code, 403)


class BannerStatsTests(HomeBase):
    def test_numbers_can_be_polled_without_reloading_the_list(self):
        b = self.post("/api/content/admin/banners/", BANNER, as_=self.editor).data["data"]["banner"]
        self.patch(f"/api/content/admin/banners/{b['id']}/", {"active": True}, as_=self.editor)
        self.assertEqual(self.get("/api/content/admin/banners/stats/", as_=self.viewer).data["data"]["results"][b["id"]]["views"], 0)
        for _ in range(3):
            self.post(f"/api/content/banners/{b['id']}/view/")
        self.post(f"/api/content/banners/{b['id']}/click/")
        row = self.get("/api/content/admin/banners/stats/", as_=self.viewer).data["data"]["results"][b["id"]]
        self.assertEqual((row["views"], row["clicks"], row["status"]), (3, 1, "Live"))
        self.assertAlmostEqual(row["ctr"], 100 / 3)

    def test_stats_need_the_content_module(self):
        other = self.make_admin("o2@example.com", modules={"products": "edit"})
        self.assertEqual(self.get("/api/content/admin/banners/stats/", as_=other).status_code, 403)

    def test_remaker_pages_get_their_own_audience(self):
        for aud in ("ReMakers", "Visitors only"):
            b = self.post("/api/content/admin/banners/", {**BANNER, "audience": aud, "title": f"For {aud}"}, as_=self.editor)
            self.patch(f"/api/content/admin/banners/{b.data['data']['banner']['id']}/", {"active": True}, as_=self.editor)
        titles = lambda who: sorted(x["title"] for x in self.get(f"/api/content/banners/?audience={who}").data["data"]["results"])
        self.assertEqual(titles("remaker_visitor"), ["For ReMakers", "For Visitors only"])
        self.assertEqual(titles("remaker"), ["For ReMakers"])
        self.assertEqual(titles("member"), [])


class SpotlightTests(HomeBase):
    def test_picks_lead_the_member_home_and_the_rest_are_the_newest(self):
        self.assertFalse(any(c.get("boosted") for c in self.home()["products"]))
        r = self.pick("user", [self.table.public_id, self.lamp.public_id])
        self.assertEqual(r.status_code, 200, r.data)
        products = self.home()["products"]
        self.assertEqual([c["id"] for c in products[:2]], [self.table.public_id, self.lamp.public_id])
        self.assertTrue(products[0]["boosted"] and products[1]["boosted"])
        self.assertEqual(len(products), 3)
        self.assertEqual(len({c["id"] for c in products}), 3)  # no product twice
        self.assertEqual(self.home()["remaker_hero"], [])

    def test_remaker_home_gets_its_own_pictures(self):
        from unittest import mock

        # The ReMaker hero only shows products that have a photo; these fixtures have none, so give them one.
        patcher = mock.patch("apps.listings.marketplace._cover", return_value="https://example.com/p.jpg")
        patcher.start()
        self.addCleanup(patcher.stop)
        self.pick("remaker", [self.tote.public_id, self.table.public_id, self.lamp.public_id])
        hero = self.home()["remaker_hero"]
        self.assertEqual([c["id"] for c in hero], [self.tote.public_id, self.table.public_id, self.lamp.public_id])
        self.assertEqual(hero[0]["title"], "Jute tote")
        self.assertFalse(any(c.get("boosted") for c in self.home()["products"]))  # member Home is untouched

    def test_changes_show_at_once_even_though_the_home_page_is_cached(self):
        self.home()  # fills the cache
        self.pick("user", [self.tote.public_id])
        self.assertEqual(self.home()["products"][0]["id"], self.tote.public_id)
        self.pick("user", [])
        self.assertFalse(self.home()["products"][0].get("boosted"))

    def test_a_product_that_stops_being_live_drops_out_by_itself(self):
        self.pick("user", [self.table.public_id, self.tote.public_id])
        self.table.status = "Sold_Out"
        self.table.save()
        ids = [c["id"] for c in self.home()["products"]]
        self.assertNotIn(self.table.public_id, ids)
        self.assertEqual(ids[0], self.tote.public_id)

    def test_what_can_be_picked(self):
        self.assertEqual(self.pick("user", ["LST-NOPE"]).status_code, 400)
        self.assertEqual(self.pick("user", [self.lamp.public_id, self.lamp.public_id]).status_code, 400)
        self.assertEqual(self.pick("user", [self.lamp.public_id, self.table.public_id, self.tote.public_id, "RPR-1"]).status_code, 400)
        self.assertEqual(self.pick("nowhere", [self.lamp.public_id]).status_code, 400)
        self.assertEqual(self.put("/api/content/admin/spotlight/", {"surface": "user", "ids": "x"}, as_=self.editor).status_code, 400)
        self.assertEqual(HomePick.objects.count(), 0)  # a refused save changes nothing
        self.lamp.item_status = "Sold"
        self.lamp.save()
        self.assertEqual(self.pick("user", [self.lamp.public_id]).status_code, 400)
        self.table.status = "Sold_Out"
        self.table.save()
        self.assertEqual(self.pick("user", [self.table.public_id]).status_code, 400)  # sold out: not worth a slot

    def test_the_same_product_can_be_on_both_homes(self):
        self.assertEqual(self.pick("user", [self.table.public_id]).status_code, 200)
        self.assertEqual(self.pick("remaker", [self.table.public_id]).status_code, 200)
        self.pick("user", [self.tote.public_id])  # replacing one list leaves the other alone
        self.assertEqual(HomePick.objects.filter(surface="remaker").count(), 1)

    def test_reading_and_searching(self):
        self.pick("user", [self.lamp.public_id])
        body = self.get("/api/content/admin/spotlight/", as_=self.viewer).data["data"]
        self.assertEqual((body["max"], [c["id"] for c in body["user"]], body["remaker"]), (3, [self.lamp.public_id], []))
        found = self.get("/api/content/admin/spotlight/search/?q=teak", as_=self.viewer).data["data"]["results"]
        self.assertEqual([c["id"] for c in found], [self.table.public_id])
        self.assertEqual(len(self.get("/api/content/admin/spotlight/search/", as_=self.viewer).data["data"]["results"]), 3)

    def test_permissions_and_audit(self):
        self.assertEqual(self.pick("user", [self.lamp.public_id], as_=self.viewer).status_code, 403)
        self.assertEqual(self.pick("user", [self.lamp.public_id], as_=self.buyer).status_code, 403)
        self.assertIn(self.get("/api/content/admin/spotlight/").status_code, (401, 403))
        self.assertEqual(self.pick("user", [self.lamp.public_id]).status_code, 200)
        from apps.core.models import AuditLog

        self.assertTrue(AuditLog.objects.filter(action="home.spotlight").exists())
