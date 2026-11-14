"""Listings API (mounted at /api/listings/).

Public (no login)
  GET  categories/                 active categories for the sell form and filters
  GET  ""                          marketplace browse (Listed and not Disabled)
  GET  <id>/                       one listing
Seller (User account)
  GET/POST  me/                    my listings / save a new draft
  GET/PATCH/DELETE  me/<id>/       read, edit, delete (draft or withdrawn only)
  POST me/<id>/publish/            go live (also relists a withdrawn listing)
  POST me/<id>/withdraw/           take it off the marketplace
  POST me/<id>/images/             add photos (multipart, field "images")
  DELETE me/<id>/images/<img>/     remove a photo
  POST me/<id>/images/order/       {"order": [imageId, ...]} first one is the cover
Admin (module "products")
  GET  admin/                      every listing, with filters
  GET  admin/<id>/
  POST admin/<id>/moderate/        {"status": Normal|Flagged|Disabled, "note": "..."}
  POST admin/<id>/suggest-price/   {"price": 1200, "note": "..."}  the seller is notified
Seller, continued
  POST me/<id>/price-suggestion/   {"accept": true|false}  take or decline the admin's suggested price
"""

from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitUser
from apps.core.gujarat import canonical_city
from apps.core.images import delete_file, process_image
from apps.core.models import AuditLog, Category, PlatformSettings
from apps.core.pagination import StandardPagination
from apps.core.responses import created, fail, ok
from apps.core.services import audit, notify
from apps.core.validators import validate_gujarat_pincode, validate_image

from .models import Item, MediaImage
from .serializers import AdminItemSerializer, CategorySerializer, ItemSerializer, PublicItemSerializer

MAX_IMAGES = 8
MAX_PRICE = 10_000_000
EDITABLE = (Item.Status.DRAFT, Item.Status.LISTED, Item.Status.WITHDRAWN)
IP = lambda request: request.META.get("REMOTE_ADDR")  # noqa: E731


def _qs():
    return Item.objects.filter(deleted_at__isnull=True).select_related(
        "category", "user"
    ).prefetch_related("images")


def _whole_rupees(value, field, errors, *, required):
    if value in (None, ""):
        if required:
            errors[field] = ["Enter a price."]
        return None
    try:
        amount = Decimal(str(value))
    except InvalidOperation:
        errors[field] = ["Enter a valid price."]
        return None
    if amount != amount.to_integral_value() or amount < 1 or amount > MAX_PRICE:
        errors[field] = [f"Enter a whole-rupee price between 1 and {MAX_PRICE:,}."]
        return None
    return amount


def clean_listing(data, *, existing=None):
    """Check a save. Drafts only need a title and a category; everything else is
    checked when it is filled in, and fully checked again on publish."""
    values, errors = {}, {}
    has = lambda k: existing is None or k in data  # noqa: E731

    if has("title"):
        title = " ".join(str(data.get("title") or "").split())
        if len(title) < 3:
            errors["title"] = ["Give the listing a title (at least 3 characters)."]
        elif len(title) > 150:
            errors["title"] = ["Title must be 150 characters or fewer."]
        else:
            values["title"] = title

    if has("category"):
        cat = Category.objects.filter(
            public_id=data.get("category"),
            status=Category.Status.ACTIVE,
            applies_to__in=(Category.AppliesTo.ITEM, Category.AppliesTo.BOTH),
        ).first()
        if cat is None:
            errors["category"] = ["Choose a category."]
        else:
            values["category"] = cat

    if "description" in data:
        desc = str(data.get("description") or "").strip()
        if desc and len(desc) > 5000:
            errors["description"] = ["Description must be 5000 characters or fewer."]
        else:
            values["description"] = desc

    if "condition" in data:
        c = data.get("condition")
        if c in Item.Condition.values:
            values["condition"] = c
        elif c not in (None, ""):
            errors["condition"] = ["Choose a condition from the list."]

    if "quantity" in data:
        try:
            q = int(data.get("quantity") or 1)
        except (TypeError, ValueError):
            q = 0
        if not 1 <= q <= 999:
            errors["quantity"] = ["Quantity must be between 1 and 999."]
        else:
            values["quantity"] = q

    if "listing_price" in data:
        values["listing_price"] = _whole_rupees(
            data.get("listing_price"), "listing_price", errors, required=False
        )
    if "estimated_price" in data:
        values["estimated_price"] = _whole_rupees(
            data.get("estimated_price"), "estimated_price", errors, required=False
        )

    if "pickup_preference" in data:
        p = data.get("pickup_preference")
        if p in Item.Pickup.values:
            values["pickup_preference"] = p
        elif p not in (None, ""):
            errors["pickup_preference"] = ["Choose how the item will be handed over."]

    if "city" in data:
        raw = str(data.get("city") or "").strip()
        city = canonical_city(raw) if raw else ""
        if raw and not city:
            errors["city"] = ["Choose one of the Gujarat cities from the list."]
        else:
            values["city"] = city
    if "pincode" in data:
        try:
            values["pincode"] = validate_gujarat_pincode(data.get("pincode")) or ""
        except DjangoValidationError as e:
            errors["pincode"] = [e.messages[0]]
    return values, errors


def readiness(item):
    """What is still missing before this listing can go live."""
    errors = {}
    if len((item.description or "").strip()) < 10:
        errors["description"] = ["Describe the item (at least 10 characters)."]
    if not item.condition:
        errors["condition"] = ["Choose a condition."]
    if not item.listing_price or item.listing_price < 1:
        errors["listing_price"] = ["Enter a price."]
    if not item.pickup_preference:
        errors["pickup_preference"] = ["Choose how the item will be handed over."]
    if not item.city:
        errors["city"] = ["Choose your city."]
    if not item.pincode:
        errors["pincode"] = ["Enter your pincode."]
    if not item.images.exists():
        errors["images"] = ["Add at least one photo."]
    if item.category.status != Category.Status.ACTIVE:
        errors["category"] = ["This category is no longer available. Choose another."]
    return errors


def published_today(user):
    start = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
    return AuditLog.objects.filter(
        action="listing.publish",
        actor_public_id=user.public_id,
        created_at__gte=start,
        created_at__lt=start + timedelta(days=1),
    ).count()


def daily_cap():
    return max(1, PlatformSettings.load().max_listings_per_day)


def before_price(snapshot):
    return Decimal(snapshot["listing_price"]) if snapshot["listing_price"] is not None else None


def _snapshot(i):
    return {
        "title": i.title,
        "listing_price": str(i.listing_price) if i.listing_price is not None else None,
        "item_status": i.item_status,
        "moderation_status": i.moderation_status,
    }


def _ctx(request):
    return {"request": request}


# --------------------------------------------------------------------------- #
# Public
# --------------------------------------------------------------------------- #
class CategoryListView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        rows = Category.objects.filter(
            status=Category.Status.ACTIVE,
            applies_to__in=(Category.AppliesTo.ITEM, Category.AppliesTo.BOTH),
        )
        return ok({"categories": CategorySerializer(rows, many=True).data})


class PublicListView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    ORDER = {
        "newest": ("-created_at", "-pk"),
        "price_asc": ("listing_price", "-pk"),
        "price_desc": ("-listing_price", "-pk"),
    }

    def get(self, request):
        q = request.query_params
        rows = _qs().filter(item_status=Item.Status.LISTED).exclude(
            moderation_status=Item.Moderation.DISABLED
        )
        if q.get("q"):
            term = q["q"].strip()
            rows = rows.filter(Q(title__icontains=term) | Q(description__icontains=term))
        if q.get("category"):
            rows = rows.filter(category__slug=q["category"])
        if q.get("condition") in Item.Condition.values:
            rows = rows.filter(condition=q["condition"])
        if q.get("city"):
            rows = rows.filter(city__iexact=q["city"])
        for key, op in (("min_price", "gte"), ("max_price", "lte")):
            try:
                if q.get(key):
                    rows = rows.filter(**{f"listing_price__{op}": Decimal(q[key])})
            except InvalidOperation:
                pass
        rows = rows.order_by(*self.ORDER.get(q.get("ordering"), self.ORDER["newest"]))
        pager = StandardPagination()
        page = pager.paginate_queryset(rows, request)
        return pager.get_paginated_response(
            PublicItemSerializer(page, many=True, context=_ctx(request)).data
        )


class PublicDetailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, public_id):
        item = get_object_or_404(
            _qs().filter(item_status__in=(Item.Status.LISTED, Item.Status.RESERVED, Item.Status.SOLD))
            .exclude(moderation_status=Item.Moderation.DISABLED),
            public_id=public_id,
        )
        return ok({"listing": PublicItemSerializer(item, context=_ctx(request)).data})


# --------------------------------------------------------------------------- #
# Seller
# --------------------------------------------------------------------------- #
class MyBase(APIView):
    permission_classes = [IsReOrbitUser]

    def mine(self, request, public_id):
        return get_object_or_404(_qs(), public_id=public_id, user=request.user.account)

    def show(self, request, item, message="OK", status_code=200):
        item = _qs().get(pk=item.pk)
        data = {
            "listing": ItemSerializer(item, context=_ctx(request)).data,
            "limit": {"cap": daily_cap(), "used": published_today(request.user.account)},
        }
        return (created if status_code == 201 else ok)(data, message)

    @staticmethod
    def locked(item):
        if item.item_status not in EDITABLE:
            return fail(
                f"This listing is {item.item_status.lower()} and can't be changed.",
                status=409,
            )
        return None


class MyListView(MyBase):
    def get(self, request):
        rows = _qs().filter(user=request.user.account)
        status = request.query_params.get("status")
        if status in Item.Status.values:
            rows = rows.filter(item_status=status)
        return ok(
            {
                "listings": ItemSerializer(rows, many=True, context=_ctx(request)).data,
                "limit": {"cap": daily_cap(), "used": published_today(request.user.account)},
            }
        )

    @transaction.atomic
    def post(self, request):
        values, errors = clean_listing(request.data)
        if errors:
            return fail("Please correct the highlighted fields.", errors=errors)
        user = request.user.account
        item = Item(user=user, **values)
        item.quantity = values.get("quantity", 1)
        profile = getattr(user, "profile", None)
        # City and pincode fall back to the seller's profile
        item.city = values.get("city") or getattr(profile, "city", "") or ""
        item.pincode = values.get("pincode") or getattr(profile, "pincode", "") or ""
        item.save()
        audit(user, "listing.create", "item", item.public_id, after=_snapshot(item), ip=IP(request))
        return self.show(request, item, "Draft saved.", 201)


class MyDetailView(MyBase):
    def get(self, request, public_id):
        return self.show(request, self.mine(request, public_id))

    @transaction.atomic
    def patch(self, request, public_id):
        item = self.mine(request, public_id)
        if (blocked := self.locked(item)):
            return blocked
        values, errors = clean_listing(request.data, existing=item)
        if errors:
            return fail("Please correct the highlighted fields.", errors=errors)
        before = _snapshot(item)
        for k, v in values.items():
            setattr(item, k, v)
        if item.suggestion_status == Item.Suggestion.PENDING and "listing_price" in values \
                and values["listing_price"] != before_price(before):
            item.suggestion_status = Item.Suggestion.DECLINED  # the seller chose their own price
        if item.item_status == Item.Status.LISTED:  # a live listing must stay complete
            missing = readiness(item)
            if missing:
                return fail("A live listing needs these details.", errors=missing)
        item.save()
        audit(request.user.account, "listing.update", "item", item.public_id,
              before=before, after=_snapshot(item), ip=IP(request))
        return self.show(request, item, "Listing updated.")

    @transaction.atomic
    def delete(self, request, public_id):
        item = self.mine(request, public_id)
        if item.item_status not in (Item.Status.DRAFT, Item.Status.WITHDRAWN):
            return fail("Withdraw the listing before deleting it.", status=409)
        item.deleted_at = timezone.now()
        item.save(update_fields=["deleted_at", "updated_at"])
        audit(request.user.account, "listing.delete", "item", item.public_id, ip=IP(request))
        return ok(message="Listing deleted.")


class MyPublishView(MyBase):
    @transaction.atomic
    def post(self, request, public_id):
        user = request.user.account
        item = self.mine(request, public_id)
        if item.item_status == Item.Status.LISTED:
            return self.show(request, item, "Already live.")
        if item.item_status not in (Item.Status.DRAFT, Item.Status.WITHDRAWN):
            return fail(f"A {item.item_status.lower()} listing can't be published.", status=409)
        if item.moderation_status == Item.Moderation.DISABLED:
            return fail(
                "ReOrbit turned this listing off, so it can't go live again. "
                "Contact support if you think this is a mistake.",
                status=403,
            )
        missing = readiness(item)
        if missing:
            return fail("Finish the listing before publishing it.", errors=missing)
        cap, used = daily_cap(), published_today(user)
        if used >= cap:
            return fail(
                f"You can publish up to {cap} listings a day. Try again tomorrow.",
                status=429,
                code="DAILY_LIMIT",
            )
        before = _snapshot(item)
        item.item_status = Item.Status.LISTED
        item.save(update_fields=["item_status", "updated_at"])
        audit(user, "listing.publish", "item", item.public_id,
              before=before, after=_snapshot(item), ip=IP(request))
        return self.show(request, item, "Your listing is live.")


class MyWithdrawView(MyBase):
    @transaction.atomic
    def post(self, request, public_id):
        item = self.mine(request, public_id)
        if item.item_status != Item.Status.LISTED:
            return fail("Only a live listing can be withdrawn.", status=409)
        before = _snapshot(item)
        item.item_status = Item.Status.WITHDRAWN
        item.save(update_fields=["item_status", "updated_at"])
        audit(request.user.account, "listing.withdraw", "item", item.public_id,
              before=before, after=_snapshot(item), ip=IP(request))
        return self.show(request, item, "Listing withdrawn.")


def _renumber(item):
    """Keep display_order 0..n-1; the first picture is the cover."""
    for n, img in enumerate(item.images.order_by("display_order", "pk")):
        kind = MediaImage.Kind.COVER if n == 0 else MediaImage.Kind.GALLERY
        if img.display_order != n or img.image_type != kind:
            img.display_order, img.image_type = n, kind
            img.save(update_fields=["display_order", "image_type"])


class MyImagesView(MyBase):
    @transaction.atomic
    def post(self, request, public_id):
        item = self.mine(request, public_id)
        if (blocked := self.locked(item)):
            return blocked
        files = request.FILES.getlist("images") or request.FILES.getlist("image")
        if not files:
            return fail("Choose at least one photo.", errors={"images": ["No file was sent."]})
        have = item.images.count()
        if have + len(files) > MAX_IMAGES:
            return fail(f"A listing can have up to {MAX_IMAGES} photos.",
                        errors={"images": [f"You already have {have}."]})
        for f in files:
            try:
                validate_image(f)
            except DjangoValidationError as e:
                return fail(e.messages[0], errors={"images": [e.messages[0]]})
        for n, f in enumerate(files):
            MediaImage.objects.create(
                item=item,
                image=process_image(f, max_side=1600),
                display_order=have + n,
                uploaded_by_user=request.user.account,
            )
        _renumber(item)
        return self.show(request, item, "Photos added.", 201)


class MyImageDetailView(MyBase):
    @transaction.atomic
    def delete(self, request, public_id, image_id):
        item = self.mine(request, public_id)
        if (blocked := self.locked(item)):
            return blocked
        img = get_object_or_404(MediaImage, pk=image_id, item=item)
        if item.item_status == Item.Status.LISTED and item.images.count() <= 1:
            return fail("A live listing needs at least one photo.", status=409)
        delete_file(img.image)
        img.delete()
        _renumber(item)
        return self.show(request, item, "Photo removed.")


class MyImageOrderView(MyBase):
    @transaction.atomic
    def post(self, request, public_id):
        item = self.mine(request, public_id)
        if (blocked := self.locked(item)):
            return blocked
        order = request.data.get("order")
        ids = set(item.images.values_list("pk", flat=True))
        if not isinstance(order, list) or set(order) != ids or len(order) != len(ids):
            return fail("Send every photo id once, in the order you want.")
        for n, pk in enumerate(order):
            MediaImage.objects.filter(pk=pk, item=item).update(display_order=n)
        _renumber(item)
        return self.show(request, item, "Photos reordered.")


# --------------------------------------------------------------------------- #
# Admin (module: products)
# --------------------------------------------------------------------------- #
class AdminListView(APIView):
    permission_classes = [HasAdminModule("products")]

    def get(self, request):
        q = request.query_params
        rows = Item.objects.select_related("category", "user").prefetch_related("images")
        if q.get("status") in Item.Status.values:
            rows = rows.filter(item_status=q["status"])
        if q.get("moderation") in Item.Moderation.values:
            rows = rows.filter(moderation_status=q["moderation"])
        if q.get("category"):
            rows = rows.filter(category__slug=q["category"])
        if q.get("suggestion") in Item.Suggestion.values:
            rows = rows.filter(suggestion_status=q["suggestion"])
        if q.get("q"):
            t = q["q"].strip()
            rows = rows.filter(
                Q(title__icontains=t) | Q(public_id__icontains=t) | Q(user__full_name__icontains=t)
            )
        pager = StandardPagination()
        page = pager.paginate_queryset(rows, request)
        return pager.get_paginated_response(
            AdminItemSerializer(page, many=True, context=_ctx(request)).data
        )


class AdminDetailView(APIView):
    permission_classes = [HasAdminModule("products")]

    def get(self, request, public_id):
        item = get_object_or_404(
            Item.objects.select_related("category", "user").prefetch_related("images"),
            public_id=public_id,
        )
        return ok({"listing": AdminItemSerializer(item, context=_ctx(request)).data})


class AdminModerateView(APIView):
    permission_classes = [HasAdminModule("products", "edit")]

    @transaction.atomic
    def post(self, request, public_id):
        item = get_object_or_404(Item, public_id=public_id)
        status = request.data.get("status")
        note = " ".join(str(request.data.get("note") or "").split())
        if status not in Item.Moderation.values:
            return fail("Status must be Normal, Flagged or Disabled.",
                        errors={"status": ["Invalid."]})
        if status != Item.Moderation.NORMAL and len(note) < 3:
            return fail("Add a short reason. The seller will see it.",
                        errors={"note": ["A reason is required."]})
        admin = request.user.account
        before = _snapshot(item)
        item.moderation_status = status
        item.moderation_note = "" if status == Item.Moderation.NORMAL else note[:1000]
        item.moderated_by, item.moderated_at = admin, timezone.now()
        item.save()
        audit(admin, "listing.moderate", "item", item.public_id,
              before=before, after=_snapshot(item), reason=note, ip=IP(request))
        if before["moderation_status"] != status:
            texts = {
                Item.Moderation.DISABLED: ("Your listing was turned off",
                                           f"“{item.title}” is hidden from buyers. Reason: {note}"),
                Item.Moderation.FLAGGED: ("Your listing was flagged",
                                          f"“{item.title}” is still live but needs attention. Reason: {note}"),
                Item.Moderation.NORMAL: ("Your listing is back on",
                                         f"“{item.title}” is visible to buyers again."),
            }
            title, body = texts[status]
            notify(item.user, title, body, module="listings", ref_type="item", ref_id=item.public_id)
        item = Item.objects.select_related("category", "user").prefetch_related("images").get(pk=item.pk)
        return ok({"listing": AdminItemSerializer(item, context=_ctx(request)).data}, "Listing updated.")


class AdminSuggestPriceView(APIView):
    permission_classes = [HasAdminModule("products", "edit")]

    @transaction.atomic
    def post(self, request, public_id):
        item = get_object_or_404(Item.objects.select_for_update(), public_id=public_id, deleted_at__isnull=True)
        errors = {}
        price = _whole_rupees(request.data.get("price"), "price", errors, required=True)
        note = " ".join(str(request.data.get("note") or "").split())[:300]
        if errors:
            return fail("Enter a valid price.", errors=errors)
        if item.item_status in (Item.Status.SOLD, Item.Status.DONATED):
            return fail(f"A {item.item_status.lower()} listing can't be re-priced.", status=409)
        if item.listing_price is not None and price == item.listing_price:
            return fail("That is already the listing price.", errors={"price": ["Pick a different price."]})
        admin = request.user.account
        before = _snapshot(item)
        item.suggested_price, item.suggested_note = price, note
        item.suggested_at, item.suggested_by = timezone.now(), admin
        item.suggestion_status = Item.Suggestion.PENDING
        item.save()
        audit(admin, "listing.suggest_price", "item", item.public_id, before=before,
              after={**_snapshot(item), "suggested_price": str(price)}, reason=note, ip=IP(request))
        notify(item.user, "ReOrbit suggested a new price",
               f"For “{item.title}”: ₹{price:,.0f}." + (f" {note}" if note else "") + " Open My Listings to accept or decline.",
               module="listings", ref_type="item", ref_id=item.public_id)
        item = Item.objects.select_related("category", "user").prefetch_related("images").get(pk=item.pk)
        return ok({"listing": AdminItemSerializer(item, context=_ctx(request)).data}, "Price suggestion sent.")


class MyPriceSuggestionView(MyBase):
    """The seller answers an admin's suggested price."""

    @transaction.atomic
    def post(self, request, public_id):
        item = get_object_or_404(
            Item.objects.select_for_update(), public_id=public_id,
            user=request.user.account, deleted_at__isnull=True,
        )
        if item.suggestion_status != Item.Suggestion.PENDING or item.suggested_price is None:
            return fail("There is no price suggestion to answer.", status=409)
        accept = request.data.get("accept")
        if not isinstance(accept, bool):
            return fail("Say whether you accept the suggested price.", errors={"accept": ["Required."]})
        if accept and item.item_status in (Item.Status.SOLD, Item.Status.DONATED):
            return fail(f"A {item.item_status.lower()} listing can't be re-priced.", status=409)
        before = _snapshot(item)
        if accept:
            item.listing_price = item.suggested_price
            item.suggestion_status = Item.Suggestion.ACCEPTED
        else:
            item.suggestion_status = Item.Suggestion.DECLINED
        item.save()
        audit(request.user.account, "listing.price_accepted" if accept else "listing.price_declined",
              "item", item.public_id, before=before, after=_snapshot(item), ip=IP(request))
        return self.show(request, item, "Price updated." if accept else "Suggestion declined.")
