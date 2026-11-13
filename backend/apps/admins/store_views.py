"""ReOrbit's own products (the Admin_Items table), mounted at /api/admins/store/.

Same flow as ReMaker products: draft, photos, publish, pause, stock. Anyone with
the "products" module can read; "edit" level is needed to change anything.
SKU is created automatically (RO-XXXXXX) unless one is sent.
"""

import re
import secrets
from decimal import Decimal, InvalidOperation

from django.db.models import Count
from rest_framework.permissions import SAFE_METHODS
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule
from apps.core.models import SellableBase
from apps.core.responses import ok
from apps.orders.models import OrderItem
from apps.social.models import WishlistEntry
from apps.listings import sellables as sb
from apps.listings.product_serializers import AdminItemSerializer

from .models import AdminItem

SKU_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$")


CONDITIONS = ("Like new", "Good", "Fair", "Refurbished", "Brand new")
SOURCES = ("warehouse", "refurbished", "other")
DELIVERY = ("free", "flat")
SPEC_KEYS = ("material", "dimensions", "weight", "warranty")


def _storefront(data, values, errors):
    """Condition, original price, source, delivery, returns and specs."""
    if "mrp" in data:
        raw = data.get("mrp")
        if raw in (None, "", 0, "0"):
            values["mrp"] = None
        else:
            try:
                mrp = Decimal(str(raw))
            except InvalidOperation:
                mrp = Decimal("-1")
            if mrp != mrp.to_integral_value() or not 1 <= mrp <= 10_000_000:
                errors["mrp"] = ["Enter the original price in whole rupees."]
            else:
                values["mrp"] = mrp
    if "condition" in data:
        c = str(data.get("condition") or "").strip()
        if c and c not in CONDITIONS:
            errors["condition"] = ["Choose the condition."]
        else:
            values["condition"] = c
    if "source" in data:
        s = str(data.get("source") or "other").strip()
        if s not in SOURCES:
            errors["source"] = ["Choose where this product comes from."]
        else:
            values["source"] = s
    if "inventory_id" in data:
        values["inventory_id"] = str(data.get("inventory_id") or "").strip()[:40]
    if "delivery" in data:
        d = str(data.get("delivery") or "flat").strip()
        if d not in DELIVERY:
            errors["delivery"] = ["Choose free or flat-rate delivery."]
        else:
            values["delivery"] = d
    if "returnable" in data:
        values["returnable"] = bool(data.get("returnable"))
    if "specs" in data:
        raw = data.get("specs")
        if not isinstance(raw, dict):
            errors["specs"] = ["Specs must be a set of name and value pairs."]
        else:
            specs = {k: " ".join(str(raw.get(k) or "").split())[:100] for k in SPEC_KEYS}
            w = specs["weight"]
            try:
                if w and float(w) <= 0:
                    raise ValueError
            except ValueError:
                errors["specs"] = ["Weight must be a number in kg."]
            values["specs"] = specs


def _extra(data, values, errors, has):
    _storefront(data, values, errors)
    if "sku" in data and str(data.get("sku") or "").strip():
        sku = str(data["sku"]).strip().upper()
        if not SKU_RE.match(sku):
            errors["sku"] = ["SKU can use letters, numbers, dots, dashes and underscores (3 to 80)."]
        else:
            values["sku"] = sku


def new_sku():
    while True:
        sku = f"RO-{secrets.token_hex(3).upper()}"
        if not AdminItem.objects.filter(sku=sku).exists():
            return sku


class Mine:
    model = AdminItem
    serializer = AdminItemSerializer
    parent_field = "admin_item"
    audit_name = "store_item"
    extra_clean = staticmethod(_extra)
    select = ("category", "admin")

    def get_permissions(self):
        level = "view" if self.request.method in SAFE_METHODS else "edit"
        return [HasAdminModule("products", level)()]

    def owner(self, request):
        return request.user.account

    def owned(self, request):
        # ReOrbit's catalogue is shared by every admin with the module, not per person.
        return AdminItem.objects.all()

    def create_kwargs(self, request, values):
        return {"admin": request.user.account, "sku": values.pop("sku", None) or new_sku()}

    def mine(self, request, public_id):
        return super().mine(request, public_id)


class ListCreateView(Mine, sb.ListCreate):
    def post(self, request):
        sku = str(request.data.get("sku") or "").strip().upper()
        if sku and AdminItem.objects.filter(sku=sku).exists():
            from apps.core.responses import fail
            return fail("Please correct the highlighted fields.",
                        errors={"sku": ["This SKU is already used by another product."]})
        return super().post(request)


class DetailView(Mine, sb.Detail):
    def patch(self, request, public_id):
        sku = str(request.data.get("sku") or "").strip().upper()
        if sku and AdminItem.objects.filter(sku=sku).exclude(public_id=public_id).exists():
            from apps.core.responses import fail
            return fail("Please correct the highlighted fields.",
                        errors={"sku": ["This SKU is already used by another product."]})
        return super().patch(request, public_id)


class StatsView(APIView):
    """What each store product has sold, for the Sell products screens.

    {"stats": {"ADI-1": {"sold", "revenue", "orders", "to_handle", "wishlisted"}}}
    sold counts units in orders that are still going ahead; revenue is delivered orders only;
    to_handle is orders waiting for the admin to pack or ship.
    """

    def get_permissions(self):
        return [HasAdminModule("products", "view")()]

    def get(self, request):
        stats = {}

        def row(ref):
            return stats.setdefault(ref, {"sold": 0, "revenue": 0, "orders": 0, "to_handle": 0, "wishlisted": 0})

        seen = set()
        lines = OrderItem.objects.filter(kind="admin_item", order__confirmed_at__isnull=False).values_list(
            "ref_id", "order_id", "qty", "line_total", "order__status")
        for ref, order_id, qty, total, status in lines:
            r = row(ref)
            if (ref, order_id) not in seen:
                seen.add((ref, order_id))
                r["orders"] += 1
                if status in ("Confirmed", "Packed"):
                    r["to_handle"] += 1
            if status not in ("Cancelled", "Returned_To_Origin"):
                r["sold"] += qty
            if status == "Delivered":
                r["revenue"] += total
        saved = WishlistEntry.objects.filter(item_kind="admin").values("item_ref").annotate(n=Count("id"))
        for s in saved:
            row(s["item_ref"])["wishlisted"] = s["n"]
        return ok({"stats": stats})


class PublishView(Mine, sb.Publish): pass
class PauseView(Mine, sb.Unpublish): pass
class ImagesView(Mine, sb.Images): pass
class ImageDetailView(Mine, sb.ImageDetail): pass
class ImageOrderView(Mine, sb.ImageOrder): pass
