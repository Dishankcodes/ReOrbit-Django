"""Real views and saves (wishlist) for any product on ReOrbit, in bulk.

Views: member listings (LST-) and ReOrbit store items (ADI-) keep a view_count on the row; ReMaker
creations (RPR-) keep daily counters (analytics.ProductViewDay). A view is counted once per browser
session by the product page (POST /api/analytics/view/); the owner looking at their own item is not.
Saves: how many wishlists hold it right now.
"""

from django.db.models import Count, Sum


def saves_for(refs):
    from apps.social.models import WishlistEntry

    refs = [r for r in refs if r]
    if not refs:
        return {}
    return dict(WishlistEntry.objects.filter(item_ref__in=refs).values("item_ref")
                .annotate(n=Count("pk")).values_list("item_ref", "n"))


def views_for(refs):
    """{public_id: views} for a mix of LST-/RPR-/ADI- ids."""
    from apps.admins.models import AdminItem
    from apps.analytics.models import ProductViewDay
    from apps.listings.models import Item

    refs = [r for r in refs if r]
    out = {}
    lst = [r for r in refs if r.startswith("LST-")]
    adi = [r for r in refs if r.startswith("ADI-")]
    rpr = [r for r in refs if r.startswith("RPR-")]
    if lst:
        out.update(Item.objects.filter(public_id__in=lst).values_list("public_id", "view_count"))
    if adi:
        out.update(AdminItem.objects.filter(public_id__in=adi).values_list("public_id", "view_count"))
    if rpr:
        out.update(ProductViewDay.objects.filter(remaker_product__public_id__in=rpr)
                   .values("remaker_product__public_id").annotate(n=Sum("views"))
                   .values_list("remaker_product__public_id", "n"))
    return out


def for_refs(refs, known_views=None):
    """{public_id: {"views": n, "saves": n}}. known_views: counts the caller already has (no query for those)."""
    refs = list(refs)
    known = dict(known_views or {})
    v = {**views_for([r for r in refs if r not in known]), **known}
    s = saves_for(refs)
    return {r: {"views": int(v.get(r) or 0), "saves": int(s.get(r) or 0)} for r in refs}


def attach(rows, key="id", known_views=None):
    """Add views / saves (and likes, the same number, for older screens) to a list of dicts in place."""
    eng = for_refs([r.get(key) for r in rows], known_views)
    for r in rows:
        e = eng.get(r.get(key), {"views": 0, "saves": 0})
        r["views"], r["saves"], r["likes"] = e["views"], e["saves"], e["saves"]
    return rows
