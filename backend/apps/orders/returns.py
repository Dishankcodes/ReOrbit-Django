"""Returns after delivery.

  1. Within RETURN_DAYS of delivery the buyer asks for a return: a reason, a few words and photos.
  2. The seller approves or rejects. (For ReOrbit store orders ReOrbit is the seller.)
  3. If rejected, the buyer has ESCALATE_DAYS to take it to ReOrbit, which decides.
  4. Approved: the buyer sends the item back, the seller (or ReOrbit) marks it received, and the
     refund is created. It goes back the way the buyer paid; cash-on-delivery refunds are sent by
     ReOrbit by hand.

Who pays: if the return is the seller's fault (damaged, wrong item, not as described) the seller
pays return shipping and the buyer gets the delivery fee back too. If it is the buyer's choice,
the buyer pays return shipping and the delivery fee is not refunded. The platform fee is always
refunded. The seller's earning for the order is frozen while a return is open and taken back when
the refund is made.
"""

from datetime import timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone

from apps.core import buyers
from apps.core.images import process_image
from apps.core.services import audit
from apps.core.validators import validate_image
from apps.payments import refunds, wallet

from .models import Order, ReturnPhoto, ReturnRequest
from .services import CheckoutError, _notify_buyer, _notify_seller, event, make_refund

RETURN_DAYS = 7
ESCALATE_DAYS = 3
MAX_PHOTOS = 4

# code -> (label, whose fault by default)
REASONS = {
    "damaged": ("Arrived damaged", "seller"),
    "defective": ("Does not work properly", "seller"),
    "wrong_item": ("Received the wrong item", "seller"),
    "not_as_described": ("Not as described", "seller"),
    "changed_mind": ("Changed my mind", "buyer"),
    "no_longer_needed": ("No longer needed", "buyer"),
    "size_fit": ("Size or fit is not right", "buyer"),
}


def window_open(order, now=None):
    now = now or timezone.now()
    return bool(order.delivered_at) and now < order.delivered_at + timedelta(days=RETURN_DAYS)


def can_request(order):
    return (order.status == Order.Status.DELIVERED and window_open(order)
            and not ReturnRequest.objects.filter(order=order).exists())


def refund_amount(order, fault):
    """Item price and platform fee always; the delivery fee only when the seller was at fault."""
    return order.subtotal + order.platform_fee + (order.delivery_fee if fault == "seller" else 0)


def earning_taken_back(order, fault):
    return order.subtotal + (order.delivery_fee if fault == "seller" else 0)


def _text(v, n):
    return " ".join(str(v or "").split())[:n]


def request_return(order_pk, buyer, reason_code, details, files):
    if reason_code not in REASONS:
        raise CheckoutError("Choose a reason.", {"reason": ["Choose a reason."]})
    details = _text(details, 500)
    errs = {}
    if len(details) < 10:
        errs["details"] = ["Tell us what is wrong in a few words (at least 10 characters)."]
    files = list(files or [])[:MAX_PHOTOS + 1]
    if len(files) > MAX_PHOTOS:
        errs["photos"] = [f"You can add up to {MAX_PHOTOS} photos."]
    elif REASONS[reason_code][1] == "seller" and not files:
        errs["photos"] = ["Add at least one photo of the problem."]
    for f in files[:MAX_PHOTOS]:
        try:
            validate_image(f)
        except DjangoValidationError as e:
            errs["photos"] = [e.messages[0]]
    if errs:
        raise CheckoutError("Please fix the highlighted fields.", errs)
    with transaction.atomic():
        o = Order.objects.select_for_update(of=("self",)).get(pk=order_pk)
        if o.buyer_key != buyers.key_of(buyer):
            raise CheckoutError("Order not found.", status=404, code="NOT_FOUND")
        if o.status != Order.Status.DELIVERED:
            raise CheckoutError("You can ask for a return after the order is delivered.", code="BAD_STATE", status=409)
        if not window_open(o):
            raise CheckoutError(f"The {RETURN_DAYS}-day return window for this order has closed.", code="WINDOW_CLOSED", status=409)
        if ReturnRequest.objects.filter(order=o).exists():
            raise CheckoutError("A return was already requested for this order.", code="DUPLICATE", status=409)
        rr = ReturnRequest.objects.create(order=o, reason_code=reason_code, details=details, fault=REASONS[reason_code][1])
        for f in files:
            ReturnPhoto.objects.create(request=rr, image=process_image(f, max_side=1600))
        event(o, "Return requested", REASONS[reason_code][0], "buyer")
        _notify_seller(o, "Return requested", f"{o.public_id}: {REASONS[reason_code][0]}. Please approve or reject it.")
    return rr


def _lock(rr_pk):
    return ReturnRequest.objects.select_for_update(of=("self",)).select_related("order", "order__payment").get(pk=rr_pk)


def seller_decide(rr_pk, approve, note="", *, actor_kind="seller", actor=None, ip=None):
    note = _text(note, 300)
    if not approve and len(note) < 5:
        raise CheckoutError("Tell the buyer why you are rejecting it.", {"note": ["Tell the buyer why you are rejecting it."]})
    with transaction.atomic():
        rr = _lock(rr_pk)
        if rr.status != ReturnRequest.Status.REQUESTED:
            raise CheckoutError("This return was already answered.", code="BAD_STATE", status=409)
        now = timezone.now()
        rr.decided_by, rr.decided_at, rr.seller_note = "seller" if actor_kind == "seller" else "admin", now, note
        o = rr.order
        if approve:
            rr.status = ReturnRequest.Status.APPROVED
            event(o, "Return approved", "Send the item back to the seller", "seller" if actor_kind == "seller" else "admin")
            who_pays = "the seller pays return shipping" if rr.fault == "seller" else "you pay return shipping"
            _notify_buyer(o, "Return approved", f"{o.public_id}: send the item back; {who_pays}. Your refund is made once it is received.")
        else:
            rr.status, rr.escalate_until = ReturnRequest.Status.REJECTED, now + timedelta(days=ESCALATE_DAYS)
            event(o, "Return rejected", note, "seller" if actor_kind == "seller" else "admin")
            _notify_buyer(o, "Return rejected", f"{o.public_id}: {note}. If you disagree you can ask ReOrbit to review it for {ESCALATE_DAYS} days.")
        rr.save()
        if actor_kind == "admin":
            audit(actor, "return.seller_decision", "return", rr.public_id, after={"approve": approve}, ip=ip)
    return rr


def escalate(rr_pk, buyer_key):
    with transaction.atomic():
        rr = _lock(rr_pk)
        o = rr.order
        if o.buyer_key != buyer_key:
            raise CheckoutError("Return not found.", status=404, code="NOT_FOUND")
        if rr.status != ReturnRequest.Status.REJECTED or not rr.escalate_until or rr.escalate_until < timezone.now():
            raise CheckoutError("This return can't be sent to ReOrbit any more.", code="BAD_STATE", status=409)
        rr.status = ReturnRequest.Status.ESCALATED
        rr.save(update_fields=["status", "updated_at"])
        event(o, "Sent to ReOrbit", "The buyer asked ReOrbit to review the return", "buyer")
        _notify_seller(o, "Return sent to ReOrbit", f"{o.public_id}: the buyer asked ReOrbit to review the rejected return.")
        _notify_admins_return(rr)
    return rr


def _notify_admins_return(rr):
    from apps.core.models import Notification
    from apps.core.services import notify

    from .services import _admins_for_orders

    try:
        with transaction.atomic():
            for a in _admins_for_orders():
                notify(a, "Return needs a decision", f"{rr.public_id} ({rr.order.public_id}) was escalated by the buyer.",
                       module="orders", target_url="/admin-orders", severity=Notification.Severity.WARNING,
                       ref_type="return", ref_id=rr.public_id)
    except Exception:
        pass


def admin_decide(rr_pk, approve, fault, note, admin, ip=None):
    """ReOrbit settles a dispute (or acts for a seller who does not answer)."""
    note = _text(note, 300)
    if len(note) < 5:
        raise CheckoutError("Write the reason for your decision.", {"note": ["Write the reason for your decision."]})
    if fault not in ("seller", "buyer", ""):
        raise CheckoutError("Choose who was at fault.", {"fault": ["Choose who was at fault."]})
    with transaction.atomic():
        rr = _lock(rr_pk)
        open_states = (ReturnRequest.Status.REQUESTED, ReturnRequest.Status.REJECTED, ReturnRequest.Status.ESCALATED)
        if rr.status not in open_states and not (rr.status == ReturnRequest.Status.APPROVED and not approve):
            raise CheckoutError("This return is already settled.", code="BAD_STATE", status=409)
        o, now = rr.order, timezone.now()
        rr.admin_note, rr.decided_by, rr.decided_at = note, "admin", now
        if approve:
            rr.status = ReturnRequest.Status.APPROVED
            if fault:
                rr.fault = fault
            event(o, "Return approved by ReOrbit", note, "admin")
            _notify_buyer(o, "Return approved", f"{o.public_id}: ReOrbit approved your return. Send the item back.")
            _notify_seller(o, "Return approved by ReOrbit", f"{o.public_id}: {note}")
        else:
            rr.status, rr.resolved_at = ReturnRequest.Status.CLOSED, now
            event(o, "Return closed by ReOrbit", note, "admin")
            _notify_buyer(o, "Return not approved", f"{o.public_id}: {note}")
            _notify_seller(o, "Return closed by ReOrbit", f"{o.public_id}: {note}")
        rr.save()
        audit(admin, "return.admin_decision", "return", rr.public_id, after={"approve": approve, "fault": rr.fault}, reason=note, ip=ip)
    return rr


def withdraw(rr_pk, buyer_key):
    with transaction.atomic():
        rr = _lock(rr_pk)
        if rr.order.buyer_key != buyer_key:
            raise CheckoutError("Return not found.", status=404, code="NOT_FOUND")
        if rr.status != ReturnRequest.Status.REQUESTED:
            raise CheckoutError("This return can't be withdrawn any more.", code="BAD_STATE", status=409)
        rr.status, rr.resolved_at = ReturnRequest.Status.CLOSED, timezone.now()
        rr.save(update_fields=["status", "resolved_at", "updated_at"])
        event(rr.order, "Return withdrawn", "", "buyer")
    return rr


def mark_received(rr_pk, *, actor_kind, actor=None, ip=None):
    """The item is back. Make the refund and take the earning back from the seller."""
    refund = None
    with transaction.atomic():
        rr = _lock(rr_pk)
        if rr.status != ReturnRequest.Status.APPROVED:
            raise CheckoutError("Approve the return first.", code="BAD_STATE", status=409)
        o = rr.order
        amount = refund_amount(o, rr.fault)
        rr.status, rr.received_at, rr.resolved_at, rr.refund_amount = (
            ReturnRequest.Status.REFUNDED, timezone.now(), timezone.now(), amount)
        rr.save(update_fields=["status", "received_at", "resolved_at", "refund_amount", "updated_at"])
        event(o, "Return received", f"Refund of ₹{amount:,}", actor_kind)
        refund = make_refund(o.payment, amount, "return", order=o, note=f"{rr.public_id}: {REASONS[rr.reason_code][0]}", send=False)
        wallet.reverse_earning(o, earning_taken_back(o, rr.fault), note=f"{o.public_id} returned ({rr.public_id})")
        if actor_kind == "admin":
            audit(actor, "return.received", "return", rr.public_id, after={"refund": amount}, ip=ip)
        _notify_buyer(o, "Return received", f"{o.public_id}: your refund of ₹{amount:,} is being made.")
    if refund.method == "RAZORPAY":
        refunds.process(refund.pk)
    return rr
