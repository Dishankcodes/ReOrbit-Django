"""Data for the before-login pages (mounted at /api/public/). No login, cached.

  GET home/       {stats, categories, products, remakers}  (cached 5 minutes)
  GET remakers/   active ReMakers, paged. ?q=  ?category=<name>
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
        for row in qs.order_by().values("category__name", "category__slug").annotate(n=Count("pk")):
            key = (row["category__name"], row["category__slug"])
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
        "categories": [{"name": n, "slug": s, "live": c}
                       for (n, s), c in sorted(counts.items(), key=lambda kv: -kv[1])[:6]],
        "products": _latest_cards(request, 3),
        "remakers": [_remaker_row(r, request, r.n) for r in top],
    }


class HomeView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @method_decorator(cache_control(max_age=60, public=True))
    def get(self, request):
        key = f"public_home:{request.get_host()}"
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
