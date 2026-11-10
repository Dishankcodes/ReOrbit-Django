"""Admin: manage the categories members and ReMakers pick from.

  GET    /api/core/admin/categories/              all categories with how much each is used
  POST   /api/core/admin/categories/              {name, description, icon}
  PATCH  /api/core/admin/categories/<id>/         {name?, description?, icon?, active?}
  POST   /api/core/admin/categories/<id>/move/    {dir: -1 | 1}
  DELETE /api/core/admin/categories/<id>/

Rules (the Content screen shows the same ones): a category that is in use cannot be renamed
or deleted (hide it instead); names are unique ignoring capitals; "Other" is always available and
always last.
"""

from django.db import IntegrityError, transaction
from django.db.models import Count, Max, Q
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin

from .models import Category
from .responses import created, fail, ok
from .services import audit

ICONS = ("Armchair", "Home", "CookingPot", "Shirt", "Smartphone", "BookOpen", "Dumbbell", "Lamp", "Gem", "Baby",
         "Bike", "Music", "Camera", "Watch", "Flower2", "Hammer", "Gamepad2", "Backpack", "Package")
LOCKED_SLUG = "other"


def _usage(qs):
    return qs.annotate(
        n_items=Count("items", distinct=True),
        n_donated=Count("items", filter=Q(items__item_status="Donated") | Q(items__listing_price__isnull=True), distinct=True),
        n_products=Count("remakerproduct_set", distinct=True),
        n_store=Count("adminitem_set", distinct=True),
        n_live=(Count("items", filter=Q(items__item_status="Listed"), distinct=True)
                + Count("remakerproduct_set", filter=Q(remakerproduct_set__status="Listed"), distinct=True)
                + Count("adminitem_set", filter=Q(adminitem_set__status="Listed"), distinct=True)),
    )


def row(c):
    items, products, store = getattr(c, "n_items", 0), getattr(c, "n_products", 0), getattr(c, "n_store", 0)
    return {
        "id": c.public_id, "name": c.name, "blurb": c.description, "icon": c.icon or "Package",
        "active": c.status == Category.Status.ACTIVE, "locked": c.slug == LOCKED_SLUG,
        "position": c.sort_order, "createdAt": c.created_at,
        "usage": {"live": getattr(c, "n_live", 0), "donations": getattr(c, "n_donated", 0),
                  "listings": items - getattr(c, "n_donated", 0), "products": products, "stock": store},
        "total": items + products + store, "inUse": (items + products + store) > 0,
    }


def _one(public_id):
    return _usage(Category.objects.filter(public_id=public_id)).get()


def _clean(data, *, partial=False):
    errs, out = {}, {}
    if "name" in data or not partial:
        name = " ".join(str(data.get("name") or "").split())
        if not 2 <= len(name) <= 40:
            errs["name"] = ["Use 2 to 40 characters."]
        else:
            out["name"] = name
    if "description" in data or "blurb" in data:
        blurb = " ".join(str(data.get("description", data.get("blurb")) or "").split())
        if len(blurb) > 90:
            errs["blurb"] = ["Keep the description under 90 characters."]
        else:
            out["description"] = blurb
    if "icon" in data:
        if data["icon"] not in ICONS:
            errs["icon"] = ["Choose one of the icons."]
        else:
            out["icon"] = data["icon"]
    return out, errs


def _unique_slug(name):
    base = slugify(name)[:100] or "category"
    slug, i = base, 2
    while Category.objects.filter(slug=slug).exists():
        slug, i = f"{base}-{i}", i + 1
    return slug


def _tidy_order():
    """Keeps 'Other' last and the rest numbered 1..n with no gaps."""
    rows = list(Category.objects.order_by("sort_order", "pk"))
    rows.sort(key=lambda c: (c.slug == LOCKED_SLUG, c.sort_order, c.pk))
    for i, c in enumerate(rows, start=1):
        if c.sort_order != i:
            Category.objects.filter(pk=c.pk).update(sort_order=i)


class _Admin(APIView):
    permission_classes = [IsReOrbitAdmin, HasAdminModule("content")]


class AdminCategories(_Admin):
    def get(self, request):
        qs = _usage(Category.objects.all()).order_by("sort_order", "pk")
        return ok({"results": [row(c) for c in qs]})

    def post(self, request):
        out, errs = _clean(request.data)
        out.setdefault("icon", "Package")
        if errs:
            return fail("Please fix the highlighted fields.", errors=errs, status=400)
        if Category.objects.filter(name__iexact=out["name"]).exists():
            return fail("That name is already used.", errors={"name": ["That name is already used."]}, status=400)
        try:
            with transaction.atomic():
                top = Category.objects.aggregate(m=Max("sort_order"))["m"] or 0
                c = Category.objects.create(slug=_unique_slug(out["name"]), sort_order=top + 1, created_by=request.user.account, **out)
                _tidy_order()
                audit(request.user.account, "category.create", "category", c.public_id, after={"name": c.name}, ip=request.META.get("REMOTE_ADDR"))
        except IntegrityError:
            return fail("That name is already used.", errors={"name": ["That name is already used."]}, status=400)
        return created({"category": row(_one(c.public_id))}, message="Category added.")


class AdminCategoryDetail(_Admin):
    def patch(self, request, public_id):
        with transaction.atomic():
            c = get_object_or_404(Category.objects.select_for_update(), public_id=public_id)
            locked = c.slug == LOCKED_SLUG
            out, errs = _clean(request.data, partial=True)
            before = {"name": c.name, "status": c.status}
            used = _usage(Category.objects.filter(pk=c.pk)).get()
            in_use = (used.n_items + used.n_products + used.n_store) > 0
            if "name" in out and out["name"] != c.name:
                if locked or in_use:
                    errs["name"] = ["This category is in use, so it can't be renamed. Hide it and add a new one instead."]
                elif Category.objects.filter(name__iexact=out["name"]).exclude(pk=c.pk).exists():
                    errs["name"] = ["That name is already used."]
            if errs:
                return fail("Please fix the highlighted fields.", errors=errs, status=400)
            if "active" in request.data:
                if locked and not request.data["active"]:
                    return fail("“Other” is always available.", status=409, code="LOCKED")
                c.status = Category.Status.ACTIVE if request.data["active"] else Category.Status.INACTIVE
            for k, v in out.items():
                setattr(c, k, v)
            try:
                c.save()
            except IntegrityError:
                return fail("That name is already used.", errors={"name": ["That name is already used."]}, status=400)
            audit(request.user.account, "category.update", "category", c.public_id, before=before,
                  after={"name": c.name, "status": c.status}, ip=request.META.get("REMOTE_ADDR"))
        return ok({"category": row(_one(public_id))}, message="Category updated.")

    def delete(self, request, public_id):
        with transaction.atomic():
            c = get_object_or_404(Category.objects.select_for_update(), public_id=public_id)
            used = _usage(Category.objects.filter(pk=c.pk)).get()
            if c.slug == LOCKED_SLUG:
                return fail("“Other” can't be deleted.", status=409, code="LOCKED")
            if used.n_items + used.n_products + used.n_store:
                return fail("This category is in use. Hide it instead.", status=409, code="IN_USE")
            name = c.name
            c.delete()
            _tidy_order()
            audit(request.user.account, "category.delete", "category", public_id, before={"name": name}, ip=request.META.get("REMOTE_ADDR"))
        return ok({}, message="Category deleted.")


class AdminCategoryMove(_Admin):
    def post(self, request, public_id):
        try:
            step = int(request.data.get("dir"))
        except (TypeError, ValueError):
            step = 0
        if step not in (-1, 1):
            return fail("Choose up or down.", status=400)
        with transaction.atomic():
            _tidy_order()
            rows = list(Category.objects.select_for_update().order_by("sort_order", "pk"))
            i = next((k for k, c in enumerate(rows) if c.public_id == public_id), None)
            if i is None:
                return fail("Category not found.", status=404)
            j = i + step
            if not 0 <= j < len(rows) or rows[i].slug == LOCKED_SLUG or rows[j].slug == LOCKED_SLUG:
                return ok({}, message="Nothing to move.")
            a, b = rows[i], rows[j]
            Category.objects.filter(pk=a.pk).update(sort_order=b.sort_order)
            Category.objects.filter(pk=b.pk).update(sort_order=a.sort_order)
        return ok({"results": [row(c) for c in _usage(Category.objects.all()).order_by("sort_order", "pk")]})
