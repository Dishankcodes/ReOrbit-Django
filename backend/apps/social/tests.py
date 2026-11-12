from django.db import IntegrityError, transaction

from apps.admins.models import AdminItem
from apps.core.models import Category
from apps.core.testing import APIBase
from apps.listings.models import Item
from apps.remakers.models import RemakerProduct

from .models import WishlistEntry

URL = "/api/social/wishlist/"


class WishlistTests(APIBase):
    def setUp(self):
        super().setUp()
        cat = Category.objects.create(name="Furniture", slug="furniture", applies_to="Both")
        self.member = self.make_user("m@example.com")
        self.other = self.make_user("o@example.com")
        self.maker = self.make_remaker()
        self.boss = self.make_admin("boss@example.com", modules={"products": "edit"})
        self.lamp = Item.objects.create(
            user=self.other, category=cat, title="Brass lamp", description="Old brass lamp, works well.",
            condition="Good", quantity=1, listing_price=1000, pickup_preference="Platform_Pickup",
            item_status="Listed", city="Surat", pincode="395003")
        self.table = RemakerProduct.objects.create(
            remaker=self.maker, category=cat, title="Teak table", description="Made from an old teak door.",
            price=2400, stock=3, status="Listed")
        self.tote = AdminItem.objects.create(
            admin=self.boss, category=cat, title="Jute tote", description="Hand stitched bag.",
            price=500, stock=5, status="Listed", sku="RO-T1")

    def test_login_required(self):
        self.assertEqual(self.get(URL).status_code, 401)
        self.assertEqual(self.post(URL, {"id": self.lamp.public_id}).status_code, 401)

    def test_all_three_sides_save_in_one_table_by_actor_type(self):
        for who, kind in ((self.member, "user"), (self.maker, "remaker"), (self.boss, "admin")):
            r = self.post(URL, {"id": self.lamp.public_id}, as_=who)
            self.assertEqual(r.status_code, 201, r.data)
            self.assertEqual(r.data["data"]["count"], 1)
        self.assertEqual(sorted(WishlistEntry.objects.values_list("actor_type", flat=True)), ["admin", "remaker", "user"])
        self.assertEqual(WishlistEntry.objects.count(), 3)

    def test_each_account_sees_only_its_own_list(self):
        self.post(URL, {"id": self.lamp.public_id}, as_=self.member)
        self.post(URL, {"id": self.table.public_id}, as_=self.maker)
        mine = self.get(URL, as_=self.member).data["data"]
        self.assertEqual([i["id"] for i in mine["items"]], [self.lamp.public_id])
        theirs = self.get(URL, as_=self.maker).data["data"]
        self.assertEqual([i["id"] for i in theirs["items"]], [self.table.public_id])
        self.assertEqual(self.get(URL, as_=self.boss).data["data"]["count"], 0)

    def test_saving_twice_is_fine_and_newest_first(self):
        self.post(URL, {"id": self.lamp.public_id}, as_=self.member)
        self.post(URL, {"id": self.lamp.public_id}, as_=self.member)
        self.post(URL, {"id": self.tote.public_id}, as_=self.member)
        items = self.get(URL, as_=self.member).data["data"]["items"]
        self.assertEqual([i["id"] for i in items], [self.tote.public_id, self.lamp.public_id])
        self.assertEqual(items[0]["seller"]["type"], "admin")
        self.assertIn("saved_at", items[0])

    def test_cannot_save_unknown_or_unlisted(self):
        self.assertEqual(self.post(URL, {"id": "LST-NOPE"}, as_=self.member).status_code, 404)
        self.assertEqual(self.post(URL, {"id": "xyz"}, as_=self.member).status_code, 404)
        self.assertEqual(self.post(URL, {}, as_=self.member).status_code, 404)
        self.tote.status = "Draft"
        self.tote.save()
        self.assertEqual(self.post(URL, {"id": self.tote.public_id}, as_=self.member).status_code, 404)

    def test_remove_one_and_clear(self):
        for it in (self.lamp, self.table, self.tote):
            self.post(URL, {"id": it.public_id}, as_=self.member)
        self.post(URL, {"id": self.lamp.public_id}, as_=self.maker)
        r = self.delete(f"{URL}{self.lamp.public_id}/", self.member)
        self.assertEqual((r.status_code, r.data["data"]["count"]), (200, 2))
        self.assertEqual(self.delete(f"{URL}{self.lamp.public_id}/", self.member).status_code, 200)  # again is fine
        r = self.delete(URL, self.member)
        self.assertEqual((r.status_code, r.data["data"]["removed"]), (200, 2))
        self.assertEqual(self.get(URL, as_=self.maker).data["data"]["count"], 1)  # someone else's list untouched

    def test_item_gone_after_saving_shows_as_unavailable(self):
        self.post(URL, {"id": self.lamp.public_id}, as_=self.member)
        self.lamp.item_status = "Sold"
        self.lamp.save()
        items = self.get(URL, as_=self.member).data["data"]["items"]
        self.assertEqual(items[0]["id"], self.lamp.public_id)
        self.assertTrue(items[0]["unavailable"])

    def test_database_guards_one_owner_and_no_duplicates(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            WishlistEntry.objects.create(actor_type="user", item_kind="user", item_ref="LST-X")  # no owner
        with self.assertRaises(IntegrityError), transaction.atomic():
            WishlistEntry.objects.create(actor_type="user", user=self.member, remaker=self.maker, item_kind="user", item_ref="LST-X")
        WishlistEntry.objects.create(actor_type="user", user=self.member, item_kind="user", item_ref="LST-X")
        with self.assertRaises(IntegrityError), transaction.atomic():
            WishlistEntry.objects.create(actor_type="user", user=self.member, item_kind="user", item_ref="LST-X")

    def test_limit(self):
        WishlistEntry.objects.bulk_create(
            [WishlistEntry(actor_type="user", user=self.member, item_kind="user", item_ref=f"LST-{i}") for i in range(200)])
        r = self.post(URL, {"id": self.table.public_id}, as_=self.member)
        self.assertEqual(r.status_code, 400)
