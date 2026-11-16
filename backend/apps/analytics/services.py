"""ReMaker analytics, built from real records.

  earnings    item prices of delivered orders (the buyer pays the ReOrbit fee on top), minus
              orders that were refunded after a return. Counted on the day the order was delivered.
  orders      orders placed (paid, or cash on delivery), counted on the day they were placed
  views       product-page views, saves = wishlist adds, followers = new follows
  funnel      views, then saves, then orders placed, then those orders that were delivered

Every figure is also worked out for the period of the same length just before, so the page can
show whether things are up or down.
"""

from collections import defaultdict
from datetime import datetime, time, timedelta

from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from apps.listings.models import MediaImage
from apps.orders.models import Order, OrderItem, ReturnRequest
from apps.remakers.models import RemakerProduct
from apps.social.models import Follow, WishlistEntry

from .models import ProductViewDay, ProfileViewDay

RANGES = {
    "7": {"days": 7, "label": "7 days", "long": "Last 7 days"},
    "30": {"days": 30, "label": "30 days", "long": "Last 30 days"},
    "90": {"days": 90, "label": "90 days", "long": "Last 90 days"},
    "365": {"days": 365, "label": "12 months", "long": "Last 12 months"},
}
SOURCES = dict(ProductViewDay.Source.choices)
WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
TIME_BLOCKS = ["12 to 4 am", "4 to 8 am", "8 am to 12", "12 to 4 pm", "4 to 8 pm", "8 pm to 12"]
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
TOP_CITIES = 7
SHOWN_PRODUCT_STATUSES = (RemakerProduct.Status.LISTED, RemakerProduct.Status.SOLD_OUT, RemakerProduct.Status.INACTIVE)


# --------------------------------------------------------------------------- #
# recording views


def _bump(model, **key):
    """Add one to a day's counter, creating the row the first time (safe if two requests race)."""
    if model.objects.filter(**key).update(views=F("views") + 1):
        return
    try:
        with transaction.atomic():
            model.objects.create(views=1, **key)
    except IntegrityError:
        model.objects.filter(**key).update(views=F("views") + 1)


def record_product_view(product, source):
    source = source if source in SOURCES else ProductViewDay.Source.OTHER
    _bump(ProductViewDay, remaker_product=product, day=timezone.localdate(), source=source)


def record_profile_view(remaker):
    _bump(ProfileViewDay, remaker=remaker, day=timezone.localdate())


# --------------------------------------------------------------------------- #
# helpers


def _start(day):
    return timezone.make_aware(datetime.combine(day, time.min))


def _day(dt):
    return timezone.localtime(dt).date()


def _change(current, previous):
    if not previous:
        return None
    return round((current - previous) / previous * 100, 1)


def _cover(request, product, covers):
    from apps.orders.serializers import media_url

    name = covers.get(product.pk)
    return media_url(request, name) if name else None


def _bucket_points(start, days, today):
    """Chart points: a day each up to 31 days, weeks up to 90, calendar months for a year."""
    points = []
    if days <= 31:
        for i in range(days):
            d = start + timedelta(days=i)
            short = WEEK_DAYS[d.weekday()] if days <= 7 else str(d.day)
            points.append({"label": f"{d.day} {MONTHS[d.month - 1]}", "short": short, "dates": [d]})
    elif days <= 90:
        d = start
        while d <= today:
            chunk = [d + timedelta(days=k) for k in range(7) if d + timedelta(days=k) <= today]
            points.append({"label": f"Week of {d.day} {MONTHS[d.month - 1]}",
                           "short": f"{d.day} {MONTHS[d.month - 1]}", "dates": chunk})
            d += timedelta(days=7)
    else:
        by_month = {}
        for i in range(days):
            d = start + timedelta(days=i)
            key = (d.year, d.month)
            if key not in by_month:
                by_month[key] = {"label": f"{MONTHS[d.month - 1]} {d.year}", "short": MONTHS[d.month - 1], "dates": []}
                points.append(by_month[key])
            by_month[key]["dates"].append(d)
    return points


# --------------------------------------------------------------------------- #
# the report


def report(remaker, range_key="30", request=None):
    spec = RANGES.get(str(range_key), RANGES["30"])
    days = spec["days"]
    today = timezone.localdate()
    cur_start = today - timedelta(days=days - 1)
    prev_start = cur_start - timedelta(days=days)
    in_current = lambda d: cur_start <= d <= today  # noqa: E731
    in_previous = lambda d: prev_start <= d < cur_start  # noqa: E731
    lo, hi = _start(prev_start), _start(today + timedelta(days=1))

    products = list(RemakerProduct.objects.filter(remaker=remaker).select_related("category"))
    by_id = {p.pk: p for p in products}
    by_ref = {p.public_id: p for p in products}

    # ---- orders placed (counted on the day they were placed) ----
    placed = list(
        Order.objects.filter(seller_type=Order.SellerType.REMAKER, seller_remaker=remaker, created_at__gte=lo, created_at__lt=hi)
        .exclude(status=Order.Status.PENDING_PAYMENT)
        .exclude(payment_status=Order.PayStatus.VOID)
        .values("pk", "created_at", "status", "address")
    )
    # ---- delivered orders (earnings count on the day of delivery) ----
    delivered = list(
        Order.objects.filter(seller_type=Order.SellerType.REMAKER, seller_remaker=remaker,
                             status=Order.Status.DELIVERED, delivered_at__gte=lo, delivered_at__lt=hi)
        .values("pk", "delivered_at", "subtotal", "address")
    )
    refunded = set(
        ReturnRequest.objects.filter(order_id__in=[o["pk"] for o in delivered], status=ReturnRequest.Status.REFUNDED)
        .values_list("order_id", flat=True)
    )
    lines = defaultdict(list)  # order pk -> [(product pk, line_total)]
    for line in OrderItem.objects.filter(order_id__in=[o["pk"] for o in delivered], remaker_product__isnull=False):
        lines[line.order_id].append((line.remaker_product_id, line.line_total))
    placed_lines = defaultdict(set)  # order pk -> product pks, for per-product order counts
    for oid, pid in OrderItem.objects.filter(order_id__in=[o["pk"] for o in placed], remaker_product__isnull=False).values_list("order_id", "remaker_product_id"):
        placed_lines[oid].add(pid)

    def blank():
        return {"revenue": 0, "orders": 0, "views": 0, "saves": 0, "visits": 0, "followers": 0, "delivered": 0}

    per_day = defaultdict(blank)
    per_product = {"cur": defaultdict(blank), "prev": defaultdict(blank)}
    total = {"cur": blank(), "prev": blank()}

    def period(d):
        return "cur" if in_current(d) else "prev" if in_previous(d) else None

    for o in placed:
        d = _day(o["created_at"])
        p = period(d)
        if not p:
            continue
        total[p]["orders"] += 1
        if p == "cur":
            per_day[d]["orders"] += 1
        for pid in placed_lines.get(o["pk"], ()):
            per_product[p][pid]["orders"] += 1

    delivered_value = {}  # order pk -> (period, net) for the city split
    for o in delivered:
        if o["pk"] in refunded:
            continue
        d = _day(o["delivered_at"])
        p = period(d)
        if not p:
            continue
        total[p]["revenue"] += o["subtotal"]
        total[p]["delivered"] += 1
        if p == "cur":
            per_day[d]["revenue"] += o["subtotal"]
            delivered_value[o["pk"]] = o
        for pid, amount in lines.get(o["pk"], ()):
            per_product[p][pid]["revenue"] += amount

    # ---- views, saves, profile visits, followers ----
    source_views = defaultdict(int)
    for row in ProductViewDay.objects.filter(remaker_product__remaker=remaker, day__gte=prev_start, day__lte=today).values("remaker_product_id", "day", "source", "views"):
        p = period(row["day"])
        if not p:
            continue
        total[p]["views"] += row["views"]
        per_product[p][row["remaker_product_id"]]["views"] += row["views"]
        if p == "cur":
            per_day[row["day"]]["views"] += row["views"]
            source_views[row["source"]] += row["views"]
    for row in ProfileViewDay.objects.filter(remaker=remaker, day__gte=prev_start, day__lte=today).values("day", "views"):
        p = period(row["day"])
        if p:
            total[p]["visits"] += row["views"]
            if p == "cur":
                per_day[row["day"]]["visits"] += row["views"]
    for ref, created in WishlistEntry.objects.filter(item_kind="remaker", item_ref__in=list(by_ref), created_at__gte=lo, created_at__lt=hi).values_list("item_ref", "created_at"):
        d = _day(created)
        p = period(d)
        if p:
            total[p]["saves"] += 1
            per_product[p][by_ref[ref].pk]["saves"] += 1
            if p == "cur":
                per_day[d]["saves"] += 1
    for created in Follow.objects.filter(target=remaker, created_at__gte=lo, created_at__lt=hi).values_list("created_at", flat=True):
        d = _day(created)
        p = period(d)
        if p:
            total[p]["followers"] += 1
            if p == "cur":
                per_day[d]["followers"] += 1

    def finish(t):
        t["aov"] = round(t["revenue"] / t["delivered"]) if t["delivered"] else 0
        t["conv"] = round(t["orders"] / t["views"] * 100, 2) if t["views"] else 0
        return t

    current, previous = finish(total["cur"]), finish(total["prev"])
    deltas = {k: _change(current[k], previous[k]) for k in ("revenue", "orders", "views", "conv", "aov", "followers")}

    # ---- chart ----
    series = []
    for point in _bucket_points(cur_start, days, today):
        row = blank()
        for d in point["dates"]:
            for k, v in per_day[d].items():
                row[k] += v
        series.append({"label": point["label"], "short": point["short"],
                       **{k: row[k] for k in ("revenue", "orders", "views", "saves", "visits", "followers")}})

    # ---- products ----
    covers = {}
    for img in MediaImage.objects.filter(remaker_product__in=products).order_by("display_order", "pk").values("remaker_product_id", "image"):
        covers.setdefault(img["remaker_product_id"], img["image"])
    rows = []
    for p in products:
        cur, prev = per_product["cur"].get(p.pk), per_product["prev"].get(p.pk)
        has_activity = bool(cur and any(cur.values()))
        shown = p.deleted_at is None and p.status in SHOWN_PRODUCT_STATUSES
        if not (shown or has_activity):
            continue
        cur = cur or blank()
        prev = prev or blank()
        rows.append({
            "id": p.public_id, "title": p.title, "category": p.category.name,
            "image": _cover(request, p, covers), "price": float(p.price), "status": p.status,
            "views": cur["views"], "saves": cur["saves"], "orders": cur["orders"], "revenue": cur["revenue"],
            "conv": round(cur["orders"] / cur["views"] * 100, 2) if cur["views"] else 0,
            "delta": _change(cur["revenue"], prev["revenue"]),
            "removed": p.deleted_at is not None,
        })
    rows.sort(key=lambda r: (-r["revenue"], -r["orders"], -r["views"], r["title"].lower()))

    # ---- categories ----
    cats = defaultdict(int)
    for r in rows:
        if r["revenue"]:
            cats[r["category"]] += r["revenue"]
    cat_total = sum(cats.values()) or 1
    categories = [{"name": n, "revenue": v, "share": round(v / cat_total * 100, 1)} for n, v in sorted(cats.items(), key=lambda kv: -kv[1])]

    # ---- sources ----
    src_total = sum(source_views.values())
    sources = [{"key": k, "label": SOURCES[k], "value": source_views.get(k, 0),
                "percent": round(source_views.get(k, 0) / src_total * 100, 1) if src_total else 0}
               for k in sorted(SOURCES, key=lambda k: -source_views.get(k, 0))]

    # ---- buyer cities ----
    city = defaultdict(lambda: {"orders": 0, "revenue": 0, "state": ""})
    placed_current = [o for o in placed if in_current(_day(o["created_at"]))]
    for o in placed_current:
        a = o["address"] or {}
        name = (a.get("city") or "").strip().title() or "Not given"
        city[name]["orders"] += 1
        city[name]["state"] = city[name]["state"] or (a.get("state") or "").strip().title()
    for o in delivered_value.values():
        a = o["address"] or {}
        city[(a.get("city") or "").strip().title() or "Not given"]["revenue"] += o["subtotal"]
    ranked = sorted(city.items(), key=lambda kv: (-kv[1]["orders"], -kv[1]["revenue"], kv[0]))
    shown, rest = ranked[:TOP_CITIES], ranked[TOP_CITIES:]
    order_total = len(placed_current) or 1
    cities = [{"key": n, "city": n, "state": v["state"], "orders": v["orders"], "revenue": v["revenue"],
               "percent": round(v["orders"] / order_total * 100, 1)} for n, v in shown]
    if rest:
        o_sum = sum(v["orders"] for _, v in rest)
        cities.append({"key": "other", "city": "Other cities", "state": "", "orders": o_sum,
                       "revenue": sum(v["revenue"] for _, v in rest), "percent": round(o_sum / order_total * 100, 1)})

    # ---- when customers order ----
    cells = [[0] * len(TIME_BLOCKS) for _ in WEEK_DAYS]
    for o in placed_current:
        t = timezone.localtime(o["created_at"])
        cells[t.weekday()][t.hour // 4] += 1
    peak = max((v for row in cells for v in row), default=0)
    best = None
    if peak:
        d, b = next((d, b) for d, row in enumerate(cells) for b, v in enumerate(row) if v == peak)
        best = {"day": WEEK_DAYS[d], "block": TIME_BLOCKS[b], "value": peak}

    done = sum(1 for o in placed_current if o["status"] == Order.Status.DELIVERED)
    funnel = [
        {"key": "views", "label": "Product views", "value": current["views"]},
        {"key": "saves", "label": "Saved to wishlist", "value": current["saves"]},
        {"key": "orders", "label": "Orders placed", "value": current["orders"]},
        {"key": "done", "label": "Orders completed", "value": done},
    ]

    return {
        "range": {"key": str(range_key) if str(range_key) in RANGES else "30", "days": days,
                  "label": spec["label"], "long": spec["long"]},
        "current": current, "previous": previous, "deltas": deltas, "series": series,
        "products": rows, "categories": categories, "sources": sources, "cities": cities,
        "heatmap": {"days": WEEK_DAYS, "blocks": TIME_BLOCKS, "cells": cells, "max": max(peak, 1), "best": best},
        "funnel": funnel,
        "hasData": bool(current["orders"] or current["views"] or current["saves"] or current["revenue"]),
    }
