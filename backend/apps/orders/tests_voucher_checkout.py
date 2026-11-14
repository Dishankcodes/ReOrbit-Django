"""Rewards at checkout: public coupons, points vouchers, and giving a voucher back when a checkout is dropped."""

from datetime import timedelta
from unittest import mock

from django.utils import timezone

from apps.payments import gateway
from apps.payments.models import Payment
from apps.rewards import services as rewards
from apps.rewards.models import RewardOffer, Voucher
from apps.rewards.tests import offer_body

from . import services
from .models import Order
from .tests import OrderBase


class CouponCheckoutTests(OrderBase):
    def setUp(self):
        super().setUp()
        self.rw = self.make_admin("rwc@example.com", modules={"rewards": "edit"})

    def coupon(self, **over):
        body = offer_body(code="SAVE50", kind="code", points_cost=0, value=50, min_order=100, usage_limit=2, per_user=1)
        body.update(over)
        return rewards.save_offer(body, self.rw)

    def lines(self, item=None):
        return [{"id": (item or self.table).public_id, "qty": 1}]

    def test_quote_keeps_the_typed_coupon_code_and_checkout_accepts_it(self):
        self.coupon()
        q = self.post("/api/orders/quote/", {"items": self.lines(), "voucher_code": "save50"}, as_=self.buyer).data["data"]
        self.assertEqual((q["voucher_error"], q["voucher"]["code"], q["discount"]), ("", "SAVE50", 50))
        r = self.checkout(self.lines(), voucher_code=q["voucher"]["code"])
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Order.objects.get().discount, 50)
        claim = Voucher.objects.get()
        self.assertEqual((claim.status, claim.source_type), ("Used", "code"))

    def test_a_coupon_is_used_once_per_member(self):
        self.coupon()
        self.assertEqual(self.checkout(self.lines(), voucher_code="SAVE50").status_code, 201)
        again = self.checkout(self.lines(self.tote), voucher_code="SAVE50")
        self.assertEqual(again.status_code, 400, again.data)
        self.assertEqual(Order.objects.count(), 1)

    def test_a_paused_or_expired_coupon_is_refused_and_nothing_is_taken(self):
        offer = self.coupon()
        RewardOffer.objects.filter(pk=offer.pk).update(valid_to=timezone.localdate() - timedelta(days=1))
        r = self.checkout(self.lines(), voucher_code="SAVE50")
        self.assertEqual(r.status_code, 400, r.data)
        self.assertFalse(Order.objects.exists() or Voucher.objects.exists())

    def test_remaker_only_coupon_needs_a_remaker_product(self):
        self.coupon(code="MAKER20", remaker_only=True)
        member_item = [{"id": self.lamp.public_id, "qty": 1}]
        q = self.post("/api/orders/quote/", {"items": member_item, "voucher_code": "MAKER20"}, as_=self.buyer).data["data"]
        self.assertTrue(q["voucher_error"])
        q = self.post("/api/orders/quote/", {"items": self.lines(), "voucher_code": "MAKER20"}, as_=self.buyer).data["data"]
        self.assertEqual(q["voucher_error"], "")

    def test_a_dropped_online_checkout_gives_the_voucher_back(self):
        self.coupon()
        with mock.patch.object(gateway, "create_order", return_value={"id": "order_V1"}):
            r = self.checkout(self.lines(), method="RAZORPAY", voucher_code="SAVE50")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Voucher.objects.get().status, "Used")
        Payment.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
        services.expire_stale()
        self.assertEqual(Voucher.objects.get().status, "Void")  # the claim is cancelled
        # and they can use the coupon again on a fresh checkout
        self.assertEqual(self.checkout(self.lines(), voucher_code="SAVE50").status_code, 201)

    def test_a_cancelled_order_gives_a_held_voucher_back(self):
        v = Voucher.objects.create(owner=self.buyer, code="RO-HELD0001", amount=100, min_order=200, title="₹100",
                                   expires_at=timezone.now() + timedelta(days=30), source_type="points", source_id="X")
        self.assertEqual(self.checkout(self.lines(), voucher_code="RO-HELD0001").status_code, 201)
        v.refresh_from_db()
        self.assertEqual(v.status, "Used")
        order = Order.objects.get()
        r = self.post(f"/api/orders/me/{order.public_id}/cancel/", {"reason": "changed my mind"}, as_=self.buyer)
        self.assertEqual(r.status_code, 200, r.data)
        v.refresh_from_db()
        self.assertEqual(v.status, "Active")
