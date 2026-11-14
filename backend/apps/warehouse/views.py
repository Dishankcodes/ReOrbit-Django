"""Warehouse stock (mounted under /api/warehouse/). Admin module "warehouse":
view level to read, edit level to change anything.

  GET   admin/                              every lot that is, or has been, in the warehouse
  POST  admin/                              check in stock bought from a User or ReMaker
  GET   admin/<id>/                         one lot with its timeline
  PATCH admin/<id>/                         stock management: price, quantity, condition, move
  POST  admin/<id>/actions/<action>/        putAway, list, discount, promote, refurbish,
                                            donate, snooze, receiveBack, dispatch
  POST  admin/actions/                      the same action on several lots: {ids, action, ...}
"""

from django.shortcuts import get_object_or_404
from rest_framework.permissions import SAFE_METHODS
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin
from apps.core.responses import created, fail, ok

from . import serializers as sz
from . import services
from .services import WarehouseError

MAX_BULK = 100
IP = lambda request: request.META.get("REMOTE_ADDR")  # noqa: E731


def _error(e):
    return fail(e.message, errors=e.errors, status=e.status, code=e.code)


class AdminBase(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("warehouse")]

    def one(self, request, public_id):
        qs = sz.queryset().filter(public_id=public_id)
        return sz.items_data(list(qs), request)[0] if qs else None

    def show(self, request, public_id, message="OK", make=ok):
        return make({"item": self.one(request, public_id)}, message)


class ListCreateView(AdminBase):
    def get(self, request):
        qs = sz.queryset()
        stage = request.query_params.get("status")
        if stage:
            qs = qs.filter(warehouse_status=stage)
        return ok({"items": sz.items_data(qs[:2000], request)})

    def post(self, request):
        try:
            item = services.check_in(request.user.account, request.data, IP(request))
        except WarehouseError as e:
            return _error(e)
        return self.show(request, item.public_id, "Stock checked in.", created)


class DetailView(AdminBase):
    def get(self, request, public_id):
        data = self.one(request, public_id)
        if data is None:
            return fail("Item not found.", status=404, code="NOT_FOUND")
        return ok({"item": data})

    def patch(self, request, public_id):
        try:
            services.update_stock(public_id, request.user.account, request.data, IP(request))
        except WarehouseError as e:
            return _error(e)
        return self.show(request, public_id, "Changes saved.")


class ActionView(AdminBase):
    def post(self, request, public_id, key):
        try:
            services.run_action(public_id, key, request.user.account, request.data, IP(request))
        except WarehouseError as e:
            return _error(e)
        return self.show(request, public_id, "Done.")


class BulkActionView(AdminBase):
    def post(self, request):
        ids = request.data.get("ids")
        key = str(request.data.get("action") or "")
        if not isinstance(ids, list) or not ids or not all(isinstance(i, str) for i in ids):
            return fail("Choose at least one item.", errors={"ids": ["Choose at least one item."]})
        if len(set(ids)) > MAX_BULK:
            return fail(f"Choose at most {MAX_BULK} items at a time.", errors={"ids": ["Too many items."]})
        if key not in services.ACTIONS:
            return fail("Unknown action.", code="BAD_ACTION")
        done, failed = services.run_bulk(ids, key, request.user.account, request.data, IP(request))
        rows = sz.items_data(sz.queryset().filter(public_id__in=done), request) if done else []
        return ok({"done": done, "failed": failed, "items": rows},
                  "Done." if not failed else f"{len(done)} done, {len(failed)} could not be changed.")
