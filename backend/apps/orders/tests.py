import hashlib
import hmac
import json
from datetime import timedelta
from unittest import mock

from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone

from apps.admins.models import AdminItem
from apps.core.models import Category, PlatformSettings
from apps.core.testing import APIBase
from apps.listings.models import Item
from apps.payments import gateway
from apps.payments.models import Payment
from apps.remakers.models import RemakerProduct

from . import services
from .models import Order

KEYS = dict(RAZORPAY_KEY_ID="rzp_test_x", RAZORPAY_KEY_SECRET="topsecret", RAZORPAY_WEBHOOK_SECRET="whsec")
GOOD_ADDR = {"label": "Home", "name": "Asha Shah", "phone": "9876543210", "line1": "12 Ring Road, Adajan",
             "city": "Surat", "pincode": "395009"}


def sign(order_id, payment_id):
    return hmac.new(b"topsecret", f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()


@override_settings(**KEYS)
class OrderBase(APIBase):
    def setUp(self):
        super().setUp()
        self.rz_override = {}

        def fake_fetch(payment_id):
            p = Payment.objects.filter(razorpay_payment_id=None).exclude(razorpay_order_id=None).order_by("-pk").first()
            entity = {"id": payment_id, "order_id": p.razorpay_order_id if p else "", "amount": (p.amount * 100) if p else 0,
                      "currency": "INR", "status": "captured"}
            entity.update(self.rz_override)
            return entity

        patcher = mock.patch.object(gateway, "fetch_payment", side_effect=fake_fetch)
        patcher.start()
        self.addCleanup(patcher.stop)
        s = PlatformSettings.load()
        s.platform_fee_pct, s.item_delivery, s.product_delivery, s.free_delivery_from = 3, 149, 79, 1500
        s.admin_item_delivery, s.admin_item_free_from = 79, 1500  # ReOrbit's own listings
        s.cod_enabled, s.cod_limit = True, 20000
        s.save()
        self.cat = Category.objects.create(name="Furniture", slug="furniture", applies_to="Both")
        self.buyer = self.make_user("buyer@example.com")
        self.seller = self.make_user("seller@example.com")
        self.maker = self.make_remaker()
        self.boss = self.make_admin("boss@example.com", modules={"orders": "edit", "products": "edit"})
        self.lamp = Item.objects.create(
            user=self.seller, category=self.cat, title="Brass lamp", description="Old brass lamp, works well.",
            condition="Good", quantity=1, listing_price=1000, pickup_preference="Platform_Pickup",
            item_status="Listed", city="Surat", pincode="395003")
        self.table = RemakerProduct.objects.create(
            remaker=self.maker, category=self.cat, title="Teak table", description="Made from an old teak door.",
            price=2400, stock=3, status="Listed")
        self.tote = AdminItem.objects.create(
            admin=self.boss, category=self.cat, title="Jute tote", description="Hand stitched bag.",
            price=500, stock=5, status="Listed", sku="RO-T1")
        r = self.post("/api/orders/addresses/", GOOD_ADDR, as_=self.buyer)
        self.assertEqual(r.status_code, 201, r.data)
        self.addr = r.data["data"]["address"]["id"]

    def checkout(self, items, method="COD", who=None, key=None, **extra):
        body = {"items": items, "address_id": self.addr, "method": method, **extra}
        kw = {"HTTP_IDEMPOTENCY_KEY": key} if key else {}
        return self.client.post("/api/orders/checkout/", body, format="json", **kw, **self._headers(who or self.buyer))

    def refresh(self):
        for o in (self.lamp, self.table, self.tote):
            o.refresh_from_db()


class AddressTests(OrderBase):
    def test_first_is_default_and_gujarat_only(self):
        a = self.get("/api/orders/addresses/", as_=self.buyer).data["data"]["addresses"]
        self.assertEqual(len(a), 1)
        self.assertTrue(a[0]["is_default"])
        r = self.post("/api/orders/addresses/", {**GOOD_ADDR, "pincode": "110001"}, as_=self.buyer)
        self.assertEqual(r.status_code, 400)
        self.assertIn("pincode", r.data["errors"])
        r = self.post("/api/orders/addresses/", {**GOOD_ADDR, "city": "Delhi"}, as_=self.buyer)
        self.assertIn("city", r.data["errors"])

    def test_cannot_use_someone_elses_address(self):
        r = self.checkout([{"id": self.tote.public_id, "qty": 1}], who=self.seller)
        self.assertEqual(r.status_code, 400)
        self.assertIn("address_id", r.data["errors"])


class CheckoutTests(OrderBase):
    def test_cod_splits_per_seller_and_server_prices(self):
        lines = [{"id": self.lamp.public_id, "qty": 1}, {"id": self.table.public_id, "qty": 2},
                 {"id": self.tote.public_id, "qty": 1}]
        r = self.checkout(lines, price=1, total=1)  # extra keys are ignored
        self.assertEqual(r.status_code, 201, r.data)
        orders = {o["seller"]["type"]: o for o in r.data["data"]["orders"]}
        self.assertEqual(set(orders), {"user", "remaker", "platform"})
        u, m, p = orders["user"], orders["remaker"], orders["platform"]
        self.assertEqual((u["subtotal"], u["platform_fee"], u["delivery_fee"], u["total"]), (1000, 30, 149, 1179))
        self.assertEqual((m["subtotal"], m["platform_fee"], m["delivery_fee"], m["total"]), (4800, 144, 0, 4944))
        self.assertEqual((p["subtotal"], p["platform_fee"], p["delivery_fee"], p["total"]), (500, 0, 79, 579))
        self.assertEqual(r.data["data"]["payment"]["amount"], 1179 + 4944 + 579)
        self.assertTrue(all(o["status"] == "Confirmed" for o in orders.values()))
        self.refresh()
        self.assertEqual((self.lamp.item_status, self.table.stock, self.tote.stock), ("Sold", 1, 4))

    def test_last_piece_goes_to_first_buyer_only(self):
        other = self.make_user("other@example.com")
        self.post("/api/orders/addresses/", GOOD_ADDR, as_=other)
        a2 = self.get("/api/orders/addresses/", as_=other).data["data"]["addresses"][0]["id"]
        self.assertEqual(self.checkout([{"id": self.lamp.public_id, "qty": 1}]).status_code, 201)
        r = self.client.post("/api/orders/checkout/", {"items": [{"id": self.lamp.public_id, "qty": 1}],
                             "address_id": a2, "method": "COD"}, format="json", **self._headers(other))
        self.assertEqual(r.status_code, 409)
        self.assertIn(self.lamp.public_id, r.data["errors"])

    def test_cannot_overbuy_or_buy_own(self):
        r = self.checkout([{"id": self.table.public_id, "qty": 9}])
        self.assertEqual(r.status_code, 409)
        self.post("/api/orders/addresses/", GOOD_ADDR, as_=self.seller)
        mine = self.get("/api/orders/addresses/", as_=self.seller).data["data"]["addresses"][0]["id"]
        r = self.client.post("/api/orders/checkout/", {"items": [{"id": self.lamp.public_id, "qty": 1}],
                             "address_id": mine, "method": "COD"}, format="json", **self._headers(self.seller))
        self.assertEqual(r.status_code, 409)
        self.assertIn("own listing", r.data["errors"][self.lamp.public_id])
        self.refresh()
        self.assertEqual(self.table.stock, 3)

    def test_unlisted_and_paused_not_sellable(self):
        self.table.status = "Inactive"
        self.table.save()
        self.assertEqual(self.checkout([{"id": self.table.public_id, "qty": 1}]).status_code, 409)

    def test_multi_quantity_member_item_returns_stock_exactly(self):
        self.lamp.quantity = 5
        self.lamp.save()
        other = self.make_user("other@example.com")
        self.post("/api/orders/addresses/", GOOD_ADDR, as_=other)
        a2 = self.get("/api/orders/addresses/", as_=other).data["data"]["addresses"][0]["id"]
        first = self.checkout([{"id": self.lamp.public_id, "qty": 3}])
        self.assertEqual(first.status_code, 201, first.data)
        r = self.client.post("/api/orders/checkout/", {"items": [{"id": self.lamp.public_id, "qty": 2}],
                             "address_id": a2, "method": "COD"}, format="json", **self._headers(other))
        self.assertEqual(r.status_code, 201, r.data)
        self.lamp.refresh_from_db()
        self.assertEqual((self.lamp.quantity, self.lamp.item_status), (0, "Sold"))
        self.post(f"/api/orders/me/{first.data['data']['orders'][0]['id']}/cancel/", {}, as_=self.buyer)
        self.lamp.refresh_from_db()
        self.assertEqual((self.lamp.quantity, self.lamp.item_status), (3, "Listed"))  # B still holds its 2

    def test_bad_input(self):
        for items in ([], None, [{"id": "XYZ-1", "qty": 1}], [{"id": self.tote.public_id, "qty": 0}],
                      [{"id": self.tote.public_id, "qty": "x"}]):
            self.assertEqual(self.checkout(items).status_code, 400, items)
        r = self.checkout([{"id": self.tote.public_id, "qty": 1}], method="BITCOIN")
        self.assertEqual(r.status_code, 400)

    def test_cod_limit(self):
        s = PlatformSettings.load()
        s.cod_limit = 400
        s.save()
        r = self.checkout([{"id": self.tote.public_id, "qty": 1}])
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["code"], "COD_BLOCKED")
        s.cod_enabled = False
        s.save()
        self.assertEqual(self.checkout([{"id": self.tote.public_id, "qty": 1}]).status_code, 400)

    def test_idempotency_key_stops_double_orders(self):
        a = self.checkout([{"id": self.tote.public_id, "qty": 1}], key="k1")
        b = self.checkout([{"id": self.tote.public_id, "qty": 1}], key="k1")
        self.assertEqual(a.data["data"]["payment"]["id"], b.data["data"]["payment"]["id"])
        self.assertEqual(Order.objects.count(), 1)
        self.refresh()
        self.assertEqual(self.tote.stock, 4)

    def test_quote_matches_checkout_and_touches_nothing(self):
        lines = [{"id": self.table.public_id, "qty": 1}, {"id": self.tote.public_id, "qty": 2}]
        q = self.post("/api/orders/quote/", {"items": lines}, as_=self.buyer).data["data"]
        r = self.checkout(lines)
        self.assertEqual(q["total"], r.data["data"]["payment"]["amount"])
        self.assertEqual(q["problems"], {})

    def test_requires_login_and_user_account(self):
        self.assertEqual(self.client.post("/api/orders/checkout/", {}, format="json").status_code, 401)
        self.assertEqual(self.checkout([{"id": self.tote.public_id, "qty": 1}], who=self.maker).status_code, 400)  # ReMakers may buy; no address yet


class OnlinePaymentTests(OrderBase):
    def start(self, items=None, **kw):
        items = items or [{"id": self.lamp.public_id, "qty": 1}, {"id": self.tote.public_id, "qty": 2}]
        with mock.patch.object(gateway, "create_order", return_value={"id": "order_ABC"}) as m:
            r = self.checkout(items, method="RAZORPAY", **kw)
        self.assertEqual(r.status_code, 201, r.data)
        return r.data["data"], m

    def test_hold_then_verify(self):
        d, m = self.start()
        self.assertEqual(m.call_args.args[0], d["payment"]["amount"])
        self.assertEqual(d["payment"]["razorpay_order_id"], "order_ABC")
        self.assertEqual(d["payment"]["key_id"], "rzp_test_x")
        self.assertTrue(all(o["status"] == "Pending_Payment" for o in d["orders"]))
        self.refresh()
        self.assertEqual((self.lamp.item_status, self.tote.stock), ("Reserved", 3))
        # sellers do not see unpaid orders
        self.assertEqual(self.get("/api/orders/sales/", as_=self.seller).data["data"]["count"], 0)
        bad = self.post("/api/payments/verify/", {"razorpay_order_id": "order_ABC", "razorpay_payment_id": "pay_1",
                                                  "razorpay_signature": "nope"}, as_=self.buyer)
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(Payment.objects.get().status, "Created")
        good = {"razorpay_order_id": "order_ABC", "razorpay_payment_id": "pay_1", "razorpay_signature": sign("order_ABC", "pay_1")}
        for _ in range(2):  # twice: idempotent
            r = self.post("/api/payments/verify/", good, as_=self.buyer)
            self.assertEqual(r.status_code, 200, r.data)
            self.assertEqual(r.data["data"]["payment"]["status"], "Paid")
        self.refresh()
        self.assertEqual(self.lamp.item_status, "Sold")
        self.assertEqual(set(Order.objects.values_list("status", "payment_status")), {("Confirmed", "Paid")})
        self.assertEqual(self.get("/api/orders/sales/", as_=self.seller).data["data"]["count"], 1)

    def _verify(self, pay="pay_1"):
        return self.post("/api/payments/verify/", {"razorpay_order_id": "order_ABC", "razorpay_payment_id": pay,
                                                   "razorpay_signature": sign("order_ABC", pay)}, as_=self.buyer)

    def test_verify_refuses_when_razorpay_record_does_not_match(self):
        self.start()
        for override in ({"order_id": "order_OTHER"}, {"amount": 100}, {"currency": "USD"}, {"status": "failed"},
                         {"status": "created"}, {"id": "pay_someone_else"}):
            self.rz_override = override
            r = self._verify()
            self.assertEqual(r.status_code, 400, override)
            self.assertEqual(r.data["code"], "PAYMENT_MISMATCH", override)
            self.assertEqual(Payment.objects.get().status, "Created", override)
        self.rz_override = {}
        self.assertEqual(self._verify().status_code, 200)

    def test_authorized_payment_is_captured_first(self):
        self.start()
        self.rz_override = {"status": "authorized"}
        with mock.patch.object(gateway, "capture_payment", return_value={"id": "pay_1", "order_id": "order_ABC",
                               "amount": Payment.objects.get().amount * 100, "currency": "INR", "status": "captured"}) as cap:
            self.assertEqual(self._verify().status_code, 200)
        cap.assert_called_once()

    def test_gateway_down_during_verify_keeps_hold(self):
        self.start()
        with mock.patch.object(gateway, "fetch_payment", side_effect=gateway.GatewayError("down")):
            self.assertEqual(self._verify().status_code, 503)
        self.assertEqual(Payment.objects.get().status, "Created")

    def test_other_buyer_cannot_verify(self):
        self.start()
        other = self.make_user("o2@example.com")
        r = self.post("/api/payments/verify/", {"razorpay_order_id": "order_ABC", "razorpay_payment_id": "p",
                                                "razorpay_signature": sign("order_ABC", "p")}, as_=other)
        self.assertEqual(r.status_code, 404)

    def test_cancel_window_gives_stock_back(self):
        d, _ = self.start()
        r = self.post(f"/api/payments/{d['payment']['id']}/cancel/", {}, as_=self.buyer)
        self.assertEqual(r.data["data"]["payment"]["status"], "Cancelled")
        self.refresh()
        self.assertEqual((self.lamp.item_status, self.tote.stock), ("Listed", 5))
        self.assertEqual(self.get("/api/orders/me/", as_=self.buyer).data["data"]["count"], 0)

    def test_expired_hold_is_released_by_command(self):
        self.start()
        Payment.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
        call_command("expire_payments")
        self.refresh()
        self.assertEqual((self.lamp.item_status, self.tote.stock), ("Listed", 5))
        self.assertEqual(Payment.objects.get().status, "Expired")

    def test_new_checkout_replaces_own_abandoned_hold(self):
        self.start([{"id": self.lamp.public_id, "qty": 1}])
        with mock.patch.object(gateway, "create_order", return_value={"id": "order_NEW"}):
            r = self.checkout([{"id": self.lamp.public_id, "qty": 1}], method="RAZORPAY")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Payment.objects.filter(status="Cancelled").count(), 1)

    def test_gateway_down_releases_everything(self):
        with mock.patch.object(gateway, "create_order", side_effect=gateway.GatewayError("down")):
            r = self.checkout([{"id": self.lamp.public_id, "qty": 1}], method="RAZORPAY")
        self.assertEqual(r.status_code, 503)
        self.refresh()
        self.assertEqual(self.lamp.item_status, "Listed")

    @override_settings(RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
    def test_not_configured(self):
        self.assertFalse(self.get("/api/payments/config/").data["data"]["enabled"])
        r = self.checkout([{"id": self.tote.public_id, "qty": 1}], method="RAZORPAY")
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.data["code"], "PAYMENT_NOT_CONFIGURED")

    def test_config_never_leaks_secret(self):
        data = self.get("/api/payments/config/").data["data"]
        self.assertEqual(data, {"enabled": True, "key_id": "rzp_test_x"})


class WebhookTests(OrderBase):
    start = OnlinePaymentTests.start

    def hook(self, payload, event_id="evt_1", sig=None):
        raw = json.dumps(payload).encode()
        sig = sig or hmac.new(b"whsec", raw, hashlib.sha256).hexdigest()
        return self.client.post("/api/payments/webhook/", raw, content_type="application/json",
                                HTTP_X_RAZORPAY_SIGNATURE=sig, HTTP_X_RAZORPAY_EVENT_ID=event_id)

    def captured(self, amount, order="order_ABC", pay="pay_9"):
        return {"event": "payment.captured", "payload": {"payment": {"entity": {"id": pay, "order_id": order, "amount": amount * 100, "currency": "INR", "status": "captured"}}}}

    def test_bad_signature_rejected(self):
        self.start()
        self.assertEqual(self.hook(self.captured(1), sig="bad").status_code, 400)

    def test_webhook_confirms_and_dedupes(self):
        d, _ = self.start()
        amt = d["payment"]["amount"]
        self.assertEqual(self.hook(self.captured(amt)).status_code, 200)
        self.assertEqual(Payment.objects.get().status, "Paid")
        self.assertEqual(self.hook(self.captured(amt)).data["message"], "Already processed.")

    def test_uncaptured_webhook_ignored(self):
        d, _ = self.start()
        body = self.captured(d["payment"]["amount"])
        body["payload"]["payment"]["entity"]["status"] = "authorized"
        self.hook(body)
        self.assertEqual(Payment.objects.get().status, "Created")

    def test_wrong_amount_ignored(self):
        self.start()
        self.hook(self.captured(1))
        self.assertEqual(Payment.objects.get().status, "Created")

    def test_late_payment_after_expiry_retakes_stock(self):
        d, _ = self.start()
        Payment.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
        services.expire_stale()
        self.hook(self.captured(d["payment"]["amount"]))
        self.assertEqual(Payment.objects.get().status, "Paid")
        self.refresh()
        self.assertEqual(self.lamp.item_status, "Sold")
        self.assertEqual(set(Order.objects.values_list("status", flat=True)), {"Confirmed"})

    def test_late_payment_when_goods_gone_is_refunded(self):
        d, _ = self.start([{"id": self.lamp.public_id, "qty": 1}])
        Payment.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
        services.expire_stale()
        self.assertEqual(self.checkout([{"id": self.lamp.public_id, "qty": 1}]).status_code, 201)  # someone else bought it
        with mock.patch.object(gateway, "refund") as rf:
            self.hook(self.captured(d["payment"]["amount"]))
        rf.assert_called_once_with("pay_9", d["payment"]["amount"], receipt=mock.ANY)
        self.assertEqual(Payment.objects.get(public_id=d["payment"]["id"]).status, "Refunded")


class FulfilmentTests(OrderBase):
    def place(self, items=None, method="COD"):
        items = items or [{"id": self.tote.public_id, "qty": 1}]
        r = self.checkout(items, method=method)
        self.assertEqual(r.status_code, 201, r.data)
        return r.data["data"]["orders"][0]["id"]

    def test_seller_flow_and_cod_collected(self):
        oid = self.place([{"id": self.table.public_id, "qty": 1}])
        S = f"/api/orders/sales/{oid}/"
        self.assertEqual(self.post(S + "ship/", {}, as_=self.maker).status_code, 409)  # not packed yet
        self.assertEqual(self.post(S + "pack/", {}, as_=self.maker).data["data"]["order"]["status"], "Packed")
        r = self.post(S + "ship/", {"courier_name": "Delhivery"}, as_=self.maker)
        self.assertEqual(r.status_code, 400)
        self.assertIn("tracking_no", r.data["errors"])
        r = self.post(S + "ship/", {"courier_name": "Delhivery", "tracking_no": "12345678901"}, as_=self.maker)
        self.assertEqual(r.data["data"]["order"]["courier"], {"name": "Delhivery", "tracking_no": "12345678901"})
        r = self.post(S + "deliver/", {}, as_=self.maker)
        o = r.data["data"]["order"]
        self.assertEqual((o["status"], o["payment"]["status"]), ("Delivered", "COD_Collected"))  # courier has the cash
        self.assertEqual([e["label"] for e in o["events"]][-3:], ["Packed", "Shipped", "Delivered"])
        self.assertEqual(self.get(f"/api/orders/me/{oid}/", as_=self.buyer).data["data"]["order"]["status"], "Delivered")

    def test_only_the_seller_can_act(self):
        oid = self.place([{"id": self.table.public_id, "qty": 1}])
        for who in (self.seller, self.buyer):
            self.assertEqual(self.post(f"/api/orders/sales/{oid}/pack/", {}, as_=who).status_code, 404)
        self.assertEqual(self.get(f"/api/orders/sales/{oid}/", as_=self.seller).status_code, 404)

    def test_member_seller_sees_buyer_and_acts(self):
        oid = self.place([{"id": self.lamp.public_id, "qty": 1}])
        d = self.get("/api/orders/sales/", as_=self.seller).data["data"]
        self.assertEqual(d["counts"]["Confirmed"], 1)
        self.assertEqual(d["results"][0]["buyer"]["name"], "Test User")
        self.assertEqual(self.post(f"/api/orders/sales/{oid}/pack/", {}, as_=self.seller).status_code, 200)

    def test_buyer_cancel_gives_stock_back(self):
        oid = self.place([{"id": self.table.public_id, "qty": 2}])
        r = self.post(f"/api/orders/me/{oid}/cancel/", {"reason": "changed mind"}, as_=self.buyer)
        self.assertEqual(r.data["data"]["order"]["status"], "Cancelled")
        self.table.refresh_from_db()
        self.assertEqual(self.table.stock, 3)
        self.assertEqual(self.post(f"/api/orders/me/{oid}/cancel/", {}, as_=self.buyer).status_code, 409)

    def test_cannot_cancel_after_shipping(self):
        oid = self.place([{"id": self.table.public_id, "qty": 1}])
        S = f"/api/orders/sales/{oid}/"
        self.post(S + "pack/", {}, as_=self.maker)
        self.post(S + "ship/", {"courier_name": "DTDC", "tracking_no": "D12345678"}, as_=self.maker)
        self.assertEqual(self.post(f"/api/orders/me/{oid}/cancel/", {}, as_=self.buyer).status_code, 409)

    def test_seller_cancel_needs_reason(self):
        oid = self.place([{"id": self.table.public_id, "qty": 1}])
        self.assertEqual(self.post(f"/api/orders/sales/{oid}/cancel/", {}, as_=self.maker).status_code, 400)
        self.assertEqual(self.post(f"/api/orders/sales/{oid}/cancel/", {"reason": "Out of material"}, as_=self.maker).status_code, 200)

    def test_cancel_paid_online_order_refunds(self):
        with mock.patch.object(gateway, "create_order", return_value={"id": "order_R"}):
            self.checkout([{"id": self.tote.public_id, "qty": 1}], method="RAZORPAY")
        self.post("/api/payments/verify/", {"razorpay_order_id": "order_R", "razorpay_payment_id": "pay_R",
                                            "razorpay_signature": sign("order_R", "pay_R")}, as_=self.buyer)
        oid = Order.objects.get().public_id
        with mock.patch.object(gateway, "refund") as rf:
            r = self.post(f"/api/orders/me/{oid}/cancel/", {}, as_=self.buyer)
        rf.assert_called_once_with("pay_R", 579, receipt=mock.ANY)
        self.assertEqual(r.data["data"]["order"]["payment"]["status"], "Refunded")
        self.tote.refresh_from_db()
        self.assertEqual(self.tote.stock, 5)

    def test_failed_refund_is_flagged_not_hidden(self):
        with mock.patch.object(gateway, "create_order", return_value={"id": "order_R"}):
            self.checkout([{"id": self.tote.public_id, "qty": 1}], method="RAZORPAY")
        self.post("/api/payments/verify/", {"razorpay_order_id": "order_R", "razorpay_payment_id": "pay_R",
                                            "razorpay_signature": sign("order_R", "pay_R")}, as_=self.buyer)
        oid = Order.objects.get().public_id
        with mock.patch.object(gateway, "refund", side_effect=gateway.GatewayError("x")):
            r = self.post(f"/api/orders/me/{oid}/cancel/", {}, as_=self.buyer)
        self.assertEqual(r.data["data"]["order"]["payment"]["status"], "Refund_Failed")

    def test_admin_manages_store_orders(self):
        oid = self.place([{"id": self.tote.public_id, "qty": 1}])
        d = self.get("/api/orders/admin/?seller_type=platform", as_=self.boss).data["data"]
        self.assertEqual(d["count"], 1)
        self.assertEqual(self.post(f"/api/orders/admin/{oid}/pack/", {}, as_=self.boss).status_code, 200)
        nobody = self.make_admin("n@example.com", modules={"products": "edit"})
        self.assertEqual(self.get("/api/orders/admin/", as_=nobody).status_code, 403)
        viewer = self.make_admin("v@example.com", modules={"orders": "view"})
        self.assertEqual(self.get("/api/orders/admin/", as_=viewer).status_code, 200)
        self.assertEqual(self.post(f"/api/orders/admin/{oid}/ship/", {"courier_name": "X1", "tracking_no": "T123"}, as_=viewer).status_code, 403)

    def test_list_queries_do_not_grow_with_orders(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        for _ in range(3):
            self.place([{"id": self.tote.public_id, "qty": 1}])
        with CaptureQueriesContext(connection) as c:
            r = self.get("/api/orders/me/", as_=self.buyer)
        self.assertEqual(r.data["data"]["count"], 3)
        self.assertLessEqual(len(c), 10, [q["sql"][:80] for q in c.captured_queries])


class OtherBuyerTests(OrderBase):
    """ReMakers and admins can buy too: own addresses, own orders, same money rules."""

    def setUp(self):
        super().setUp()
        self.rmk = self.make_remaker("buyer-maker@example.com", username="Maker Two")
        self.adm = self.make_admin("shopper@example.com", modules={"orders": "view"})
        self.addr_for = {}
        for who in (self.rmk, self.adm):
            r = self.post("/api/orders/addresses/", GOOD_ADDR, as_=who)
            self.assertEqual(r.status_code, 201, r.data)
            self.addr_for[who] = r.data["data"]["address"]["id"]

    def buy(self, who, items, method="COD", key=None):
        body = {"items": items, "address_id": self.addr_for[who], "method": method}
        kw = {"HTTP_IDEMPOTENCY_KEY": key} if key else {}
        return self.client.post("/api/orders/checkout/", body, format="json", **kw, **self._headers(who))

    def test_addresses_are_private_to_each_account(self):
        self.assertEqual(len(self.get("/api/orders/addresses/", as_=self.rmk).data["data"]["addresses"]), 1)
        self.assertEqual(len(self.get("/api/orders/addresses/", as_=self.adm).data["data"]["addresses"]), 1)
        r = self.buy(self.rmk, [{"id": self.tote.public_id, "qty": 1}])
        self.assertEqual(r.status_code, 201)
        # a member cannot use the ReMaker's address id
        r = self.client.post("/api/orders/checkout/", {"items": [{"id": self.tote.public_id, "qty": 1}],
                             "address_id": self.addr_for[self.rmk], "method": "COD"}, format="json",
                             **self._headers(self.buyer))
        self.assertEqual(r.status_code, 400)

    def test_remaker_buys_and_sees_only_own_orders(self):
        r = self.buy(self.rmk, [{"id": self.lamp.public_id, "qty": 1}])
        self.assertEqual(r.status_code, 201, r.data)
        oid = r.data["data"]["orders"][0]["id"]
        mine = self.get("/api/orders/me/", as_=self.rmk).data["data"]
        self.assertEqual((mine["count"], mine["results"][0]["id"]), (1, oid))
        self.assertEqual(self.get("/api/orders/me/", as_=self.buyer).data["data"]["count"], 0)
        self.assertEqual(self.get(f"/api/orders/me/{oid}/", as_=self.buyer).status_code, 404)
        sold = self.get("/api/orders/sales/", as_=self.seller).data["data"]["results"][0]
        self.assertEqual((sold["buyer"]["type"], sold["buyer"]["name"]), ("remaker", "Test Maker"))
        self.assertNotIn("email", sold["buyer"])

    def test_remaker_cannot_buy_own_product(self):
        r = self.buy(self.rmk, [{"id": self.table.public_id, "qty": 1}])
        self.assertEqual(r.status_code, 201)  # someone else's product is fine
        self.addr_for[self.maker] = self.post("/api/orders/addresses/", GOOD_ADDR, as_=self.maker).data["data"]["address"]["id"]
        r = self.buy(self.maker, [{"id": self.table.public_id, "qty": 1}])
        self.assertEqual(r.status_code, 409)
        self.assertIn("own product", str(r.data))

    def test_admin_cannot_buy_own_store_product_but_can_buy_a_colleagues(self):
        r = self.buy(self.adm, [{"id": self.tote.public_id, "qty": 1}])
        self.assertEqual(r.status_code, 201, r.data)  # another admin's product is fine
        self.addr_for[self.boss] = self.post("/api/orders/addresses/", GOOD_ADDR, as_=self.boss).data["data"]["address"]["id"]
        r = self.buy(self.boss, [{"id": self.tote.public_id, "qty": 1}])
        self.assertEqual(r.status_code, 409)
        self.assertIn("own store product", str(r.data))

    def test_admin_buys_and_orders_show_in_admin_list_with_buyer_type(self):
        r = self.buy(self.adm, [{"id": self.table.public_id, "qty": 1}])
        self.assertEqual(r.status_code, 201, r.data)
        rows = self.get("/api/orders/admin/?q=shopper@", as_=self.boss).data["data"]["results"]
        self.assertEqual([x["buyer"]["type"] for x in rows], ["admin"])
        self.assertEqual(self.get("/api/orders/me/", as_=self.adm).data["data"]["count"], 1)

    def test_online_payment_for_remaker_buyer(self):
        with mock.patch.object(gateway, "create_order", return_value={"id": "order_ABC"}):
            r = self.buy(self.rmk, [{"id": self.lamp.public_id, "qty": 1}], method="RAZORPAY", key="k1")
        self.assertEqual(r.status_code, 201, r.data)
        again = self.buy(self.rmk, [{"id": self.lamp.public_id, "qty": 1}], method="RAZORPAY", key="k1")
        self.assertEqual(again.status_code, 201)  # idempotent replay, same payment
        self.assertEqual(Payment.objects.count(), 1)
        # the member cannot confirm somebody else's payment
        bad = self.post("/api/payments/verify/", {"razorpay_order_id": "order_ABC", "razorpay_payment_id": "pay_1",
                        "razorpay_signature": sign("order_ABC", "pay_1")}, as_=self.buyer)
        self.assertEqual(bad.status_code, 404)
        ok_ = self.post("/api/payments/verify/", {"razorpay_order_id": "order_ABC", "razorpay_payment_id": "pay_1",
                        "razorpay_signature": sign("order_ABC", "pay_1")}, as_=self.rmk)
        self.assertEqual(ok_.status_code, 200, ok_.data)
        self.assertEqual(Payment.objects.get().buyer_type, "remaker")
