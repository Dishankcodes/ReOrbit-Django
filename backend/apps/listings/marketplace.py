"""The public marketplace: user listings, ReMaker products and ReOrbit's own
products in one place (mounted at /api/marketplace/).

  GET categories/    active categories (cached for 5 minutes)
  GET ""             browse. ?sold_by=user|remaker|admin  ?q  ?category=<slug>
                     ?min_price ?max_price ?condition (user listings only)
                     ?ordering=newest|price_asc|price_desc  ?page ?page_size
  GET <public_id>/   one entry (LST-.., RPR-.., ADI-..)

Speed: the page is chosen from a light UNION of (kind, id, sort columns), then
each kind is fetched once for just that page, with its photos. That is at most
about seven queries however large the catalogue grows.
"""

from decimal import Decimal, InvalidOperation

from django.db.models import CharField, F, Q, Value
from django.shortcuts import get_object_or_404
from django.views.decorators.cache import cache_control
from django.utils.decorators import method_decorator
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.admins.models import AdminItem
from apps.core.models import Category, SellableBase
from apps.core.pagination import StandardPagination
from apps.core.responses import ok
from apps.remakers.models import RemakerProduct

from .models import Item
from .serializers import CategorySerializer, _images, ImageSerializer

KINDS = ("user", "remaker", "admin")
LIVE = (SellableBase.Status.LISTED, SellableBase.Status.SOLD_OUT)  # sold out stays visible, marked


def _user_qs():
    return Item.objects.filter(item_status=Item.Status.LISTED, deleted_at__isnull=True).exclude(
        moderation_status=Item.Moderation.DISABLED)


def _remaker_qs():
    return RemakerProduct.objects.filter(status__in=LIVE, deleted_at__isnull=True,
                                         remaker__status="Active")


def _admin_qs():
    return AdminItem.objects.filter(status__in=LIVE)


def _filters(qs, q, *, price_field, condition_ok):
    if q.get("q"):
        t = q["q"].strip()
        qs = qs.filter(Q(title__icontains=t) | Q(description__icontains=t))
    if q.get("category"):
        qs = qs.filter(category__slug=q["category"])
    for key, op in (("min_price", "gte"), ("max_price", "lte")):
        if q.get(key):
            try:
                qs = qs.filter(**{f"{price_field}__{op}": Decimal(q[key])})
            except InvalidOperation:
                pass
    if q.get("condition"):
        qs = qs.filter(condition=q["condition"]) if condition_ok else qs.none()
    return qs


def _light(qs, kind, price_field):
    return (
        qs.order_by()
        .annotate(kind=Value(kind, output_field=CharField()), sort_id=F("pk"), sort_price=F(price_field))
        .values_list("kind", "sort_id", "created_at", "sort_price")
    )


ORDER = {"newest": ("-created_at", "-sort_id"), "price_asc": ("sort_price", "-sort_id"),
         "price_desc": ("-sort_price", "-sort_id")}


def _cover(obj, request):
    imgs = _images(obj)
    return ImageSerializer(imgs[0], context={"request": request}).data["url"] if imgs else None


def card(kind, o, request):
    base = {
        "id": o.public_id, "kind": kind, "title": o.title,
        "summary": " ".join((o.description or "").split())[:140],
        "category": {"name": o.category.name, "slug": o.category.slug},
        "cover": _cover(o, request), "created_at": o.created_at,
    }
    if kind == "user":
        return {**base, "price": o.listing_price, "stock": o.quantity, "sold_out": False,
                "condition": o.condition, "city": o.city,
                "seller": {"type": "user", "id": o.user.public_id, "name": o.user.full_name}}
    sold_out = o.status == SellableBase.Status.SOLD_OUT
    if kind == "remaker":
        return {**base, "price": o.price, "stock": o.stock, "sold_out": sold_out,
                "customization_available": o.customization_available,
                "seller": {"type": "remaker", "id": o.remaker.public_id,
                           "name": o.remaker.full_name, "username": o.remaker.username}}
    return {**base, "price": o.price, "stock": o.stock, "sold_out": sold_out,
            "seller": {"type": "admin", "id": o.admin.public_id, "name": "ReOrbit"}}


def detail(kind, o, request):
    imgs = ImageSerializer(_images(o), many=True, context={"request": request}).data
    data = {**card(kind, o, request), "description": o.description, "images": imgs}
    if kind == "remaker":
        data.update(materials=o.materials, dimensions=o.dimensions)
    return data


@method_decorator(cache_control(public=True, max_age=300), name="get")
class CategoriesView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        rows = Category.objects.filter(status=Category.Status.ACTIVE)
        use = {"item": Category.AppliesTo.ITEM, "product": Category.AppliesTo.PRODUCT}.get(
            request.query_params.get("for"))
        if use:  # ?for=item|product: only categories that can hold that kind of thing
            rows = rows.filter(applies_to__in=(use, Category.AppliesTo.BOTH))
        return ok({"categories": CategorySerializer(rows, many=True).data})


class BrowseView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        q = request.query_params
        want = [q["sold_by"]] if q.get("sold_by") in KINDS else list(KINDS)
        if q.get("condition"):
            want = [k for k in want if k == "user"]  # only user listings have a condition
        parts = []
        if "user" in want:
            parts.append(_light(_filters(_user_qs(), q, price_field="listing_price", condition_ok=True),
                                "user", "listing_price"))
        if "remaker" in want:
            parts.append(_light(_filters(_remaker_qs(), q, price_field="price", condition_ok=False),
                                "remaker", "price"))
        if "admin" in want:
            parts.append(_light(_filters(_admin_qs(), q, price_field="price", condition_ok=False),
                                "admin", "price"))
        if not parts:
            parts = [_light(Item.objects.none(), "user", "listing_price")]
        rows = parts[0].union(*parts[1:], all=True) if len(parts) > 1 else parts[0]
        rows = rows.order_by(*ORDER.get(q.get("ordering"), ORDER["newest"]))
        pager = StandardPagination()
        page = pager.paginate_queryset(rows, request)

        ids = {k: [pk for kind, pk, *_ in page if kind == k] for k in KINDS}
        found = {}
        if ids["user"]:
            found["user"] = {
                o.pk: o for o in Item.objects.filter(pk__in=ids["user"])
                .select_related("category", "user").prefetch_related("images")}
        if ids["remaker"]:
            found["remaker"] = {o.pk: o for o in RemakerProduct.objects.filter(pk__in=ids["remaker"])
                                .select_related("category", "remaker").prefetch_related("images")}
        if ids["admin"]:
            found["admin"] = {o.pk: o for o in AdminItem.objects.filter(pk__in=ids["admin"])
                              .select_related("category", "admin").prefetch_related("images")}
        out = [card(kind, found[kind][pk], request) for kind, pk, *_ in page
               if pk in found.get(kind, {})]
        return pager.get_paginated_response(out)


PREFIX = {"LST": "user", "RPR": "remaker", "ADI": "admin"}


class DetailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, public_id):
        kind = PREFIX.get(public_id[:3])
        if kind == "user":
            o = get_object_or_404(
                _user_qs().select_related("category", "user").prefetch_related("images"),
                public_id=public_id)
        elif kind == "remaker":
            o = get_object_or_404(
                _remaker_qs().select_related("category", "remaker").prefetch_related("images"),
                public_id=public_id)
        elif kind == "admin":
            o = get_object_or_404(
                _admin_qs().select_related("category", "admin").prefetch_related("images"),
                public_id=public_id)
        else:
            from django.http import Http404
            raise Http404
        return ok({"product": detail(kind, o, request)})
