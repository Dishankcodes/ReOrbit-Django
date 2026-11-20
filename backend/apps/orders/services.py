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
import os
import re
from collections import OrderedDict
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.admins.models import Admins, AdminItem
from apps.core import buyers as buyer_kit
from apps.core.models import Notification, PlatformSettings, SavedAddress
from apps.core.pricing import (cod_block_reason, delivery_charge, free_delivery_from, maintenance_block_reason,
                                platform_fee, sale_of)
from apps.core.services import audit, notify
from apps.listings.models import Item, MediaImage
from apps.listings.sellables import settle_status
from apps.payments import gateway, refunds
from apps.payments.models import Payment
from apps.remakers.models import RemakerProduct, ReMakers
from apps.rewards import services as vouchers
from apps.rewards.services import VoucherError
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
    return OrderEvent.objects.create(order=order, label=label[:60], detail=str(detail or "")[:255], actor=actor)


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
        if buyer_kit.type_of(buyer) == "admin" and obj.admin_id == buyer.pk:
            return "This is your own store product, so you can't buy it."
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
            if ln.kind == "admin_item":
                from apps.warehouse import services as warehouse  # local import: warehouse reads orders too

                warehouse.on_store_restock(obj, order)  # a warehouse lot this order had claimed is for sale again


def _admins_for_orders():
    return [a for a in Admins.objects.filter(status="Active") if a.has_module("orders", "view")]


def _notify_seller(order, title, body):
    try:
        with transaction.atomic():  # savepoint: a failed notification must not poison the order's transaction
            if order.seller_type == "user":
                notify(order.seller_user, title, body, module="orders", target_url=f"/user-sell/sales/{order.public_id}",
                       ref_type="order", ref_id=order.public_id)
            elif order.seller_type == "remaker":
                notify(order.seller_remaker, title, body, module="orders", target_url=f"/remaker-sales/{order.public_id}",
                       ref_type="order", ref_id=order.public_id)
            else:
                for a in _admins_for_orders():
                    notify(a, title, body, module="orders", target_url=f"/admin-orders/{order.public_id}",
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
def split_discount(discount, totals):
    """Share a voucher between the orders of one checkout, in proportion to what each costs.
    No order gets more than it costs, and the shares add up to exactly `discount`."""
    n = sum(totals)
    if discount <= 0 or n <= 0:
        return [0] * len(totals)
    shares = [discount * t // n for t in totals]
    left = discount - sum(shares)
    by_remainder = sorted(range(len(totals)), key=lambda i: (discount * totals[i]) % n, reverse=True)
    for i in by_remainder[:left]:
        shares[i] += 1
    return shares


def _seller_types(plan, everything=False):
    """Who sells the full-price items in the cart (user / remaker / platform): a coupon for ReMaker
    creations or for ReOrbit's own products needs one of those in the cart (sale items don't count)."""
    return {g["seller"]["type"] for g in plan["groups"] if everything or g["eligible"]}


SALE_ONLY = ("Coupons and points vouchers don't apply to items already on sale. Add a full-price item, "
             "or use a donation voucher (those work on sale items too).")


def _is_donation_voucher(code):
    """Donation vouchers are a thank-you for giving, so they work on sale items too."""
    from apps.rewards.models import Voucher

    return Voucher.objects.filter(code=vouchers.clean_code(code), source_type="donation").exists()


def voucher_base(plan, voucher):
    """What each order's share of the discount is worked out on: the full-price part of the cart,
    or everything for a donation voucher."""
    full = voucher is not None and voucher.source_type == "donation"
    return [g["subtotal"] if full else g["eligible"] for g in plan["groups"]]


def _voucher(buyer, code, plan, lock=False):
    """Check a voucher against the full-price part of the cart only. Items already on sale (marked
    down from their original price by the seller) don't get a second discount from a coupon or a
    points voucher, and don't count towards its minimum order. Donation vouchers apply to the whole
    cart. Returns (voucher, discount) or raises VoucherError."""
    goods = sum(g["subtotal"] for g in plan["groups"])
    if _is_donation_voucher(code):
        return vouchers.check(buyer, code, goods, lock=lock, seller_types=_seller_types(plan, True))
    eligible = sum(g["eligible"] for g in plan["groups"])
    if eligible <= 0 and goods > 0:
        raise VoucherError(SALE_ONLY, "VOUCHER_SALE_ONLY")
    try:
        return vouchers.check(buyer, code, eligible, lock=lock, seller_types=_seller_types(plan))
    except VoucherError as e:
        if e.code == "VOUCHER_MIN_ORDER" and eligible < goods:
            e.message = e.message.replace("more to use", "more of full-price items to use") + " Sale items don't count."
        raise


def quote(buyer, raw_lines, method=None, voucher_code=None):
    """Price a cart without touching stock. Same maths as create_checkout.
    A bad voucher never fails the quote: it is explained in `voucher_error` and takes nothing off."""
    merged = parse_lines(raw_lines)
    s = PlatformSettings.load()
    plan = _plan(buyer, merged, s, lock=False)
    grand = sum(g["total"] for g in plan["groups"])
    goods = sum(g["subtotal"] for g in plan["groups"])
    discount, applied, voucher_error = 0, None, ""
    if str(voucher_code or "").strip():
        try:
            v, discount = _voucher(buyer, voucher_code, plan)
            discount, applied = min(discount, max(0, grand - 1)), vouchers.brief(v)
        except VoucherError as e:
            voucher_error = e.message
    payable = grand - discount
    cod = cod_block_reason(payable, s) or cod_open_reason(buyer)
    return {
        "groups": [_public_group(g) for g in plan["groups"]],
        "subtotal": goods,
        "platform_fee": sum(g["platform_fee"] for g in plan["groups"]),
        "delivery_fee": sum(g["delivery_fee"] for g in plan["groups"]),
        "discount": discount, "voucher": applied, "voucher_error": voucher_error,
        # coupons and points vouchers only work on full-price items; sale items already have their own
        # discount (donation vouchers work on everything)
        "coupon_eligible": sum(g["eligible"] for g in plan["groups"]),
        "sale_items": sum(ln["qty"] for g in plan["groups"] for ln in g["lines"] if ln["sale"]),
        "sale_savings": sum((ln["sale"]["mrp"] - ln["unit_price"]) * ln["qty"]
                            for g in plan["groups"] for ln in g["lines"] if ln["sale"]),
        "total": payable,
        "cod_allowed": not cod,
        "cod_reason": cod,
        "problems": plan["problems"],
    }


def _public_group(g):
    return {
        "seller": g["seller"],
        "subtotal": g["subtotal"], "platform_fee": g["platform_fee"],
        "delivery_fee": g["delivery_fee"], "total": g["total"],
        "free_delivery": g["free_delivery"],
        "lines": [{"id": ln["public_id"], "title": ln["title"], "qty": ln["qty"], "unit_price": ln["unit_price"],
                   "line_total": ln["line_total"], "on_sale": bool(ln["sale"]),
                   "mrp": ln["sale"]["mrp"] if ln["sale"] else None,
                   "off": ln["sale"]["off"] if ln["sale"] else None} for ln in g["lines"]],
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
            "sale": sale_of(obj),
        })
        if kind in ("item", "remaker_product") and obj.pickup_preference == Item.Pickup.PLATFORM_PICKUP:
            g["platform_pickup"] = True

    out = list(groups.values())
    for g in out:
        g["subtotal"] = sum(ln["line_total"] for ln in g["lines"])
        # what a coupon can take off: items already on sale are left out (like Zomato's "not on offer items")
        g["eligible"] = sum(ln["line_total"] for ln in g["lines"] if not ln["sale"])
        g["platform_fee"] = platform_fee(g["subtotal"], g["seller"]["type"], s)
        # ReOrbit delivers "Managed by ReOrbit" orders and keeps the fee, so it is always the platform rate
        # (Admin > Settings); a seller who ships it themselves adds no delivery charge.
        g["delivery_fee"] = delivery_charge(g["seller"]["type"], g["subtotal"], g["platform_pickup"], s)
        g["total"] = g["subtotal"] + g["platform_fee"] + g["delivery_fee"]
        free_from = free_delivery_from(g["seller"]["type"], g["platform_pickup"], s)
        g["free_delivery"] = ({"from": free_from, "gap": max(0, free_from - g["subtotal"])}
                              if free_from and g["delivery_fee"] else None)
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

    # Maintenance mode stops members placing new orders; ReOrbit's own admins can still buy.
    if type(buyer)._meta.label != "admins.Admins":
        reason = maintenance_block_reason()
        if reason:
            raise CheckoutError(reason, code="MAINTENANCE", status=503)

    method = str(data.get("method") or "").upper()
    if method not in (Payment.Method.RAZORPAY, Payment.Method.COD):
        raise CheckoutError("Choose how you want to pay.", {"method": ["Choose how you want to pay."]})
    address = SavedAddress.objects.filter(public_id=str(data.get("address_id") or ""), **buyer_kit.address_book(buyer)).first()
    if address is None and buyer_kit.type_of(buyer) == "admin":
        address = buyer_kit.reorbit_address()  # ReOrbit buying for itself: it delivers to its own address
    if address is None:
        raise CheckoutError("Choose a delivery address.", {"address_id": ["Choose a delivery address."]})
    merged = parse_lines(data.get("items"))
    note = " ".join(str(data.get("note") or "").split())[:300]
    voucher_code = vouchers.clean_code(data.get("voucher_code"))
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
            voucher, discount = None, 0
            if voucher_code:
                try:  # locked: two checkouts can never both spend it
                    voucher, discount = _voucher(buyer, voucher_code, plan, lock=True)
                except VoucherError as e:
                    raise CheckoutError(e.message, code=e.code)
                discount = min(discount, max(0, grand - 1))  # an order always keeps at least ₹1 to pay
            payable = grand - discount
            if cod:
                reason = cod_block_reason(payable, s) or cod_open_reason(buyer)
                if reason:
                    raise CheckoutError(reason, {"method": [reason]}, code="COD_BLOCKED")
            # the discount only lands on orders that have full-price items
            shares = split_discount(discount, voucher_base(plan, voucher))
            payment = Payment.objects.create(
                **buyer_kit.fields(buyer), method=method, amount=payable, idempotency_key=key or None,
                status=Payment.Status.COD if cod else Payment.Status.CREATED,
                expires_at=None if cod else now + timedelta(minutes=HOLD_MINUTES),
            )
            snapshot = address.snapshot()
            for g, share in zip(plan["groups"], shares):
                kind_t = g["seller"]["type"]
                order = Order.objects.create(
                    **buyer_kit.fields(buyer), payment=payment, seller_type=kind_t,
                    seller_user=g["lines"][0]["obj"].user if kind_t == "user" else None,
                    seller_remaker=g["lines"][0]["obj"].remaker if kind_t == "remaker" else None,
                    status=Order.Status.CONFIRMED if cod else Order.Status.PENDING_PAYMENT,
                    payment_status=Order.PayStatus.COD_DUE if cod else Order.PayStatus.PENDING,
                    subtotal=g["subtotal"], platform_fee=g["platform_fee"], delivery_fee=g["delivery_fee"],
                    managed_delivery=bool(g["platform_pickup"]) and g["seller"]["type"] != "platform",
                    discount=share, total=g["total"] - share, address=snapshot, note=note,
                    confirmed_at=now if cod else None,
                )
                for ln in g["lines"]:
                    took, closed = _take_stock(ln["obj"], ln["kind"], ln["qty"], hold=not cod)
                    OrderItem.objects.create(
                        order=order, kind=ln["kind"], ref_id=ln["public_id"], title=ln["title"], cover=ln["cover"],
                        unit_price=ln["unit_price"], qty=ln["qty"], line_total=ln["line_total"],
                        took_stock=took, closed_lot=closed,
                        # the listing's return policy at the moment of purchase
                        returnable=bool(getattr(ln["obj"], "returnable", True)),
                        **{{"item": "item", "remaker_product": "remaker_product", "admin_item": "admin_item"}[ln["kind"]]: ln["obj"]},
                    )
                    if ln["kind"] == "admin_item":
                        from apps.warehouse import services as warehouse  # local import: warehouse reads orders too

                        warehouse.on_store_sale(ln["obj"], order)  # the last unit sold: the lot is ready to dispatch
                detail = "Pay on delivery" if cod else "Complete the payment to confirm this order"
                if share:
                    detail += f" · voucher {voucher.code} took off ₹{share:,}"
                event(order, "Order placed" if cod else "Waiting for payment", detail, "buyer")
                if cod:
                    _notify_seller(order, "New order", f"{order.public_id}: new order to pack ({len(g['lines'])} item(s)).")
                    _notify_buyer(order, "Order placed", f"{order.public_id} is confirmed. Pay ₹{order.total:,} on delivery.")
            if voucher:
                vouchers.spend(voucher, payment)
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
        vouchers.give_back(p.public_id)  # nothing was bought, so the voucher was not spent
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
            late_refund = refunds.create(p, p.amount, "late_payment", note="Paid after the stock was released", send=False)
            refund_needed = True
        else:
            p.status, p.razorpay_payment_id, p.paid_at = Payment.Status.PAID, razorpay_payment_id, now
            p.save(update_fields=["status", "razorpay_payment_id", "paid_at", "updated_at"])
            _finalize_paid(p, now)
    if refund_needed:
        refunds.process(late_refund.pk)  # on failure it stays a visible "needs attention" refund an admin can retry
    return p


# --------------------------------------------------------------------------- #
# status changes
# --------------------------------------------------------------------------- #
FLOW = {"pack": ("Confirmed", "Packed"), "ship": ("Packed", "Shipped"), "deliver": ("Shipped", "Delivered")}
# On a "Managed by ReOrbit" order the seller packs and asks for a pickup; everything after that is ReOrbit's.
MANAGED_SELLER_BLOCKED = {"ship", "deliver", "fail", "retry", "returned"}
MANAGED_COURIER = "ReOrbit Delivery"
LABEL = {"Packed": "Packed", "Shipped": "Shipped", "Delivered": "Delivered"}

# The seller (or ReOrbit, for its own store) books the courier and pays for shipping; the
# delivery fee the buyer paid goes to the seller's earning. A tracking number must look like
# the courier's own format, and one number can only be used on one order.
COURIERS = {
    "Delhivery": r"^\d{10,14}$",
    "India Post": r"^[A-Z]{2}\d{9}[A-Z]{2}$",
    "Blue Dart": r"^\d{11}$",
    "DTDC": r"^([A-Z]\d{8}|\d{9,12})$",
    "Ecom Express": r"^\d{9,12}$",
    "Xpressbees": r"^\d{12,16}$",
    "Shadowfax": r"^[A-Z0-9]{8,20}$",
    "ReOrbit Delivery": r"^[A-Z0-9-]{4,20}$",  # ReOrbit's own pickup team (managed delivery)
}
_GENERIC_TRACKING = re.compile(r"^[A-Za-z0-9\-/]{5,30}$")

# Where to check a parcel on the courier's own website ({n} = tracking number). ReOrbit has no courier
# partner yet, so an admin opens this page, checks the parcel and marks the order delivered on the
# order page. Couriers without a deep link open their tracking page (paste the number shown).
COURIER_TRACK_URLS = {
    "Delhivery": "https://www.delhivery.com/track-v2/package/{n}",
    "India Post": "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx",
    "Blue Dart": "https://www.bluedart.com/web/guest/trackdartresultthirdparty?trackFor=0&trackNo={n}",
    "DTDC": "https://www.dtdc.in/tracking.asp",
    "Ecom Express": "https://ecomexpress.in/tracking/?awb_field={n}",
    "Xpressbees": "https://www.xpressbees.com/shipment/tracking?awbNo={n}",
    "Shadowfax": "https://tracker.shadowfax.in/",
}


def tracking_url(courier, number):
    """The courier's tracking page for this parcel, or "" (ReOrbit's own delivery, unknown couriers)."""
    url = COURIER_TRACK_URLS.get(courier or "")
    if not url or not number:
        return ""
    from urllib.parse import quote

    return url.replace("{n}", quote(str(number), safe=""))


def check_tracking(courier_name, tracking_no, exclude_pk=None, unique=True):
    """Returns (courier, tracking) cleaned, or raises CheckoutError with field messages.
    unique=False skips the "already used" check (ReOrbit's own pickup number, which ReOrbit made)."""
    courier = " ".join(str(courier_name or "").split())[:40]
    tracking = re.sub(r"\s+", "", str(tracking_no or "")).upper()
    errs = {}
    if len(courier) < 2:
        errs["courier_name"] = ["Choose the courier."]
    known = next((k for k in COURIERS if k.lower() == courier.lower()), None)
    if known:
        courier = known
    if not tracking:
        errs["tracking_no"] = ["Enter the tracking number."]
    elif known and not re.match(COURIERS[known], tracking):
        errs["tracking_no"] = [f"This does not look like a {known} tracking number."]
    elif not _GENERIC_TRACKING.match(tracking) or len(set(tracking)) < 3:
        errs["tracking_no"] = ["Enter the tracking number exactly as the courier gave it."]
    elif unique and Order.objects.filter(courier_name__iexact=courier, tracking_no=tracking).exclude(pk=exclude_pk).exists():
        errs["tracking_no"] = ["This tracking number is already used on another order."]
    if errs:
        raise CheckoutError("Check the courier details.", errs)
    return courier, tracking


# why a delivery failed, and whose fault that is (decides the refund)
FAIL_REASONS = {
    "buyer_unreachable": ("Buyer could not be reached", "buyer"),
    "buyer_refused": ("Buyer refused the parcel", "buyer"),
    "wrong_address": ("Address was wrong or incomplete", "buyer"),
    "lost_in_transit": ("Parcel lost in transit", "seller"),
    "damaged_in_transit": ("Parcel damaged in transit", "seller"),
    "seller_error": ("Seller sent the wrong parcel", "seller"),
}


def advance_order(order_pk, action, *, actor_kind, actor, courier_name="", tracking_no="", ip=None,
                  unique_tracking=True):
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
            courier_name, tracking_no = check_tracking(courier_name, tracking_no, exclude_pk=o.pk,
                                                       unique=unique_tracking)
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
            # who vouched for the delivery (sellers can't): shown on the order's timeline
            detail = {"buyer": "Confirmed by the buyer",
                      "admin": "Checked by ReOrbit" + (" on the courier's tracking" if not o.managed_delivery else ""),
                      "system": f"Marked delivered automatically, {AUTO_CONFIRM_DAYS} days after shipping",
                      }.get(actor_kind, "")
            if o.payment_status == Order.PayStatus.COD_DUE:
                # the courier has the cash; ReOrbit counts it as paid once an admin confirms it arrived
                o.payment_status = Order.PayStatus.COD_COLLECTED
                fields.append("payment_status")
                detail = (detail + " · " if detail else "") + "Cash collected by the courier"
        o.save(update_fields=fields)
        event(o, LABEL[to], detail, actor_kind)
        if to == "Delivered":
            from apps.payments import wallet  # local import: wallet imports core, not orders

            wallet.credit_delivered_order(o)  # the seller earns the item subtotal (held for the return window)
            if o.payment_status != Order.PayStatus.COD_COLLECTED:
                vouchers.on_order_delivered(o)  # the buyer's Orbit Points; never fails the delivery
            # pay on delivery: the points wait until ReOrbit confirms it has the cash (confirm_cod_cash), so a
            # "delivered" marked without any money changing hands earns nothing
            if o.buyer_admin_id:
                # bought by the ReOrbit team: it arrives at the warehouse dock (Floor 2 once put away)
                from apps.warehouse import services as warehouse  # local import: warehouse reads orders too

                warehouse.receive_purchase(o)
        if actor_kind == "admin":
            audit(actor, f"order.{action}", "order", o.public_id, before={"status": before}, after={"status": to}, ip=ip)
        _notify_buyer(o, f"Order {to.lower()}", f"{o.public_id} is {to.lower()}." + (f" {detail}" if to == "Shipped" else ""))
    return o


def confirm_received(order_pk, buyer):
    """The buyer says the parcel arrived (a courier order the seller shipped). This, ReOrbit checking
    the courier's tracking, or ReOrbit's own pickup team are the only ways an order becomes Delivered:
    a seller can't mark their own order delivered, so nobody is paid for a parcel that never arrived."""
    with transaction.atomic():
        o = Order.objects.select_for_update().get(pk=order_pk)
        if o.buyer_key != buyer_kit.key_of(buyer):
            raise CheckoutError("This isn't your order.", code="FORBIDDEN", status=403)
        if o.managed_delivery:
            raise CheckoutError("ReOrbit is delivering this order and will mark it delivered.",
                                code="MANAGED_DELIVERY", status=409)
        if o.status != Order.Status.SHIPPED:
            raise CheckoutError("You can confirm an order once it has been shipped.", code="BAD_STATE", status=409)
    return advance_order(order_pk, "deliver", actor_kind="buyer", actor=buyer)


# --------------------------------------------------------------------------- #
# Auto-confirm: a courier order the buyer never confirmed
# --------------------------------------------------------------------------- #
AUTO_CONFIRM_DAYS = max(int(os.getenv("AUTO_CONFIRM_DAYS", "7") or 7), 3)
REMIND_BEFORE_DAYS = 2
REMINDER_LABEL = "Delivery reminder"
OPEN_TICKET = ("Open", "In progress", "Waiting for you")


def auto_confirm_on(order):
    """When a shipped courier order becomes Delivered by itself (None if it never will)."""
    if order.managed_delivery or order.status != Order.Status.SHIPPED or not order.shipped_at:
        return None
    return order.shipped_at + timedelta(days=AUTO_CONFIRM_DAYS)


def _disputed(public_ids):
    """Orders with an open support ticket (e.g. "it never arrived"): never confirmed automatically."""
    from apps.support.models import SupportTicket  # local import: support reads orders too

    return set(SupportTicket.objects.filter(order_id__in=list(public_ids), status__in=OPEN_TICKET)
               .values_list("order_id", flat=True))


def _remind_buyer(o, on):
    from apps.core import mailer

    when = f"{timezone.localtime(on):%d %b}"
    body = (f"{o.public_id} was shipped {AUTO_CONFIRM_DAYS - REMIND_BEFORE_DAYS} days ago. Got it? Tap \"I received it\". "
            f"If it hasn't arrived, tell us before {when}; otherwise we'll mark it delivered then.")
    _notify_buyer(o, "Did your order arrive?", body)
    try:
        buyer = o.buyer
        mailer.send(
            buyer.email, f"Did your order arrive? ({o.public_id})",
            heading="Did your parcel arrive?",
            intro=body,
            facts=[("Order", o.public_id), ("Courier", f"{o.courier_name} · {o.tracking_no}"),
                   ("Marked delivered on", when)],
            footer="Not arrived yet? Open the order and choose Get help, so we can look into it first.",
        )
    except Exception:  # noqa: BLE001 - a reminder must never stop the job
        log.exception("delivery reminder email failed for %s", o.public_id)


def auto_confirm_due(now=None):
    """Runs by itself every hour (apps.core.autojobs). For courier orders the seller shipped:
    - REMIND_BEFORE_DAYS before the date, the buyer is reminded once (in the app and by email);
    - after AUTO_CONFIRM_DAYS it becomes Delivered, as if the buyer had confirmed it.
    "Managed by ReOrbit" orders are skipped (the pickup team delivers them), and so is any order with
    an open support ticket. Cash on delivery still waits for ReOrbit to get the cash before the
    seller's earning starts clearing or points are given. Returns how many were confirmed."""
    now = now or timezone.now()
    base = Order.objects.filter(status=Order.Status.SHIPPED, managed_delivery=False, shipped_at__isnull=False)
    due_at = now - timedelta(days=AUTO_CONFIRM_DAYS)

    remind = list(base.filter(shipped_at__lte=due_at + timedelta(days=REMIND_BEFORE_DAYS), shipped_at__gt=due_at)
                  .exclude(events__label=REMINDER_LABEL)[:200])
    skip = _disputed(o.public_id for o in remind)
    for o in remind:
        if o.public_id in skip:
            continue
        with transaction.atomic():  # once per order, even with two server processes running the job
            locked = Order.objects.select_for_update(skip_locked=True).filter(pk=o.pk, status=Order.Status.SHIPPED).first()
            if not locked or OrderEvent.objects.filter(order=locked, label=REMINDER_LABEL).exists():
                continue
            event(locked, REMINDER_LABEL, "The buyer was asked to confirm it arrived", "system")
        _remind_buyer(o, auto_confirm_on(o))

    due = list(base.filter(shipped_at__lte=due_at).values_list("pk", "public_id")[:200])
    skip = _disputed(pid for _, pid in due)
    done = 0
    for pk, pid in due:
        if pid in skip:
            continue
        try:
            advance_order(pk, "deliver", actor_kind="system", actor=None)
            done += 1
        except CheckoutError:
            pass  # it moved on meanwhile (confirmed, failed or cancelled)
        except Exception:  # noqa: BLE001 - one bad order must not stop the rest
            log.exception("auto-confirm failed for %s", pid)
    return done


REORBIT_COURIER = "ReOrbit Delivery"  # the courier choice that hands the parcel to ReOrbit's own pickup team


def is_reorbit_courier(name):
    return " ".join(str(name or "").lower().split()) in ("reorbit delivery", "reorbit", "reorbit pickup")


def hand_to_reorbit(order_pk, *, actor_kind, actor, ip=None):
    """"Mark as shipped" with ReOrbit Delivery as the courier, by the seller or an admin: ReOrbit's
    pickup team takes over. The order becomes a ReOrbit-delivered one and gets a pickup in
    Admin > Pickups; from then on only that pickup moves it along (picked up = shipped,
    completed = delivered). The buyer's total does not change. Safe to press twice."""
    from apps.pickups import services as pickups  # local import: pickups reads orders too

    with transaction.atomic():
        o = Order.objects.select_for_update(of=("self",)).select_related(
            "seller_user", "seller_remaker").get(pk=order_pk)
        if o.status == Order.Status.CONFIRMED:
            raise CheckoutError("Pack the order first, then hand it to ReOrbit Delivery.", code="BAD_STATE", status=409)
        if o.status != Order.Status.PACKED:
            raise CheckoutError("This order has already left, so it can't be handed to ReOrbit Delivery.",
                                code="BAD_STATE", status=409)
        first = not o.managed_delivery or not o.pickup_requested_at
        o.managed_delivery = True
        o.pickup_requested_at = o.pickup_requested_at or timezone.now()
        o.save(update_fields=["managed_delivery", "pickup_requested_at", "updated_at"])
        r = pickups.request_for_order(o)
        if first:
            who = "ReOrbit" if actor_kind == "admin" else "The seller"
            event(o, "Handed to ReOrbit Delivery", f"{who} chose ReOrbit Delivery. ReOrbit's team collects it ({r.public_id}).",
                  actor_kind)
            if actor_kind == "admin":
                audit(actor, "order.reorbit_delivery", "order", o.public_id, after={"pickup": r.public_id}, ip=ip)
            _notify_buyer(o, "ReOrbit is delivering your order",
                          f"{o.public_id} will be collected and delivered by ReOrbit's own team.")
    return r


def request_pickup(order_pk, *, actor, ip=None):
    """"Managed by ReOrbit": the seller has packed the parcel and asks ReOrbit to collect it.
    Creates the pickup in Admin > Pickups. Safe to press twice."""
    from apps.pickups import services as pickups  # local import: pickups reads orders too

    with transaction.atomic():
        o = Order.objects.select_for_update(of=("self",)).select_related(
            "seller_user", "seller_remaker").get(pk=order_pk)
        if not o.managed_delivery:
            raise CheckoutError("You ship this order yourself, so there is no ReOrbit pickup.", code="NOT_MANAGED", status=409)
        if o.status != Order.Status.PACKED:
            raise CheckoutError("Pack the order first, then ask ReOrbit to pick it up.", code="BAD_STATE", status=409)
        if o.pickup_requested_at:
            return o
        o.pickup_requested_at = timezone.now()
        o.save(update_fields=["pickup_requested_at", "updated_at"])
        pickups.request_for_order(o)
        event(o, "Ready for pickup", "The seller packed it; ReOrbit will collect it.", "seller")
    return o


def cancel_order(order_pk, *, by, actor, reason="", ip=None):
    """Cancel before it ships. Gives stock back and refunds an online payment."""
    reason = " ".join(reason.split())
    if by in ("seller", "admin") and len(reason) < 3:
        raise CheckoutError("Give a reason for cancelling.", {"reason": ["Give a reason for cancelling."]})
    refund = None
    with transaction.atomic():
        o = Order.objects.select_for_update(of=("self",)).select_related("payment").get(pk=order_pk)
        if o.status not in (Order.Status.CONFIRMED, Order.Status.PACKED):
            raise CheckoutError("This order can't be cancelled any more.", code="BAD_STATE", status=409)
        _restock(o)
        before = o.status
        paid_online = o.payment_status == Order.PayStatus.PAID and o.payment.method == Payment.Method.RAZORPAY
        o.status, o.cancelled_at, o.cancelled_by = Order.Status.CANCELLED, timezone.now(), by
        o.cancel_reason = (reason or "Cancelled by the buyer.")[:255]
        o.payment_status = Order.PayStatus.REFUND_PENDING if paid_online else Order.PayStatus.VOID
        o.save(update_fields=["status", "cancelled_at", "cancelled_by", "cancel_reason", "payment_status", "updated_at"])
        event(o, "Cancelled", o.cancel_reason, by)
        if not o.payment.orders.exclude(status=Order.Status.CANCELLED).exists():
            vouchers.give_back(o.payment.public_id)  # the whole checkout is gone: the voucher is usable again
        if by == "admin":
            audit(actor, "order.cancel", "order", o.public_id, before={"status": before}, after={"status": "Cancelled"}, reason=reason, ip=ip)
        if by != "buyer":
            _notify_buyer(o, "Order cancelled", f"{o.public_id} was cancelled. {o.cancel_reason}")
        if by != "seller":
            _notify_seller(o, "Order cancelled", f"{o.public_id} was cancelled.")
        if paid_online:
            refund = make_refund(o.payment, o.total, "cancelled", order=o, note=o.cancel_reason, send=False)
    if refund:
        refunds.process(refund.pk)  # a failure stays a visible refund that an admin can retry
        o.refresh_from_db()
    return o


# --------------------------------------------------------------------------- #
# delivery updates, failed deliveries, cash on delivery
# --------------------------------------------------------------------------- #
def make_refund(*args, **kwargs):
    """refunds.create, with its errors shown to the user instead of crashing the request."""
    try:
        return refunds.create(*args, **kwargs)
    except refunds.RefundError as e:
        raise CheckoutError(e.message, code=e.code, status=e.status)


def _who(actor_kind):
    return "seller" if actor_kind == "seller" else actor_kind


def post_update(order_pk, text, *, actor_kind, actor, ip=None):
    """The seller tells the buyer something about the parcel ("Out for delivery")."""
    text = " ".join(str(text or "").split())
    if len(text) < 3:
        raise CheckoutError("Write a short update for the buyer.", {"text": ["Write a short update for the buyer."]})
    text = text[:120]
    with transaction.atomic():
        o = Order.objects.select_for_update(of=("self",)).get(pk=order_pk)
        if o.status != Order.Status.SHIPPED:
            raise CheckoutError("Updates can be sent while the parcel is on its way.", code="BAD_STATE", status=409)
        event(o, "Update", text, actor_kind)
        _notify_buyer(o, "Delivery update", f"{o.public_id}: {text}")
    return o


def mark_failed(order_pk, reason_code, note="", *, actor_kind, actor, ip=None):
    """The courier could not deliver. The parcel is on its way back to the seller."""
    if reason_code not in FAIL_REASONS:
        raise CheckoutError("Choose why the delivery failed.", {"reason": ["Choose why the delivery failed."]})
    label, fault = FAIL_REASONS[reason_code]
    note = " ".join(str(note or "").split())[:255]
    with transaction.atomic():
        o = Order.objects.select_for_update(of=("self",)).get(pk=order_pk)
        if o.status != Order.Status.SHIPPED:
            raise CheckoutError("Only a parcel that is on its way can be marked as not delivered.", code="BAD_STATE", status=409)
        o.status, o.failed_at, o.fail_reason, o.fail_note, o.fail_fault = (
            Order.Status.DELIVERY_FAILED, timezone.now(), reason_code, note, fault)
        o.save(update_fields=["status", "failed_at", "fail_reason", "fail_note", "fail_fault", "updated_at"])
        event(o, "Delivery failed", label + (f" · {note}" if note else ""), actor_kind)
        if actor_kind == "admin":
            audit(actor, "order.fail", "order", o.public_id, after={"reason": reason_code}, ip=ip)
        _notify_buyer(o, "Delivery attempt failed", f"{o.public_id}: {label}. The seller will try again or the parcel goes back to them.")
        if actor_kind != "seller":
            _notify_seller(o, "Delivery failed", f"{o.public_id}: {label}.")
    return o


def reattempt(order_pk, *, actor_kind, actor, ip=None):
    """Try the delivery again (same parcel, same tracking)."""
    with transaction.atomic():
        o = Order.objects.select_for_update(of=("self",)).get(pk=order_pk)
        if o.status != Order.Status.DELIVERY_FAILED:
            raise CheckoutError("This order is not waiting for another delivery attempt.", code="BAD_STATE", status=409)
        o.status, o.failed_at, o.fail_reason, o.fail_note, o.fail_fault = Order.Status.SHIPPED, None, "", "", ""
        o.save(update_fields=["status", "failed_at", "fail_reason", "fail_note", "fail_fault", "updated_at"])
        event(o, "Delivery retried", "", actor_kind)
        _notify_buyer(o, "Delivery attempted again", f"{o.public_id} is out for another delivery attempt.")
    return o


def return_to_origin(order_pk, *, actor_kind, actor, ip=None):
    """The parcel is back with the seller. Stock goes back. A prepaid buyer is refunded: in full when the
    seller or courier was at fault, otherwise minus the delivery fee. Cash on delivery needs no refund
    (nothing was collected). The seller earns nothing for this order."""
    refund = None
    with transaction.atomic():
        o = Order.objects.select_for_update(of=("self",)).select_related("payment").get(pk=order_pk)
        if o.status != Order.Status.DELIVERY_FAILED:
            raise CheckoutError("Only an order with a failed delivery can be marked as returned.", code="BAD_STATE", status=409)
        _restock(o)
        o.status = Order.Status.RETURNED_TO_ORIGIN
        paid_online = o.payment_status == Order.PayStatus.PAID and o.payment.method == Payment.Method.RAZORPAY
        amount = o.total if o.fail_fault == "seller" else max(o.total - o.delivery_fee, 0)
        o.payment_status = Order.PayStatus.REFUND_PENDING if paid_online and amount else Order.PayStatus.VOID
        o.save(update_fields=["status", "payment_status", "updated_at"])
        event(o, "Returned to seller", "Parcel is back with the seller", actor_kind)
        if actor_kind == "admin":
            audit(actor, "order.return_to_origin", "order", o.public_id, ip=ip)
        if paid_online and amount:
            refund = make_refund(o.payment, amount, "delivery_failed", order=o,
                                    note="Delivery failed" + ("" if o.fail_fault == "seller" else " (delivery fee kept)"), send=False)
            _notify_buyer(o, "Order returned to the seller", f"{o.public_id} could not be delivered. ₹{amount:,} is being refunded.")
        else:
            _notify_buyer(o, "Order returned to the seller", f"{o.public_id} could not be delivered. Nothing was charged." if o.payment.method == Payment.Method.COD
                          else f"{o.public_id} could not be delivered.")
        if actor_kind != "seller":
            _notify_seller(o, "Parcel returned", f"{o.public_id} is back with you and the stock was restored.")
    if refund:
        refunds.process(refund.pk)
        o.refresh_from_db()
    return o


# Pay-on-delivery orders hold the stock with no money paid. At most this many unshipped ones per
# account, so nobody can tie up every item (pay online and there is no limit).
MAX_OPEN_COD_CHECKOUTS = 2


def cod_open_reason(buyer):
    open_cod = (Payment.objects.filter(buyer_key=buyer_kit.key_of(buyer), method=Payment.Method.COD,
                                       orders__status__in=(Order.Status.CONFIRMED, Order.Status.PACKED))
                .distinct().count())
    if open_cod >= MAX_OPEN_COD_CHECKOUTS:
        return (f"You already have {open_cod} pay-on-delivery orders waiting to ship. Pay online for this one, "
                "or wait until one of them ships.")
    return ""


def confirm_cod_cash(order_pk, admin, reference="", ip=None):
    """Admin: the courier handed ReOrbit the cash for this order. Counts it as paid and starts the
    seller's clearing days."""
    reference = " ".join(str(reference or "").split())[:60]
    with transaction.atomic():
        o = Order.objects.select_for_update(of=("self",)).select_related("payment").get(pk=order_pk)
        waiting = (o.payment.method == Payment.Method.COD and o.status == Order.Status.DELIVERED
                   and o.cod_received_at is None and o.payment_status != Order.PayStatus.PAID)
        if not waiting:
            raise CheckoutError("This order is not waiting for cash from the courier.", code="BAD_STATE", status=409)
        # a refund may already be under way (a return before the cash arrived): keep its status
        if o.payment_status == Order.PayStatus.COD_COLLECTED:
            o.payment_status = Order.PayStatus.PAID
        o.cod_received_at, o.cod_received_by, o.cod_reference = timezone.now(), admin, reference
        o.save(update_fields=["payment_status", "cod_received_at", "cod_received_by", "cod_reference", "updated_at"])
        event(o, "Cash received", f"₹{o.total:,} received by ReOrbit" + (f" (ref {reference})" if reference else ""), "admin")
        audit(admin, "order.cod_received", "order", o.public_id, after={"amount": o.total, "reference": reference}, ip=ip)
        from apps.payments import wallet

        wallet.release_cod(o)
        vouchers.on_order_delivered(o)  # the buyer's Orbit Points, now that the money is real
    return o
