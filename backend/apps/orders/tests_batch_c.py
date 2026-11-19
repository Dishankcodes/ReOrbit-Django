"""Money and points safety (security batch C).

- "It never arrived": a buyer can claim it without photos; once the seller or ReOrbit accepts, the
  refund is made at once and the seller's earning is taken back.
- An order the seller ships and marks delivered themselves never clears before the return window ends.
- Pay-on-delivery: points only once ReOrbit has the cash; at most 2 unshipped COD checkouts.
"""

from datetime import timedelta
from unittest import mock

from django.utils import timezone

from apps.payments.models import WalletEntry
from apps.rewards.models import PointsEntry, RewardRule

from . import services
from .models import Order, ReturnRequest
from .tests_post_delivery import PostDeliveryBase


class NeverArrivedTests(PostDeliveryBase):
    def test_claim_without_photos_and_refund_on_acceptance(self):
        oid = self.place(self.lamp)
        self.deliver(oid, self.lamp)
        r = self.ask_return(oid, reason="not_received", details="The parcel never came to my door.", photos=0)
        self.assertEqual(r.status_code, 201, r.data)
        # while the claim is open the seller's money is frozen
        WalletEntry.objects.filter(kind="Earning").update(available_at=timezone.now() - timedelta(days=1))
        seller = self.seller_of(self.lamp)
        self.assertEqual(self.get("/api/payments/wallet/", as_=seller).data["data"]["balances"]["available"], 0)
        r = self.act(oid, self.lamp, "return-approve")
        self.assertEqual(r.status_code, 200, r.data)
        rr = ReturnRequest.objects.get(order__public_id=oid)
        self.assertEqual(rr.status, "Refunded")  # nothing to send back: refunded straight away
        self.assertTrue(WalletEntry.objects.filter(kind="Reversal").exists())

    def test_damaged_still_needs_a_photo(self):
        oid = self.place(self.lamp)
        self.deliver(oid, self.lamp)
        r = self.ask_return(oid, reason="damaged", photos=0)
        self.assertEqual(r.status_code, 400)
        self.assertIn("photos", r.data["errors"])

    def test_options_say_which_reasons_need_photos(self):
        reasons = {x["code"]: x for x in self.get("/api/orders/options/", as_=self.buyer).data["data"]["return_reasons"]}
        self.assertFalse(reasons["not_received"]["needs_photo"])
        self.assertFalse(reasons["not_received"]["item_back"])
        self.assertTrue(reasons["damaged"]["needs_photo"])


class ClearingDaysTests(PostDeliveryBase):
    def test_self_shipped_order_never_clears_inside_the_return_window(self):
        from apps.core.models import PlatformSettings

        s = PlatformSettings.load()
        s.payout_hold_days = 1  # an admin set the hold shorter than the return window
        s.save()
        oid = self.place(self.table, method="RAZORPAY")
        self.deliver(oid, self.table)
        e = WalletEntry.objects.get(kind="Earning", order__public_id=oid)
        o = Order.objects.get(public_id=oid)
        self.assertFalse(o.managed_delivery)
        self.assertGreaterEqual(e.available_at, o.delivered_at + timedelta(days=7) - timedelta(minutes=1))


class CodPointsTests(PostDeliveryBase):
    def setUp(self):
        super().setUp()
        RewardRule.objects.update_or_create(key="purchase", defaults={
            "group": "shop", "title": "Purchase", "description": "per ₹100", "points": 2, "unit": "per ₹100", "active": True})

    def test_points_wait_for_the_cash(self):
        oid = self.place(self.lamp)
        self.deliver(oid, self.lamp, cash_in=False)  # marked delivered, no money has reached ReOrbit
        self.assertFalse(PointsEntry.objects.filter(kind="purchase", ref_id=oid).exists())
        self.assertEqual(self.post(f"/api/orders/admin/{oid}/cod-received/", {}, as_=self.boss).status_code, 200)
        self.assertTrue(PointsEntry.objects.filter(kind="purchase", ref_id=oid).exists())

    def test_prepaid_points_on_delivery_as_before(self):
        oid = self.place(self.lamp, method="RAZORPAY")
        self.deliver(oid, self.lamp)
        self.assertTrue(PointsEntry.objects.filter(kind="purchase", ref_id=oid).exists())


class CodLimitTests(PostDeliveryBase):
    def test_third_unshipped_cod_checkout_is_refused(self):
        self.place(self.table)
        self.place(self.table)
        r = self.checkout([{"id": self.table.public_id, "qty": 1}])
        self.assertEqual((r.status_code, r.data["code"]), (400, "COD_BLOCKED"))
        self.assertIn("pay-on-delivery", r.data["message"])

    def test_shipping_one_frees_a_place(self):
        first = self.place(self.table)
        self.place(self.table)
        self.ship(first, self.table)
        r = self.checkout([{"id": self.table.public_id, "qty": 1}])
        self.assertEqual(r.status_code, 201, r.data)
