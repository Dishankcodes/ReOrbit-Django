import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image

from apps.admins.models import Admins
from apps.core.models import Category, PlatformSettings
from apps.core.testing import APIBase

from .models import Item


def png(color="red", size=(40, 40)):
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, "PNG")
    return SimpleUploadedFile("pic.png", buf.getvalue(), content_type="image/png")


GOOD = {
    "title": "Walnut bookshelf",
    "description": "Solid walnut bookshelf with four shelves.",
    "condition": "Very Good",
    "quantity": 1,
    "listing_price": 3800,
    "pickup_preference": "Seller_Handover",
    "city": "surat",
    "pincode": "395003",
}


@override_settings(MEDIA_ROOT="/tmp/reorbit_test_media")
class ListingTests(APIBase):
    def setUp(self):
        super().setUp()
        self.cat = Category.objects.create(name="Furniture", slug="furniture")
        self.user = self.make_user("seller@example.com")
        self.other = self.make_user("other@example.com")

    def upload(self, pid, *files):
        return self.client.post(
            f"/api/listings/me/{pid}/images/",
            {"images": list(files)},
            format="multipart",
            **self._headers(self.user),
        )

    def draft(self, **over):
        r = self.post("/api/listings/me/", {**GOOD, "category": self.cat.public_id, **over}, as_=self.user)
        return r

    def live(self):
        pid = self.draft().data["data"]["listing"]["id"]
        self.upload(pid, png())
        r = self.post(f"/api/listings/me/{pid}/publish/", {}, as_=self.user)
        return pid, r

    def test_draft_then_photo_then_publish(self):
        r = self.draft()
        self.assertEqual(r.status_code, 201, r.data)
        item = r.data["data"]["listing"]
        self.assertEqual(item["item_status"], "Draft")
        self.assertEqual(item["city"], "Surat")  # canonical
        pid = item["id"]
        # no photo yet
        r = self.post(f"/api/listings/me/{pid}/publish/", {}, as_=self.user)
        self.assertEqual(r.status_code, 400)
        self.assertIn("images", r.data["errors"])
        r = self.upload(pid, png())
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["data"]["listing"]["images"][0]["image_type"], "Cover")
        r = self.post(f"/api/listings/me/{pid}/publish/", {}, as_=self.user)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["data"]["listing"]["item_status"], "Listed")

    def test_validation(self):
        self.assertEqual(self.draft(title="a").status_code, 400)
        self.assertEqual(self.draft(category="CAT-0").status_code, 400)
        self.assertEqual(self.draft(listing_price=0).status_code, 400)
        self.assertEqual(self.draft(listing_price=12.5).status_code, 400)
        self.assertEqual(self.draft(city="Pune").status_code, 400)
        self.assertEqual(self.draft(pincode="411001").status_code, 400)
        self.assertEqual(self.draft(quantity=0).status_code, 400)
        self.cat.status = Category.Status.INACTIVE
        self.cat.save()
        self.assertEqual(self.draft().status_code, 400)  # inactive category not offered

    def test_bad_image(self):
        pid = self.draft().data["data"]["listing"]["id"]
        bad = SimpleUploadedFile("x.png", b"not an image", content_type="image/png")
        r = self.upload(pid, bad)
        self.assertEqual(r.status_code, 400)

    def test_image_limit_reorder_delete(self):
        pid = self.draft().data["data"]["listing"]["id"]
        for _ in range(8):
            self.upload(pid, png())
        r = self.upload(pid, png())
        self.assertEqual(r.status_code, 400)
        imgs = self.get(f"/api/listings/me/{pid}/", as_=self.user).data["data"]["listing"]["images"]
        ids = [i["id"] for i in imgs]
        r = self.post(f"/api/listings/me/{pid}/images/order/", {"order": list(reversed(ids))}, as_=self.user)
        self.assertEqual(r.data["data"]["listing"]["images"][0]["id"], ids[-1])
        self.assertEqual(r.data["data"]["listing"]["images"][0]["image_type"], "Cover")
        r = self.delete(f"/api/listings/me/{pid}/images/{ids[0]}/", as_=self.user)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data["data"]["listing"]["images"]), 7)

    def test_cannot_touch_someone_elses(self):
        pid = self.draft().data["data"]["listing"]["id"]
        self.assertEqual(self.get(f"/api/listings/me/{pid}/", as_=self.other).status_code, 404)
        self.assertEqual(self.patch(f"/api/listings/me/{pid}/", {"title": "Hacked"}, as_=self.other).status_code, 404)
        self.assertEqual(self.get("/api/listings/me/").status_code, 401)
        maker = self.make_remaker()
        self.assertEqual(self.get("/api/listings/me/", as_=maker).status_code, 403)

    def test_daily_cap(self):
        s = PlatformSettings.load()
        s.max_listings_per_day = 1
        s.save()
        _, r = self.live()
        self.assertEqual(r.status_code, 200)
        pid2 = self.draft(title="Second one").data["data"]["listing"]["id"]
        self.upload(pid2, png())
        r = self.post(f"/api/listings/me/{pid2}/publish/", {}, as_=self.user)
        self.assertEqual(r.status_code, 429)

    def test_withdraw_relist_edit_delete(self):
        pid, _ = self.live()
        r = self.patch(f"/api/listings/me/{pid}/", {"listing_price": 3500}, as_=self.user)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["data"]["listing"]["listing_price"], "3500.00")
        self.assertEqual(self.delete(f"/api/listings/me/{pid}/", as_=self.user).status_code, 409)  # live
        self.assertEqual(self.post(f"/api/listings/me/{pid}/withdraw/", {}, as_=self.user).status_code, 200)
        self.assertEqual(self.post(f"/api/listings/me/{pid}/publish/", {}, as_=self.user).status_code, 200)  # relist
        self.post(f"/api/listings/me/{pid}/withdraw/", {}, as_=self.user)
        self.assertEqual(self.delete(f"/api/listings/me/{pid}/", as_=self.user).status_code, 200)
        self.assertEqual(self.get(f"/api/listings/me/{pid}/", as_=self.user).status_code, 404)

    def test_reserved_is_locked(self):
        pid, _ = self.live()
        Item.objects.filter(public_id=pid).update(item_status="Reserved")
        self.assertEqual(self.patch(f"/api/listings/me/{pid}/", {"title": "New title"}, as_=self.user).status_code, 409)

    def test_suspended_seller_is_read_only(self):
        pid, _ = self.live()
        self.user.status = "Suspended"
        self.user.save()
        self.assertEqual(self.get("/api/listings/me/", as_=self.user).status_code, 200)
        self.assertEqual(self.post(f"/api/listings/me/{pid}/withdraw/", {}, as_=self.user).status_code, 403)

    def test_public_browse_and_detail(self):
        pid, _ = self.live()
        self.draft(title="Hidden draft")
        r = self.client.get("/api/listings/")
        self.assertEqual(r.status_code, 200)
        rows = r.data["data"]["results"]
        self.assertEqual([x["id"] for x in rows], [pid])
        self.assertNotIn("moderation_note", rows[0])
        self.assertNotIn("email", str(rows[0]["seller"]))
        self.assertEqual(len(self.client.get("/api/listings/?q=walnut").data["data"]["results"]), 1)
        self.assertEqual(len(self.client.get("/api/listings/?q=zzz").data["data"]["results"]), 0)
        self.assertEqual(len(self.client.get("/api/listings/?min_price=5000").data["data"]["results"]), 0)
        self.assertEqual(len(self.client.get("/api/listings/?category=furniture").data["data"]["results"]), 1)
        self.assertEqual(self.client.get(f"/api/listings/{pid}/").status_code, 200)
        self.assertEqual(self.client.get("/api/listings/categories/").data["data"]["categories"][0]["slug"], "furniture")

    def test_admin_moderation_hides_and_notifies(self):
        pid, _ = self.live()
        mod = self.make_admin("mod@example.com", modules={"products": "edit"})
        viewer = self.make_admin("view@example.com", modules={"products": "view"})
        none = self.make_admin("none@example.com", modules={"users": "edit"})
        self.assertEqual(self.get("/api/listings/admin/", as_=none).status_code, 403)
        self.assertEqual(self.get("/api/listings/admin/", as_=viewer).status_code, 200)
        url = f"/api/listings/admin/{pid}/moderate/"
        self.assertEqual(self.post(url, {"status": "Disabled", "note": "x"}, as_=viewer).status_code, 403)
        self.assertEqual(self.post(url, {"status": "Disabled"}, as_=mod).status_code, 400)  # reason needed
        r = self.post(url, {"status": "Disabled", "note": "Looks like a duplicate"}, as_=mod)
        self.assertEqual(r.status_code, 200, r.data)
        # hidden from the marketplace, history kept, seller cannot relist it
        self.assertEqual(len(self.client.get("/api/listings/").data["data"]["results"]), 0)
        self.assertEqual(self.client.get(f"/api/listings/{pid}/").status_code, 404)
        mine = self.get(f"/api/listings/me/{pid}/", as_=self.user).data["data"]["listing"]
        self.assertEqual(mine["item_status"], "Listed")
        self.assertEqual(mine["moderation_status"], "Disabled")
        self.assertEqual(mine["moderation_note"], "Looks like a duplicate")
        self.post(f"/api/listings/me/{pid}/withdraw/", {}, as_=self.user)
        self.assertEqual(self.post(f"/api/listings/me/{pid}/publish/", {}, as_=self.user).status_code, 403)
        self.assertTrue(self.user.notifications.filter(title="Your listing was turned off").exists())
        # back to normal
        self.assertEqual(self.post(url, {"status": "Normal"}, as_=mod).status_code, 200)
        self.assertEqual(self.get(f"/api/listings/admin/{pid}/", as_=viewer).status_code, 200)

    def test_suggest_price_accept_decline(self):
        pid, _ = self.live()
        mod = self.make_admin("mod@example.com", modules={"products": "edit"})
        viewer = self.make_admin("view@example.com", modules={"products": "view"})
        url = f"/api/listings/admin/{pid}/suggest-price/"
        self.assertEqual(self.post(url, {"price": 3000}, as_=viewer).status_code, 403)
        self.assertEqual(self.post(url, {"price": "abc"}, as_=mod).status_code, 400)
        self.assertEqual(self.post(url, {"price": 3800}, as_=mod).status_code, 400)  # same as current
        r = self.post(url, {"price": 3000, "note": "Similar items sell for less"}, as_=mod)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["data"]["listing"]["suggestion_status"], "Pending")
        self.assertTrue(self.user.notifications.filter(title="ReOrbit suggested a new price").exists())
        # the seller sees it; buyers do not
        mine = self.get(f"/api/listings/me/{pid}/", as_=self.user).data["data"]["listing"]
        self.assertEqual(mine["suggestion_status"], "Pending")
        self.assertNotIn("suggested_price", self.client.get(f"/api/listings/{pid}/").data["data"]["listing"])
        # others cannot answer it
        ans = f"/api/listings/me/{pid}/price-suggestion/"
        self.assertEqual(self.post(ans, {"accept": True}, as_=self.other).status_code, 404)
        r = self.post(ans, {"accept": True}, as_=self.user)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["data"]["listing"]["listing_price"], "3000.00")
        self.assertEqual(r.data["data"]["listing"]["suggestion_status"], "Accepted")
        self.assertEqual(self.post(ans, {"accept": True}, as_=self.user).status_code, 409)
        # a second suggestion can be declined and the price stays
        self.post(url, {"price": 2500}, as_=mod)
        r = self.post(ans, {"accept": False}, as_=self.user)
        self.assertEqual(r.data["data"]["listing"]["listing_price"], "3000.00")
        self.assertEqual(r.data["data"]["listing"]["suggestion_status"], "Declined")
        self.assertEqual(Item.objects.get(public_id=pid).suggestion_status, "Declined")

    def test_admin_list_filters_and_seller_details(self):
        pid, _ = self.live()
        mod = self.make_admin("mod@example.com", modules={"products": "edit"})
        self.post(f"/api/listings/admin/{pid}/moderate/", {"status": "Flagged", "note": "Check photos"}, as_=mod)
        rows = self.get("/api/listings/admin/?moderation=Flagged", as_=mod).data["data"]["results"]
        self.assertEqual([r["id"] for r in rows], [pid])
        self.assertEqual(rows[0]["seller"]["email"], "seller@example.com")
        self.assertEqual(self.get("/api/listings/admin/?moderation=Disabled", as_=mod).data["data"]["results"], [])
        # a flagged listing stays on the marketplace
        self.assertEqual(len(self.client.get("/api/listings/").data["data"]["results"]), 1)
