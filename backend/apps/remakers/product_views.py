"""ReMaker products (mounted under /api/remakers/products/).

  GET/POST  products/                    my products / save a draft
  GET/PATCH/DELETE  products/<id>/
  POST products/<id>/publish/            go live (also un-pauses)
  POST products/<id>/pause/              take off the marketplace
  POST products/<id>/images/             add photos (multipart "images")
  POST products/<id>/images/order/       {"order": [imageId, ...]}
  DELETE products/<id>/images/<img>/
Admin moderation (module "products")
  GET  products/admin/        GET products/admin/<id>/
  POST products/admin/<id>/deactivate/   {"reason": "..."}   POST .../reactivate/
"""

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitReMaker
from apps.core.models import SellableBase
from apps.core.pagination import StandardPagination
from apps.core.responses import fail, ok
from apps.core.services import audit, notify
from apps.listings import sellables as sb
from apps.listings.product_serializers import RemakerProductSerializer

from .models import RemakerProduct

S = SellableBase.Status


def _extra(data, values, errors, has):
    if "materials" in data:
        m = " ".join(str(data.get("materials") or "").split())
        if len(m) > 500:
            errors["materials"] = ["Materials must be 500 characters or fewer."]
        else:
            values["materials"] = m
    if "dimensions" in data:
        d = " ".join(str(data.get("dimensions") or "").split())
        if len(d) > 150:
            errors["dimensions"] = ["Dimensions must be 150 characters or fewer."]
        else:
            values["dimensions"] = d
    if "customization_available" in data:
        values["customization_available"] = bool(data.get("customization_available"))


class Mine:
    permission_classes = [IsReOrbitReMaker]
    model = RemakerProduct
    serializer = RemakerProductSerializer
    parent_field = "remaker_product"
    audit_name = "product"
    extra_clean = staticmethod(_extra)
    select = ("category", "remaker")

    def owner(self, request):
        return request.user.account

    def owned(self, request):
        return RemakerProduct.objects.filter(remaker=request.user.account, deleted_at__isnull=True)

    def create_kwargs(self, request, values):
        return {"remaker": request.user.account}

    def guard(self, obj):
        # A product ReOrbit switched off stays off until ReOrbit switches it back on.
        if obj.deactivated_by_id is not None and obj.status == S.INACTIVE:
            return fail("ReOrbit turned this product off, so it can't be changed. "
                        "Contact support if you think this is a mistake.", status=403)
        return None


class ListCreateView(Mine, sb.ListCreate): pass
class DetailView(Mine, sb.Detail): pass
class PublishView(Mine, sb.Publish): pass
class PauseView(Mine, sb.Unpublish): pass
class ImagesView(Mine, sb.Images): pass
class ImageDetailView(Mine, sb.ImageDetail): pass
class ImageOrderView(Mine, sb.ImageOrder): pass


# --------------------------------------------------------------------------- #
# Admin moderation
# --------------------------------------------------------------------------- #
def _admin_qs():
    return RemakerProduct.objects.filter(deleted_at__isnull=True).select_related(
        "category", "remaker"
    ).prefetch_related("images")


class AdminListView(APIView):
    permission_classes = [HasAdminModule("products")]

    def get(self, request):
        q = request.query_params
        rows = _admin_qs()
        if q.get("status") in S.values:
            rows = rows.filter(status=q["status"])
        if q.get("category"):
            rows = rows.filter(category__slug=q["category"])
        if q.get("q"):
            t = q["q"].strip()
            rows = rows.filter(Q(title__icontains=t) | Q(public_id__icontains=t)
                               | Q(remaker__full_name__icontains=t))
        pager = StandardPagination()
        page = pager.paginate_queryset(rows, request)
        return pager.get_paginated_response(
            RemakerProductSerializer(page, many=True, context={"request": request}).data)


class AdminDetailView(APIView):
    permission_classes = [HasAdminModule("products")]

    def get(self, request, public_id):
        obj = get_object_or_404(_admin_qs(), public_id=public_id)
        return ok({"product": RemakerProductSerializer(obj, context={"request": request}).data})


class AdminDeactivateView(APIView):
    permission_classes = [HasAdminModule("products", "edit")]

    @transaction.atomic
    def post(self, request, public_id):
        obj = get_object_or_404(_admin_qs(), public_id=public_id)
        reason = " ".join(str(request.data.get("reason") or "").split())
        if len(reason) < 3:
            return fail("Add a short reason. The ReMaker will see it.",
                        errors={"reason": ["A reason is required."]})
        if obj.status == S.DRAFT:
            return fail("A draft isn't on the marketplace, so there is nothing to switch off.", status=409)
        admin, before = request.user.account, obj.status
        obj.status = S.INACTIVE
        obj.deactivated_by, obj.deactivated_at = admin, timezone.now()
        obj.deactivation_reason = reason[:1000]
        obj.save()
        audit(admin, "product.deactivate", "product", obj.public_id,
              before={"status": before}, after={"status": obj.status}, reason=reason,
              ip=request.META.get("REMOTE_ADDR"))
        notify(obj.remaker, "Your product was turned off",
               f"“{obj.title}” is hidden from buyers. Reason: {reason}",
               module="products", ref_type="product", ref_id=obj.public_id)
        obj = _admin_qs().get(pk=obj.pk)
        return ok({"product": RemakerProductSerializer(obj, context={"request": request}).data},
                  "Product switched off.")


class AdminReactivateView(APIView):
    permission_classes = [HasAdminModule("products", "edit")]

    @transaction.atomic
    def post(self, request, public_id):
        obj = get_object_or_404(_admin_qs(), public_id=public_id)
        if obj.deactivated_by_id is None or obj.status != S.INACTIVE:
            return fail("This product wasn't switched off by ReOrbit.", status=409)
        admin = request.user.account
        obj.status = S.LISTED if obj.stock > 0 else S.SOLD_OUT
        obj.deactivated_by = obj.deactivated_at = None
        obj.deactivation_reason = ""
        obj.save()
        audit(admin, "product.reactivate", "product", obj.public_id,
              after={"status": obj.status}, ip=request.META.get("REMOTE_ADDR"))
        notify(obj.remaker, "Your product is back on",
               f"“{obj.title}” is visible to buyers again.",
               module="products", ref_type="product", ref_id=obj.public_id)
        obj = _admin_qs().get(pk=obj.pk)
        return ok({"product": RemakerProductSerializer(obj, context={"request": request}).data},
                  "Product is live again.")
