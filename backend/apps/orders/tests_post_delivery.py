"""Tracking, failed deliveries, COD cash, returns and refunds."""

import shutil
import tempfile
from datetime import timedelta
from unittest import mock

from django.test import override_settings
from django.utils import timezone

from apps.core.tests.test_profile import image_file
from apps.payments import gateway, refunds
from apps.payments.models import Payment, Refund, WalletEntry

from .models import Order, ReturnRequest
from .tests import KEYS, OrderBase, sign

TMP = tempfile.mkdtemp(prefix="reorbit_test_returns_")


@override_settings(MEDIA_ROOT=TMP, **KEYS)
class PostDeliveryBase(OrderBase):
    _n = 0

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP, ignore_errors=True)

    def setUp(self):
        super().setUp()
        self.fin = self.make_admin("fin@example.com", modules={"orders": "edit", "finance": "edit", "earnings": "edit"})
        self.boss = self.make_admin("boss2@example.com", modules={"orders": "edit", "earnings": "edit", "finance": "edit"})

    def place(self, item, qty=1, method="COD"):
        PostDeliveryBase._n += 1
        n = PostDeliveryBase._n
        if method == "COD":
            r = self.checkout([{"id": item.public_id, "qty": qty}])
            self.assertEqual(r.status_code, 201, r.data)
            return r.data["data"]["orders"][0]["id"]
        with mock.patch.object(gateway, "create_order", return_value={"id": f"order_{n}"}):
            r = self.checkout([{"id": item.public_id, "qty": qty}], method="RAZORPAY")
        self.assertEqual(r.status_code, 201, r.data)
        v = self.post("/api/payments/verify/", {"razorpay_order_id": f"order_{n}", "razorpay_payment_id": f"pay_{n}",
                                                "razorpay_signature": sign(f"order_{n}", f"pay_{n}")}, as_=self.buyer)
        self.assertEqual(v.status_code, 200, v.data)
        return r.data["data"]["orders"][0]["id"]

    def seller_of(self, item):
        return self.seller if item is self.lamp else self.maker

    def act(self, oid, item, action, body=None, who=None):
        if item is self.tote:  # ReOrbit's own store: an admin fulfils it
            return self.post(f"/api/orders/admin/{oid}/{action}/", body or {}, as_=who or self.boss)
        return self.post(f"/api/orders/sales/{oid}/{action}/", body or {}, as_=who or self.seller_of(item))

    def ship(self, oid, item):
        PostDeliveryBase._n += 1
        self.assertEqual(self.act(oid, item, "pack").status_code, 200)
        r = self.act(oid, item, "ship", {"courier_name": "Delhivery", "tracking_no": f"98765{PostDeliveryBase._n:06d}"})
        self.assertEqual(r.status_code, 200, r.data)

    def deliver(self, oid, item, cash_in=True):
        self.ship(oid, item)
        self.assertEqual(self.act(oid, item, "deliver").status_code, 200)
        o = Order.objects.get(public_id=oid)
        if cash_in and o.payment_status == "COD_Collected":
            self.assertEqual(self.post(f"/api/orders/admin/{oid}/cod-received/", {}, as_=self.boss).status_code, 200)

    def photo(self):
        return image_file()

    def ask_return(self, oid, reason="damaged", details="It arrived with a crack on the side.", photos=1, who=None):
        files = [self.photo() for _ in range(photos)]
        return self.client.post(f"/api/orders/me/{oid}/return/", {"reason": reason, "details": details, "photos": files},
                                format="multipart", **self._headers(who or self.buyer))

    def entries(self, kind=None):
        qs = WalletEntry.objects.all()
        return qs.filter(kind=kind) if kind else qs


class TrackingTests(PostDeliveryBase):
    def test_courier_format_and_uniqueness(self):
        oid = self.place(self.table)
        self.act(oid, self.table, "pack")
        bad = self.act(oid, self.table, "ship", {"courier_name": "Delhivery", "tracking_no": "ABC"})
        self.assertEqual(bad.status_code, 400)
        self.assertIn("tracking_no", bad.data["errors"])
        self.assertEqual(self.act(oid, self.table, "ship", {"courier_name": "Delhivery", "tracking_no": "1111111111"}).status_code, 400)  # not a real-looking number
        ok = self.act(oid, self.table, "ship", {"courier_name": "delhivery", "tracking_no": " 12345 678901 "})
        self.assertEqual(ok.status_code, 200, ok.data)
        self.assertEqual(ok.data["data"]["order"]["courier"], {"name": "Delhivery", "tracking_no": "12345678901"})
        oid2 = self.place(self.table)
        self.act(oid2, self.table, "pack")
        dup = self.act(oid2, self.table, "ship", {"courier_name": "Delhivery", "tracking_no": "12345678901"})
        self.assertEqual(dup.status_code, 400)
        self.assertIn("already used", dup.data["errors"]["tracking_no"][0])
        other = self.act(oid2, self.table, "ship", {"courier_name": "Local Rider Co", "tracking_no": "LR-2024-77"})
        self.assertEqual(other.status_code, 200, other.data)

    def test_buyer_gets_delivery_updates(self):
        oid = self.place(self.table)
        self.assertEqual(self.act(oid, self.table, "update", {"text": "Out for delivery"}).status_code, 409)  # not shipped yet
        self.ship(oid, self.table)
        self.assertEqual(self.act(oid, self.table, "update", {"text": "x"}).status_code, 400)
        self.assertEqual(self.act(oid, self.table, "update", {"text": "Out for delivery today"}).status_code, 200)
        order = self.get(f"/api/orders/me/{oid}/", as_=self.buyer).data["data"]["order"]
        self.assertEqual(order["events"][-1]["label"], "Update")
        note = self.get("/api/notifications/", as_=self.buyer)
        self.assertIn("Out for delivery today", str(note.data))

    def test_options_lists_couriers_and_reasons(self):
        d = self.get("/api/orders/options/", as_=self.buyer).data["data"]
        self.assertIn("Delhivery", d["couriers"])
        self.assertEqual(d["return_days"], 7)
        self.assertTrue(any(r["code"] == "damaged" and r["fault"] == "seller" for r in d["return_reasons"]))


class FailedDeliveryTests(PostDeliveryBase):
    def fail(self, oid, item, reason):
        return self.act(oid, item, "fail", {"reason": reason, "note": "Tried twice"})

    def test_prepaid_buyer_fault_refunds_without_delivery_fee_and_restocks(self):
        oid = self.place(self.lamp, method="RAZORPAY")  # 1000 + 30 fee + 149 delivery = 1179
        self.ship(oid, self.lamp)
        self.assertEqual(self.fail(oid, self.lamp, "nonsense").status_code, 400)
        r = self.fail(oid, self.lamp, "buyer_unreachable")
        self.assertEqual(r.data["data"]["order"]["status"], "Delivery_Failed")
        self.assertEqual(r.data["data"]["order"]["failed"]["fault"], "buyer")
        with mock.patch.object(gateway, "refund", return_value={"id": "rfnd_1"}) as rf:
            r = self.act(oid, self.lamp, "returned")
        rf.assert_called_once_with(Payment.objects.get().razorpay_payment_id, 1030, receipt=mock.ANY)
        o = r.data["data"]["order"]
        self.assertEqual((o["status"], o["payment"]["status"]), ("Returned_To_Origin", "Refunded"))
        self.lamp.refresh_from_db()
        self.assertEqual((self.lamp.quantity, self.lamp.item_status), (1, "Listed"))
        self.assertEqual(self.entries().count(), 0)  # the seller earns nothing
        self.assertEqual(Refund.objects.get().amount, 1030)

    def test_prepaid_seller_fault_refunds_everything(self):
        oid = self.place(self.lamp, method="RAZORPAY")
        self.ship(oid, self.lamp)
        self.fail(oid, self.lamp, "lost_in_transit")
        with mock.patch.object(gateway, "refund", return_value={"id": "rfnd_1"}) as rf:
            self.act(oid, self.lamp, "returned")
        self.assertEqual(rf.call_args.args[1], 1179)

    def test_cod_failed_needs_no_refund(self):
        oid = self.place(self.lamp)
        self.ship(oid, self.lamp)
        self.fail(oid, self.lamp, "buyer_refused")
        r = self.act(oid, self.lamp, "returned")
        self.assertEqual(r.data["data"]["order"]["payment"]["status"], "Void")
        self.assertEqual(Refund.objects.count(), 0)
        self.lamp.refresh_from_db()
        self.assertEqual(self.lamp.item_status, "Listed")

    def test_retry_goes_back_to_shipped_and_states_are_guarded(self):
        oid = self.place(self.lamp)
        self.assertEqual(self.fail(oid, self.lamp, "buyer_unreachable").status_code, 409)  # not shipped
        self.ship(oid, self.lamp)
        self.fail(oid, self.lamp, "buyer_unreachable")
        self.assertEqual(self.act(oid, self.lamp, "deliver").status_code, 409)
        self.assertEqual(self.act(oid, self.lamp, "retry").data["data"]["order"]["status"], "Shipped")
        self.assertEqual(self.act(oid, self.lamp, "returned").status_code, 409)

    def test_only_the_seller_or_admin_can_mark_failed(self):
        oid = self.place(self.lamp)
        self.ship(oid, self.lamp)
        self.assertEqual(self.act(oid, self.lamp, "fail", {"reason": "buyer_unreachable"}, who=self.maker).status_code, 404)  # another seller
        self.assertEqual(self.post(f"/api/orders/me/{oid}/fail/", {}, as_=self.buyer).status_code, 404)


class CodReconciliationTests(PostDeliveryBase):
    def test_earning_waits_for_the_cash_then_clears_in_seven_days(self):
        oid = self.place(self.table, qty=2)
        self.deliver(oid, self.table, cash_in=False)
        o = self.get(f"/api/orders/me/{oid}/", as_=self.buyer).data["data"]["order"]
        self.assertEqual(o["payment"]["status"], "COD_Collected")
        e = self.entries("Earning").get()
        self.assertIsNone(e.available_at)
        w = self.get("/api/payments/wallet/", as_=self.maker).data["data"]["balances"]
        self.assertEqual((w["pending"], w["available"]), (4800, 0))
        s = self.get("/api/payments/admin/summary/", as_=self.boss).data["data"]
        self.assertEqual((s["cod_orders"], s["cod_to_collect"]), (1, 4944))
        # sellers and viewers cannot confirm cash
        self.assertEqual(self.post(f"/api/orders/sales/{oid}/cod-received/", {}, as_=self.maker).status_code, 404)
        viewer = self.make_admin("v@example.com", modules={"orders": "view"})
        self.assertEqual(self.post(f"/api/orders/admin/{oid}/cod-received/", {}, as_=viewer).status_code, 403)
        r = self.post(f"/api/orders/admin/{oid}/cod-received/", {"reference": "REM-77"}, as_=self.boss)
        self.assertEqual(r.data["data"]["order"]["payment"]["status"], "Paid")
        e.refresh_from_db()
        self.assertAlmostEqual((e.available_at - timezone.now()).days, 6, delta=1)
        self.assertEqual(self.post(f"/api/orders/admin/{oid}/cod-received/", {}, as_=self.boss).status_code, 409)
        from apps.core.models import AuditLog
        self.assertTrue(AuditLog.objects.filter(action="order.cod_received", entity_id=oid).exists())

    def test_seller_earning_includes_the_delivery_fee(self):
        oid = self.place(self.lamp)  # 1000 + 149 delivery; platform fee 30 stays with ReOrbit
        self.deliver(oid, self.lamp)
        self.assertEqual(self.entries("Earning").get().amount, 1149)
        o = self.get(f"/api/orders/sales/{oid}/", as_=self.seller).data["data"]["order"]
        self.assertEqual(o["seller_earning"], 1149)


class ReturnTests(PostDeliveryBase):
    def delivered(self, item=None, method="COD"):
        item = item or self.lamp
        oid = self.place(item, method=method)
        self.deliver(oid, item)
        return oid, item

    def test_request_rules(self):
        oid, _ = self.delivered()
        self.assertEqual(self.ask_return(oid, who=self.seller).status_code, 404)  # not the buyer
        self.assertEqual(self.ask_return(oid, reason="nope").status_code, 400)
        self.assertEqual(self.ask_return(oid, details="bad").status_code, 400)
        r = self.ask_return(oid, photos=0)  # the seller's fault needs a photo
        self.assertEqual(r.status_code, 400)
        self.assertIn("photos", r.data["errors"])
        self.assertEqual(self.ask_return(oid, photos=5).status_code, 400)
        ok = self.ask_return(oid)
        self.assertEqual(ok.status_code, 201, ok.data)
        ret = ok.data["data"]["order"]["return"]
        self.assertEqual((ret["status"], ret["fault"], len(ret["photos"])), ("Requested", "seller", 1))
        self.assertEqual(self.ask_return(oid).status_code, 409)  # only one return per order

    def test_buyer_choice_needs_no_photo_and_window_closes(self):
        oid, _ = self.delivered()
        Order.objects.filter(public_id=oid).update(delivered_at=timezone.now() - timedelta(days=8))
        self.assertEqual(self.ask_return(oid, reason="changed_mind", photos=0).status_code, 409)
        Order.objects.filter(public_id=oid).update(delivered_at=timezone.now() - timedelta(days=6))
        self.assertEqual(self.ask_return(oid, reason="changed_mind", photos=0).status_code, 201)

    def test_not_before_delivery(self):
        oid = self.place(self.lamp)
        self.assertEqual(self.ask_return(oid).status_code, 409)

    def test_seller_fault_prepaid_full_refund_and_earning_taken_back(self):
        oid, item = self.delivered(self.lamp, method="RAZORPAY")  # 1179 paid
        self.ask_return(oid)
        w = self.get("/api/payments/wallet/", as_=self.seller).data["data"]["balances"]
        self.assertEqual(w["pending"], 1149)
        # frozen while the return is open, even after the hold days pass
        WalletEntry.objects.filter(kind="Earning").update(available_at=timezone.now() - timedelta(days=1))
        w = self.get("/api/payments/wallet/", as_=self.seller).data["data"]["balances"]
        self.assertEqual((w["available"], w["pending"]), (0, 1149))
        self.assertEqual(self.act(oid, item, "return-received").status_code, 409)  # approve first
        self.assertEqual(self.act(oid, item, "return-reject", {"note": "x"}).status_code, 400)  # reasons are needed
        self.assertEqual(self.act(oid, item, "return-approve").status_code, 200)
        with mock.patch.object(gateway, "refund", return_value={"id": "rfnd_9"}) as rf:
            r = self.act(oid, item, "return-received")
        self.assertEqual(rf.call_args.args[1], 1179)  # item + platform fee + delivery fee
        o = r.data["data"]["order"]
        self.assertEqual((o["return"]["status"], o["return"]["refund_amount"], o["payment"]["status"]), ("Refunded", 1179, "Refunded"))
        w = self.get("/api/payments/wallet/", as_=self.seller).data["data"]["balances"]
        self.assertEqual((w["available"], w["pending"]), (0, 0))  # earning taken back
        self.assertEqual(self.entries("Reversal").get().amount, -1149)
        self.assertEqual(self.act(oid, item, "return-received").status_code, 409)  # not twice

    def test_buyer_choice_keeps_the_delivery_fee_and_seller_keeps_it_too(self):
        oid, item = self.delivered(self.lamp, method="RAZORPAY")
        self.ask_return(oid, reason="changed_mind", photos=0)
        self.act(oid, item, "return-approve")
        with mock.patch.object(gateway, "refund", return_value={"id": "rfnd_9"}) as rf:
            self.act(oid, item, "return-received")
        self.assertEqual(rf.call_args.args[1], 1030)  # 1000 + 30 fee, no delivery fee
        self.assertEqual(self.entries("Reversal").get().amount, -1000)  # the seller keeps the delivery fee

    def test_cod_return_creates_a_manual_refund_the_admin_sends(self):
        oid, item = self.delivered(self.lamp)
        self.ask_return(oid)
        self.act(oid, item, "return-approve")
        with mock.patch.object(gateway, "refund") as rf:
            self.act(oid, item, "return-received")
        rf.assert_not_called()
        r = Refund.objects.get()
        self.assertEqual((r.method, r.status, r.amount), ("MANUAL", "Pending", 1179))
        self.assertEqual(Order.objects.get(public_id=oid).payment_status, "Refund_Pending")
        clerk = self.make_admin("clerk@example.com", modules={"orders": "edit"})  # no finance
        self.assertEqual(self.post(f"/api/payments/admin/refunds/{r.public_id}/mark-paid/", {"reference": "UTR1"}, as_=clerk).status_code, 403)
        self.assertEqual(self.post(f"/api/payments/admin/refunds/{r.public_id}/mark-paid/", {}, as_=self.boss).status_code, 400)
        fin = self.fin
        done = self.post(f"/api/payments/admin/refunds/{r.public_id}/mark-paid/", {"reference": "UTR12345"}, as_=self.boss)
        self.assertEqual(done.status_code, 200, done.data)
        self.assertEqual(Order.objects.get(public_id=oid).payment_status, "Refunded")
        self.assertEqual(self.post(f"/api/payments/admin/refunds/{r.public_id}/mark-paid/", {"reference": "UTR12345"}, as_=self.boss).status_code, 409)

    def test_rejected_then_escalated_then_admin_decides(self):
        oid, item = self.delivered(self.lamp)
        self.ask_return(oid)
        self.assertEqual(self.post(f"/api/orders/me/{oid}/return/escalate/", {}, as_=self.buyer).status_code, 409)  # not rejected yet
        self.act(oid, item, "return-reject", {"note": "Item was fine when it left"})
        o = self.get(f"/api/orders/me/{oid}/", as_=self.buyer).data["data"]["order"]
        self.assertTrue(o["return"]["can_escalate"])
        # the seller's money stays frozen during the escalation window
        WalletEntry.objects.filter(kind="Earning").update(available_at=timezone.now() - timedelta(days=1))
        self.assertEqual(self.get("/api/payments/wallet/", as_=self.seller).data["data"]["balances"]["available"], 0)
        self.assertEqual(self.post(f"/api/orders/me/{oid}/return/escalate/", {}, as_=self.seller).status_code, 404)
        self.assertEqual(self.post(f"/api/orders/me/{oid}/return/escalate/", {}, as_=self.buyer).status_code, 200)
        self.assertEqual(self.act(oid, item, "return-approve").status_code, 409)  # the seller can no longer decide
        a = f"/api/orders/admin/{oid}/return-decide/"
        self.assertEqual(self.post(a, {"approve": True}, as_=self.boss).status_code, 400)  # a reason is needed
        r = self.post(a, {"approve": True, "fault": "seller", "note": "Photos show the crack"}, as_=self.boss)
        self.assertEqual(r.data["data"]["order"]["return"]["status"], "Approved")
        self.assertEqual(self.post(f"/api/orders/admin/{oid}/return-received/", {}, as_=self.boss).data["data"]["order"]["return"]["status"], "Refunded")

    def test_admin_closing_a_return_releases_the_earning(self):
        oid, item = self.delivered(self.lamp)
        self.ask_return(oid)
        self.act(oid, item, "return-reject", {"note": "Item was fine when it left"})
        self.post(f"/api/orders/me/{oid}/return/escalate/", {}, as_=self.buyer)
        r = self.post(f"/api/orders/admin/{oid}/return-decide/", {"approve": False, "note": "No damage visible"}, as_=self.boss)
        self.assertEqual(r.data["data"]["order"]["return"]["status"], "Closed")
        WalletEntry.objects.filter(kind="Earning").update(available_at=timezone.now() - timedelta(days=1))
        self.assertEqual(self.get("/api/payments/wallet/", as_=self.seller).data["data"]["balances"]["available"], 1149)
        self.assertEqual(Refund.objects.count(), 0)

    def test_rejection_window_ends(self):
        oid, item = self.delivered(self.lamp)
        self.ask_return(oid)
        self.act(oid, item, "return-reject", {"note": "Item was fine when it left"})
        ReturnRequest.objects.update(escalate_until=timezone.now() - timedelta(hours=1))
        self.assertEqual(self.post(f"/api/orders/me/{oid}/return/escalate/", {}, as_=self.buyer).status_code, 409)
        WalletEntry.objects.filter(kind="Earning").update(available_at=timezone.now() - timedelta(days=1))
        self.assertEqual(self.get("/api/payments/wallet/", as_=self.seller).data["data"]["balances"]["available"], 1149)

    def test_buyer_can_withdraw_before_an_answer(self):
        oid, item = self.delivered(self.lamp)
        self.ask_return(oid)
        self.assertEqual(self.post(f"/api/orders/me/{oid}/return/withdraw/", {}, as_=self.buyer).status_code, 200)
        self.assertEqual(ReturnRequest.objects.get().status, "Closed")
        self.assertEqual(self.act(oid, item, "return-approve").status_code, 409)

    def test_store_order_returns_are_handled_by_admin(self):
        oid, _ = self.delivered(self.tote)  # ReOrbit store item: the seller is the platform
        self.assertEqual(self.ask_return(oid, who=self.buyer).status_code, 201)
        r = self.post(f"/api/orders/admin/{oid}/return-approve/", {}, as_=self.boss)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(self.post(f"/api/orders/admin/{oid}/return-received/", {}, as_=self.boss).status_code, 200)
        self.assertEqual(Refund.objects.get().amount, 579)
        self.assertEqual(self.entries().count(), 0)  # nothing to take back: stores earn no wallet money


class RefundTests(PostDeliveryBase):
    def paid(self):
        return self.place(self.tote, method="RAZORPAY")

    def test_failed_refund_is_visible_and_can_be_retried(self):
        oid = self.paid()
        with mock.patch.object(gateway, "refund", side_effect=gateway.GatewayError("down")):
            self.post(f"/api/orders/me/{oid}/cancel/", {}, as_=self.buyer)
        r = Refund.objects.get()
        self.assertEqual((r.status, r.attempts, r.reason), ("Failed", 1, "cancelled"))
        self.assertEqual(Order.objects.get(public_id=oid).payment_status, "Refund_Failed")
        lst = self.get("/api/payments/admin/refunds/?status=Failed", as_=self.boss).data["data"]
        self.assertEqual((lst["count"], lst["results"][0]["order"], lst["results"][0]["amount"]), (1, oid, 579))
        viewer = self.make_admin("v@example.com", modules={"orders": "view"})
        self.assertEqual(self.post(f"/api/payments/admin/refunds/{r.public_id}/retry/", {}, as_=viewer).status_code, 403)
        # the first attempt may actually have gone through: the retry looks for it before sending again
        with mock.patch.object(gateway, "find_refund", return_value={"id": "rfnd_earlier"}) as fr, \
                mock.patch.object(gateway, "refund") as rf:
            ok = self.post(f"/api/payments/admin/refunds/{r.public_id}/retry/", {}, as_=self.boss)
        self.assertEqual(ok.status_code, 200, ok.data)
        fr.assert_called_once()
        rf.assert_not_called()
        r.refresh_from_db()
        self.assertEqual((r.status, r.razorpay_refund_id), ("Done", "rfnd_earlier"))
        self.assertEqual(Order.objects.get(public_id=oid).payment_status, "Refunded")
        self.assertEqual(self.post(f"/api/payments/admin/refunds/{r.public_id}/retry/", {}, as_=self.boss).status_code, 409)

    def test_retry_that_fails_again_stays_visible(self):
        oid = self.paid()
        with mock.patch.object(gateway, "refund", side_effect=gateway.GatewayError("down")):
            self.post(f"/api/orders/me/{oid}/cancel/", {}, as_=self.buyer)
            r = Refund.objects.get()
            with mock.patch.object(gateway, "find_refund", return_value=None):
                res = self.post(f"/api/payments/admin/refunds/{r.public_id}/retry/", {}, as_=self.boss)
        self.assertEqual(res.status_code, 200)
        r.refresh_from_db()
        self.assertEqual((r.status, r.attempts), ("Failed", 2))

    def test_a_payment_can_never_be_refunded_twice_over(self):
        oid = self.paid()
        p = Payment.objects.get()
        with mock.patch.object(gateway, "refund", return_value={"id": "r1"}):
            refunds.create(p, 400, "admin")
            with self.assertRaises(refunds.RefundError):
                refunds.create(p, 200, "admin")  # 400 + 200 > 579
            refunds.create(p, 179, "admin")
        self.assertEqual(sum(Refund.objects.values_list("amount", flat=True)), 579)

    def test_late_payment_refund_is_recorded(self):
        from apps.orders import services

        with mock.patch.object(gateway, "create_order", return_value={"id": "order_LATE"}):
            r = self.checkout([{"id": self.lamp.public_id, "qty": 1}], method="RAZORPAY")
        Payment.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
        services.expire_stale()
        type(self.lamp).objects.filter(pk=self.lamp.pk).update(quantity=0, item_status="Sold")  # the goods are gone
        with mock.patch.object(gateway, "refund", return_value={"id": "rfnd_late"}) as rf:
            v = self.post("/api/payments/verify/", {"razorpay_order_id": "order_LATE", "razorpay_payment_id": "pay_late",
                                                    "razorpay_signature": sign("order_LATE", "pay_late")}, as_=self.buyer)
        self.assertEqual(v.status_code, 200, v.data)
        rf.assert_called_once()
        row = Refund.objects.get()
        self.assertEqual((row.reason, row.status, row.order_id), ("late_payment", "Done", None))
        self.assertEqual(Payment.objects.get().status, "Refunded")
