"""A donation voucher at checkout: priced in the quote, taken off once, never shared."""

from datetime import timedelta

from django.utils import timezone

from apps.rewards.models import Voucher

from .models import Order
from .tests import OrderBase


class VoucherCheckoutTests(OrderBase):
    def voucher(self, owner=None, amount=100, min_order=200, **over):
        return Voucher.objects.create(
            owner=owner or self.buyer, code=over.pop("code", "RO-TESTCODE"), amount=amount, min_order=min_order,
            title=f"₹{amount} marketplace voucher", expires_at=over.pop("expires_at", timezone.now() + timedelta(days=30)),
            source_type="donation", source_id=over.pop("source_id", "DON-1"), **over)

    def quote(self, code=None, items=None, who=None):
        body = {"items": items or [{"id": self.table.public_id, "qty": 1}]}
        if code:
            body["voucher_code"] = code
        r = self.post("/api/orders/quote/", body, as_=who or self.buyer)
        self.assertEqual(r.status_code, 200, r.data)
        return r.data["data"]

    def test_quote_takes_the_voucher_off(self):
        self.voucher()
        plain, with_v = self.quote(), self.quote("ro-testcode")  # the code is not case sensitive
        self.assertEqual(with_v["voucher_error"], "")
        self.assertEqual(with_v["discount"], 100)
        self.assertEqual(with_v["voucher"]["code"], "RO-TESTCODE")
        self.assertEqual(plain["total"] - with_v["total"], 100)
        self.assertEqual(plain["subtotal"], with_v["subtotal"])  # the goods price is not touched

    def test_invalid_vouchers_explain_themselves(self):
        self.voucher(min_order=5000)
        self.assertIn("5,000", self.quote("RO-TESTCODE")["voucher_error"])
        self.assertIn("isn't valid", self.quote("RO-NOPE")["voucher_error"])
        self.voucher(owner=self.seller, code="RO-SELLERS", source_id="DON-2")
        self.assertIn("isn't valid", self.quote("RO-SELLERS")["voucher_error"])  # someone else's
        self.voucher(code="RO-OLDONE", source_id="DON-3", expires_at=timezone.now() - timedelta(days=1))
        self.assertIn("expired", self.quote("RO-OLDONE")["voucher_error"])
        for q in (self.quote("RO-NOPE"), self.quote("RO-SELLERS")):
            self.assertEqual(q["discount"], 0)

    def test_checkout_spends_the_voucher_once(self):
        v = self.voucher()
        plain = self.quote()
        r = self.checkout([{"id": self.table.public_id, "qty": 1}], voucher_code="RO-TESTCODE")
        self.assertEqual(r.status_code, 201, r.data)
        order = Order.objects.get()
        self.assertEqual(order.discount, 100)
        self.assertEqual(order.total, plain["total"] - 100)
        self.assertEqual(order.subtotal, 2400)  # the seller's goods are priced in full
        v.refresh_from_db()
        self.assertEqual((v.status, bool(v.used_at)), ("Used", True))

        again = self.checkout([{"id": self.tote.public_id, "qty": 1}], voucher_code="RO-TESTCODE")
        self.assertEqual(again.status_code, 400, again.data)
        self.assertEqual(again.data["code"], "VOUCHER_USED")

    def test_a_bad_voucher_blocks_the_checkout_and_changes_nothing(self):
        before = self.table.stock
        r = self.checkout([{"id": self.table.public_id, "qty": 1}], voucher_code="RO-NOPE")
        self.assertEqual(r.status_code, 400, r.data)
        self.assertFalse(Order.objects.exists())
        self.table.refresh_from_db()
        self.assertEqual(self.table.stock, before)

    def test_vouchers_are_for_member_accounts(self):
        r = self.post("/api/orders/quote/", {"items": [{"id": self.tote.public_id, "qty": 1}], "voucher_code": "RO-TESTCODE"},
                      as_=self.boss)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertIn("member", r.data["data"]["voucher_error"])
