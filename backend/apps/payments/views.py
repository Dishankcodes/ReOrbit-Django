"""Payments API (mounted at /api/payments/).

  GET  config/               {enabled, key_id}  (is online payment set up?)
  POST verify/               browser sends Razorpay's three values after paying
  POST <id>/cancel/          buyer closed the payment window: release the held stock
  POST webhook/              Razorpay -> us (signature checked, no login)
"""

import json
import logging

from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.accounts.permissions import IsReOrbitUser
from apps.core.responses import fail, ok
from apps.orders import services
from apps.orders.models import Order

from . import gateway
from .models import Payment, WebhookEvent

log = logging.getLogger(__name__)


class ConfigView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        resp = ok(gateway.public_config())
        resp["Cache-Control"] = "max-age=60"
        return resp


class VerifyView(APIView):
    permission_classes = [IsReOrbitUser]

    def post(self, request):
        d = request.data
        rz_order = str(d.get("razorpay_order_id") or "")
        rz_pay = str(d.get("razorpay_payment_id") or "")
        sig = str(d.get("razorpay_signature") or "")
        p = Payment.objects.filter(razorpay_order_id=rz_order, buyer=request.user.account).first() if rz_order else None
        if p is None:
            return fail("We could not find this payment.", status=404)
        if not gateway.verify_checkout_signature(rz_order, rz_pay, sig):
            return fail("Payment could not be verified. If money was deducted it will be refunded automatically.",
                        code="BAD_SIGNATURE")
        p = services.confirm_paid(p.pk, rz_pay)
        orders = Order.objects.filter(payment=p).values_list("public_id", "status")
        return ok({"payment": {"id": p.public_id, "status": p.status},
                   "orders": [{"id": i, "status": s} for i, s in orders]},
                  message="Payment received." if p.status == Payment.Status.PAID else "Payment could not be completed.")


class CancelView(APIView):
    permission_classes = [IsReOrbitUser]

    def post(self, request, public_id):
        p = get_object_or_404(Payment, public_id=public_id, buyer=request.user.account)
        p = services.release_payment(p.pk, Payment.Status.CANCELLED, "You closed the payment window.", actor="buyer")
        return ok({"payment": {"id": p.public_id, "status": p.status}})


class WebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        raw = request.body
        if not gateway.verify_webhook_signature(raw, request.headers.get("X-Razorpay-Signature", "")):
            return fail("Invalid signature.", status=400)
        try:
            body = json.loads(raw)
        except ValueError:
            return fail("Bad body.", status=400)
        event_id = request.headers.get("X-Razorpay-Event-Id") or ""
        etype = str(body.get("event") or "")
        if event_id:
            _, fresh = WebhookEvent.objects.get_or_create(event_id=event_id, defaults={"event_type": etype[:60]})
            if not fresh:
                return ok(message="Already processed.")
        try:
            self.handle(etype, body)
        except Exception:
            # Let Razorpay's retry through: forget the event so the next delivery is processed.
            if event_id:
                WebhookEvent.objects.filter(event_id=event_id).delete()
            raise
        return ok(message="OK")

    @staticmethod
    def handle(etype, body):
        if etype in ("payment.captured", "order.paid"):
            ent = (body.get("payload") or {}).get("payment", {}).get("entity", {})
            order_ent = (body.get("payload") or {}).get("order", {}).get("entity", {})
            rz_order = ent.get("order_id") or order_ent.get("id") or ""
            rz_pay = ent.get("id") or ""
            p = Payment.objects.filter(razorpay_order_id=rz_order).first() if rz_order else None
            if p is None:
                return
            if int(ent.get("amount") or order_ent.get("amount_paid") or 0) != p.amount * 100:
                log.error("Webhook amount mismatch for %s", p.public_id)
                return
            services.confirm_paid(p.pk, rz_pay)
