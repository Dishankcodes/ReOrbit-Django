"""Portfolio output shapes: the owner/admin view and the public view."""

from apps.core.models import SellableBase
from apps.listings.models import MediaImage


def _url(request, image):
    if image is None:
        return None
    url = image.image.url
    return request.build_absolute_uri(url) if request else url


def _photos(entry):
    # uses prefetch_related("images") when the view did it
    by_role = {i.image_type: i for i in entry.images.all()}
    return by_role.get(MediaImage.Kind.BEFORE), by_role.get(MediaImage.Kind.AFTER)


def _linked_product(entry, request, *, public):
    """The linked product, or None. A deleted product is never shown. The public
    sees it only while it is live on the marketplace."""
    product = entry.linked_product
    if product is None or product.deleted_at is not None:
        return None
    if public and product.status != SellableBase.Status.LISTED:
        return None
    images = sorted(product.images.all(), key=lambda i: (i.display_order, i.pk))
    return {
        "id": product.public_id,
        "title": product.title,
        "price": str(product.price),
        "status": product.status,
        "cover": _url(request, images[0]) if images else None,
    }


def _category(entry):
    c = entry.category
    return {"id": c.public_id, "name": c.name, "slug": c.slug} if c else None


def work_data(entry, request):
    """What the ReMaker (and the admin) see."""
    before, after = _photos(entry)
    return {
        "id": entry.public_id,
        "title": entry.title,
        "description": entry.description,
        "category": _category(entry),
        "before": _url(request, before),
        "after": _url(request, after),
        "linked_product": _linked_product(entry, request, public=False),
        "visibility": entry.visibility,
        "materials": entry.materials,
        "technique": entry.technique,
        "year_completed": entry.year_completed,
        "uploaded_at": entry.uploaded_at,
        "updated_at": entry.updated_at,
    }


def public_work_data(entry, request):
    """What buyers see on a ReMaker's profile."""
    before, after = _photos(entry)
    return {
        "id": entry.public_id,
        "title": entry.title,
        "description": entry.description,
        "category": _category(entry),
        "before": _url(request, before),
        "after": _url(request, after),
        "linked_product": _linked_product(entry, request, public=True),
        "materials": entry.materials,
        "technique": entry.technique,
        "year_completed": entry.year_completed,
        "uploaded_at": entry.uploaded_at,
    }
