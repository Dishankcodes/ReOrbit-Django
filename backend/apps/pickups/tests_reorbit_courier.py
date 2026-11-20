""""ReOrbit Delivery" as the courier: whoever marks the order shipped (ReMaker, member seller or ReOrbit
for its own store), the parcel goes to Admin › Pickups and only the pickup moves the order along."""

from apps.orders.models import Order
from apps.orders.tests_post_delivery import PostDeliveryBase

from .models import PickupRequest
from .tests import SLOT, day

BASE = "/api/pickups/admin/"
SHIP_REORBIT = {"courier_name": "ReOrbit Delivery", "tracking_no": ""}


class ReOrbitCourierTests(PostDeliveryBase):
    def setUp(self):
        super().setUp()
        self.ops = self.make_admin("ops2@example.com", modules={"pickups": "edit", "orders": "edit"})
        r = self.post(f"{BASE}teams/", {"name": "Pickup team B", "area": "Ahmedabad", "vehicle": "Van", "capacity": 5,
                                        "lead": {"name": "Ravi Kumar", "phone": "+91 98250 41011"}}, as_=self.ops)
        self.assertEqual(r.status_code, 201, r.data)

    def admin(self, p, key, **body):
        return self.post(f"{BASE}requests/{p.public_id}/{key}/", body, as_=self.ops)

    def test_remaker_picks_reorbit_delivery_when_shipping(self):
        oid = self.place(self.table)  # a courier order the ReMaker would ship themselves
        self.assertFalse(Order.objects.get(public_id=oid).managed_delivery)
        r = self.act(oid, self.table, "ship", SHIP_REORBIT, who=self.maker)
        self.assertEqual((r.status_code, r.data["code"]), (409, "BAD_STATE"))  # pack first
        self.assertEqual(self.act(oid, self.table, "pack", who=self.maker).status_code, 200)
        r = self.act(oid, self.table, "ship", SHIP_REORBIT, who=self.maker)
        self.assertEqual(r.status_code, 200, r.data)
        o = Order.objects.get(public_id=oid)
        self.assertEqual((o.status, o.managed_delivery), ("Packed", True))  # not shipped yet: the pickup decides
        p = PickupRequest.objects.get(order=o)
        self.assertEqual(r.data["data"]["pickup_id"], p.public_id)
        self.assertEqual(self.act(oid, self.table, "ship", SHIP_REORBIT, who=self.maker).status_code, 200)  # twice is fine
        self.assertEqual(PickupRequest.objects.filter(order=o).count(), 1)
        # the order page can't move it any more; the pickup does
        r = self.post(f"/api/orders/admin/{oid}/ship/", {"courier_name": "Delhivery", "tracking_no": "98765000001"}, as_=self.boss)
        self.assertEqual((r.status_code, r.data["code"]), (409, "USE_PICKUPS"))
        self.assertEqual(self.admin(p, "schedule", date=day(), slot=SLOT, partner="Pickup team B").status_code, 200)
        p.refresh_from_db()
        self.assertEqual(self.admin(p, "pickedUp", code=p.handover_code).status_code, 200)
        self.assertEqual(Order.objects.get(pk=o.pk).status, "Shipped")

    def test_reorbit_store_order_goes_to_pickups_without_a_code(self):
        oid = self.place(self.tote)  # ReOrbit's own product
        o = Order.objects.get(public_id=oid)
        self.assertEqual(self.post(f"/api/orders/admin/{oid}/pack/", {}, as_=self.ops).status_code, 200)
        r = self.post(f"/api/orders/admin/{oid}/ship/", SHIP_REORBIT, as_=self.ops)
        self.assertEqual(r.status_code, 200, r.data)
        p = PickupRequest.objects.get(order=o)
        rows = self.get(f"{BASE}requests/", as_=self.ops).data["data"]["results"]
        row = next(x for x in rows if x["id"] == p.public_id)
        self.assertEqual((row["customer"]["type"], row["customer"]["name"]), ("platform", "ReOrbit store"))
        self.assertEqual(self.admin(p, "schedule", date=day(), slot=SLOT, partner="Pickup team B").status_code, 200)
        p.refresh_from_db()
        self.assertEqual(p.handover_code, "")  # leaves ReOrbit's own address: nobody outside holds a code
        self.assertEqual(self.admin(p, "pickedUp").status_code, 200)
        self.assertEqual(self.admin(p, "complete").status_code, 200)
        self.assertEqual(Order.objects.get(pk=o.pk).status, "Delivered")
