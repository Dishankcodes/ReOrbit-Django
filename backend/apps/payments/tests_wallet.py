from datetime import timedelta
from unittest import mock

from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone

from apps.core.models import Category, PlatformSettings
from apps.core.testing import APIBase
from apps.orders.models import Order
from apps.remakers.models import RemakerProduct

from .models import Payout, WalletEntry
from . import wallet

ADDR = {"label": "Home", "name": "Asha Shah", "phone": "9876543210", "line1": "12 Ring Road, Adajan", "city": "Surat", "pincode": "395009"}
BANK = {"method": "bank", "holder_name": "Maya Patel", "bank_name": "SBI", "account_number": "123456789012", "ifsc": "SBIN0001234"}


@override_settings(OTP_RESEND_COOLDOWN_SECONDS=0)
class WalletBase(APIBase):
    def setUp(self):
        super().setUp()
        s = PlatformSettings.load()
        s.platform_fee_pct, s.product_delivery, s.free_delivery_from = 3, 79, 1500
        s.payout_hold_days, s.payout_min_amount, s.payout_auto = 7, 100, False
        s.save()
        cat = Category.objects.create(name="Furniture", slug="furniture", applies_to="Both")
        self.buyer = self.make_user("buyer@example.com")
        self.maker = self.make_remaker()
        self.boss = self.make_admin("boss@example.com", modules={"earnings": "edit", "orders": "edit", "finance": "edit"})
        self.clerk = self.make_admin("clerk@example.com", modules={"earnings": "edit"})  # no finance permission
        self.table = RemakerProduct.objects.create(remaker=self.maker, category=cat, title="Teak table",
                                                   description="Made from an old teak door.", price=2400, stock=9, status="Listed")
        self.post("/api/orders/addresses/", ADDR, as_=self.buyer)
        self.addr = self.get("/api/orders/addresses/", as_=self.buyer).data["data"]["addresses"][0]["id"]

    _n = 0

    def deliver(self, qty=1, confirm=True):
        r = self.client.post("/api/orders/checkout/", {"items": [{"id": self.table.public_id, "qty": qty}], "address_id": self.addr,
                             "method": "COD"}, format="json", **self._headers(self.buyer))
        self.assertEqual(r.status_code, 201, r.data)
        oid = r.data["data"]["orders"][0]["id"]
        S = f"/api/orders/sales/{oid}/"
        self.post(S + "pack/", {}, as_=self.maker)
        WalletBase._n += 1
        r = self.post(S + "ship/", {"courier_name": "DTDC", "tracking_no": f"D{WalletBase._n:08d}"}, as_=self.maker)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(self.post(S + "deliver/", {}, as_=self.maker).status_code, 200)
        if confirm:  # the courier handed the cash to ReOrbit and an admin confirmed it
            self.assertEqual(self.post(f"/api/orders/admin/{oid}/cod-received/", {"reference": "REM1"}, as_=self.boss).status_code, 200)
        return oid

    def age(self, days=8):
        WalletEntry.objects.filter(kind="Earning").update(available_at=timezone.now() - timedelta(days=days - 7))

    def put_account(self, body, who=None):
        """Changing payout details: ask for the emailed code, then save with it."""
        who = who or self.maker
        self.assertEqual(self.post("/api/payments/account/code/", {}, as_=who).status_code, 200)
        return self.client.put("/api/payments/account/", {**body, "code": self.last_otp()}, format="json",
                               **self._headers(who))

    def save_account(self, settle=True):
        r = self.put_account(BANK)
        self.assertEqual(r.status_code, 200, r.data)
        if settle:  # the 24-hour pause after a change has passed
            from .models import PayoutAccount

            PayoutAccount.objects.update(changed_at=timezone.now() - timedelta(hours=25))
        return r


class EarningTests(WalletBase):
    def test_delivery_credits_item_subtotal_and_holds_it(self):
        self.deliver(2)  # 2 x 2400 = 4800; platform fee/delivery are the buyer's, not cut from the seller
        w = self.get("/api/payments/wallet/", as_=self.maker).data["data"]
        self.assertEqual(w["balances"], {"pending": 4800, "available": 0, "in_review": 0, "paid_out": 0, "lifetime": 4800})
        self.assertEqual(w["rules"]["payout_hold_days"], 7)
        self.age()
        self.assertEqual(self.get("/api/payments/wallet/", as_=self.maker).data["data"]["balances"]["available"], 4800)

    def test_one_earning_per_order_even_if_called_twice(self):
        oid = self.deliver()
        order = Order.objects.get(public_id=oid)
        wallet.credit_delivered_order(order)
        self.assertEqual(WalletEntry.objects.filter(kind="Earning").count(), 1)

    def test_no_earning_before_delivery_or_for_store_orders(self):
        r = self.client.post("/api/orders/checkout/", {"items": [{"id": self.table.public_id, "qty": 1}], "address_id": self.addr,
                             "method": "COD"}, format="json", **self._headers(self.buyer))
        self.assertEqual(WalletEntry.objects.count(), 0)

    def test_buyer_only_account_has_no_seller_money(self):
        self.deliver()
        self.assertEqual(self.get("/api/payments/wallet/", as_=self.buyer).data["data"]["balances"]["lifetime"], 0)

    def test_ledger_lists_entries(self):
        self.deliver()
        d = self.get("/api/payments/wallet/entries/", as_=self.maker).data["data"]
        self.assertEqual((d["count"], d["results"][0]["kind"], d["results"][0]["amount"]), (1, "Earning", 2400))


class AccountTests(WalletBase):
    def test_validation_and_masking(self):
        bad = self.put_account({**BANK, "ifsc": "xx", "account_number": "12"})
        self.assertEqual(bad.status_code, 400)
        self.assertIn("ifsc", bad.data["errors"])
        self.assertIn("account_number", bad.data["errors"])
        ok = self.save_account().data["data"]["account"]
        self.assertEqual(ok["account_number"], "••••••••9012")
        upi = self.put_account({"method": "upi", "holder_name": "Maya", "upi_id": "maya@oksbi"})
        self.assertEqual(upi.status_code, 200)
        self.assertEqual(upi.data["data"]["account"]["upi_id"], "ma••@oksbi")
        self.assertEqual(self.put_account({"method": "upi", "holder_name": "Maya", "upi_id": "nope"}).status_code, 400)

    def test_change_needs_the_emailed_code_and_pauses_payouts(self):
        from django.core import mail

        r = self.client.put("/api/payments/account/", BANK, format="json", **self._headers(self.maker))
        self.assertEqual((r.status_code, r.data["code"]), (400, "CODE_REQUIRED"))
        self.post("/api/payments/account/code/", {}, as_=self.maker)
        right = self.last_otp()
        r = self.client.put("/api/payments/account/", {**BANK, "code": "000000" if right != "000000" else "111111"},
                            format="json", **self._headers(self.maker))
        self.assertEqual(r.status_code, 400)
        mail.outbox.clear()
        r = self.client.put("/api/payments/account/", {**BANK, "code": right}, format="json", **self._headers(self.maker))
        self.assertEqual(r.status_code, 200, r.data)
        self.assertIsNotNone(r.data["data"]["account"]["payouts_open_at"])
        self.assertTrue(any("payout details" in m.subject.lower() for m in mail.outbox))  # the owner is emailed
        self.deliver()
        self.age()
        r = self.post("/api/payments/payouts/request/", {}, as_=self.maker)
        self.assertEqual((r.status_code, r.data["code"]), (409, "ACCOUNT_RECENTLY_CHANGED"))

    def test_login_required(self):
        self.assertEqual(self.client.get("/api/payments/wallet/").status_code, 401)


class PayoutTests(WalletBase):
    def ready(self, qty=1):
        self.deliver(qty)
        self.age()
        self.save_account()

    def test_request_pay_flow(self):
        self.ready(2)  # 4800 available
        r = self.post("/api/payments/payouts/request/", {}, as_=self.maker)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["data"]["payout"]["amount"], 4800)
        self.assertEqual(r.data["data"]["balances"], {"pending": 0, "available": 0, "in_review": 4800, "paid_out": 0, "lifetime": 4800})
        pid = r.data["data"]["payout"]["id"]
        # the seller never sees the full account number
        self.assertEqual(r.data["data"]["payout"]["account"]["account_number"], "••••••••9012")
        q = self.get("/api/payments/admin/payouts/?status=Pending", as_=self.boss).data["data"]
        self.assertEqual(q["counts"], {"Pending": 1})
        self.assertEqual(q["results"][0]["account"]["account_number"], "••••••••9012")  # lists are masked for admins too
        # --- stored encrypted, snapshot holds no full number
        from apps.payments.models import Payout, PayoutAccount
        acct = PayoutAccount.objects.get()
        self.assertNotIn("123456789012", acct.account_number_enc)
        self.assertEqual(acct.account_last4, "9012")
        row = Payout.objects.get(public_id=pid)
        self.assertNotIn("123456789012", str(row.account))
        self.assertNotIn("123456789012", row.account_enc)
        # --- full details only with the finance permission, and every look is audited
        D = f"/api/payments/admin/payouts/{pid}/details/"
        self.assertEqual(self.get(D, as_=self.clerk).status_code, 403)
        self.assertEqual(self.post(f"/api/payments/admin/payouts/{pid}/pay/", {"reference": "UTR1"}, as_=self.clerk).status_code, 403)
        full = self.get(D, as_=self.boss)
        self.assertEqual(full.data["data"]["account"]["account_number"], "123456789012")
        self.assertEqual(full.data["data"]["account"]["ifsc"], "SBIN0001234")
        from apps.core.models import AuditLog
        self.assertEqual(AuditLog.objects.filter(action="payout.reveal_details", entity_id=pid).count(), 1)
        self.assertEqual(self.post(f"/api/payments/admin/payouts/{pid}/pay/", {}, as_=self.boss).status_code, 400)  # reference needed
        paid = self.post(f"/api/payments/admin/payouts/{pid}/pay/", {"reference": "UTR998877"}, as_=self.boss)
        self.assertEqual(paid.data["data"]["payout"]["status"], "Paid")
        self.assertEqual(Payout.objects.get(public_id=pid).account_enc, "")  # wiped once settled
        self.assertEqual(self.get(D, as_=self.boss).status_code, 410)
        self.assertEqual(self.post(f"/api/payments/admin/payouts/{pid}/pay/", {"reference": "UTR1"}, as_=self.boss).status_code, 409)
        b = self.get("/api/payments/wallet/", as_=self.maker).data["data"]["balances"]
        self.assertEqual((b["available"], b["in_review"], b["paid_out"]), (0, 0, 4800))

    def test_reject_returns_money(self):
        self.ready()
        pid = self.post("/api/payments/payouts/request/", {}, as_=self.maker).data["data"]["payout"]["id"]
        self.assertEqual(self.post(f"/api/payments/admin/payouts/{pid}/reject/", {}, as_=self.boss).status_code, 400)
        self.post(f"/api/payments/admin/payouts/{pid}/reject/", {"reason": "Wrong IFSC"}, as_=self.boss)
        b = self.get("/api/payments/wallet/", as_=self.maker).data["data"]["balances"]
        self.assertEqual((b["available"], b["in_review"]), (2400, 0))
        self.assertEqual(self.post(f"/api/payments/admin/payouts/{pid}/reject/", {"reason": "again"}, as_=self.boss).status_code, 409)

    def test_rules_are_enforced(self):
        self.deliver()  # still pending, not yet available
        self.save_account()
        r = self.post("/api/payments/payouts/request/", {}, as_=self.maker)
        self.assertEqual(r.data["code"], "BELOW_MINIMUM")  # available is 0
        self.age()
        self.assertEqual(self.post("/api/payments/payouts/request/", {"amount": 99}, as_=self.maker).data["code"], "BELOW_MINIMUM")
        self.assertEqual(self.post("/api/payments/payouts/request/", {"amount": 9999}, as_=self.maker).data["code"], "INSUFFICIENT")
        self.assertEqual(self.post("/api/payments/payouts/request/", {"amount": "abc"}, as_=self.maker).status_code, 400)
        ok = self.post("/api/payments/payouts/request/", {"amount": 500}, as_=self.maker)
        self.assertEqual(ok.status_code, 200)
        # one open payout at a time
        self.assertEqual(self.post("/api/payments/payouts/request/", {"amount": 500}, as_=self.maker).data["code"], "PAYOUT_OPEN")

    def test_needs_account(self):
        self.deliver()
        self.age()
        self.assertEqual(self.post("/api/payments/payouts/request/", {}, as_=self.maker).data["code"], "NO_ACCOUNT")

    def test_admin_permissions(self):
        self.ready()
        pid = self.post("/api/payments/payouts/request/", {}, as_=self.maker).data["data"]["payout"]["id"]
        nobody = self.make_admin("n@example.com", modules={"orders": "edit"})
        self.assertEqual(self.get("/api/payments/admin/payouts/", as_=nobody).status_code, 403)
        viewer = self.make_admin("v@example.com", modules={"earnings": "view"})
        self.assertEqual(self.get("/api/payments/admin/payouts/", as_=viewer).status_code, 200)
        self.assertEqual(self.post(f"/api/payments/admin/payouts/{pid}/pay/", {"reference": "UTR1"}, as_=viewer).status_code, 403)
        self.assertEqual(self.get("/api/payments/admin/payouts/", as_=self.maker).status_code, 403)

    def test_rules_endpoint_and_auto_run(self):
        self.ready(2)
        self.assertEqual(self.post("/api/payments/admin/payouts/run-auto/", {}, as_=self.boss).data["code"], "AUTO_OFF")
        r = self.client.patch("/api/payments/admin/rules/", {"payout_auto": True, "payout_min_amount": 500, "payout_hold_days": 10}, format="json", **self._headers(self.boss))
        self.assertEqual(r.data["data"], {"payout_hold_days": 10, "payout_min_amount": 500, "payout_auto": True})
        self.assertEqual(self.client.patch("/api/payments/admin/rules/", {"payout_hold_days": 99}, format="json", **self._headers(self.boss)).status_code, 400)
        call_command("run_payouts")
        p = Payout.objects.get()
        self.assertEqual((p.amount, p.source, p.status), (4800, "auto", "Pending"))
        call_command("run_payouts")  # running again creates nothing new
        self.assertEqual(Payout.objects.count(), 1)

    def test_auto_skips_sellers_without_details(self):
        self.deliver()
        self.age()
        s = PlatformSettings.load()
        s.payout_auto = True
        s.save()
        self.assertEqual(wallet.run_auto(), {"created": 0, "skipped_no_account": 1})

    def test_double_tap_cannot_overspend(self):
        self.ready()
        first = self.post("/api/payments/payouts/request/", {}, as_=self.maker)
        second = self.post("/api/payments/payouts/request/", {}, as_=self.maker)
        self.assertEqual((first.status_code, second.status_code), (200, 409))
        self.assertEqual(Payout.objects.count(), 1)


class PayoutScheduleTests(WalletBase):
    """Admin › Payouts: pay-by dates, what a payout covers, and money still on its way."""

    ready = PayoutTests.ready

    def test_working_days(self):
        from datetime import date
        from .schedule import add_working_days, working_days_between
        self.assertEqual(add_working_days(date(2026, 11, 20), 2), date(2026, 11, 24))  # Fri + 2 = Tue
        self.assertEqual(add_working_days(date(2026, 11, 16), 2), date(2026, 11, 18))  # Mon + 2 = Wed
        self.assertEqual(working_days_between(date(2026, 11, 20), date(2026, 11, 24)), 2)

    def test_pay_by_date_statement_and_summary(self):
        self.ready(2)
        oid = Order.objects.get().public_id
        pid = self.post("/api/payments/payouts/request/", {}, as_=self.maker).data["data"]["payout"]["id"]
        row = self.get("/api/payments/admin/payouts/?status=Pending", as_=self.boss).data["data"]["results"][0]
        self.assertIn(row["schedule"]["state"], ("ok", "soon", "today"))
        self.assertTrue(row["schedule"]["due_by"])

        st = self.get(f"/api/payments/admin/payouts/{pid}/statement/", as_=self.boss).data["data"]["statement"]
        self.assertEqual([r["order"] for r in st["rows"]], [oid])
        self.assertEqual((st["covered"], st["carried"]), (4800, 0))

        # three working days later it is overdue
        Payout.objects.filter(public_id=pid).update(created_at=timezone.now() - timedelta(days=7))
        row = self.get("/api/payments/admin/payouts/?status=Pending", as_=self.boss).data["data"]["results"][0]
        self.assertEqual(row["schedule"]["state"], "overdue")
        due = self.get("/api/payments/admin/summary/", as_=self.boss).data["data"]["due"]
        self.assertEqual((due["overdue"], due["overdue_amount"]), (1, 4800))

        paid = self.post(f"/api/payments/admin/payouts/{pid}/pay/", {"reference": "UTR5544"}, as_=self.boss)
        self.assertFalse(paid.data["data"]["payout"]["schedule"]["paid_on_time"])

    def test_upcoming_and_ready_sellers(self):
        self.deliver()  # clearing for 7 days
        self.save_account()
        up = self.get("/api/payments/admin/payouts/upcoming/", as_=self.boss).data["data"]
        self.assertEqual(up["total"], 2400)
        self.assertEqual(up["schedule"][0]["rows"][0]["seller"]["id"], self.maker.public_id)
        self.assertEqual(up["ready"], [])
        self.age()
        up = self.get("/api/payments/admin/payouts/upcoming/", as_=self.boss).data["data"]
        self.assertEqual(up["total"], 0)
        self.assertEqual((up["ready"][0]["available"], up["ready"][0]["has_account"], up["ready"][0]["meets_minimum"]),
                         (2400, True, True))
        self.assertEqual(self.get("/api/payments/admin/payouts/upcoming/", as_=self.buyer).status_code, 403)
