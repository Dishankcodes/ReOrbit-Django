"""ReMaker portfolio (mounted under /api/portfolio/).

ReMaker (their own works)
  GET   me/                      all my works, newest first
  POST  me/                      add a work (multipart: title, category, description,
                                 before, after, optional linked_product)
  GET / PATCH / DELETE  me/<id>/ one work. PATCH may send new before/after files.
                                 DELETE hides it (soft); the answer holds the work so
                                 the app can offer Undo.
  POST  me/<id>/restore/         undo a delete
Admin (module "remakers", read only)
  GET   admin/<remaker id>/      every work of one ReMaker, including private ones
Public (anyone)
  GET   public/<remaker id>/     public works of an active ReMaker
"""

from datetime import timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitReMaker
from apps.core.images import delete_file, process_image
from apps.core.models import Category
from apps.core.responses import created, fail, ok
from apps.core.services import audit
from apps.core.validators import validate_image
from apps.listings.models import MediaImage
from apps.remakers.models import RemakerProduct, ReMakers

from .models import DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH, PortfolioEntry
from .serializers import public_work_data, work_data

MAX_WORKS = 100  # live works per ReMaker
TITLE_MIN, TITLE_MAX = 3, TITLE_MAX_LENGTH
DESC_MIN, DESC_MAX = 20, DESCRIPTION_MAX_LENGTH
TEXT_MAX = 500
RESTORE_DAYS = 7  # how long a deleted work can be brought back (also the purge age)
PHOTO_MAX_SIDE = 1600
ROLES = (("before", MediaImage.Kind.BEFORE), ("after", MediaImage.Kind.AFTER))
PHOTO_MESSAGE = {
    "before": "Add the photo from before you started.",
    "after": "Add the photo of the finished piece.",
}
IP = lambda request: request.META.get("REMOTE_ADDR")  # noqa: E731


def _qs():
    return (
        PortfolioEntry.objects.filter(deleted_at__isnull=True)
        .select_related("category", "linked_product", "remaker")
        .prefetch_related("images", "linked_product__images")
    )


def _snapshot(entry):
    return {
        "title": entry.title,
        "category": entry.category.public_id if entry.category_id else None,
        "linked_product": entry.linked_product.public_id if entry.linked_product_id else None,
        "visibility": entry.visibility,
    }


def clean(data, remaker, *, existing=None):
    """Validate the text fields. On create everything required must be present; on
    update only the fields that were sent are checked."""
    values, errors = {}, {}
    has = lambda key: existing is None or key in data  # noqa: E731

    if has("title"):
        title = " ".join(str(data.get("title") or "").split())
        if len(title) < TITLE_MIN:
            errors["title"] = [f"Give this work a title of at least {TITLE_MIN} characters."]
        elif len(title) > TITLE_MAX:
            errors["title"] = [f"Title must be {TITLE_MAX} characters or fewer."]
        else:
            values["title"] = title

    if has("description"):
        text = str(data.get("description") or "").strip()
        if len(text) < DESC_MIN:
            errors["description"] = [f"Tell the story in at least {DESC_MIN} characters."]
        elif len(text) > DESC_MAX:
            errors["description"] = [f"The story must be {DESC_MAX} characters or fewer."]
        else:
            values["description"] = text

    if has("category"):
        public_id = str(data.get("category") or "").strip()
        if existing is not None and existing.category_id and existing.category.public_id == public_id:
            values["category"] = existing.category  # unchanged: stays valid even if retired
        else:
            category = Category.objects.filter(
                public_id=public_id,
                status=Category.Status.ACTIVE,
                applies_to__in=(Category.AppliesTo.PRODUCT, Category.AppliesTo.BOTH),
            ).first()
            if category is None:
                errors["category"] = ["Choose the closest category."]
            else:
                values["category"] = category

    if "linked_product" in data:
        public_id = str(data.get("linked_product") or "").strip()
        if not public_id:
            values["linked_product"] = None
        else:
            product = RemakerProduct.objects.filter(
                public_id=public_id, remaker=remaker, deleted_at__isnull=True
            ).first()
            if product is None:
                errors["linked_product"] = ["Choose one of your own products."]
            else:
                values["linked_product"] = product

    if "visibility" in data:
        visibility = str(data.get("visibility") or "").strip()
        if visibility not in PortfolioEntry.Visibility.values:
            errors["visibility"] = ["Choose Public or Private."]
        else:
            values["visibility"] = visibility

    for field in ("materials", "technique"):
        if field in data:
            text = " ".join(str(data.get(field) or "").split())
            if len(text) > TEXT_MAX:
                errors[field] = [f"Keep this under {TEXT_MAX} characters."]
            else:
                values[field] = text

    if "year_completed" in data:
        raw = data.get("year_completed")
        if raw in (None, ""):
            values["year_completed"] = None
        else:
            try:
                year = int(raw)
            except (TypeError, ValueError):
                year = 0
            if not 1900 <= year <= timezone.now().year + 1:
                errors["year_completed"] = ["Enter a valid year."]
            else:
                values["year_completed"] = year
    return values, errors


def _check_photos(request, errors, *, required):
    """Validate the uploaded before/after files. Returns {role: file}."""
    files = {}
    for role, _kind in ROLES:
        f = request.FILES.get(role)
        if f is None:
            if required:
                errors[role] = [PHOTO_MESSAGE[role]]
            continue
        try:
            validate_image(f)
        except DjangoValidationError as e:
            errors[role] = [e.messages[0]]
        else:
            files[role] = f
    return files


class Mine(APIView):
    permission_classes = [IsReOrbitReMaker]

    def mine_qs(self, request):
        return _qs().filter(remaker=request.user.account)

    def mine(self, request, public_id):
        return get_object_or_404(self.mine_qs(request), public_id=public_id)

    def show(self, request, public_id, message="OK", status_code=200):
        entry = self.mine(request, public_id)
        data = {"work": work_data(entry, request)}
        return (created if status_code == 201 else ok)(data, message)


class ListCreateView(Mine):
    def get(self, request):
        rows = self.mine_qs(request)
        return ok({"works": [work_data(e, request) for e in rows]})

    @transaction.atomic
    def post(self, request):
        remaker = request.user.account
        if self.mine_qs(request).count() >= MAX_WORKS:
            return fail(
                f"Your portfolio is full ({MAX_WORKS} works). Delete one to add another.",
                status=409,
            )
        values, errors = clean(request.data, remaker)
        files = _check_photos(request, errors, required=True)
        if errors:
            return fail("Please correct the highlighted fields.", errors=errors)

        entry = PortfolioEntry(remaker=remaker, **values)
        entry.save()
        saved = []
        try:
            for n, (role, kind) in enumerate(ROLES):
                saved.append(
                    MediaImage.objects.create(
                        portfolio=entry,
                        image=process_image(files[role], max_side=PHOTO_MAX_SIDE),
                        image_type=kind,
                        display_order=n,
                    )
                )
            audit(remaker, "portfolio.create", "portfolio", entry.public_id,
                  after=_snapshot(entry), ip=IP(request))
        except Exception:
            # the rollback removes the rows; remove the files that were already written
            for image in saved:
                delete_file(image.image)
            raise
        return self.show(request, entry.public_id, "Work added to your portfolio.", 201)


class DetailView(Mine):
    def get(self, request, public_id):
        return self.show(request, public_id)

    @transaction.atomic
    def patch(self, request, public_id):
        entry = self.mine(request, public_id)
        values, errors = clean(request.data, entry.remaker, existing=entry)
        files = _check_photos(request, errors, required=False)
        if errors:
            return fail("Please correct the highlighted fields.", errors=errors)

        before = _snapshot(entry)
        for key, value in values.items():
            setattr(entry, key, value)
        entry.save()

        written = []  # (storage, name) of files saved during this request
        try:
            for role, kind in ROLES:
                if role not in files:
                    continue
                new_file = process_image(files[role], max_side=PHOTO_MAX_SIDE)
                image = entry.images.filter(image_type=kind).first()
                if image is None:
                    image = MediaImage.objects.create(
                        portfolio=entry, image=new_file, image_type=kind,
                        display_order=0 if role == "before" else 1,
                    )
                    written.append((image.image.storage, image.image.name))
                    continue
                old_name, storage = image.image.name, image.image.storage
                image.image = new_file
                image.save(update_fields=["image"])
                written.append((storage, image.image.name))
                # remove the old file only once the change is really saved
                transaction.on_commit(lambda n=old_name, s=storage: s.delete(n))

            audit(entry.remaker, "portfolio.update", "portfolio", entry.public_id,
                  before=before, after=_snapshot(entry), ip=IP(request))
        except Exception:
            # nothing was saved, so the new files must not be left behind; the old
            # ones stay (their delete was only queued for a successful commit)
            for storage, name in written:
                storage.delete(name)
            raise
        return self.show(request, entry.public_id, "Changes saved.")

    @transaction.atomic
    def delete(self, request, public_id):
        entry = self.mine(request, public_id)
        data = work_data(entry, request)  # taken before it disappears, for Undo
        entry.deleted_at = timezone.now()
        entry.save(update_fields=["deleted_at", "updated_at"])
        audit(entry.remaker, "portfolio.delete", "portfolio", entry.public_id,
              before=_snapshot(entry), ip=IP(request))
        return ok({"work": data}, "Work deleted.")


class RestoreView(Mine):
    @transaction.atomic
    def post(self, request, public_id):
        remaker = request.user.account
        entry = get_object_or_404(
            PortfolioEntry.objects.select_for_update().filter(
                remaker=remaker,
                deleted_at__isnull=False,
                deleted_at__gte=timezone.now() - timedelta(days=RESTORE_DAYS),
            ),
            public_id=public_id,
        )
        if self.mine_qs(request).count() >= MAX_WORKS:
            return fail(f"Your portfolio is full ({MAX_WORKS} works).", status=409)
        entry.deleted_at = None
        entry.save(update_fields=["deleted_at", "updated_at"])
        audit(remaker, "portfolio.restore", "portfolio", entry.public_id, ip=IP(request))
        return self.show(request, entry.public_id, "Work restored.")


class AdminListView(APIView):
    """Read only: admins see every live work of a ReMaker, private ones included."""

    permission_classes = [IsReOrbitAdmin, HasAdminModule("remakers")]

    def get(self, request, remaker_id):
        remaker = get_object_or_404(ReMakers, public_id=remaker_id)
        rows = _qs().filter(remaker=remaker)
        return ok({"works": [work_data(e, request) for e in rows]})


class PublicListView(APIView):
    """Public works of an active ReMaker (the same accounts the public profile shows)."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, remaker_id):
        remaker = get_object_or_404(
            ReMakers.objects.filter(status=ReMakers.Status.ACTIVE), public_id=remaker_id
        )
        rows = _qs().filter(remaker=remaker, visibility=PortfolioEntry.Visibility.PUBLIC)
        return ok({"works": [public_work_data(e, request) for e in rows]})
