"""What the ReOrbit team buys on the marketplace lands in the warehouse, end to end."""

from unittest import mock

from apps.core.models import Notification
from apps.orders.models import Order
from apps.orders.tests import GOOD_ADDR
from apps.orders.tests_post_delivery import PostDeliveryBase
from apps.payments import gateway
from apps.warehouse import services
from apps.warehouse.models import WarehouseItem


class TeamPurchaseTests(PostDeliveryBase):
    def setUp(self):
        super().setUp()
        self.shopper = self.make_admin("buyer-team@example.com",
                                       modules={"orders": "edit", "warehouse": "edit", "products": "view"})
        r = self.post("/api/orders/addresses/", GOOD_ADDR, as_=self.shopper)
        self.assertEqual(r.status_code, 201, r.data)
        self.team_addr = r.data["data"]["address"]["id"]

    def team_buys(self, item, qty=1):
        body = {"items": [{"id": item.public_id, "qty": qty}], "address_id": self.team_addr, "method": "COD"}
        r = self.client.post("/api/orders/checkout/", body, format="json", **self._headers(self.shopper))
        self.assertEqual(r.status_code, 201, r.data)
        return r.data["data"]["orders"][0]["id"]

    def test_member_item_bought_by_the_team_arrives_at_the_dock_then_floor_2(self):
        oid = self.team_buys(self.lamp)
        self.assertFalse(WarehouseItem.objects.exists())  # nothing until it is delivered
        self.deliver(oid, self.lamp)
        lot = WarehouseItem.objects.get()
        self.assertEqual((lot.warehouse_status, lot.zone, lot.title, lot.quantity), ("Received", "DOCK", "Brass lamp", 1))
        self.assertEqual((lot.source_user, lot.cost_price, lot.condition), (self.seller, 1000, "Good"))
        self.assertTrue(lot.purchase_ref.startswith(oid))
        self.assertTrue(Notification.objects.filter(admin=self.shopper, module="warehouse").exists())
        # shows on the warehouse screen and is put away on Floor 2 (bought stock)
        rows = self.get("/api/warehouse/admin/", as_=self.shopper).data["data"]["items"]
        self.assertEqual([r["inventory_id"] for r in rows], [lot.public_id])
        r = self.post(f"/api/warehouse/admin/{lot.public_id}/actions/putAway/", {}, as_=self.shopper)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["data"]["item"]["location"]["floor"], "2")

    def test_remaker_product_and_delivery_only_once(self):
        oid = self.team_buys(self.table, qty=2)
        self.deliver(oid, self.table)
        lot = WarehouseItem.objects.get()
        self.assertEqual((lot.source_remaker, lot.quantity, lot.cost_price, lot.condition), (self.maker, 2, 4800, "Like new"))
        services.receive_purchase(Order.objects.get(public_id=oid))  # called again: no second lot
        self.assertEqual(WarehouseItem.objects.count(), 1)

    def test_members_own_orders_do_not_touch_the_warehouse(self):
        oid = self.place(self.lamp)
        self.deliver(oid, self.lamp)
        self.assertFalse(WarehouseItem.objects.exists())

    def test_returned_purchase_leaves_the_warehouse(self):
        oid = self.team_buys(self.lamp)
        self.deliver(oid, self.lamp)
        lot = WarehouseItem.objects.get()
        r = self.ask_return(oid, who=self.shopper)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(self.act(oid, self.lamp, "return-approve").status_code, 200)
        with mock.patch.object(gateway, "refund", return_value={"id": "rfnd_1"}):
            self.assertEqual(self.act(oid, self.lamp, "return-received").status_code, 200)
        lot.refresh_from_db()
        self.assertEqual((lot.warehouse_status, lot.zone, lot.given_to), ("Released", "", "Returned to seller"))
