from datetime import timedelta
from unittest import mock

from django.core.management import call_command
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from django.utils import timezone

from apps.admins.models import AdminItem
from apps.core.models import AuditLog, Category, Notification, PlatformSettings
from apps.core.testing import APIBase
from apps.orders import services as order_services
from apps.orders.models import Order
from apps.orders.tests import GOOD_ADDR
from apps.remakers.models import ReMaker_Profile

from . import services
from .models import WarehouseEvent, WarehouseItem

BASE = "/api/warehouse/admin/"
S, Sale = WarehouseItem.Stage, WarehouseItem.Sale


class WarehouseBase(APIBase):
    def setUp(self):
        super().setUp()
        self.admin = self.make_admin(modules={"warehouse": "edit"})
        self.user = self.make_user("seller@example.com")
        self.cats = {n: Category.objects.create(name=n, slug=n.lower().replace(" ", "-"), applies_to="Both")
                     for n in ("Furniture", "Kitchen", "Electronics", "Sports")}

    # -- helpers --------------------------------------------------------- #
    def lot(self, stage=S.RECEIVED, sale=Sale.NOT_LISTED, **kw):
        defaults = dict(title="Teak chair", category="Furniture", quantity=1, condition="Good", cost_price=800,
                        list_price=2000, original_price=2000, source_user=self.user, source_name="Test User",
                        source_sub="seller@example.com", purchase_ref="PO-1")
        defaults.update(kw)
        if stage == S.RECEIVED:
            defaults.update(zone="DOCK", rack="01", level=1)
        item = WarehouseItem.objects.create(warehouse_status=stage, sale_status=sale, **defaults)
        return item

    def stored(self, **kw):
        """A lot that has been put away on a shelf (through the real action)."""
        item = self.lot(S.RECEIVED, **kw)
        services.run_action(item.public_id, "putAway", self.admin)
        item.refresh_from_db()
        return item

    def act(self, item, key, as_=None, **body):
        return self.post(f"{BASE}{item.public_id}/actions/{key}/", body, as_=as_ or self.admin)

    def listed(self, price=2000, **kw):
        item = self.stored(**kw)
        r = self.act(item, "list", price=price)
        self.assertEqual(r.status_code, 200, r.data)
        item.refresh_from_db()
        return item

    def make_active_remaker(self, name, speciality="", skills=""):
        r = self.make_remaker(email=f"{name}@example.com", username=name)
        ReMaker_Profile.objects.filter(remaker=r).update(speciality=speciality, skills=skills)
        return r


class AccessTests(WarehouseBase):
    def test_module_levels(self):
        viewer = self.make_admin(email="v@example.com", modules={"warehouse": "view"})
        none = self.make_admin(email="n@example.com", modules={"orders": "edit"})
        item = self.lot()
        self.assertEqual(self.get(BASE, as_=viewer).status_code, 200)
        self.assertEqual(self.act(item, "putAway", as_=viewer).status_code, 403)
        self.assertEqual(self.post(BASE, {}, as_=viewer).status_code, 403)
        self.assertEqual(self.get(BASE, as_=none).status_code, 403)

    def test_members_and_visitors_refused(self):
        self.assertEqual(self.get(BASE, as_=self.user).status_code, 403)
        self.assertEqual(self.get(BASE, as_=self.make_remaker()).status_code, 403)
        self.assertEqual(self.client.get(BASE).status_code, 401)


class ReadTests(WarehouseBase):
    def test_item_has_every_field_the_screens_use(self):
        item = self.lot()
        data = self.get(BASE, as_=self.admin).data["data"]["items"][0]
        for key in ("inventory_id", "sku", "item_id", "title", "category", "image", "condition", "quantity",
                    "source", "purchase_ref", "cost_price", "list_price", "original_price", "received_at",
                    "stored_at", "listed_at", "warehouse_status", "sale_status", "location", "refurb", "views",
                    "wishlisted", "promoted", "price_cuts", "snoozed_until", "order_id", "events", "actions"):
            self.assertIn(key, data)
        self.assertEqual(data["inventory_id"], item.public_id)
        self.assertRegex(data["sku"], r"^RO-FUR-\d+$")
        self.assertEqual(data["location"], {"zone": "DOCK", "rack": "01", "level": 1, "bin": "DOCK-01"})
        self.assertEqual(data["source"]["type"], "User")
        self.assertEqual(data["source"]["path"], f"/admin-users/{self.user.public_id}")
        self.assertEqual(data["actions"], ["putAway"])

    def test_one_item_and_unknown(self):
        item = self.lot()
        r = self.get(f"{BASE}{item.public_id}/", as_=self.admin)
        self.assertEqual(r.data["data"]["item"]["inventory_id"], item.public_id)
        self.assertEqual(self.get(f"{BASE}WHI-0/", as_=self.admin).status_code, 404)

    def test_filter_by_stage(self):
        self.lot()
        self.lot(S.STORED, zone="A", rack="01", level=1)
        rows = self.get(f"{BASE}?status=Stored", as_=self.admin).data["data"]["items"]
        self.assertEqual([r["warehouse_status"] for r in rows], ["Stored"])

    def test_actions_per_state_match_the_screens(self):
        self.assertEqual(services.allowed_actions(self.lot()), ["putAway"])
        sold = self.lot(S.ASSIGNED, Sale.SOLD, zone="A", rack="01", level=1)
        self.assertEqual(services.allowed_actions(sold), ["dispatch"])
        refurb = self.lot(S.REFURBISHMENT, zone="QC", rack="01", level=1)
        self.assertEqual(services.allowed_actions(refurb), ["receiveBack"])
        shelf = self.lot(S.STORED, zone="A", rack="01", level=1)
        self.assertEqual(services.allowed_actions(shelf), ["list", "refurbish", "donate"])
        gone = self.lot(S.RELEASED, Sale.DONATED, zone="")
        self.assertEqual(services.allowed_actions(gone), [])


class PutAwayTests(WarehouseBase):
    def test_put_away_uses_the_categorys_zone(self):
        for category, zone in (("Furniture", "A"), ("Kitchen", "B"), ("Electronics", "D"), ("Sports", "E"),
                               ("Unknown things", "E")):
            item = self.lot(category=category)
            r = self.act(item, "putAway")
            self.assertEqual(r.status_code, 200, r.data)
            got = r.data["data"]["item"]
            self.assertEqual((got["warehouse_status"], got["location"]["zone"]), ("Stored", zone), category)
            self.assertRegex(got["location"]["bin"], rf"^{zone}-0[1-8]-[1-4]$")
            self.assertIsNotNone(got["stored_at"])
            self.assertEqual(got["events"][-1]["label"], "Stored on shelf")

    def test_items_spread_over_the_racks(self):
        bins = set()
        for _ in range(5):
            item = self.lot()
            self.act(item, "putAway")
            item.refresh_from_db()
            bins.add(item.bin)
        self.assertEqual(len(bins), 5)

    def test_a_full_zone_refuses(self):
        with mock.patch.dict(services.ZONE_CAPACITY, {"A": 2}):
            for _ in range(2):
                self.assertEqual(self.act(self.lot(), "putAway").status_code, 200)
            third = self.lot()
            r = self.act(third, "putAway")
            self.assertEqual(r.status_code, 409)
            self.assertEqual(r.data["code"], "ZONE_FULL")
        third.refresh_from_db()
        self.assertEqual(third.warehouse_status, S.RECEIVED)  # unchanged

    def test_only_items_at_the_dock(self):
        item = self.stored()
        r = self.act(item, "putAway")
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.data["code"], "BAD_STATE")

    def test_audited(self):
        item = self.lot()
        self.act(item, "putAway")
        row = AuditLog.objects.get(action="warehouse.putAway")
        self.assertEqual((row.entity_id, row.actor_public_id), (item.public_id, self.admin.public_id))
        self.assertEqual(row.before_data["warehouse_status"], "Received")
        self.assertEqual(row.after_data["warehouse_status"], "Stored")


class ListingTests(WarehouseBase):
    def test_list_needs_a_price(self):
        item = self.stored(list_price=0, original_price=0)
        r = self.act(item, "list")
        self.assertEqual(r.status_code, 400)
        self.assertIn("price", r.data["errors"])
        self.assertEqual(self.act(item, "list", price="abc").status_code, 400)
        self.assertEqual(self.act(item, "list", price=0).status_code, 400)

    def test_list_puts_it_on_the_marketplace(self):
        item = self.stored(quantity=3)
        r = self.act(item, "list", price=2500)
        self.assertEqual(r.status_code, 200, r.data)
        got = r.data["data"]["item"]
        self.assertEqual((got["sale_status"], got["list_price"], got["original_price"]), ("Listed", 2500, 2500))
        self.assertIsNotNone(got["listed_at"])
        store = AdminItem.objects.get(warehouse_item=item)
        self.assertEqual((store.status, store.stock, int(store.price), store.sku), ("Listed", 3, 2500, item.sku))
        self.assertEqual(store.category.name, "Furniture")
        self.assertEqual(store.admin_id, self.admin.pk)
        self.assertEqual(got["events"][-1]["label"], "Listed on marketplace")

    def test_list_without_the_category_explains(self):
        Category.objects.filter(name="Kitchen").delete()
        item = self.stored(category="Kitchen")
        r = self.act(item, "list", price=500)
        self.assertEqual(r.status_code, 400)
        self.assertIn("category", r.data["errors"])
        item.refresh_from_db()
        self.assertEqual(item.sale_status, Sale.NOT_LISTED)
        self.assertFalse(AdminItem.objects.exists())

    def test_cannot_list_twice(self):
        item = self.listed()
        self.assertEqual(self.act(item, "list", price=100).status_code, 409)

    def test_discount_cuts_15_percent_and_restarts_the_timer(self):
        item = self.listed(price=2000)
        WarehouseItem.objects.filter(pk=item.pk).update(listed_at=timezone.now() - timedelta(days=9))
        r = self.act(item, "discount")
        self.assertEqual(r.status_code, 200, r.data)
        got = r.data["data"]["item"]
        self.assertEqual((got["list_price"], got["price_cuts"], got["original_price"]), (1700, 1, 2000))
        item.refresh_from_db()
        self.assertLess((timezone.now() - item.listed_at).total_seconds(), 60)
        self.assertEqual(int(AdminItem.objects.get(warehouse_item=item).price), 1700)

    def test_prices_round_to_ten(self):
        item = self.listed(price=999)
        self.act(item, "discount")
        item.refresh_from_db()
        self.assertEqual(item.list_price, 850)  # 999 x 0.85 = 849.15 -> 850

    def test_promote_pauses_the_alert_for_a_week(self):
        item = self.listed()
        r = self.act(item, "promote")
        got = r.data["data"]["item"]
        self.assertTrue(got["promoted"])
        item.refresh_from_db()
        self.assertGreater(item.snoozed_until, timezone.now() + timedelta(days=6))

    def test_discount_and_promote_need_a_listed_item(self):
        item = self.stored()
        for key in ("discount", "promote", "snooze"):
            self.assertEqual(self.act(item, key).status_code, 409, key)


class SnoozeTests(WarehouseBase):
    def test_snooze_only_when_there_is_an_alert(self):
        item = self.listed()
        self.assertEqual(self.act(item, "snooze").status_code, 409)  # listed just now
        WarehouseItem.objects.filter(pk=item.pk).update(listed_at=timezone.now() - timedelta(days=8))
        item.refresh_from_db()
        self.assertEqual(services.alert_for(item)["key"], "watch")
        self.assertIn("snooze", services.allowed_actions(item))
        r = self.act(item, "snooze")
        self.assertEqual(r.status_code, 200, r.data)
        item.refresh_from_db()
        self.assertGreater(item.snoozed_until, timezone.now() + timedelta(days=2))
        self.assertIsNone(services.alert_for(item))  # quiet while snoozed
        self.assertEqual(self.act(item, "snooze").status_code, 409)

    def test_alert_levels_follow_the_settings(self):
        item = self.listed()
        for days, key in ((6, None), (7, "watch"), (14, "slow"), (30, "dead")):
            WarehouseItem.objects.filter(pk=item.pk).update(listed_at=timezone.now() - timedelta(days=days))
            item.refresh_from_db()
            got = services.alert_for(item)
            self.assertEqual(got and got["key"], key, days)
        s = PlatformSettings.load()
        s.warehouse_rules = {"unsoldDays": 10, "slowDays": 20, "deadDays": 40}
        s.save()
        WarehouseItem.objects.filter(pk=item.pk).update(listed_at=timezone.now() - timedelta(days=9))
        item.refresh_from_db()
        self.assertIsNone(services.alert_for(item))


class RefurbishmentTests(WarehouseBase):
    def test_goes_to_the_best_matching_remaker(self):
        self.make_active_remaker("general")
        chair = self.make_active_remaker("chairs", speciality="Furniture restoration")
        item = self.stored()
        r = self.act(item, "refurbish")
        self.assertEqual(r.status_code, 200, r.data)
        got = r.data["data"]["item"]
        self.assertEqual((got["warehouse_status"], got["sale_status"]), ("Refurbishment", "Not listed"))
        self.assertEqual(got["refurb"]["name"], chair.full_name)
        self.assertEqual(got["refurb"]["path"], f"/admin-remakers/{chair.public_id}")
        self.assertEqual(got["refurb"]["progress"], "Assigned")
        self.assertEqual(got["location"]["zone"], "QC")
        self.assertRegex(got["location"]["bin"], r"^QC-0[1-4]$")
        item.refresh_from_db()
        self.assertAlmostEqual((item.refurb_due_at - item.refurb_assigned_at).days, 10, delta=1)
        note = Notification.objects.get(title="New refurbishment job")
        self.assertEqual(note.body.count(item.public_id), 1)

    def test_workload_breaks_ties(self):
        a = self.make_active_remaker("amit", speciality="Furniture")
        b = self.make_active_remaker("bela", speciality="Furniture")
        first = self.stored()
        self.act(first, "refurbish")
        second = self.stored()
        self.act(second, "refurbish")
        first.refresh_from_db(); second.refresh_from_db()
        self.assertNotEqual(first.refurb_remaker_id, second.refurb_remaker_id)
        self.assertEqual({first.refurb_remaker_id, second.refurb_remaker_id}, {a.pk, b.pk})

    def test_explicit_remaker_and_inactive_ones(self):
        a = self.make_active_remaker("amit")
        b = self.make_active_remaker("bela")
        item = self.stored()
        self.assertEqual(self.act(item, "refurbish", remaker=b.public_id).status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.refurb_remaker_id, b.pk)
        blocked = self.make_active_remaker("carl")
        blocked.status = "Blocked"
        blocked.save()
        other = self.stored()
        r = self.act(other, "refurbish", remaker=blocked.public_id)
        self.assertEqual(r.status_code, 400)
        self.assertIn("remaker", r.data["errors"])
        self.assertTrue(a.pk)

    def test_no_active_remaker(self):
        item = self.stored()
        r = self.act(item, "refurbish")
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.data["code"], "NO_REMAKER")
        item.refresh_from_db()
        self.assertEqual(item.warehouse_status, S.STORED)  # nothing changed

    def test_a_listed_item_comes_off_sale(self):
        self.make_active_remaker("amit")
        item = self.listed()
        store = AdminItem.objects.get(warehouse_item=item)
        self.assertEqual(store.status, "Listed")
        self.assertEqual(self.act(item, "refurbish").status_code, 200)
        store.refresh_from_db()
        self.assertEqual(store.status, "Inactive")
        item.refresh_from_db()
        self.assertEqual((item.sale_status, item.listed_at, item.promoted_until), (Sale.NOT_LISTED, None, None))

    def test_receive_back_returns_it_to_a_shelf(self):
        self.make_active_remaker("amit")
        item = self.stored(condition="Needs refurbishing")
        self.act(item, "refurbish")
        self.assertEqual(services.allowed_actions(item.__class__.objects.get(pk=item.pk)), ["receiveBack"])
        r = self.act(item, "receiveBack")
        self.assertEqual(r.status_code, 200, r.data)
        got = r.data["data"]["item"]
        self.assertEqual((got["warehouse_status"], got["sale_status"], got["condition"]), ("Stored", "Not listed", "Good"))
        self.assertIsNone(got["refurb"])
        self.assertEqual(got["location"]["zone"], "A")
        self.assertEqual(got["events"][-1]["label"], "Received back from ReMaker")

    def test_relist_after_refurbishment_reuses_the_listing(self):
        self.make_active_remaker("amit")
        item = self.listed()
        store = AdminItem.objects.get(warehouse_item=item)
        self.act(item, "refurbish")
        self.act(item, "receiveBack")
        self.assertEqual(self.act(item, "list", price=3200).status_code, 200)
        store.refresh_from_db()
        self.assertEqual((store.status, int(store.price)), ("Listed", 3200))
        self.assertEqual(AdminItem.objects.filter(warehouse_item=item).count(), 1)


class DonateTests(WarehouseBase):
    def test_donate_needs_a_reason(self):
        item = self.stored()
        r = self.act(item, "donate")
        self.assertEqual(r.status_code, 400)
        self.assertIn("reason", r.data["errors"])
        self.assertEqual(self.act(item, "donate", reason="ab").status_code, 400)

    def test_donate_removes_it_from_sale_and_the_building(self):
        item = self.listed()
        r = self.act(item, "donate", reason="Handed to Asha Kiran Trust for the winter drive")
        self.assertEqual(r.status_code, 200, r.data)
        got = r.data["data"]["item"]
        self.assertEqual((got["warehouse_status"], got["sale_status"], got["location"]), ("Released", "Donated", None))
        self.assertIsNotNone(got["released_at"])
        self.assertIn("Asha Kiran", got["events"][-1]["detail"])
        self.assertEqual(AdminItem.objects.get(warehouse_item=item).status, "Inactive")
        self.assertEqual(self.act(item, "putAway").status_code, 409)  # final

    def test_available_from_the_shelf_not_the_dock(self):
        self.assertEqual(self.act(self.lot(), "donate", reason="Some NGO").status_code, 409)


class SaleAndDispatchTests(WarehouseBase):
    def setUp(self):
        super().setUp()
        self.buyer = self.make_user("buyer@example.com")
        r = self.post("/api/orders/addresses/", GOOD_ADDR, as_=self.buyer)
        self.addr = r.data["data"]["address"]["id"]

    def buy(self, store, qty=1):
        return self.client.post("/api/orders/checkout/", {
            "items": [{"id": store.public_id, "qty": qty}], "address_id": self.addr, "method": "COD"},
            format="json", **self._headers(self.buyer))

    def test_last_unit_sold_assigns_the_lot(self):
        item = self.listed(quantity=1)
        store = AdminItem.objects.get(warehouse_item=item)
        r = self.buy(store)
        self.assertEqual(r.status_code, 201, r.data)
        item.refresh_from_db()
        order = Order.objects.get()
        self.assertEqual((item.warehouse_status, item.sale_status, item.order_id), (S.ASSIGNED, Sale.SOLD, order.pk))
        self.assertEqual(services.allowed_actions(item), ["dispatch"])
        self.assertEqual(item.events.last().label, "Sold on the marketplace")
        self.assertIn(order.public_id, item.events.last().detail)

    def test_selling_part_of_the_lot_changes_nothing(self):
        item = self.listed(quantity=3)
        store = AdminItem.objects.get(warehouse_item=item)
        self.assertEqual(self.buy(store, 1).status_code, 201)
        item.refresh_from_db()
        self.assertEqual((item.warehouse_status, item.sale_status), (S.STORED, Sale.LISTED))

    def test_cancelled_order_puts_it_back_on_sale(self):
        item = self.listed()
        self.buy(AdminItem.objects.get(warehouse_item=item))
        order = Order.objects.get()
        order_services.cancel_order(order.pk, by="buyer", actor=self.buyer)
        item.refresh_from_db()
        self.assertEqual((item.warehouse_status, item.sale_status, item.order_id), (S.STORED, Sale.LISTED, None))
        self.assertEqual(AdminItem.objects.get(warehouse_item=item).status, "Listed")

    def test_dispatch_releases_it_and_tells_the_order(self):
        item = self.listed()
        self.buy(AdminItem.objects.get(warehouse_item=item))
        r = self.act(item, "dispatch")
        self.assertEqual(r.status_code, 200, r.data)
        got = r.data["data"]["item"]
        self.assertEqual((got["warehouse_status"], got["location"]), ("Released", None))
        self.assertEqual(got["events"][-1]["label"], "Dispatched to buyer")
        order = Order.objects.get()
        self.assertTrue(order.events.filter(label="Left the warehouse").exists())

    def test_only_sold_lots_can_dispatch(self):
        self.assertEqual(self.act(self.stored(), "dispatch").status_code, 409)


class CheckInAndStockTests(WarehouseBase):
    def checkin(self, **over):
        body = {"title": "Cane rocking chair", "category": "Furniture", "quantity": 2, "condition": "Good",
                "source_type": "user", "source": self.user.public_id, "purchase_ref": "PO-2610-12",
                "cost_price": 1500, "list_price": 3200}
        body.update(over)
        return self.post(BASE, body, as_=self.admin)

    def test_check_in_from_a_user(self):
        r = self.checkin()
        self.assertEqual(r.status_code, 201, r.data)
        got = r.data["data"]["item"]
        self.assertEqual((got["warehouse_status"], got["sale_status"], got["quantity"]), ("Received", "Not listed", 2))
        self.assertEqual((got["location"]["bin"], got["cost_price"], got["list_price"]), ("DOCK-01", 1500, 3200))
        self.assertEqual(got["source"]["id"], self.user.public_id)
        self.assertIn("PO-2610-12", got["events"][0]["detail"])
        self.assertTrue(AuditLog.objects.filter(action="warehouse.checkIn").exists())

    def test_check_in_from_a_remaker(self):
        maker = self.make_remaker()
        r = self.checkin(source_type="remaker", source=maker.public_id)
        self.assertEqual(r.status_code, 201, r.data)
        got = r.data["data"]["item"]
        self.assertEqual((got["source"]["type"], got["source"]["path"]), ("ReMaker", f"/admin-remakers/{maker.public_id}"))

    def test_check_in_validation(self):
        cases = {"title": "ab", "category": "", "quantity": 0, "condition": "Broken", "cost_price": -5,
                 "list_price": "x", "source": "USR-0"}
        for field, value in cases.items():
            r = self.checkin(**{field: value})
            self.assertEqual(r.status_code, 400, field)
            self.assertIn(field, r.data["errors"], field)
        self.assertEqual(WarehouseItem.objects.count(), 0)

    def test_edit_price_quantity_condition(self):
        item = self.listed(quantity=3)
        url = f"{BASE}{item.public_id}/"
        r = self.patch(url, {"list_price": 2400, "condition": "Fair"}, as_=self.admin)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(int(AdminItem.objects.get(warehouse_item=item).price), 2400)
        r = self.patch(url, {"quantity": 2}, as_=self.admin)
        self.assertEqual(r.status_code, 400)  # a stock change needs a reason
        self.assertIn("reason", r.data["errors"])
        r = self.patch(url, {"quantity": 2, "reason": "One cracked in handling"}, as_=self.admin)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(AdminItem.objects.get(warehouse_item=item).stock, 2)
        labels = [e["label"] for e in r.data["data"]["item"]["events"]]
        self.assertIn("Stock adjusted", labels)
        self.assertIn("Price changed", labels)

    def test_move_to_another_bin(self):
        item = self.stored()
        r = self.patch(f"{BASE}{item.public_id}/", {"location": {"zone": "B", "rack": 3, "level": 2}}, as_=self.admin)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["data"]["item"]["location"]["bin"], "B-03-2")
        bad = self.patch(f"{BASE}{item.public_id}/", {"location": {"zone": "Z", "rack": 3, "level": 2}}, as_=self.admin)
        self.assertEqual(bad.status_code, 400)
        dock = self.lot()
        self.assertEqual(self.patch(f"{BASE}{dock.public_id}/", {"location": {"zone": "A", "rack": 1, "level": 1}},
                                    as_=self.admin).status_code, 400)  # not on a shelf yet

    def test_released_items_are_read_only(self):
        item = self.lot(S.RELEASED, Sale.DONATED, zone="")
        self.assertEqual(self.patch(f"{BASE}{item.public_id}/", {"list_price": 5}, as_=self.admin).status_code, 409)


class BulkTests(WarehouseBase):
    def test_bulk_put_away_some_fail_some_pass(self):
        a, b = self.lot(), self.lot()
        shelf = self.lot(S.STORED, zone="A", rack="01", level=1)
        r = self.post(f"{BASE}actions/", {"ids": [a.public_id, b.public_id, shelf.public_id, "WHI-0"],
                                          "action": "putAway"}, as_=self.admin)
        self.assertEqual(r.status_code, 200, r.data)
        data = r.data["data"]
        self.assertEqual(sorted(data["done"]), sorted([a.public_id, b.public_id]))
        self.assertEqual(sorted(f["id"] for f in data["failed"]), sorted([shelf.public_id, "WHI-0"]))
        self.assertEqual(len(data["items"]), 2)

    def test_bulk_validation(self):
        for body in ({}, {"ids": [], "action": "putAway"}, {"ids": ["x"], "action": "nope"},
                     {"ids": [f"WHI-{n}" for n in range(101)], "action": "putAway"}, {"ids": [1], "action": "putAway"}):
            self.assertEqual(self.post(f"{BASE}actions/", body, as_=self.admin).status_code, 400, body)

    def test_bulk_donate_uses_one_reason(self):
        items = [self.stored() for _ in range(2)]
        r = self.post(f"{BASE}actions/", {"ids": [i.public_id for i in items], "action": "donate",
                                          "reason": "Winter drive"}, as_=self.admin)
        self.assertEqual(len(r.data["data"]["done"]), 2)


class DonationFlowTests(WarehouseBase):
    def test_a_received_donation_arrives_at_the_dock(self):
        from apps.donations.models import Donation

        d = Donation.objects.create(
            user=self.user, title="Books", category="Books", description="Old books.", condition="Medium",
            quantity=3, contact_name="A", contact_phone="9876543210", received_at=timezone.now())
        item = services.receive_donation(d)
        self.assertEqual((item.warehouse_status, item.condition, item.bin), (S.RECEIVED, "Fair", "DOCK-01"))
        self.assertEqual(services.receive_donation(d).pk, item.pk)  # once only
        self.assertEqual(WarehouseEvent.objects.filter(item=item).count(), 1)
        services.donation_completed(d, "Asha Kiran Trust")
        item.refresh_from_db()
        self.assertEqual((item.warehouse_status, item.sale_status, item.given_to), (S.RELEASED, Sale.DONATED, "Asha Kiran Trust"))
        services.donation_completed(d, "Someone else")  # already gone: unchanged
        item.refresh_from_db()
        self.assertEqual(item.given_to, "Asha Kiran Trust")


class AutoCutTests(WarehouseBase):
    def settings_on(self, pct=20, on=True):
        s = PlatformSettings.load()
        s.warehouse_rules = {"autoPriceCut": on, "priceCutPct": pct}
        s.save()

    def test_slow_stock_is_cut_by_the_setting(self):
        item = self.listed(price=1000)
        WarehouseItem.objects.filter(pk=item.pk).update(listed_at=timezone.now() - timedelta(days=15))
        self.settings_on(20)
        self.assertEqual(services.auto_price_cuts(), [item.public_id])
        item.refresh_from_db()
        self.assertEqual((item.list_price, item.price_cuts), (800, 1))
        self.assertEqual(int(AdminItem.objects.get(warehouse_item=item).price), 800)
        self.assertEqual(services.auto_price_cuts(), [])  # the timer restarted

    def test_off_by_default_and_fresh_or_snoozed_stock_is_left(self):
        slow = self.listed(price=1000)
        WarehouseItem.objects.filter(pk=slow.pk).update(listed_at=timezone.now() - timedelta(days=40))
        self.assertEqual(services.auto_price_cuts(), [])  # switched off
        self.settings_on()
        fresh = self.listed(price=1000)
        watch = self.listed(price=1000)
        WarehouseItem.objects.filter(pk=watch.pk).update(listed_at=timezone.now() - timedelta(days=9))
        snoozed = self.listed(price=1000)
        WarehouseItem.objects.filter(pk=snoozed.pk).update(
            listed_at=timezone.now() - timedelta(days=40), snoozed_until=timezone.now() + timedelta(days=2))
        self.assertEqual(services.auto_price_cuts(), [slow.public_id])
        for item in (fresh, watch, snoozed):
            item.refresh_from_db()
            self.assertEqual(item.list_price, 1000)

    def test_command(self):
        self.settings_on()
        call_command("warehouse_autocut", verbosity=0)


class MigrationTests(TransactionTestCase):
    """Databases that already hold donated stock keep it, as inventory."""

    OLD = [("warehouse", "0001_initial")]

    def test_old_rows_become_inventory_and_it_reverses(self):
        executor = MigrationExecutor(connection)
        executor.migrate(self.OLD)
        Old = executor.loader.project_state(self.OLD).apps.get_model("warehouse", "WarehouseItem")
        now = timezone.now()
        Old.objects.create(public_id="WHI-9001", title="Books", category="Books", quantity=3, condition="Medium",
                           status="In_Stock", location="Main warehouse", received_at=now)
        Old.objects.create(public_id="WHI-9002", title="Chair", category="Furniture", quantity=1, condition="Good",
                           status="Given_Out", location="Main warehouse", given_to="Asha Kiran Trust",
                           received_at=now - timedelta(days=5), given_at=now - timedelta(days=1))

        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
        waiting = WarehouseItem.objects.get(public_id="WHI-9001")
        self.assertEqual((waiting.warehouse_status, waiting.sale_status, waiting.bin), ("Received", "Not listed", "DOCK-01"))
        self.assertEqual((waiting.condition, waiting.sku), ("Fair", "RO-BOK-9001"))
        gone = WarehouseItem.objects.get(public_id="WHI-9002")
        self.assertEqual((gone.warehouse_status, gone.sale_status, gone.zone), ("Released", "Donated", ""))
        self.assertEqual((gone.given_to, gone.sku), ("Asha Kiran Trust", "RO-FUR-9002"))
        self.assertIsNotNone(gone.released_at)
        self.assertEqual(WarehouseEvent.objects.filter(item=gone).count(), 2)
        self.assertEqual(WarehouseEvent.objects.filter(item=waiting).count(), 1)

        executor = MigrationExecutor(connection)  # and back again
        executor.migrate(self.OLD)
        Old = executor.loader.project_state(self.OLD).apps.get_model("warehouse", "WarehouseItem")
        self.assertEqual(dict(Old.objects.values_list("public_id", "status")),
                         {"WHI-9001": "In_Stock", "WHI-9002": "Given_Out"})
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
