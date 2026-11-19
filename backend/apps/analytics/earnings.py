"""What ReOrbit itself earns, for the admin Earnings page.

Income
  Platform fee   added to every order a member or ReMaker places. Orders the platform buys carry none.
  Product sales  the item price (and the delivery charge) of ReOrbit's own store products.
  Delivery       the delivery fee of "Managed by ReOrbit" orders (ReOrbit picks up and delivers them).
Money out
  Vouchers       donation vouchers taken off at checkout. ReOrbit pays these: sellers still get their
                 full price.
  Refunds        the fee and the sales given back on refunded orders.
  Purchases      what the platform spends when an admin buys something.

"Earned" means the money is in and the order is confirmed or completed, the same rule the Reports page
uses, so the two pages always agree. Everything is read from the orders as they are right now.
"""

from django.utils import timezone

from apps.core.models import PlatformSettings
from apps.orders.models import Order

from .aggregate import DAY, DEFAULT_RANGE, PARTY, RANGES, in_bucket, make_buckets, ms, order_status, pay_status, pct, tally

MAX_ENTRIES = 400
SELLER_GROUP = {"platform": "Platform products", "remaker": "ReMaker products", "user": "Member items"}


def _category(order, lines):
    for line in lines:
        for ref in (line.item, line.remaker_product, line.admin_item):
            if ref is not None and getattr(ref, "category", None) is not None:
                return ref.category.name
    return "Other"


def _buyer(o):
    who = {"user": o.buyer_user, "remaker": o.buyer_remaker, "admin": o.buyer_admin}.get(o.buyer_type)
    return who.full_name if who else "ReOrbit"


def _seller(o):
    who = {"user": o.seller_user, "remaker": o.seller_remaker}.get(o.seller_type)
    return who.full_name if who else "ReOrbit"


def _rows(since, until):
    qs = (Order.objects.filter(confirmed_at__isnull=False, created_at__gte=since, created_at__lte=until)
          .select_related("buyer_user", "buyer_remaker", "buyer_admin", "seller_user", "seller_remaker")
          .prefetch_related("lines__item__category", "lines__remaker_product__category", "lines__admin_item__category"))
    rows = []
    for o in qs:
        lines = list(o.lines.all())
        status, pay = order_status(o), pay_status(o)
        own_sale = o.seller_type == "platform"
        own_buy = o.buyer_type == "admin"
        fee = 0 if own_buy else o.platform_fee
        sale = o.subtotal if own_sale else 0
        # ReOrbit keeps the delivery fee when it delivered: its own store, and "Managed by ReOrbit" orders
        delivery = o.delivery_fee if own_sale or o.managed_delivery else 0
        rows.append({
            "id": o.public_id, "at": o.created_at,
            "earned": pay == "Success" and status in ("Confirmed", "Completed"),
            "pending": pay == "Pending" and status in ("Pending", "Confirmed"),
            "refunded": pay == "Refunded",
            "fee": fee, "sale": sale, "delivery": delivery, "amount": o.total, "subtotal": o.subtotal,
            "voucher": o.discount or 0,
            "own_buy": own_buy, "own_sale": own_sale,
            "buyer": _buyer(o), "buyer_type": PARTY.get(o.buyer_type, "User"),
            "seller": _seller(o), "seller_type": o.seller_type,
            "title": lines[0].title if lines else "Order",
            "category": _category(o, lines),
        })
    return rows


def _totals(rows):
    earned = [r for r in rows if r["earned"]]
    fees = sum(r["fee"] for r in earned)
    sales = sum(r["sale"] for r in earned)
    delivery = sum(r["delivery"] for r in earned)
    refunds = sum(r["fee"] + r["sale"] + r["delivery"] for r in rows if r["refunded"])
    vouchers = sum(r["voucher"] for r in earned)
    purchases = sum(r["amount"] for r in earned if r["own_buy"])
    earnings = fees + sales + delivery - vouchers - refunds
    return {"fees": fees, "sales": sales, "delivery": delivery, "vouchers": vouchers, "refunds": refunds,
            "purchases": purchases, "earnings": earnings, "net": earnings - purchases}


def _group(rows, key, val):
    return tally(rows, key, val)


def build_earnings(range_key, now=None):
    key = range_key if range_key in RANGES else DEFAULT_RANGE
    label, days = RANGES[key]
    end = now or timezone.now()
    start = end - days * DAY
    prev_start = start - days * DAY
    weekly = days <= 60
    buckets = make_buckets(start, end, weekly)

    both = _rows(prev_start, end)
    rows = [r for r in both if r["at"] >= start]
    prev_rows = [r for r in both if r["at"] < start]
    cur, prev = _totals(rows), _totals(prev_rows)

    trend, running = [], 0
    for b in buckets:
        t = _totals([r for r in rows if in_bucket(b, r["at"])])
        running += t["earnings"]
        trend.append({"label": b["label"], "Platform fees": t["fees"], "Product sales": t["sales"],
                      "Delivery fees": t["delivery"], "vouchers": t["vouchers"], "refunds": t["refunds"], "earnings": t["earnings"], "purchases": t["purchases"], "cumulative": running})

    flow = [
        {"key": "fees", "label": "Platform fees", "value": cur["fees"], "kind": "gain"},
        {"key": "sales", "label": "Product sales", "value": cur["sales"], "kind": "gain"},
        {"key": "delivery", "label": "Delivery fees", "value": cur["delivery"], "kind": "gain"},
        {"key": "vouchers", "label": "Voucher discounts", "value": -cur["vouchers"], "kind": "loss"},
        {"key": "refunds", "label": "Refunds", "value": -cur["refunds"], "kind": "loss"},
        {"key": "earnings", "label": "Earnings", "value": cur["earnings"], "kind": "total"},
        {"key": "purchases", "label": "Purchases", "value": -cur["purchases"], "kind": "loss"},
        {"key": "net", "label": "Net cash flow", "value": cur["net"], "kind": "total"},
    ]

    fee_rows = [r for r in rows if r["earned"] and r["fee"] > 0]
    sellers = {}
    for r in fee_rows:
        c = sellers.setdefault((r["seller"], r["seller_type"]),
                               {"name": r["seller"], "type": PARTY.get(r["seller_type"], "Admin"), "orders": 0, "fee": 0, "volume": 0})
        c["orders"] += 1
        c["fee"] += r["fee"]
        c["volume"] += r["subtotal"]

    pending = [r for r in rows if r["pending"]]

    entries = []
    for r in rows:
        status = "Earned" if r["earned"] else "Refunded" if r["refunded"] else "Pending" if r["pending"] else None
        if status is None:
            continue
        sign = -1 if status == "Refunded" else 1
        base = {"order_id": r["id"], "at": r["at"].isoformat(), "party": r["buyer"], "title": r["title"]}
        if r["fee"] > 0:
            entries.append({**base, "id": f"{r['id']}-fee", "type": "Platform fee", "amount": sign * r["fee"], "status": status})
        if r["sale"] > 0:
            entries.append({**base, "id": f"{r['id']}-sale", "type": "Product sale",
                            "amount": sign * r["sale"], "status": status})
        if r["delivery"] > 0:
            entries.append({**base, "id": f"{r['id']}-delivery", "type": "Delivery fee",
                            "amount": sign * r["delivery"], "status": status})
        if r["voucher"] > 0 and status == "Earned":
            entries.append({**base, "id": f"{r['id']}-voucher", "type": "Voucher discount",
                            "amount": -r["voucher"], "status": "Spent"})
        if r["own_buy"] and status == "Earned":
            entries.append({**base, "id": f"{r['id']}-buy", "type": "Purchase", "amount": -r["amount"],
                            "status": "Spent", "party": r["seller"]})
    entries.sort(key=lambda e: e["at"], reverse=True)

    gmv = sum(r["subtotal"] for r in fee_rows)
    return {
        "range": {"key": key, "label": label, "days": days},
        "start": ms(start), "end": ms(end), "weekly": weekly,
        "cur": cur, "prev": prev, "trend": trend, "flow": flow,
        "feeByCategory": _group(fee_rows, lambda r: r["category"], lambda r: r["fee"])[:6],
        "feeByBuyer": _group(fee_rows, lambda r: r["buyer_type"], lambda r: r["fee"]),
        "feeBySeller": _group(fee_rows, lambda r: SELLER_GROUP.get(r["seller_type"], "Member items"), lambda r: r["fee"]),
        "salesByCategory": _group([r for r in rows if r["earned"] and r["own_sale"]], lambda r: r["category"],
                                  lambda r: r["sale"] + r["delivery"])[:6],
        "topSellers": sorted(sellers.values(), key=lambda s: -s["fee"])[:6],
        "pending": {"orders": len(pending), "fees": sum(r["fee"] for r in pending),
                    "sales": sum(r["sale"] + r["delivery"] for r in pending)},
        "entries": entries[:MAX_ENTRIES],
        "takeRate": pct(cur["fees"], gmv),
        "feeOrders": len(fee_rows),
        "feePct": float(PlatformSettings.load().platform_fee_pct),
    }
