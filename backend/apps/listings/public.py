"""Data for the before-login pages (mounted at /api/public/). No login, cached.

  GET home/       {stats, categories, products, remakers}  (cached 5 minutes)
  GET remakers/   active ReMakers, paged. ?q=  ?category=<name>
  GET top-selling/  the 9 best-selling live products (units sold, never cancelled orders); filled with the newest
                    products when fewer than 9 have sold (cached 5 minutes)
"""

from django.core.cache import cache
from django.db.models import Count, Q, Sum
from django.views.decorators.cache import cache_control
from django.utils.decorators import method_decorator
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.core.models import Category
from apps.core.pagination import StandardPagination
from apps.core.responses import ok
from apps.orders.models import Order, OrderItem
from apps.remakers.models import ReMakers, RemakerProduct
from apps.users.models import Users

from .marketplace import _admin_qs, _remaker_qs, _user_qs, card

TTL = 300


def _avatar(profile, request):
    if profile and profile.profile_image:
        return request.build_absolute_uri(profile.profile_image.url)
    return None


def _remaker_row(r, request, creations, category=""):
    p = getattr(r, "profile", None)
    return {
        "id": r.public_id, "name": r.full_name, "username": r.username,
        "specialty": (p.speciality if p else "") or "",
        "bio": " ".join(((p.bio if p else "") or "").split())[:200],
        "city": (p.city if p else "") or "",
        "image": _avatar(p, request),
        "creations": creations,
        "category": category,
    }


def _live_counts():
    """{category name: live product count} across the three sellers (3 grouped queries)."""
    out = {}
    for qs in (_user_qs(), _remaker_qs(), _admin_qs()):
        for row in qs.order_by().values("category__name", "category__slug", "category__icon").annotate(n=Count("pk")):
            key = (row["category__name"], row["category__slug"], row["category__icon"] or "Package")
            out[key] = out.get(key, 0) + row["n"]
    return out


def _latest_cards(request, n):
    rows = []
    for kind, qs in (("user", _user_qs().select_related("category", "user")),
                     ("remaker", _remaker_qs().select_related("category", "remaker")),
                     ("admin", _admin_qs().select_related("category", "admin"))):
        rows += [(kind, o) for o in qs.prefetch_related("images").order_by("-created_at")[:n]]
    rows.sort(key=lambda r: r[1].created_at, reverse=True)
    return [card(k, o, request) for k, o in rows[:n]]


def _hero_cards(request):
    """Three cards for the Home hero: the products the team picked first, then the newest ones."""
    from apps.content import spotlight

    picked = spotlight.picks_for("user", request)
    for c in picked:
        c["boosted"] = True
    ids = {c["id"] for c in picked}
    rest = [c for c in _latest_cards(request, 3 + len(picked)) if c["id"] not in ids]
    return (picked + rest)[:3]


def _hero_row(c, boosted=False):
    return {"id": c["id"], "kind": c["kind"], "title": c["title"], "category": c["category"]["name"],
            "price": c["price"], "cover": c["cover"], "boosted": boosted, "sold_out": c["sold_out"]}


def _remaker_hero(request):
    """Three pictures for the ReMaker Home hero: what the team picked first, then the newest ReMaker creations,
    then anything newest. Fewer than three only when the store has fewer products (the page then keeps its own)."""
    from apps.content import spotlight

    out = [_hero_row(c, True) for c in spotlight.picks_for("remaker", request) if c["cover"]]
    have = {r["id"] for r in out}
    latest = [c for c in _latest_cards(request, 12) if c["cover"] and c["id"] not in have]
    latest.sort(key=lambda c: c["kind"] != "remaker")  # stable: ReMaker creations first, newest first within
    out += [_hero_row(c) for c in latest]
    return out[:3]


def _featured(request, n=6):
    """Newest live products for the ReMaker Home "featured" strip."""
    return [{"id": c["id"], "kind": c["kind"], "title": c["title"], "category": c["category"]["name"],
             "price": c["price"], "cover": c["cover"], "city": c.get("city", ""), "sold_out": c["sold_out"],
             "seller": c["seller"]["name"]} for c in _latest_cards(request, n) if c["cover"]]


def _top_selling(request, n=9):
    """Best sellers by units on orders that were not cancelled or failed. Sold-out products stay (they sold out
    because they sold well); a product that is no longer for sale is skipped."""
    bad = (Order.Status.CANCELLED, Order.Status.DELIVERY_FAILED, Order.Status.RETURNED_TO_ORIGIN, Order.Status.PENDING_PAYMENT)
    grouped = (OrderItem.objects.exclude(order__status__in=bad).order_by().values("kind", "ref_id")
               .annotate(units=Sum("qty")).order_by("-units")[: n * 4])
    wanted = {"item": [], "remaker_product": [], "admin_item": []}
    units = {}
    for g in grouped:
        wanted[g["kind"]].append(g["ref_id"])
        units[g["ref_id"]] = g["units"]
    found = {}
    for kind, qs, key in (("user", _user_qs().select_related("category", "user"), "item"),
                          ("remaker", _remaker_qs().select_related("category", "remaker"), "remaker_product"),
                          ("admin", _admin_qs().select_related("category", "admin"), "admin_item")):
        if wanted[key]:
            for o in qs.filter(public_id__in=wanted[key]).prefetch_related("images"):
                found[o.public_id] = card(kind, o, request)
    cards = []
    for ref, u in sorted(units.items(), key=lambda kv: -kv[1]):
        if ref in found and found[ref]["cover"]:
            cards.append({**found[ref], "units_sold": u})
        if len(cards) == n:
            break
    if len(cards) < n:  # not enough sales yet: fill with the newest so the section is never half empty
        have = {c["id"] for c in cards}
        for c in _latest_cards(request, n + len(cards)):
            if c["id"] not in have and c["cover"]:
                cards.append({**c, "units_sold": 0})
            if len(cards) == n:
                break
    return cards


def _build_home(request):
    counts = _live_counts()
    live_total = sum(counts.values())
    delivered = Order.objects.filter(status=Order.Status.DELIVERED)
    rescued = OrderItem.objects.filter(order__in=delivered).aggregate(n=Sum("qty"))["n"] or 0
    kg = ReMakers.objects.filter(status="Active").aggregate(s=Sum("profile__environmental_impact"))["s"] or 0
    top = ReMakers.objects.filter(status="Active").select_related("profile") \
        .annotate(n=Count("products", filter=Q(products__status__in=("Listed", "Sold_Out"), products__deleted_at__isnull=True))) \
        .order_by("-n", "-created_at")[:3]
    return {
        "stats": {
            "members": Users.objects.filter(status="Active").count(),
            "remakers": ReMakers.objects.filter(status="Active").count(),
            "live_products": live_total,
            "items_rescued": rescued,
            "co2_tonnes": round(float(kg) / 1000, 1),
        },
        "categories": [{"name": n, "slug": s, "icon": i, "live": c}
                       for (n, s, i), c in sorted(counts.items(), key=lambda kv: -kv[1])[:6]],
        "products": _hero_cards(request),
        "remaker_hero": _remaker_hero(request),
        "featured": _featured(request),
        "remakers": [_remaker_row(r, request, r.n) for r in top],
    }


class HomeView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @method_decorator(cache_control(max_age=60, public=True))
    def get(self, request):
        from apps.content import spotlight

        key = spotlight.home_cache_key(request.get_host())
        data = cache.get(key)
        if data is None:
            data = _build_home(request)
            cache.set(key, data, TTL)
        return ok(data)


class RemakersView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @method_decorator(cache_control(max_age=60, public=True))
    def get(self, request):
        q = request.query_params
        live = Q(products__status__in=("Listed", "Sold_Out"), products__deleted_at__isnull=True)
        rows = ReMakers.objects.filter(status="Active").select_related("profile").annotate(n=Count("products", filter=live))
        t = (q.get("q") or "").strip()
        if t:
            rows = rows.filter(Q(full_name__icontains=t) | Q(username__icontains=t)
                               | Q(profile__speciality__icontains=t) | Q(profile__city__icontains=t))
        if q.get("category"):
            rows = rows.filter(products__category__name=q["category"], products__status__in=("Listed", "Sold_Out"),
                               products__deleted_at__isnull=True).distinct()
        rows = rows.order_by("-n", "-created_at", "-pk")
        pager = StandardPagination()
        page = pager.paginate_queryset(rows, request)
        # each ReMaker's main category: one grouped query for just this page
        main = {}
        ids = [r.pk for r in page]
        if ids:
            for row in (RemakerProduct.objects.filter(remaker_id__in=ids, status__in=("Listed", "Sold_Out"), deleted_at__isnull=True)
                        .order_by().values("remaker_id", "category__name").annotate(c=Count("pk")).order_by("-c")):
                main.setdefault(row["remaker_id"], row["category__name"])
        return pager.get_paginated_response(
            [_remaker_row(r, request, r.n, main.get(r.pk, "")) for r in page])


class TopSellingView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @method_decorator(cache_control(max_age=60, public=True))
    def get(self, request):
        key = "public_top_selling:" + request.get_host()
        data = cache.get(key)
        if data is None:
            data = {"products": _top_selling(request)}
            cache.set(key, data, TTL)
        return ok(data)
