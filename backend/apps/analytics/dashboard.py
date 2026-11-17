"""The numbers on a ReMaker's home screen, worked out from their real orders, products, reviews and followers.

  sales       item prices of delivered orders (refunded returns taken off), this month against last month
  orders      orders placed this month against last month
  pipeline    orders by where they are now: new, packed, shipped, delivered
  top         best-selling products by units delivered
  performance score out of 100 = buyer rating (60%) and deliveries that arrived (40%)
  impact      items given a second life (delivered units) and the CO2 that avoids, the same way the admin counts it
"""

from collections import defaultdict
from datetime import datetime, time, timedelta

from django.db.models import Count, Sum
from django.utils import timezone

from apps.orders.models import Order, OrderItem, ReturnRequest
from apps.remakers.models import RemakerProduct
from apps.reviews.models import ProductReview, SellerReview
from apps.social.models import Follow, WishlistEntry

from .models import ProductViewDay

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
CO2_PER_ITEM_KG = 4.2
ACTIVE = (RemakerProduct.Status.LISTED, RemakerProduct.Status.SOLD_OUT)
STATUS_WORD = {
    "Pending_Payment": "Awaiting payment", "Confirmed": "New", "Packed": "Processing", "Shipped": "Shipped",
    "Delivered": "Delivered", "Cancelled": "Cancelled", "Delivery_Failed": "Delivery failed",
    "Returned_To_Origin": "Returned",
}


def _month_start(d, back=0):
    """First day of the month `back` months before d's month."""
    y, m = d.year, d.month - back
    while m < 1:
        m += 12
        y -= 1
    return d.replace(year=y, month=m, day=1)


def _change(cur, prev):
    return round((cur - prev) / prev * 100, 1) if prev else None


def _buyer_name(o):
    who = {"user": o.buyer_user, "remaker": o.buyer_remaker, "admin": o.buyer_admin}.get(o.buyer_type)
    return who.full_name if who else "Customer"


def dashboard(remaker):
    now = timezone.now()
    today = timezone.localdate()
    this_month = _month_start(today)
    last_month = _month_start(today, 1)
    year_start = _month_start(today, 11)
    prev_year_start = _month_start(today, 23)

    def at(d):
        return timezone.make_aware(datetime.combine(d, time.min))

    mine = Order.objects.filter(seller_type=Order.SellerType.REMAKER, seller_remaker=remaker)

    # ---- sales: delivered orders, refunded returns taken off, counted on the day of delivery ----
    refunded_ids = set(ReturnRequest.objects.filter(order__in=mine, status=ReturnRequest.Status.REFUNDED).values_list("order_id", flat=True))
    delivered = [o for o in mine.filter(status=Order.Status.DELIVERED, delivered_at__gte=at(prev_year_start)).values("pk", "delivered_at", "subtotal")
                 if o["pk"] not in refunded_ids]
    per_month = defaultdict(int)
    for o in delivered:
        d = timezone.localtime(o["delivered_at"]).date()
        per_month[(d.year, d.month)] += o["subtotal"]

    def month_total(d):
        return per_month.get((d.year, d.month), 0)

    revenue12 = []
    for back in range(11, -1, -1):
        d = _month_start(today, back)
        revenue12.append({"label": MONTHS[d.month - 1], "value": month_total(d)})
    year_total = sum(p["value"] for p in revenue12)
    prev_year_total = sum(month_total(_month_start(today, back)) for back in range(12, 24))

    # ---- orders placed ----
    placed = mine.exclude(status=Order.Status.PENDING_PAYMENT).exclude(payment_status=Order.PayStatus.VOID)
    orders_now = placed.filter(created_at__gte=at(this_month)).count()
    orders_before = placed.filter(created_at__gte=at(last_month), created_at__lt=at(this_month)).count()

    # ---- products and followers ----
    products_live = RemakerProduct.objects.filter(remaker=remaker, deleted_at__isnull=True, status=RemakerProduct.Status.LISTED).count()
    products_new = RemakerProduct.objects.filter(remaker=remaker, deleted_at__isnull=True, status=RemakerProduct.Status.LISTED,
                                                 created_at__gte=now - timedelta(days=30)).count()
    month_ago = now - timedelta(days=30)
    followers = Follow.objects.filter(target=remaker)

    # ---- pipeline ----
    by_status = {r["status"]: r["n"] for r in mine.order_by().values("status").annotate(n=Count("pk"))}
    pipeline = [
        {"key": "pending", "label": "Pending", "value": by_status.get("Confirmed", 0)},
        {"key": "processing", "label": "Processing", "value": by_status.get("Packed", 0)},
        {"key": "shipped", "label": "Shipped", "value": by_status.get("Shipped", 0)},
        {"key": "delivered", "label": "Delivered", "value": by_status.get("Delivered", 0)},
    ]

    # ---- top products by units delivered ----
    sold = defaultdict(lambda: {"units": 0, "revenue": 0})
    for row in (OrderItem.objects.filter(order__in=mine.filter(status=Order.Status.DELIVERED).exclude(pk__in=refunded_ids),
                                         remaker_product__isnull=False)
                .values("remaker_product_id").annotate(units=Sum("qty"), revenue=Sum("line_total"))):
        sold[row["remaker_product_id"]] = {"units": row["units"] or 0, "revenue": row["revenue"] or 0}
    top = []
    if sold:
        ranked = sorted(sold.items(), key=lambda kv: (-kv[1]["units"], -kv[1]["revenue"]))[:3]
        found = {p.pk: p for p in RemakerProduct.objects.filter(pk__in=[pk for pk, _ in ranked]).select_related("category")}
        for pk, v in ranked:
            p = found.get(pk)
            if p is None:
                continue
            top.append({"id": p.public_id, "name": p.title, "category": p.category.name, "sales": v["units"], "revenue": v["revenue"],
                        "rating": float(getattr(p, "rating_average", 0) or 0)})

    # ---- recent orders ----
    recent = []
    for o in (placed.select_related("buyer_user", "buyer_remaker", "buyer_admin").prefetch_related("lines").order_by("-created_at")[:4]):
        lines = list(o.lines.all())
        title = lines[0].title if lines else "Order"
        if len(lines) > 1:
            title += f" +{len(lines) - 1} more"
        recent.append({"id": o.public_id, "product": title, "customer": _buyer_name(o), "amount": o.subtotal,
                       "status": STATUS_WORD.get(o.status, o.status), "at": o.created_at.isoformat()})

    # ---- recent activity ----
    feed = []
    for o in placed.select_related("buyer_user", "buyer_remaker", "buyer_admin").order_by("-created_at")[:4]:
        feed.append({"kind": "order", "title": "New order received", "text": f"{o.public_id} was placed by {_buyer_name(o)}.", "at": o.created_at})
    for r in ProductReview.objects.filter(order__in=mine, status="Visible").select_related("order_item").order_by("-created_at")[:3]:
        feed.append({"kind": "review", "title": f"New {r.rating}-star review", "text": f"A customer reviewed {r.order_item.title}.", "at": r.created_at})
    for r in SellerReview.objects.filter(seller_remaker=remaker, status="Visible").order_by("-created_at")[:2]:
        feed.append({"kind": "review", "title": f"New {r.rating}-star review", "text": "A customer rated you as a seller.", "at": r.created_at})
    for f in followers.select_related("user", "remaker", "admin").order_by("-created_at")[:3]:
        who = f.user or f.remaker or f.admin
        feed.append({"kind": "follow", "title": "New follower", "text": f"{who.full_name} started following you." if who else "Someone started following you.", "at": f.created_at})
    for r in ReturnRequest.objects.filter(order__in=mine).select_related("order").order_by("-created_at")[:2]:
        feed.append({"kind": "return", "title": "Return requested", "text": f"A buyer asked to return {r.order.public_id}.", "at": r.created_at})
    feed.sort(key=lambda x: x["at"], reverse=True)
    activity = [{**x, "at": x["at"].isoformat()} for x in feed[:4]]

    # ---- studio performance ----
    own_ids = list(RemakerProduct.objects.filter(remaker=remaker).values_list("pk", flat=True))
    refs = list(RemakerProduct.objects.filter(remaker=remaker).values_list("public_id", flat=True))
    views = ProductViewDay.objects.filter(remaker_product_id__in=own_ids, day__gte=today - timedelta(days=29)).aggregate(n=Sum("views"))["n"] or 0
    saves = WishlistEntry.objects.filter(item_kind="remaker", item_ref__in=refs, created_at__gte=month_ago).count()
    recent_delivered = [o for o in delivered if o["delivered_at"] >= month_ago]
    aov = round(sum(o["subtotal"] for o in recent_delivered) / len(recent_delivered)) if recent_delivered else 0
    profile = getattr(remaker, "profile", None)  # the cached rating lives on the profile row
    rating = float(getattr(profile, "rating_average", 0) or 0)
    rating_count = getattr(profile, "rating_count", 0) or 0
    arrived, failed = by_status.get("Delivered", 0), by_status.get("Delivery_Failed", 0) + by_status.get("Returned_To_Origin", 0)
    delivery_rate = arrived / (arrived + failed) * 100 if arrived + failed else None
    score = None
    if rating_count or arrived:
        parts = []
        if rating_count:
            parts.append((0.6, rating / 5 * 100))
        if delivery_rate is not None:
            parts.append((0.4, delivery_rate))
        weight = sum(w for w, _ in parts)
        score = round(sum(w * v for w, v in parts) / weight) if weight else None
    grade = None if score is None else "Excellent" if score >= 85 else "Good" if score >= 70 else "Fair" if score >= 50 else "Needs attention"

    units = sum(v["units"] for v in sold.values())
    return {
        "stats": {
            "sales": {"value": month_total(this_month), "previous": month_total(last_month), "change": _change(month_total(this_month), month_total(last_month))},
            "orders": {"value": orders_now, "previous": orders_before, "change": _change(orders_now, orders_before)},
            "products": {"value": products_live, "new": products_new},
            "followers": {"value": followers.count(), "last30": followers.filter(created_at__gte=month_ago).count()},
        },
        "revenue": {"series": revenue12, "total": year_total, "previous": prev_year_total, "change": _change(year_total, prev_year_total)},
        "pipeline": pipeline,
        "topProducts": top,
        "recentOrders": recent,
        "activity": activity,
        "performance": {"score": score, "grade": grade, "views": views, "saves": saves, "rating": rating,
                        "ratingCount": rating_count, "aov": aov},
        "impact": {"items": units, "co2": round(units * CO2_PER_ITEM_KG)},
    }
