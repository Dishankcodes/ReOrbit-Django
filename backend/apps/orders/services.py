"""Checkout, payment confirmation, stock and order status.

Rules this file keeps:
  * The browser only says WHAT it wants (ids and quantities). Every price, fee and
    total is worked out here from the database and PlatformSettings.
  * Stock is held the moment an order is created, inside one transaction with the
    rows locked, so two buyers can never take the last piece.
  * Online orders wait (Pending_Payment) for up to HOLD_MINUTES. Unpaid holds are
    released. A COD order is confirmed straight away.
  * Confirming a payment is idempotent: the browser verify call and Razorpay's webhook
    can both arrive, in any order, any number of times.
  * Money is returned (refund) when an order is cancelled after payment, or when a
    payment arrives after the hold was released and the goods are gone.
"""

import logging
from collections import OrderedDict
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.admins.models import Admins, AdminItem
from apps.core import buyers as buyer_kit
from apps.core.models import Notification, PlatformSettings, SavedAddress
from apps.core.pricing import cod_block_reason, delivery_charge, platform_fee
from apps.core.services import audit, notify
from apps.listings.models import Item, MediaImage
from apps.listings.sellables import settle_status
from apps.payments import gateway
from apps.payments.models import Payment
from apps.remakers.models import RemakerProduct, ReMakers
from apps.users.models import Users

from .models import Order, OrderEvent, OrderItem

log = logging.getLogger(__name__)

HOLD_MINUTES = 30
MAX_LINES = 20
MAX_QTY = 99
PREFIX = {"LST": "item", "RPR": "remaker_product", "ADI": "admin_item"}


class CheckoutError(Exception):
    def __init__(self, message, errors=None, code="CHECKOUT_ERROR", status=400):
        super().__init__(message)
        self.message, self.errors, self.code, self.status = message, errors, code, status


# --------------------------------------------------------------------------- #
# small helpers
# --------------------------------------------------------------------------- #
def rupees(value):
    return int(Decimal(value).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def event(order, label, detail="", actor="system"):
    return OrderEvent.objects.create(order=order, label=label, detail=detail, actor=actor)


def parse_lines(raw):
    """[{id, qty}] -> OrderedDict {public_id: qty}. Merges repeats, rejects nonsense."""
    if not isinstance(raw, list) or not raw:
        raise CheckoutError("Your cart is empty.", code="EMPTY_CART")
    merged = OrderedDict()
    for row in raw:
        if not isinstance(row, dict):
            raise CheckoutError("Invalid cart.")
        pid = str(row.get("id") or "").strip()
        try:
            qty = int(row.get("qty", 1))
        except (TypeError, ValueError):
            raise CheckoutError("Invalid quantity.")
        if pid[:3] not in PREFIX or qty < 1:
            raise CheckoutError("Invalid cart.")
        merged[pid] = merged.get(pid, 0) + qty
        if merged[pid] > MAX_QTY:
            raise CheckoutError(f"You can buy at most {MAX_QTY} of one product.")
    if len(merged) > MAX_LINES:
        raise CheckoutError(f"A checkout can have at most {MAX_LINES} different products.")
    return merged


def _fetch(kind, public_ids, lock):
    model = {"item": Item, "remaker_product": RemakerProduct, "admin_item": AdminItem}[kind]
    qs = model.objects.filter(public_id__in=public_ids)
    if kind != "admin_item":
        qs = qs.filter(deleted_at__isnull=True)
    if lock:
        qs = qs.select_for_update()
    return {o.public_id: o for o in qs.order_by("pk")}


def _covers(kind, objs):
    """First photo path of each thing, in one query."""
    field = {"item": "item_id", "remaker_product": "remaker_product_id", "admin_item": "admin_item_id"}[kind]
    ids = [o.pk for o in objs]
    out = {}
    if not ids:
        return out
    rows = MediaImage.objects.filter(**{f"{field}__in": ids}).order_by("display_order", "pk")
    for r in rows:
        out.setdefault(getattr(r, field), r.image.name)
    return out


def _unavailable(obj, kind, qty, buyer, sellers):
    """Return a plain-words reason this cannot be bought, or ""."""
    if kind == "item":
        seller = sellers.get(("user", obj.user_id))
        if buyer_kit.type_of(buyer) == "user" and obj.user_id == buyer.pk:
            return "This is your own listing, so you can't buy it."
        if obj.item_status != Item.Status.LISTED or obj.moderation_status == Item.Moderation.DISABLED:
            return "This piece is no longer available."
        if seller is None or seller.status != Users.Status.ACTIVE:
            return "This piece is no longer available."
        if obj.listing_price is None:
            return "This piece is not priced yet."
        if qty > obj.quantity:
            return f"Only {obj.quantity} left." if obj.quantity else "Sold out."
        return ""
    if kind == "remaker_product":
        seller = sellers.get(("remaker", obj.remaker_id))
        if buyer_kit.type_of(buyer) == "remaker" and obj.remaker_id == buyer.pk:
            return "This is your own product, so you can't buy it."
        if obj.status not in ("Listed",) or seller is None or seller.status != ReMakers.Status.ACTIVE:
            return "This product is no longer available."
    else:
        if obj.status != "Listed":
            return "This product is no longer available."
    if qty > obj.stock:
        return f"Only {obj.stock} left." if obj.stock else "Sold out."
    return ""


def _unit_price(obj, kind):
    return rupees(obj.listing_price if kind == "item" else obj.price)


def _take_stock(obj, kind, qty, hold):
    """Take `qty` from stock. Returns (took_stock, closed_lot)."""
    if kind == "item":
        obj.quantity -= qty
        if obj.quantity == 0:  # the last piece went: take it off the marketplace
            obj.item_status = Item.Status.RESERVED if hold else Item.Status.SOLD
            obj.save(update_fields=["quantity", "item_status", "updated_at"])
            return qty, True
        obj.save(update_fields=["quantity", "updated_at"])
        return qty, False
    obj.stock -= qty
    settle_status(obj)
    obj.save(update_fields=["stock", "status", "updated_at"])
    return qty, False


def _lock_line_goods(lines):
    """Lock the rows a set of OrderItems point at, always in the same order."""
    goods = {}
    for kind, fk in (("item", "item_id"), ("remaker_product", "remaker_product_id"), ("admin_item", "admin_item_id")):
        ids = sorted({getattr(ln, fk) for ln in lines if getattr(ln, fk)})
        if ids:
            model = {"item": Item, "remaker_product": RemakerProduct, "admin_item": AdminItem}[kind]
            for o in model.objects.select_for_update().filter(pk__in=ids).order_by("pk"):
                goods[(kind, o.pk)] = o
    return goods


def _restock(order):
    """Give back exactly what this order took."""
    lines = list(order.lines.all())
    goods = _lock_line_goods(lines)
    for ln in lines:
        pk = {"item": ln.item_id, "remaker_product": ln.remaker_product_id, "admin_item": ln.admin_item_id}[ln.kind]
        obj = goods.get((ln.kind, pk))
        if obj is None:
            continue
        if ln.kind == "item":
            obj.quantity += ln.took_stock
            fields = ["quantity", "updated_at"]
            if obj.item_status in (Item.Status.RESERVED, Item.Status.SOLD):
                obj.item_status = Item.Status.LISTED  # there is stock again
                fields.append("item_status")
            obj.save(update_fields=fields)
        else:
            obj.stock += ln.took_stock
            settle_status(obj)
            obj.save(update_fields=["stock", "status", "updated_at"])


def _admins_for_orders():
    return [a for a in Admins.objects.filter(status="Active") if a.has_module("orders", "view")]


def _notify_seller(order, title, body):
    try:
        with transaction.atomic():  # savepoint: a failed notification must not poison the order's transaction
            if order.seller_type == "user":
                notify(order.seller_user, title, body, module="orders", target_url="/user-sales",
                       ref_type="order", ref_id=order.public_id)
            elif order.seller_type == "remaker":
                notify(order.seller_remaker, title, body, module="orders", target_url="/remaker-orders",
                       ref_type="order", ref_id=order.public_id)
            else:
                for a in _admins_for_orders():
                    notify(a, title, body, module="orders", target_url="/admin-orders",
                           ref_type="order", ref_id=order.public_id)
    except Exception:  # a notification must never break an order
        log.exception("order notification failed")


def _notify_buyer(order, title, body):
    try:
        with transaction.atomic():
            notify(order.buyer, title, body, module="orders", target_url=buyer_kit.order_url(order),
                   ref_type="order", ref_id=order.public_id)
    except Exception:
        log.exception("order notification failed")


# --------------------------------------------------------------------------- #
# checkout
# --------------------------------------------------------------------------- #
def quote(buyer, raw_lines, method=None):
    """Price a cart without touching stock. Same maths as create_checkout."""
    merged = parse_lines(raw_lines)
    s = PlatformSettings.load()
    plan = _plan(buyer, merged, s, lock=False)
    grand = sum(g["total"] for g in plan["groups"])
    cod = cod_block_reason(grand, s)
    return {
        "groups": [_public_group(g) for g in plan["groups"]],
        "subtotal": sum(g["subtotal"] for g in plan["groups"]),
        "platform_fee": sum(g["platform_fee"] for g in plan["groups"]),
        "delivery_fee": sum(g["delivery_fee"] for g in plan["groups"]),
        "total": grand,
        "cod_allowed": not cod,
        "cod_reason": cod,
        "problems": plan["problems"],
    }


def _public_group(g):
    return {
        "seller": g["seller"],
        "subtotal": g["subtotal"], "platform_fee": g["platform_fee"],
        "delivery_fee": g["delivery_fee"], "total": g["total"],
        "lines": [{"id": ln["public_id"], "title": ln["title"], "qty": ln["qty"], "unit_price": ln["unit_price"],
                   "line_total": ln["line_total"]} for ln in g["lines"]],
    }


def _plan(buyer, merged, s, lock):
    """Look up everything, check it can be bought, price it, group by seller."""
    by_kind = {"item": [], "remaker_product": [], "admin_item": []}
    for pid in merged:
        by_kind[PREFIX[pid[:3]]].append(pid)
    goods = {}
    for kind, ids in by_kind.items():
        if ids:
            for pid, obj in _fetch(kind, ids, lock).items():
                goods[pid] = (kind, obj)

    user_ids = {o.user_id for k, o in goods.values() if k == "item"}
    remaker_ids = {o.remaker_id for k, o in goods.values() if k == "remaker_product"}
    sellers = {("user", u.pk): u for u in Users.objects.filter(pk__in=user_ids)}
    sellers.update({("remaker", r.pk): r for r in ReMakers.objects.filter(pk__in=remaker_ids)})

    covers = {}
    for kind in by_kind:
        covers[kind] = _covers(kind, [o for k, o in goods.values() if k == kind])

    problems, groups = {}, OrderedDict()
    for pid, qty in merged.items():
        if pid not in goods:
            problems[pid] = "This product is no longer available."
            continue
        kind, obj = goods[pid]
        why = _unavailable(obj, kind, qty, buyer, sellers)
        if why:
            problems[pid] = why
            continue
        if kind == "item":
            key, seller = ("user", obj.user_id), {"type": "user", "id": sellers[("user", obj.user_id)].public_id,
                                                  "name": sellers[("user", obj.user_id)].full_name}
        elif kind == "remaker_product":
            r = sellers[("remaker", obj.remaker_id)]
            key, seller = ("remaker", obj.remaker_id), {"type": "remaker", "id": r.public_id, "name": r.full_name}
        else:
            key, seller = ("platform", 0), {"type": "platform", "id": "", "name": "ReOrbit"}
        g = groups.setdefault(key, {"key": key, "seller": seller, "lines": [], "platform_pickup": False})
        unit = _unit_price(obj, kind)
        g["lines"].append({
            "public_id": pid, "kind": kind, "obj": obj, "qty": qty, "title": obj.title, "unit_price": unit,
            "line_total": unit * qty, "cover": covers[kind].get(obj.pk, ""),
        })
        if kind == "item" and obj.pickup_preference == Item.Pickup.PLATFORM_PICKUP:
            g["platform_pickup"] = True

    out = list(groups.values())
    for g in out:
        g["subtotal"] = sum(ln["line_total"] for ln in g["lines"])
        g["platform_fee"] = platform_fee(g["subtotal"], g["seller"]["type"], s)
        g["delivery_fee"] = delivery_charge(g["seller"]["type"], g["subtotal"], g["platform_pickup"], s)
        g["total"] = g["subtotal"] + g["platform_fee"] + g["delivery_fee"]
    return {"groups": out, "problems": problems}


def _replay(prior):
    """Same Idempotency-Key again: hand back the same checkout, unless it is already dead."""
    if prior.status in (Payment.Status.CANCELLED, Payment.Status.EXPIRED, Payment.Status.FAILED):
        raise CheckoutError("This checkout is no longer open. Please place the order again.", code="STALE_CHECKOUT", status=409)
    return prior


def _existing_for_key(buyer, key):
    if not key:
        return None
    return Payment.objects.filter(buyer_key=buyer_kit.key_of(buyer), idempotency_key=key).first()


def create_checkout(buyer, data, key=None):
    """Create the Payment and one Order per seller; hold stock. Returns the Payment."""
    expire_stale(buyer)
    prior = _existing_for_key(buyer, key)
    if prior:
        return _replay(prior)

    method = str(data.get("method") or "").upper()
    if method not in (Payment.Method.RAZORPAY, Payment.Method.COD):
        raise CheckoutError("Choose how you want to pay.", {"method": ["Choose how you want to pay."]})
    address = SavedAddress.objects.filter(public_id=str(data.get("address_id") or ""), **buyer_kit.owner(buyer)).first()
    if address is None:
        raise CheckoutError("Choose a delivery address.", {"address_id": ["Choose a delivery address."]})
    merged = parse_lines(data.get("items"))
    note = " ".join(str(data.get("note") or "").split())[:300]
    if method == Payment.Method.RAZORPAY and not gateway.is_configured():
        raise CheckoutError("Online payment is not available right now. Pay on delivery instead.",
                            code="PAYMENT_NOT_CONFIGURED", status=503)

    # One open payment per buyer: starting again lets go of an earlier unpaid hold, so a
    # buyer is never blocked by their own abandoned checkout (a late payment is still safe,
    # see confirm_paid). Done only after the request itself is known to be well-formed.
    for pk in list(Payment.objects.filter(buyer_key=buyer_kit.key_of(buyer), status=Payment.Status.CREATED).values_list("pk", flat=True)):
        release_payment(pk, Payment.Status.CANCELLED, "Replaced by a newer checkout.", "system")

    s = PlatformSettings.load()
    now = timezone.now()
    cod = method == Payment.Method.COD
    try:
        with transaction.atomic():
            plan = _plan(buyer, merged, s, lock=True)
            # A twin request with the same key waited for our row locks; if it has already
            # committed, answer with its result instead of failing on the stock it took.
            prior = _existing_for_key(buyer, key)
            if prior:
                return _replay(prior)
            if plan["problems"]:
                raise CheckoutError("Some items in your cart can't be bought right now.", plan["problems"],
                                    code="UNAVAILABLE", status=409)
            grand = sum(g["total"] for g in plan["groups"])
            if cod:
                reason = cod_block_reason(grand, s)
                if reason:
                    raise CheckoutError(reason, {"method": [reason]}, code="COD_BLOCKED")
            payment = Payment.objects.create(
                **buyer_kit.fields(buyer), method=method, amount=grand, idempotency_key=key or None,
                status=Payment.Status.COD if cod else Payment.Status.CREATED,
                expires_at=None if cod else now + timedelta(minutes=HOLD_MINUTES),
            )
            snapshot = address.snapshot()
            for g in plan["groups"]:
                kind_t = g["seller"]["type"]
                order = Order.objects.create(
                    **buyer_kit.fields(buyer), payment=payment, seller_type=kind_t,
                    seller_user=g["lines"][0]["obj"].user if kind_t == "user" else None,
                    seller_remaker=g["lines"][0]["obj"].remaker if kind_t == "remaker" else None,
                    status=Order.Status.CONFIRMED if cod else Order.Status.PENDING_PAYMENT,
                    payment_status=Order.PayStatus.COD_DUE if cod else Order.PayStatus.PENDING,
                    subtotal=g["subtotal"], platform_fee=g["platform_fee"], delivery_fee=g["delivery_fee"],
                    total=g["total"], address=snapshot, note=note,
                    confirmed_at=now if cod else None,
                )
                for ln in g["lines"]:
                    took, closed = _take_stock(ln["obj"], ln["kind"], ln["qty"], hold=not cod)
                    OrderItem.objects.create(
                        order=order, kind=ln["kind"], ref_id=ln["public_id"], title=ln["title"], cover=ln["cover"],
                        unit_price=ln["unit_price"], qty=ln["qty"], line_total=ln["line_total"],
                        took_stock=took, closed_lot=closed,
                        **{{"item": "item", "remaker_product": "remaker_product", "admin_item": "admin_item"}[ln["kind"]]: ln["obj"]},
                    )
                event(order, "Order placed" if cod else "Waiting for payment",
                      "Pay on delivery" if cod else "Complete the payment to confirm this order", "buyer")
                if cod:
                    _notify_seller(order, "New order", f"{order.public_id}: new order to pack ({len(g['lines'])} item(s)).")
                    _notify_buyer(order, "Order placed", f"{order.public_id} is confirmed. Pay ₹{order.total:,} on delivery.")
    except IntegrityError:  # two taps at once with the same key
        prior = _existing_for_key(buyer, key)
        if prior:
            return _replay(prior)
        raise

    if not cod:
        _attach_gateway_order(payment)
    return payment


def _attach_gateway_order(payment):
    try:
        rz = gateway.create_order(payment.amount, payment.public_id, {"payment": payment.public_id})
    except gateway.GatewayError as exc:
        release_payment(payment.pk, Payment.Status.FAILED, str(exc))
        raise CheckoutError(str(exc), code="GATEWAY_ERROR", status=503)
    payment.razorpay_order_id = rz["id"]
    payment.save(update_fields=["razorpay_order_id", "updated_at"])


# --------------------------------------------------------------------------- #
# releasing and confirming payments
# --------------------------------------------------------------------------- #
def release_payment(payment_pk, new_status, reason, actor="system"):
    """Drop an unpaid hold: cancel the orders, give the stock back."""
    with transaction.atomic():
        p = Payment.objects.select_for_update().get(pk=payment_pk)
        if p.status != Payment.Status.CREATED:
            return p
        now = timezone.now()
        for o in p.orders.select_for_update().order_by("pk"):
            if o.status != Order.Status.PENDING_PAYMENT:
                continue
            _restock(o)
            o.status, o.payment_status = Order.Status.CANCELLED, Order.PayStatus.VOID
            o.cancelled_at, o.cancel_reason, o.cancelled_by = now, reason[:255], actor
            o.save(update_fields=["status", "payment_status", "cancelled_at", "cancel_reason", "cancelled_by", "updated_at"])
            event(o, "Payment not completed", reason[:255], actor)
        p.status, p.failure_reason = new_status, reason[:255]
        p.save(update_fields=["status", "failure_reason", "updated_at"])
        return p


def expire_stale(buyer=None, limit=200):
    """Release holds whose time ran out. Cheap: uses the (status, expires_at) index."""
    qs = Payment.objects.filter(status=Payment.Status.CREATED, expires_at__lt=timezone.now())
    if buyer is not None:
        qs = qs.filter(buyer_key=buyer_kit.key_of(buyer))
    count = 0
    for pk in list(qs.values_list("pk", flat=True)[:limit]):
        release_payment(pk, Payment.Status.EXPIRED, "Payment was not completed in time.")
        count += 1
    return count


def _finalize_paid(payment, now):
    for o in payment.orders.select_for_update().order_by("pk"):
        if o.status != Order.Status.PENDING_PAYMENT:
            continue
        lines = list(o.lines.all())
        goods = _lock_line_goods(lines)
        for ln in lines:
            if ln.kind == "item" and ln.closed_lot:
                obj = goods.get(("item", ln.item_id))
                if obj is not None and obj.item_status == Item.Status.RESERVED:
                    obj.item_status = Item.Status.SOLD
                    obj.save(update_fields=["item_status", "updated_at"])
        o.status, o.payment_status, o.confirmed_at = Order.Status.CONFIRMED, Order.PayStatus.PAID, now
        o.save(update_fields=["status", "payment_status", "confirmed_at", "updated_at"])
        event(o, "Payment received", f"₹{o.total:,} paid online", "system")
        _notify_seller(o, "New order", f"{o.public_id}: paid order to pack.")
        _notify_buyer(o, "Payment received", f"{o.public_id} is confirmed.")


def _hold_again(payment):
    """A payment arrived after we released the stock. Try to take the stock again."""
    orders = list(payment.orders.select_for_update().order_by("pk"))
    all_lines = [ln for o in orders for ln in o.lines.all()]
    goods = _lock_line_goods(all_lines)
    for o in orders:
        for ln in o.lines.all():
            pk = {"item": ln.item_id, "remaker_product": ln.remaker_product_id, "admin_item": ln.admin_item_id}[ln.kind]
            obj = goods.get((ln.kind, pk))
            if obj is None:
                return False
            if ln.kind == "item":
                if obj.item_status != Item.Status.LISTED or obj.moderation_status == Item.Moderation.DISABLED or ln.qty > obj.quantity:
                    return False
            elif obj.status != "Listed" or ln.qty > obj.stock:
                return False
    for o in orders:
        for ln in o.lines.all():
            pk = {"item": ln.item_id, "remaker_product": ln.remaker_product_id, "admin_item": ln.admin_item_id}[ln.kind]
            took, closed = _take_stock(goods[(ln.kind, pk)], ln.kind, ln.qty, hold=True)
            ln.took_stock, ln.closed_lot = took, closed
            ln.save(update_fields=["took_stock", "closed_lot"])
        o.status, o.payment_status, o.cancelled_at, o.cancel_reason, o.cancelled_by = (
            Order.Status.PENDING_PAYMENT, Order.PayStatus.PENDING, None, "", "")
        o.save(update_fields=["status", "payment_status", "cancelled_at", "cancel_reason", "cancelled_by", "updated_at"])
    return True


def verified_confirm(payment, razorpay_payment_id, entity=None):
    """Confirm a payment only after Razorpay itself says it is right: the payment belongs to
    this checkout's Razorpay order, the amount matches what we stored, the currency is INR and
    the status is captured. `entity` is Razorpay's payment record (from a signed webhook, or
    fetched from their API). Raises CheckoutError when anything is off, so nothing is confirmed."""
    if payment.status in (Payment.Status.PAID, Payment.Status.REFUNDED):
        return payment
    if entity is None:
        try:
            entity = gateway.fetch_payment(razorpay_payment_id)
            if isinstance(entity, dict) and entity.get("status") == "authorized" and entity.get("order_id") == payment.razorpay_order_id:
                entity = gateway.capture_payment(razorpay_payment_id, payment.amount)
        except gateway.GatewayError as exc:
            raise CheckoutError(str(exc), code="GATEWAY_ERROR", status=503)
    if isinstance(entity, dict) and entity.get("id") not in (None, razorpay_payment_id):
        problem = "payment id does not match"
    else:
        problem = gateway.entity_problem(entity, payment)
    if problem:
        log.error("Payment %s not confirmed: %s", payment.public_id, problem)
        raise CheckoutError("We could not verify this payment. If money was deducted it will be refunded.",
                            code="PAYMENT_MISMATCH")
    return confirm_paid(payment.pk, razorpay_payment_id)


def confirm_paid(payment_pk, razorpay_payment_id):
    """Mark a payment paid and confirm its orders. Safe to call many times.
    Callers must have verified the payment first (see verified_confirm)."""
    refund_needed = False
    with transaction.atomic():
        p = Payment.objects.select_for_update().get(pk=payment_pk)
        if p.status in (Payment.Status.PAID, Payment.Status.REFUNDED):
            return p
        if p.method != Payment.Method.RAZORPAY:
            return p
        now = timezone.now()
        if p.status != Payment.Status.CREATED and not _hold_again(p):
            p.status, p.razorpay_payment_id, p.paid_at = Payment.Status.REFUNDED, razorpay_payment_id, now
            p.failure_reason = "Paid after the hold expired and the items were gone. Refunded."
            p.save(update_fields=["status", "razorpay_payment_id", "paid_at", "failure_reason", "updated_at"])
            for o in p.orders.all():
                o.payment_status = Order.PayStatus.REFUND_FAILED  # until the refund call succeeds
                o.save(update_fields=["payment_status", "updated_at"])
            refund_needed = True
        else:
            p.status, p.razorpay_payment_id, p.paid_at = Payment.Status.PAID, razorpay_payment_id, now
            p.save(update_fields=["status", "razorpay_payment_id", "paid_at", "updated_at"])
            _finalize_paid(p, now)
    if refund_needed:
        try:
            gateway.refund(razorpay_payment_id, p.amount)
            p.orders.update(payment_status=Order.PayStatus.REFUNDED)
        except gateway.GatewayError:
            log.error("REFUND NEEDED for %s", p.public_id)
            for a in _admins_for_orders():
                notify(a, "Refund needs attention", f"{p.public_id}: ₹{p.amount:,} was paid after the stock was released. Refund it in Razorpay.",
                       module="orders", severity=Notification.Severity.CRITICAL, ref_type="payment", ref_id=p.public_id)
    return p


# --------------------------------------------------------------------------- #
# status changes
# --------------------------------------------------------------------------- #
FLOW = {"pack": ("Confirmed", "Packed"), "ship": ("Packed", "Shipped"), "deliver": ("Shipped", "Delivered")}
LABEL = {"Packed": "Packed", "Shipped": "Shipped", "Delivered": "Delivered"}


def advance_order(order_pk, action, *, actor_kind, actor, courier_name="", tracking_no="", ip=None):
    """Seller/admin moves an order forward one step."""
    if action not in FLOW:
        raise CheckoutError("Unknown action.")
    need, to = FLOW[action]
    courier_name, tracking_no = " ".join(courier_name.split()), tracking_no.strip()
    with transaction.atomic():
        o = Order.objects.select_for_update().get(pk=order_pk)
        if o.status != need:
            raise CheckoutError(f"This order is {o.get_status_display().lower()}, so it can't be marked {to.lower()}.",
                                code="BAD_STATE", status=409)
        if action == "ship":
            errs = {}
            if len(courier_name) < 2:
                errs["courier_name"] = ["Enter the courier name."]
            if len(tracking_no) < 3:
                errs["tracking_no"] = ["Enter the tracking number."]
            if errs:
                raise CheckoutError("Courier details are needed to ship.", errs)
        before = o.status
        o.status = to
        fields = ["status", "updated_at"]
        detail = ""
        if to == "Shipped":
            o.courier_name, o.tracking_no, o.shipped_at = courier_name, tracking_no, timezone.now()
            fields += ["courier_name", "tracking_no", "shipped_at"]
            detail = f"{courier_name} · {tracking_no}"
        if to == "Delivered":
            o.delivered_at = timezone.now()
            fields.append("delivered_at")
            if o.payment_status == Order.PayStatus.COD_DUE:
                o.payment_status = Order.PayStatus.PAID
                fields.append("payment_status")
                detail = "Cash collected"
        o.save(update_fields=fields)
        event(o, LABEL[to], detail, actor_kind)
        if to == "Delivered":
            from apps.payments import wallet  # local import: wallet imports core, not orders

            wallet.credit_delivered_order(o)  # the seller earns the item subtotal (held for the return window)
        if actor_kind == "admin":
            audit(actor, f"order.{action}", "order", o.public_id, before={"status": before}, after={"status": to}, ip=ip)
        _notify_buyer(o, f"Order {to.lower()}", f"{o.public_id} is {to.lower()}." + (f" {detail}" if to == "Shipped" else ""))
    return o


def cancel_order(order_pk, *, by, actor, reason="", ip=None):
    """Cancel before it ships. Gives stock back and refunds an online payment."""
    reason = " ".join(reason.split())
    if by in ("seller", "admin") and len(reason) < 3:
        raise CheckoutError("Give a reason for cancelling.", {"reason": ["Give a reason for cancelling."]})
    refund_args = None
    with transaction.atomic():
        o = Order.objects.select_for_update(of=("self",)).select_related("payment").get(pk=order_pk)
        if o.status not in (Order.Status.CONFIRMED, Order.Status.PACKED):
            raise CheckoutError("This order can't be cancelled any more.", code="BAD_STATE", status=409)
        _restock(o)
        before = o.status
        paid_online = o.payment_status == Order.PayStatus.PAID and o.payment.method == Payment.Method.RAZORPAY
        o.status, o.cancelled_at, o.cancelled_by = Order.Status.CANCELLED, timezone.now(), by
        o.cancel_reason = (reason or "Cancelled by the buyer.")[:255]
        o.payment_status = Order.PayStatus.REFUND_FAILED if paid_online else Order.PayStatus.VOID  # until refund succeeds
        o.save(update_fields=["status", "cancelled_at", "cancelled_by", "cancel_reason", "payment_status", "updated_at"])
        event(o, "Cancelled", o.cancel_reason, by)
        if by == "admin":
            audit(actor, "order.cancel", "order", o.public_id, before={"status": before}, after={"status": "Cancelled"}, reason=reason, ip=ip)
        if by != "buyer":
            _notify_buyer(o, "Order cancelled", f"{o.public_id} was cancelled. {o.cancel_reason}")
        if by != "seller":
            _notify_seller(o, "Order cancelled", f"{o.public_id} was cancelled.")
        if paid_online:
            refund_args = (o.payment.razorpay_payment_id, o.total)
    if refund_args:
        try:
            gateway.refund(*refund_args)
            Order.objects.filter(pk=o.pk).update(payment_status=Order.PayStatus.REFUNDED)
            o.payment_status = Order.PayStatus.REFUNDED
            event(o, "Refund sent", f"₹{o.total:,} returned to the buyer", "system")
        except gateway.GatewayError:
            log.error("REFUND FAILED for order %s", o.public_id)
            for a in _admins_for_orders():
                notify(a, "Refund needs attention", f"{o.public_id}: ₹{o.total:,} could not be refunded automatically.",
                       module="orders", severity=Notification.Severity.CRITICAL, ref_type="order", ref_id=o.public_id)
    return o
