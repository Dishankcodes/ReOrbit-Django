from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin
from apps.core.pagination import StandardPagination
from apps.core.responses import fail, ok
from apps.core.services import audit

from .models import WarehouseItem

LOCATION_MAX = 80


def item_data(w):
    return {
        "id": w.public_id, "title": w.title, "category": w.category, "quantity": w.quantity,
        "condition": w.condition, "weight_kg": float(w.weight_kg), "status": w.status, "location": w.location,
        "given_to": w.given_to, "received_at": w.received_at, "given_at": w.given_at,
        "donation": w.donation.public_id if w.donation_id else None,
    }


class _AdminView(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("warehouse")]


class AdminItems(_AdminView):
    """GET /api/warehouse/admin/  ?status=In_Stock|Given_Out &q="""

    def get(self, request):
        qs = WarehouseItem.objects.select_related("donation")
        st = request.query_params.get("status")
        if st in WarehouseItem.Status.values:
            qs = qs.filter(status=st)
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(public_id__icontains=q))
        pager = StandardPagination()
        page = pager.paginate_queryset(qs, request)
        resp = pager.get_paginated_response([item_data(w) for w in page])
        resp.data["data"]["counts"] = {r["status"]: r["n"] for r in WarehouseItem.objects.order_by().values("status").annotate(n=Count("pk"))}
        return resp


class AdminItemDetail(_AdminView):
    def get(self, request, public_id):
        return ok({"item": item_data(get_object_or_404(WarehouseItem, public_id=public_id))})

    def patch(self, request, public_id):
        w = get_object_or_404(WarehouseItem, public_id=public_id)
        loc = " ".join(str(request.data.get("location") or "").split())
        if not loc or len(loc) > LOCATION_MAX:
            return fail("Enter where it is stored.", errors={"location": ["Enter where it is stored (up to 80 characters)."]})
        before = {"location": w.location}
        w.location = loc
        w.save(update_fields=["location", "updated_at"])
        audit(request.user.account, "warehouse.move", "warehouse_item", w.public_id, before=before, after={"location": loc})
        return ok({"item": item_data(w)}, "Location updated.")
