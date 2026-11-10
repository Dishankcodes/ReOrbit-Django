"""Refunds. One row per refund, so an admin can always see what was sent, what failed and why.

  create()      records the refund and (for online payments) tries to send it at once
  process()     the actual send. Safe to call again after a failure: before sending it asks
                Razorpay whether an earlier attempt with our receipt already went through
  mark_manual() admin sends a cash-on-delivery refund outside the app and records the reference

A refund of an online payment goes back to the original payment method. A cash-on-delivery
order has no online payment to reverse, so ReOrbit sends that money itself.
"""

import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.core.models import Notification
from apps.core.services import audit, notify

from . import gateway
from .models import Payment, Refund

log = logging.getLogger(__name__)

SENDING_TIMEOUT = timedelta(minutes=2)


class RefundError(Exception):
    def __init__(self, message, code="REFUND_ERROR", status=400):
        super().__init__(message)
        self.message, self.code, self.status = message, code, status


def _set_order_status(refund, pay_status):
    """Keep the order's payment_status in step with its refund."""
    from apps.orders.models import Order

    if refund.order_id:
        Order.objects.filter(pk=refund.order_id).update(payment_status=pay_status, updated_at=timezone.now())
    else:  # a whole-payment refund (paid after the stock was released)
        Order.objects.filter(payment_id=refund.payment_id).update(payment_status=pay_status, updated_at=timezone.now())


def _admins():
    from apps.admins.models import Admins

    return [a for a in Admins.objects.filter(status="Active") if a.has_module("finance", "edit") or a.has_module("orders", "edit")]


def _notify_buyer(refund, title, body):
    try:
        with transaction.atomic():
            order = refund.order or refund.payment.orders.first()
            if order is None:
                return
            from apps.core import buyers

            notify(order.buyer, title, body, module="orders", target_url=buyers.order_url(order),
                   ref_type="refund", ref_id=refund.public_id)
    except Exception:
        log.exception("refund notification failed")


def _notify_admins(title, body, refund):
    try:
        with transaction.atomic():
            for a in _admins():
                notify(a, title, body, module="orders", target_url="/admin-earnings?tab=refunds",
                       severity=Notification.Severity.CRITICAL, ref_type="refund", ref_id=refund.public_id)
    except Exception:
        log.exception("refund admin notification failed")


def create(payment, amount, reason, *, order=None, note="", send=True):
    """Record a refund of `amount` rupees. Returns the Refund (already processed when `send`)."""
    amount = int(amount)
    if amount < 1:
        raise RefundError("Nothing to refund.")
    online = payment.method == Payment.Method.RAZORPAY and bool(payment.razorpay_payment_id)
    with transaction.atomic():
        # never refund more than was paid, counting what is already refunded or on its way
        p = Payment.objects.select_for_update().get(pk=payment.pk)
        already = p.refunds.aggregate(n=Sum("amount"))["n"] or 0  # done, pending and failed all count
        if already + amount > p.amount:
            raise RefundError("This is more than was paid for this checkout.", code="OVER_REFUND", status=409)
        r = Refund.objects.create(
            payment=p, order=order, amount=amount, reason=reason, note=(note or "")[:255],
            method=Refund.Method.RAZORPAY if online else Refund.Method.MANUAL,
        )
        _set_order_status(r, "Refund_Pending")  # until it is really done
    if online and send:
        return process(r.pk)
    if not online:
        _notify_admins("Refund to send", f"{r.public_id}: ₹{r.amount:,} to the buyer of {order.public_id if order else p.public_id} "
                       "(cash on delivery). Send it and record the reference.", r)
    return r


def process(refund_pk):
    """Send an online refund. Idempotent: a Done refund is returned as it is."""
    with transaction.atomic():
        r = Refund.objects.select_for_update(of=("self",)).select_related("payment", "order").get(pk=refund_pk)
        if r.status == Refund.Status.DONE or r.method != Refund.Method.RAZORPAY:
            return r
        if r.status == Refund.Status.SENDING and r.updated_at > timezone.now() - SENDING_TIMEOUT:
            return r  # another request is sending it right now; never send twice at once
        r.attempts += 1
        r.status = Refund.Status.SENDING
        r.save(update_fields=["attempts", "status", "updated_at"])
        pay_id, amount, public_id = r.payment.razorpay_payment_id, r.amount, r.public_id
    # the network call happens outside the transaction (and outside the row lock)
    try:
        sent = gateway.find_refund(pay_id, public_id) if r.attempts > 1 else None
        sent = sent or gateway.refund(pay_id, amount, receipt=public_id)
    except Exception as exc:  # any failure leaves a visible, retryable refund rather than a stuck one
        with transaction.atomic():
            r = Refund.objects.select_for_update(of=("self",)).get(pk=refund_pk)
            if r.status != Refund.Status.DONE:
                r.status, r.last_error = Refund.Status.FAILED, str(exc)[:255]
                r.save(update_fields=["status", "last_error", "updated_at"])
                _set_order_status(r, "Refund_Failed")
        log.error("REFUND FAILED %s", public_id)
        _notify_admins("Refund needs attention", f"{public_id}: ₹{amount:,} could not be refunded automatically. Retry it from Earnings > Refunds.", r)
        return r
    with transaction.atomic():
        r = Refund.objects.select_for_update(of=("self",)).get(pk=refund_pk)
        r.status, r.razorpay_refund_id, r.last_error = Refund.Status.DONE, str(sent.get("id", ""))[:64], ""
        r.processed_at = timezone.now()
        r.save(update_fields=["status", "razorpay_refund_id", "last_error", "processed_at", "updated_at"])
        _set_order_status(r, "Refunded")
        if r.order_id:
            from apps.orders.services import event

            event(r.order, "Refund sent", f"₹{r.amount:,} returned to the original payment", "system")
    _notify_buyer(r, "Refund sent", f"₹{r.amount:,} is on its way back to your original payment method. Banks usually take 5-7 working days.")
    return r


def retry(refund_pk, admin, ip=None):
    with transaction.atomic():
        r = Refund.objects.select_for_update(of=("self",)).get(pk=refund_pk)
        if r.status == Refund.Status.DONE or r.method != Refund.Method.RAZORPAY:
            raise RefundError("Only an online refund that has not gone through can be retried.", code="BAD_STATE", status=409)
        if r.status == Refund.Status.SENDING and r.updated_at > timezone.now() - SENDING_TIMEOUT:
            raise RefundError("This refund is being sent right now. Check again in a minute.", code="IN_PROGRESS", status=409)
        audit(admin, "refund.retry", "refund", r.public_id, reason="", ip=ip)
    return process(refund_pk)


def mark_manual(refund_pk, admin, reference, ip=None):
    """Admin sent a cash-on-delivery refund (bank/UPI) and records the reference."""
    reference = " ".join(str(reference or "").split())
    if len(reference) < 3:
        raise RefundError("Enter the transfer reference.")
    with transaction.atomic():
        r = Refund.objects.select_for_update(of=("self",)).select_related("order", "payment").get(pk=refund_pk)
        # a refund Razorpay cannot send at all (e.g. the payment is too old) can be paid by hand instead
        if r.status == Refund.Status.DONE or (r.method == Refund.Method.RAZORPAY and r.status != Refund.Status.FAILED):
            raise RefundError("This refund is not waiting to be sent by hand.", code="BAD_STATE", status=409)
        r.status, r.reference, r.processed_by, r.processed_at = Refund.Status.DONE, reference[:60], admin, timezone.now()
        r.save(update_fields=["status", "reference", "processed_by", "processed_at", "updated_at"])
        _set_order_status(r, "Refunded")
        audit(admin, "refund.mark_paid", "refund", r.public_id, after={"reference": reference}, ip=ip)
        if r.order_id:
            from apps.orders.services import event

            event(r.order, "Refund sent", f"₹{r.amount:,} sent by ReOrbit (ref {reference})", "admin")
    _notify_buyer(r, "Refund sent", f"₹{r.amount:,} was sent to you by ReOrbit. Reference {reference}.")
    return r
