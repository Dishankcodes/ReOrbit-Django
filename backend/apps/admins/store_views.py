"""ReOrbit's own products (the Admin_Items table), mounted at /api/admins/store/.

Same flow as ReMaker products: draft, photos, publish, pause, stock. Anyone with
the "products" module can read; "edit" level is needed to change anything.
SKU is created automatically (RO-XXXXXX) unless one is sent.
"""

import re
import secrets

from rest_framework.permissions import SAFE_METHODS

from apps.accounts.permissions import HasAdminModule
from apps.core.models import SellableBase
from apps.listings import sellables as sb
from apps.listings.product_serializers import AdminItemSerializer

from .models import AdminItem

SKU_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$")


def _extra(data, values, errors, has):
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


class PublishView(Mine, sb.Publish): pass
class PauseView(Mine, sb.Unpublish): pass
class ImagesView(Mine, sb.Images): pass
class ImageDetailView(Mine, sb.ImageDetail): pass
class ImageOrderView(Mine, sb.ImageOrder): pass
