"""Numbers for the admin Reports and Dashboard, worked out from the real tables.

Orders, donations, pickups, warehouse stock, members, ReMakers, vouchers and payouts are
read here and shaped exactly the way the admin screens already read them, so no screen
has to change. Nothing is stored: every call looks at the rows as they are right now.
"""

from datetime import timedelta

from django.db.models import Count, Sum
from django.utils import timezone

from apps.donations.models import Donation
from apps.orders.models import Order
from apps.payments.models import Payout
from apps.pickups.models import PickupRequest
from apps.remakers.models import ReMakers
from apps.rewards.models import PointsEntry, Voucher
from apps.users.models import Users
from apps.warehouse import services as warehouse_services
from apps.warehouse.models import WarehouseItem

RANGES = {
    "30d": ("Last 30 days", 30),
    "90d": ("Last 90 days", 90),
    "6m": ("Last 6 months", 182),
    "12m": ("Last 12 months", 365),
    "all": ("All time", 1200),
}
DEFAULT_RANGE = "90d"
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
DAY = timedelta(days=1)

PARTY = {"platform": "Admin", "remaker": "ReMaker", "user": "User", "admin": "Admin"}
FLOW_NAME = {"platform": "ReOrbit", "admin": "ReOrbit", "remaker": "ReMaker", "user": "Member"}
OPEN_ORDER_RETURNS = ("Requested", "Approved", "Escalated")


# ------------------------------------------------------------------ small helpers
def ms(dt):
    return int(dt.timestamp() * 1000)


def pct(a, b):
    return round(a / b * 1000) / 10 if b else 0


def tally(rows, key, val=lambda _: 1):
    out = {}
    for r in rows:
        k = key(r)
        if k is None:
            continue
        out[k] = out.get(k, 0) + (val(r) or 0)
    return sorted(({"label": k, "value": v} for k, v in out.items()), key=lambda x: -x["value"])


def top_n(rows, n):
    if len(rows) <= n:
        return rows
    return rows[: n - 1] + [{"label": "Other", "value": sum(r["value"] for r in rows[n - 1:])}]


def make_buckets(start, end, weekly):
    out = []
    if weekly:
        s = start
        while s < end:
            d = timezone.localtime(s)
            out.append({"from": s, "to": min(s + 7 * DAY, end + timedelta(milliseconds=1)),
                        "label": f"{d.day} {MONTHS[d.month - 1]}"})
            s += 7 * DAY
    else:
        d = timezone.localtime(start).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last = timezone.localtime(end)
        while d <= last:
            nxt = (d.replace(day=28) + timedelta(days=4)).replace(day=1)
            out.append({"from": max(d, start), "to": nxt, "label": f"{MONTHS[d.month - 1]} {str(d.year)[2:]}"})
            d = nxt
    return out


def in_bucket(b, v):
    return v is not None and b["from"] <= v < b["to"]


# ------------------------------------------------------------------ orders
def order_status(o):
    """The server's statuses in the words the number screens use."""
    if o.status == "Pending_Payment":
        return "Pending"
    if o.status == "Delivered":
        return "Returned" if o.payment_status == "Refunded" else "Completed"
    if o.status == "Cancelled":
        return "Cancelled"
    if o.status == "Returned_To_Origin":
        return "Returned"
    return "Confirmed"  # Confirmed, Packed, Shipped, Delivery_Failed: still in progress


def pay_status(o):
    if o.payment_status in ("Paid", "Refund_Pending", "Refund_Failed"):
        return "Success"
    if o.payment_status == "Refunded":
        return "Refunded"
    if o.payment_status == "Void":
        return "Failed"
    return "Pending"


def _line_category(line):
    for ref in (line.item, line.remaker_product, line.admin_item):
        if ref is not None and getattr(ref, "category", None) is not None:
            return ref.category.name
    return "Other"


def order_rows(since, until):
    """Confirmed orders between two moments, each reduced to what the numbers need."""
    qs = (Order.objects.filter(confirmed_at__isnull=False, created_at__gte=since, created_at__lte=until)
          .select_related("payment", "seller_user", "seller_remaker")
          .prefetch_related("lines__item__category", "lines__remaker_product__category", "lines__admin_item__category"))
    rows = []
    for o in qs:
        lines = list(o.lines.all())
        first = lines[0] if lines else None
        st, ps = order_status(o), pay_status(o)
        seller = {"remaker": o.seller_remaker, "user": o.seller_user}.get(o.seller_type)
        rows.append({
            "id": o.public_id, "at": o.created_at, "amount": o.total, "fee": o.platform_fee,
            "status": st, "pay": ps, "paid": ps == "Success" and st in ("Confirmed", "Completed"),
            "method": "COD" if o.payment.method == "COD" else "Online",
            "seller_name": seller.full_name if seller else "ReOrbit",
            "seller_type": PARTY.get(o.seller_type, "Admin"),
            "flow": f"{FLOW_NAME.get(o.seller_type, 'ReOrbit')} → {FLOW_NAME.get(o.buyer_type, 'Member')}",
            "category": _line_category(first) if first else "Other",
            "kind": ("item" if first.kind == "item" else "product") if first else "product",
        })
    return rows


def _orders_section(rows, prev_rows, buckets):
    def gmv(rs):
        return sum(r["amount"] for r in rs if r["paid"])

    def fees(rs):
        return sum(r["fee"] for r in rs if r["paid"])

    def refunds(rs):
        return sum(r["amount"] for r in rs if r["pay"] == "Refunded")

    paid_rows = [r for r in rows if r["paid"]]
    trend = []
    for b in buckets:
        lst = [r for r in rows if in_bucket(b, r["at"])]
        trend.append({"label": b["label"], "revenue": gmv(lst), "fees": fees(lst),
                      "orders": len(lst), "refunds": refunds(lst)})

    sellers = {}
    for r in paid_rows:
        cur = sellers.setdefault((r["seller_name"], r["seller_type"]),
                                 {"name": r["seller_name"], "type": r["seller_type"], "orders": 0, "revenue": 0})
        cur["orders"] += 1
        cur["revenue"] += r["amount"]

    return {
        "kpi": {
            "revenue": gmv(rows), "revenuePrev": gmv(prev_rows),
            "orders": len(rows), "ordersPrev": len(prev_rows),
            "fees": fees(rows), "feesPrev": fees(prev_rows),
            "aov": round(gmv(rows) / len(paid_rows)) if paid_rows else 0,
            "refunds": refunds(rows),
            "cancelRate": pct(sum(1 for r in rows if r["status"] in ("Cancelled", "Returned")), len(rows)),
        },
        "trend": trend,
        "statusRows": [{"label": s, "value": sum(1 for r in rows if r["status"] == s)}
                       for s in ("Completed", "Confirmed", "Pending", "Cancelled", "Returned")],
        "flowRows": tally(paid_rows, lambda r: r["flow"], lambda r: r["amount"]),
        "categoryRows": tally(paid_rows, lambda r: r["category"], lambda r: r["amount"]),
        "payRows": tally(rows, lambda r: r["method"]),
        "kindRows": [
            {"label": "Platform products", "value": gmv([r for r in rows if r["kind"] == "product"])},
            {"label": "Member items", "value": gmv([r for r in rows if r["kind"] == "item"])},
        ],
        "topSellers": sorted(sellers.values(), key=lambda s: -s["revenue"])[:8],
    }


# ------------------------------------------------------------------ donations and pickups
DONATION_PICKUP = {
    "Pending": "Requested", "Scheduled": "Scheduled", "Failed_Pickup": "Scheduled",
    "Picked_Up": "Picked_Up", "Received": "Completed", "Completed": "Completed",
    "Rejected": "Cancelled", "Cancelled": "Cancelled",
}
IN_PROGRESS = ("Scheduled", "Failed_Pickup", "Picked_Up", "Received")
IN_HAND = ("Picked_Up", "Received", "Completed")


def _donations_section(start, prev_start, end, buckets):
    both = list(Donation.objects.filter(created_at__gte=prev_start, created_at__lte=end)
                .select_related("assigned_partner"))
    don_in = [d for d in both if d.created_at >= start]
    don_prev = [d for d in both if d.created_at < start]

    trend = []
    for b in buckets:
        lst = [d for d in don_in if in_bucket(b, d.created_at)]
        trend.append({
            "label": b["label"],
            "Completed": sum(1 for d in lst if d.status == "Completed"),
            "In progress": sum(1 for d in lst if d.status in IN_PROGRESS),
            "Pending": sum(1 for d in lst if d.status == "Pending"),
            "Rejected": sum(1 for d in lst if d.status == "Rejected"),
        })

    kpi = {
        "total": len(don_in), "totalPrev": len(don_prev),
        "items": sum(d.quantity for d in don_in),
        "weight": round(sum(float(d.weight_kg) for d in don_in if d.status in IN_HAND)),
        "completion": pct(sum(1 for d in don_in if d.status == "Completed"),
                          sum(1 for d in don_in if d.status != "Pending")),
        "pending": Donation.objects.filter(status="Pending").count(),
    }

    # every pickup: one per donation, plus the listings members asked ReOrbit to collect
    today = timezone.localdate()
    pk = [{"status": DONATION_PICKUP.get(d.status, "Requested"), "agent": d.assigned_partner.name if d.assigned_partner_id else None,
           "date": d.pickup_date} for d in don_in]
    for r in (PickupRequest.objects.filter(created_at__gte=start, created_at__lte=end)
              .select_related("assigned_partner")):
        pk.append({"status": r.status, "agent": r.assigned_partner.name if r.assigned_partner_id else None,
                   "date": r.pickup_date})
    pk_kpi = {
        "total": len(pk),
        "done": sum(1 for p in pk if p["status"] == "Completed"),
        "overdue": sum(1 for p in pk if p["status"] == "Scheduled" and p["date"] and p["date"] < today),
        "cancelRate": pct(sum(1 for p in pk if p["status"] == "Cancelled"), len(pk)),
    }
    return {
        "kpi": kpi, "trend": trend,
        "cats": top_n(tally(don_in, lambda d: d.category, lambda d: d.quantity), 5),
        "status": tally(don_in, lambda d: d.status.replace("_", " ")),
        "pk": {
            "kpi": pk_kpi,
            "status": [{"label": s.replace("_", " "), "value": sum(1 for p in pk if p["status"] == s)}
                       for s in ("Requested", "Scheduled", "Picked_Up", "Completed", "Cancelled")],
            "agents": tally([p for p in pk if p["agent"]], lambda p: p["agent"]),
        },
    }


# ------------------------------------------------------------------ warehouse
STAGES = ("Received", "Stored", "Assigned", "Refurbishment", "Released")
SALES = ("Listed", "Not listed", "Sold", "Donated")


def warehouse_section(now=None):
    now = now or timezone.now()
    rule = warehouse_services.rules()
    stock = list(WarehouseItem.objects.all())
    for i in stock:
        i.days_listed = max(0, (now - i.listed_at).days) if i.listed_at and i.sale_status == "Listed" else 0
        i.alerting = warehouse_services.alert_for(i, rule, now) is not None
    sold = sum(1 for i in stock if i.sale_status == "Sold")
    listed = sum(1 for i in stock if i.sale_status == "Listed")
    aging = [("0–7 days", 0, 7), ("8–14 days", 8, 14), ("15–30 days", 15, 30), ("31+ days", 31, 9999)]
    stale = sorted((i for i in stock if i.alerting), key=lambda i: -i.days_listed)[:8]
    return {
        "kpi": {
            "items": len(stock),
            "value": sum(i.list_price for i in stock if i.warehouse_status != "Released"),
            "listed": listed, "alerts": sum(1 for i in stock if i.alerting), "sold": sold,
            "sellThrough": pct(sold, listed + sold),
        },
        "status": [{"label": s, "value": sum(1 for i in stock if i.warehouse_status == s)} for s in STAGES],
        "sale": [{"label": s, "value": sum(1 for i in stock if i.sale_status == s)} for s in SALES],
        "cats": top_n(tally(stock, lambda i: i.category, lambda i: i.list_price or 0), 5),
        "aging": [{"label": label, "value": sum(1 for i in stock if i.sale_status == "Listed" and lo <= i.days_listed <= hi)}
                  for label, lo, hi in aging],
        "stale": [{"id": i.public_id, "title": i.title, "category": i.category,
                   "daysListed": i.days_listed, "list_price": i.list_price} for i in stale],
    }


# ------------------------------------------------------------------ community
def _community_section(start, end, buckets):
    users = list(Users.objects.select_related("profile"))
    makers = list(ReMakers.objects.select_related("profile"))
    alive = lambda a: a.status != "Deleted"  # noqa: E731
    city = lambda a: (getattr(getattr(a, "profile", None), "city", None) or "Unknown")  # noqa: E731
    new = lambda a: start <= a.created_at <= end  # noqa: E731
    return {
        "kpi": {
            "users": sum(1 for u in users if alive(u)),
            "remakers": sum(1 for r in makers if alive(r)),
            "newInRange": sum(1 for a in users + makers if new(a)),
            "suspended": sum(1 for a in users + makers if a.status in ("Suspended", "Blocked")),
            "redemptions": Voucher.objects.filter(points_spent__gt=0, created_at__gte=start, created_at__lte=end).count(),
            "pointsIssued": PointsEntry.objects.filter(points__gt=0, created_at__gte=start, created_at__lte=end)
                            .aggregate(n=Sum("points"))["n"] or 0,
        },
        "trend": [{"label": b["label"],
                   "Users": sum(1 for u in users if in_bucket(b, u.created_at)),
                   "ReMakers": sum(1 for r in makers if in_bucket(b, r.created_at))} for b in buckets],
        "userStatus": tally(users, lambda u: u.status),
        "remakerStatus": tally(makers, lambda r: r.status),
        "cities": top_n(tally([a for a in users + makers if alive(a)], city), 6),
    }


# ------------------------------------------------------------------ payouts
def payouts_section(start, end):
    pending = Payout.objects.filter(status="Pending")
    paid = Payout.objects.filter(status="Paid", paid_at__gte=start, paid_at__lte=end)
    return {
        "pending": pending.count(),
        "pendingAmount": pending.aggregate(n=Sum("amount"))["n"] or 0,
        "paid": paid.count(),
        "paidAmount": paid.aggregate(n=Sum("amount"))["n"] or 0,
        "rejected": Payout.objects.filter(status="Rejected", updated_at__gte=start, updated_at__lte=end).count(),
    }


# ------------------------------------------------------------------ the report
def build_report(range_key, now=None):
    key = range_key if range_key in RANGES else DEFAULT_RANGE
    label, days = RANGES[key]
    end = now or timezone.now()
    start = end - days * DAY
    prev_start = start - days * DAY
    weekly = days <= 60
    buckets = make_buckets(start, end, weekly)

    all_rows = order_rows(prev_start, end)
    rows = [r for r in all_rows if r["at"] >= start]
    prev_rows = [r for r in all_rows if r["at"] < start]

    return {
        "range": {"key": key, "label": label, "days": days},
        "start": ms(start), "end": ms(end), "weekly": weekly,
        "orders": _orders_section(rows, prev_rows, buckets),
        "donations": _donations_section(start, prev_start, end, buckets),
        "warehouse": warehouse_section(end),
        "community": _community_section(start, end, buckets),
        "payouts": payouts_section(start, end),
    }
