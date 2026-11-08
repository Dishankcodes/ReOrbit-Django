"""Shared logic for products sold by a ReMaker or by ReOrbit itself.

Both behave the same way: draft -> photos -> publish, with a stock count that
moves a product between LISTED and SOLD_OUT on its own. The ReMaker and admin
views subclass SellableBase below and only say who owns the rows.
"""

from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView

from apps.core.images import delete_file, process_image
from apps.core.models import Category, SellableBase as Base
from apps.core.pagination import StandardPagination
from apps.core.responses import created, fail, ok
from apps.core.services import audit
from apps.core.validators import validate_image

from .models import MediaImage

S = Base.Status
MAX_IMAGES = 8
MAX_PRICE = 10_000_000
MAX_STOCK = 99_999
EDITABLE = (S.DRAFT, S.LISTED, S.SOLD_OUT, S.INACTIVE)
IP = lambda request: request.META.get("REMOTE_ADDR")  # noqa: E731


def settle_status(obj):
    """Keep status and stock in step. Draft and Inactive are never changed here."""
    if obj.status == S.LISTED and obj.stock == 0:
        obj.status = S.SOLD_OUT
    elif obj.status == S.SOLD_OUT and obj.stock > 0:
        obj.status = S.LISTED


def clean_product(data, *, existing=None, extra=None):
    """Validate a save. Drafts need a title and category; the rest is checked when
    filled in, and fully checked on publish. `extra(data, values, errors, has)` adds
    the fields only one kind of product has."""
    values, errors = {}, {}
    has = lambda k: existing is None or k in data  # noqa: E731

    if has("title"):
        title = " ".join(str(data.get("title") or "").split())
        if len(title) < 3:
            errors["title"] = ["Give the product a title (at least 3 characters)."]
        elif len(title) > 150:
            errors["title"] = ["Title must be 150 characters or fewer."]
        else:
            values["title"] = title

    if has("category"):
        cat = Category.objects.filter(
            public_id=data.get("category"),
            status=Category.Status.ACTIVE,
            applies_to__in=(Category.AppliesTo.PRODUCT, Category.AppliesTo.BOTH),
        ).first()
        if cat is None:
            errors["category"] = ["Choose a category."]
        else:
            values["category"] = cat

    if "description" in data:
        desc = str(data.get("description") or "").strip()
        if len(desc) > 5000:
            errors["description"] = ["Description must be 5000 characters or fewer."]
        else:
            values["description"] = desc

    if "price" in data:
        raw = data.get("price")
        try:
            amount = Decimal(str(raw)) if raw not in (None, "") else None
        except InvalidOperation:
            amount = Decimal("-1")
        if amount is not None and (
            amount != amount.to_integral_value() or not 1 <= amount <= MAX_PRICE
        ):
            errors["price"] = [f"Enter a whole-rupee price between 1 and {MAX_PRICE:,}."]
        elif amount is not None:
            values["price"] = amount

    if "stock" in data:
        try:
            stock = int(data.get("stock"))
        except (TypeError, ValueError):
            stock = -1
        if not 0 <= stock <= MAX_STOCK:
            errors["stock"] = [f"Stock must be a number from 0 to {MAX_STOCK:,}."]
        else:
            values["stock"] = stock

    if extra:
        extra(data, values, errors, has)
    return values, errors


def readiness(obj):
    errors = {}
    if len((obj.description or "").strip()) < 10:
        errors["description"] = ["Describe the product (at least 10 characters)."]
    if not obj.price or obj.price < 1:
        errors["price"] = ["Enter a price."]
    if obj.stock < 1:
        errors["stock"] = ["Add at least 1 in stock before publishing."]
    if not obj.images.exists():
        errors["images"] = ["Add at least one photo."]
    if obj.category.status != Category.Status.ACTIVE:
        errors["category"] = ["This category is no longer available. Choose another."]
    return errors


def renumber(parent_field, parent):
    """Keep display_order 0..n-1; the first picture is the cover."""
    for n, img in enumerate(MediaImage.objects.filter(**{parent_field: parent})):
        kind = MediaImage.Kind.COVER if n == 0 else MediaImage.Kind.GALLERY
        if img.display_order != n or img.image_type != kind:
            img.display_order, img.image_type = n, kind
            img.save(update_fields=["display_order", "image_type"])


class SellableViews(APIView):
    """Base for the owner's own endpoints. Subclasses set the class attributes."""

    model = None  # RemakerProduct / AdminItem
    serializer = None
    parent_field = ""  # "remaker_product" / "admin_item" on MediaImage
    audit_name = ""  # "product" / "store_item"
    extra_clean = None
    select = ("category",)

    # -- hooks ------------------------------------------------------------
    def owner(self, request):
        raise NotImplementedError

    def owned(self, request):
        raise NotImplementedError

    def create_kwargs(self, request, values):
        raise NotImplementedError

    # -- helpers ----------------------------------------------------------
    def base_qs(self, request):
        return self.owned(request).select_related(*self.select).prefetch_related("images")

    def mine(self, request, public_id):
        return get_object_or_404(self.base_qs(request), public_id=public_id)

    def show(self, request, obj, message="OK", status_code=200):
        obj = self.base_qs(request).get(pk=obj.pk)
        data = {"product": self.serializer(obj, context={"request": request}).data}
        return (created if status_code == 201 else ok)(data, message)

    def snapshot(self, o):
        return {"title": o.title, "price": str(o.price) if o.price is not None else None,
                "stock": o.stock, "status": o.status}

    def guard(self, obj):
        """Subclasses refuse edits on rows an admin switched off."""
        return None


class ListCreate(SellableViews):
    def get(self, request):
        q = request.query_params
        rows = self.base_qs(request)
        if q.get("status") in S.values:
            rows = rows.filter(status=q["status"])
        if q.get("q"):
            rows = rows.filter(title__icontains=q["q"].strip())
        pager = StandardPagination()
        page = pager.paginate_queryset(rows, request)
        return pager.get_paginated_response(
            self.serializer(page, many=True, context={"request": request}).data
        )

    @transaction.atomic
    def post(self, request):
        values, errors = clean_product(request.data, extra=self.extra_clean)
        if errors:
            return fail("Please correct the highlighted fields.", errors=errors)
        values.setdefault("price", Decimal("0"))
        obj = self.model(**self.create_kwargs(request, values), **values)
        obj.save()
        audit(self.owner(request), f"{self.audit_name}.create", self.audit_name, obj.public_id,
              after=self.snapshot(obj), ip=IP(request))
        return self.show(request, obj, "Draft saved.", 201)


class Detail(SellableViews):
    def get(self, request, public_id):
        return self.show(request, self.mine(request, public_id))

    @transaction.atomic
    def patch(self, request, public_id):
        obj = self.mine(request, public_id)
        if (blocked := self.guard(obj)):
            return blocked
        values, errors = clean_product(request.data, existing=obj, extra=self.extra_clean)
        if errors:
            return fail("Please correct the highlighted fields.", errors=errors)
        before = self.snapshot(obj)
        for k, v in values.items():
            setattr(obj, k, v)
        if obj.status in (S.LISTED, S.SOLD_OUT):  # a live product must stay complete
            missing = {k: v for k, v in readiness(obj).items() if k != "stock"}
            if missing:
                return fail("A live product needs these details.", errors=missing)
        settle_status(obj)
        obj.save()
        audit(self.owner(request), f"{self.audit_name}.update", self.audit_name, obj.public_id,
              before=before, after=self.snapshot(obj), ip=IP(request))
        return self.show(request, obj, "Product updated.")

    @transaction.atomic
    def delete(self, request, public_id):
        obj = self.mine(request, public_id)
        if (blocked := self.guard(obj)):
            return blocked
        if obj.status in (S.LISTED, S.SOLD_OUT):
            return fail("Set the product to inactive before deleting it.", status=409)
        if hasattr(obj, "deleted_at"):
            obj.deleted_at = timezone.now()
            obj.save(update_fields=["deleted_at", "updated_at"])
        else:
            obj.delete()
        audit(self.owner(request), f"{self.audit_name}.delete", self.audit_name, public_id,
              ip=IP(request))
        return ok(message="Product deleted.")


class Publish(SellableViews):
    @transaction.atomic
    def post(self, request, public_id):
        obj = self.mine(request, public_id)
        if (blocked := self.guard(obj)):
            return blocked
        if obj.status in (S.LISTED, S.SOLD_OUT):
            return self.show(request, obj, "Already live.")
        missing = readiness(obj)
        if missing:
            return fail("Finish the product before publishing it.", errors=missing)
        before = self.snapshot(obj)
        obj.status = S.LISTED
        obj.save(update_fields=["status", "updated_at"])
        audit(self.owner(request), f"{self.audit_name}.publish", self.audit_name, obj.public_id,
              before=before, after=self.snapshot(obj), ip=IP(request))
        return self.show(request, obj, "Your product is live.")


class Unpublish(SellableViews):
    """The owner pauses a product (Inactive). It can be published again later."""

    @transaction.atomic
    def post(self, request, public_id):
        obj = self.mine(request, public_id)
        if (blocked := self.guard(obj)):
            return blocked
        if obj.status not in (S.LISTED, S.SOLD_OUT):
            return fail("Only a live product can be paused.", status=409)
        before = self.snapshot(obj)
        obj.status = S.INACTIVE
        obj.save(update_fields=["status", "updated_at"])
        audit(self.owner(request), f"{self.audit_name}.pause", self.audit_name, obj.public_id,
              before=before, after=self.snapshot(obj), ip=IP(request))
        return self.show(request, obj, "Product paused.")


class Images(SellableViews):
    @transaction.atomic
    def post(self, request, public_id):
        obj = self.mine(request, public_id)
        if (blocked := self.guard(obj)):
            return blocked
        files = request.FILES.getlist("images") or request.FILES.getlist("image")
        if not files:
            return fail("Choose at least one photo.", errors={"images": ["No file was sent."]})
        have = obj.images.count()
        if have + len(files) > MAX_IMAGES:
            return fail(f"A product can have up to {MAX_IMAGES} photos.",
                        errors={"images": [f"You already have {have}."]})
        for f in files:
            try:
                validate_image(f)
            except DjangoValidationError as e:
                return fail(e.messages[0], errors={"images": [e.messages[0]]})
        for n, f in enumerate(files):
            MediaImage.objects.create(
                **{self.parent_field: obj}, image=process_image(f, max_side=1600),
                display_order=have + n,
            )
        renumber(self.parent_field, obj)
        return self.show(request, obj, "Photos added.", 201)


class ImageDetail(SellableViews):
    @transaction.atomic
    def delete(self, request, public_id, image_id):
        obj = self.mine(request, public_id)
        if (blocked := self.guard(obj)):
            return blocked
        img = get_object_or_404(MediaImage, pk=image_id, **{self.parent_field: obj})
        if obj.status in (S.LISTED, S.SOLD_OUT) and obj.images.count() <= 1:
            return fail("A live product needs at least one photo.", status=409)
        delete_file(img.image)
        img.delete()
        renumber(self.parent_field, obj)
        return self.show(request, obj, "Photo removed.")


class ImageOrder(SellableViews):
    @transaction.atomic
    def post(self, request, public_id):
        obj = self.mine(request, public_id)
        if (blocked := self.guard(obj)):
            return blocked
        order = request.data.get("order")
        ids = set(obj.images.values_list("pk", flat=True))
        if not isinstance(order, list) or set(order) != ids or len(order) != len(ids):
            return fail("Send every photo id once, in the order you want.")
        for n, pk in enumerate(order):
            MediaImage.objects.filter(pk=pk, **{self.parent_field: obj}).update(display_order=n)
        renumber(self.parent_field, obj)
        return self.show(request, obj, "Photos reordered.")
