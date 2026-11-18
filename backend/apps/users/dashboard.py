"""GET /api/users/me/dashboard/?section=<name>   The member's dashboard, one section at a time.

The page asks for "summary" first (the hero and the number tiles), then each lower section only when
the member scrolls near it, so opening the dashboard is a few small queries instead of every store.

Sections: summary | orders | selling | donations | activity | picks
"""

from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework.views import APIView

from apps.accounts.permissions import IsReOrbitUser
from apps.core.responses import fail, ok
from apps.donations.models import Donation
from apps.listings.models import Item
from apps.orders.models import Order
from apps.orders.serializers import media_url
from apps.social.models import WishlistEntry

LIVE_ORDER = (Order.Status.CONFIRMED, Order.Status.PACKED, Order.Status.SHIPPED)
NOT_PLACED = (Order.Status.PENDING_PAYMENT,)


def _months(n=6):
    """The first day of each of the last n months, oldest first."""
    today = timezone.localdate().replace(day=1)
    out = []
    y, m = today.year, today.month
    for _ in range(n):
        out.append(today.replace(year=y, month=m))
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return out[::-1]


def summary(user, request):
    from apps.rewards import services as rewards

    now = timezone.now()
    month_start = timezone.localdate().replace(day=1)
    bought = Order.objects.filter(buyer_user=user).exclude(status__in=NOT_PLACED)
    o = bought.aggregate(
        n=Count("pk"), month=Count("pk", filter=Q(created_at__date__gte=month_start)),
        active=Count("pk", filter=Q(status__in=LIVE_ORDER)),
        spent=Sum("total", filter=Q(status=Order.Status.DELIVERED)),
    )
    o["total"] = o.pop("n")
    d = Donation.objects.filter(donor=user).aggregate(
        n=Count("pk"), done=Count("pk", filter=Q(status=Donation.Status.COMPLETED)),
        open=Count("pk", filter=Q(status__in=(Donation.Status.PENDING, Donation.Status.SCHEDULED,
                                              Donation.Status.FAILED_PICKUP))),
        kg=Sum("weight_kg", filter=Q(status__in=(Donation.Status.RECEIVED, Donation.Status.COMPLETED))),
    )
    d["total"] = d.pop("n")
    li = Item.objects.filter(user=user).aggregate(
        live=Count("pk", filter=Q(item_status=Item.Status.LISTED)),
        sold=Count("pk", filter=Q(item_status=Item.Status.SOLD)),
    )
    to_ship = Order.objects.filter(seller_user=user, status__in=(Order.Status.CONFIRMED, Order.Status.PACKED)).count()
    balance, lifetime = rewards.totals(user)
    i = rewards.level_index(lifetime)
    nxt = rewards.LEVELS[i + 1] if i + 1 < len(rewards.LEVELS) else None
    lo = rewards.LEVELS[i][2]
    progress = 100 if nxt is None else round((lifetime - lo) * 100 / max(1, nxt[2] - lo))
    try:
        from apps.payments.wallet import balances

        wallet = balances({"seller_user": user})
    except Exception:  # noqa: BLE001  the dashboard still opens without the wallet
        wallet = {"available": 0, "pending": 0}
    reused = (o["total"] or 0) + (d["done"] or 0) + (li["sold"] or 0)
    p = getattr(user, "profile", None)
    photo = None
    if p is not None and getattr(p, "profile_image", None):
        try:
            photo = request.build_absolute_uri(p.profile_image.url)
        except ValueError:
            photo = None
    return {
        "name": user.full_name, "first_name": (user.full_name or "there").split()[0],
        "member_since": user.created_at, "photo": photo, "city": (getattr(p, "city", "") or "") if p else "",
        "points": {"balance": balance, "lifetime": lifetime, "level": rewards.LEVELS[i][1],
                   "next": nxt[1] if nxt else None, "to_next": max(0, nxt[2] - lifetime) if nxt else 0,
                   "progress": max(0, min(100, progress))},
        "orders": {"total": o["total"] or 0, "this_month": o["month"] or 0, "active": o["active"] or 0,
                   "spent": o["spent"] or 0},
        "donations": {"total": d["total"] or 0, "completed": d["done"] or 0, "open": d["open"] or 0,
                      "kg": float(d["kg"] or 0)},
        "selling": {"live": li["live"] or 0, "sold": li["sold"] or 0, "to_ship": to_ship,
                    "available": wallet.get("available", 0), "pending": wallet.get("pending", 0)},
        "wishlist": WishlistEntry.objects.filter(user=user).count(),
        "items_reused": reused,
        "generated_at": now,
    }


def _order_row(o, request):
    lines = list(o.lines.all())
    first = lines[0] if lines else None
    return {
        "id": o.public_id, "status": o.status, "status_label": o.get_status_display(), "total": o.total,
        "placed_at": o.created_at, "delivered_at": o.delivered_at,
        "title": first.title if first else "Order", "more": max(0, len(lines) - 1),
        "cover": media_url(request, first.cover) if first and first.cover else None,
    }


def orders(user, request):
    qs = (Order.objects.filter(buyer_user=user).exclude(status__in=NOT_PLACED)
          .prefetch_related("lines").order_by("-created_at"))
    rows = list(qs[:5])
    # delivered orders with a line the member has not reviewed yet
    to_review = (qs.filter(status=Order.Status.DELIVERED, lines__review__isnull=True).distinct().count())
    return {"recent": [_order_row(o, request) for o in rows], "to_review": to_review}


def selling(user, request):
    from apps.listings.marketplace import _cover

    live = list(Item.objects.filter(user=user, item_status=Item.Status.LISTED)
                .prefetch_related("images").order_by("-created_at")[:4])
    sales = list(Order.objects.filter(seller_user=user).exclude(status__in=NOT_PLACED)
                 .prefetch_related("lines").order_by("-created_at")[:4])
    return {
        "listings": [{"id": i.public_id, "title": i.title, "price": int(i.listing_price or 0), "cover": _cover(i, request),
                      "created_at": i.created_at} for i in live],
        "sales": [_order_row(o, request) for o in sales],
    }


def donations(user, request):
    rows = Donation.objects.filter(donor=user).order_by("-created_at")[:4]
    return {"recent": [{
        "id": d.public_id, "title": d.title, "category": d.category, "quantity": d.quantity, "status": d.status,
        "status_label": d.get_status_display(), "pickup_date": d.pickup_date, "pickup_slot": d.pickup_slot,
        "created_at": d.created_at,
    } for d in rows]}


def activity(user, request):
    from apps.rewards.models import PointsEntry

    months = _months(6)
    start = months[0]
    def per_month(qs, field="created_at"):
        got = {}
        for row in qs.filter(**{f"{field}__date__gte": start}).values_list(field, flat=True):
            k = timezone.localtime(row).date().replace(day=1) if hasattr(row, "tzinfo") else row.replace(day=1)
            got[k] = got.get(k, 0) + 1
        return [got.get(m, 0) for m in months]

    bought = per_month(Order.objects.filter(buyer_user=user).exclude(status__in=NOT_PLACED))
    sold = per_month(Order.objects.filter(seller_user=user, status=Order.Status.DELIVERED), "delivered_at")
    given = per_month(Donation.objects.filter(donor=user))
    ledger = PointsEntry.objects.filter(user=user).order_by("-created_at", "-pk")[:6]
    return {
        "months": [m.strftime("%b") for m in months],
        "series": {"bought": bought, "sold": sold, "donated": given},
        "points": [{"id": e.pk, "kind": e.kind, "points": e.points, "title": e.title, "detail": e.detail,
                    "at": e.created_at} for e in ledger],
    }


def picks(user, request):
    """Fresh live products that are not the member's own, nudged towards what they saved."""
    from apps.listings.marketplace import _admin_qs, _remaker_qs, _user_qs, card

    saved_cats = set()
    wished = list(WishlistEntry.objects.filter(user=user).values_list("item_kind", "item_ref")[:30])
    for kind, qs in (("user", _user_qs), ("remaker", _remaker_qs), ("admin", _admin_qs)):
        refs = [r for k, r in wished if k == kind]
        if refs:
            saved_cats |= set(qs().filter(public_id__in=refs).values_list("category_id", flat=True))
    wished_refs = {r for _, r in wished}
    rows = []
    since = timezone.now() - timedelta(days=120)
    for kind, qs in (("user", _user_qs().exclude(user=user).select_related("category", "user")),
                     ("remaker", _remaker_qs().select_related("category", "remaker")),
                     ("admin", _admin_qs().select_related("category", "admin"))):
        base = qs.prefetch_related("images").filter(created_at__gte=since)
        if saved_cats:
            rows += [(kind, o) for o in base.filter(category_id__in=saved_cats).order_by("-created_at")[:6]]
        rows += [(kind, o) for o in base.order_by("-created_at")[:6]]
    seen, out = set(), []
    rows.sort(key=lambda r: (r[1].category_id not in saved_cats, -r[1].created_at.timestamp()))
    for kind, o in rows:
        if o.public_id in seen or o.public_id in wished_refs:
            continue
        seen.add(o.public_id)
        c = card(kind, o, request)
        if c.get("cover") and not c.get("sold_out"):
            out.append(c)
        if len(out) == 6:
            break
    return {"products": out, "personal": bool(saved_cats)}


SECTIONS = {"summary": summary, "orders": orders, "selling": selling, "donations": donations,
            "activity": activity, "picks": picks}


class MemberDashboard(APIView):
    permission_classes = [IsReOrbitUser]

    def get(self, request):
        name = request.query_params.get("section", "summary")
        fn = SECTIONS.get(name)
        if fn is None:
            return fail("Unknown section.", errors={"section": [", ".join(SECTIONS)]})
        return ok({"section": name, **fn(request.user.account, request)})
