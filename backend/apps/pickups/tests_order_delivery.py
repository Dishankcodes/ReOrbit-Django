""""Managed by ReOrbit" orders: the seller packs and asks for a pickup; ReOrbit picks it up, ships it and
delivers it, and keeps the delivery fee."""

from apps.orders.models import Order
from apps.orders.tests_post_delivery import PostDeliveryBase
from apps.payments.models import WalletEntry

from .models import PickupRequest
from .tests import SLOT, day

BASE = "/api/pickups/admin/"


class ManagedDeliveryTests(PostDeliveryBase):
    def setUp(self):
        super().setUp()
        self.ops = self.make_admin("ops@example.com", modules={"pickups": "edit", "orders": "edit"})
        r = self.post(f"{BASE}teams/", {"name": "Pickup team A", "area": "Ahmedabad", "vehicle": "Van", "capacity": 5,
                                        "lead": {"name": "Ravi Kumar", "phone": "+91 98250 41011"}}, as_=self.ops)
        self.assertEqual(r.status_code, 201, r.data)
        self.table.pickup_preference = "Platform_Pickup"  # a ReMaker product "Managed by ReOrbit"
        self.table.delivery_fee = 999  # sellers no longer set the fee: the platform rate applies
        self.table.save()

    def pickup(self, oid):
        return PickupRequest.objects.get(order__public_id=oid)

    def admin(self, r, key, **body):
        return self.post(f"{BASE}requests/{r.public_id}/{key}/", body, as_=self.ops)

    def test_seller_packs_and_asks_reorbit_which_ships_delivers_and_keeps_the_fee(self):
        oid = self.place(self.table)
        o = Order.objects.get(public_id=oid)
        self.assertTrue(o.managed_delivery)
        self.assertNotEqual(o.delivery_fee, 999)

        # the seller can't ship it themselves, and must pack before asking
        self.assertEqual(self.act(oid, self.table, "pickup").status_code, 409)
        self.assertEqual(self.act(oid, self.table, "pack").status_code, 200)
        # "Mark as shipped" on a ReOrbit-delivered order hands it to the pickup team instead of shipping it
        r = self.act(oid, self.table, "ship", {"courier_name": "Delhivery", "tracking_no": "98765000001"}, who=self.maker)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual((r.data["data"]["order"]["status"], r.data["data"]["pickup_id"]), ("Packed", self.pickup(oid).public_id))
        r = self.act(oid, self.table, "pickup")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["data"]["order"]["pickup"]["status"], "Requested")
        self.assertEqual(self.act(oid, self.table, "pickup").status_code, 200)  # pressing twice is fine
        self.assertEqual(PickupRequest.objects.filter(order__public_id=oid).count(), 1)

        # it is in Admin > Pickups, from the ReMaker
        rows = self.get(f"{BASE}requests/", as_=self.ops).data["data"]["results"]
        row = next(x for x in rows if x["kind"] == "order")
        self.assertEqual((row["order"]["id"], row["customer"]["type"]), (oid, "remaker"))

        p = self.pickup(oid)
        self.assertEqual(self.admin(p, "schedule", date=day(), slot=SLOT, partner="Pickup team A").status_code, 200)
        # the seller sees the 4-digit code on their sale; the team needs it to mark the pickup collected
        p.refresh_from_db()
        sale = self.get(f"/api/orders/sales/{oid}/", as_=self.maker).data["data"]["order"]
        self.assertEqual(sale["pickup"]["handover_code"], p.handover_code)
        self.assertNotIn("handover_code", self.get(f"/api/orders/admin/{oid}/", as_=self.boss).data["data"]["order"]["pickup"])
        self.assertEqual(self.admin(p, "pickedUp").status_code, 400)  # no code
        # the order page can't move a ReOrbit delivery: it goes through the pickup
        blocked = self.post(f"/api/orders/admin/{oid}/ship/", {"courier_name": "Delhivery", "tracking_no": "98765000002"},
                            as_=self.boss)
        self.assertEqual((blocked.status_code, blocked.data["code"]), (409, "USE_PICKUPS"))
        picked = self.admin(p, "pickedUp", code=p.handover_code)
        self.assertEqual(picked.status_code, 200, picked.data)
        o.refresh_from_db()
        self.assertEqual((o.status, o.courier_name, o.tracking_no), ("Shipped", "ReOrbit Delivery", p.public_id))
        self.assertEqual(self.admin(p, "complete").status_code, 200)
        o.refresh_from_db()
        self.assertEqual(o.status, "Delivered")

        # the seller earns the item price only; ReOrbit's earnings count the delivery fee
        earning = WalletEntry.objects.get(order=o, kind="Earning")
        self.assertEqual(earning.amount, o.subtotal)
        sale = self.get(f"/api/orders/sales/{oid}/", as_=self.maker).data["data"]["order"]
        self.assertEqual((sale["seller_earning"], sale["managed_delivery"]), (o.subtotal, True))
        # and the customer page counts the same: no delivery fee in "You earned"
        cust = self.get("/api/orders/sales/customers/", as_=self.maker).data["data"]["customers"][0]
        self.assertEqual(cust["earned"], o.subtotal)

    def test_cancelled_pickup_lets_the_seller_ask_again(self):
        oid = self.place(self.table)
        self.act(oid, self.table, "pack")
        self.act(oid, self.table, "pickup")
        p = self.pickup(oid)
        self.assertEqual(self.admin(p, "cancel", reason="No team free in that area").status_code, 200)
        self.assertIsNone(Order.objects.get(public_id=oid).pickup_requested_at)
        self.assertEqual(self.act(oid, self.table, "pickup").status_code, 200)
        self.assertEqual(self.pickup(oid).status, "Requested")

    def test_self_shipped_orders_are_unchanged(self):
        self.lamp.pickup_preference = "Seller_Handover"  # the member ships it themselves
        self.lamp.save()
        oid = self.place(self.lamp)
        self.assertFalse(Order.objects.get(public_id=oid).managed_delivery)
        self.assertEqual(self.act(oid, self.lamp, "pack").status_code, 200)
        self.assertEqual(self.act(oid, self.lamp, "pickup").status_code, 409)

    def test_old_order_with_the_same_pickup_number_does_not_block(self):
        """After a database reset an old order can already carry this pickup's number as its tracking.
        Marking the pickup collected must still work."""
        oid = self.place(self.table)
        self.assertEqual(self.act(oid, self.table, "pack").status_code, 200)
        self.assertEqual(self.act(oid, self.table, "pickup").status_code, 200)
        p = self.pickup(oid)
        old = self.place(self.table)
        Order.objects.filter(public_id=old).update(courier_name="ReOrbit Delivery", tracking_no=p.public_id)
        self.assertEqual(self.admin(p, "schedule", date=day(), slot=SLOT, partner="Pickup team A").status_code, 200)
        p.refresh_from_db()
        r = self.admin(p, "pickedUp", code=p.handover_code)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(Order.objects.get(public_id=oid).tracking_no, p.public_id)
