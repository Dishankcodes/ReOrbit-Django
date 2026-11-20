"""The before-login "Discover ReMakers" page: which ReMakers it features (Admin > Content > Discover).

GET /api/public/discover-remakers/   {spotlight, cards, hero_images}   (no login, cached)
GET /api/content/admin/discover/     what is picked now, plus the defaults it falls back to
PUT /api/content/admin/discover/     {spotlight: RMK-..|null, images: [RPR-..] (max 3), cards: [RMK-..] (max 9)}

Stored as HomePick rows (surface rmk_spot / rmk_imgs / rmk_cards), so nothing new is needed in the
database. Anything the team leaves empty is filled automatically: the highest-rated active ReMakers
(most reviews first on a tie, then the longest on ReOrbit), and for the spotlight pictures the
studio cover and that ReMaker's newest creations. A ReMaker who is no longer active drops out by itself.
"""

from django.db import transaction
from django.db.models import Count, Q

from apps.remakers.models import ReMakers, RemakerProduct

from .models import HomePick
from .spotlight import bump_cache

SPOT, IMGS, CARDS = "rmk_spot", "rmk_imgs", "rmk_cards"
MAX_CARDS, MAX_IMGS = 9, 3
LIVE = ("Listed", "Sold_Out")


class DiscoverError(Exception):
    pass


def _active():
    live = Q(products__status__in=LIVE, products__deleted_at__isnull=True)
    return ReMakers.objects.filter(status="Active").select_related("profile").annotate(n=Count("products", filter=live))


def _ranked():
    """Default order: best rated, then most reviewed, then the longest on ReOrbit."""
    return _active().order_by("-profile__rating_average", "-profile__rating_count", "created_at", "pk")


def _url(request, f):
    if not f:
        return None
    try:
        return request.build_absolute_uri(f.url)
    except ValueError:
        return None


def _cover(product, request):
    from apps.listings.marketplace import _cover as cover  # the marketplace's own first-picture rule

    return cover(product, request)


def _newest_products(maker_ids):
    """{remaker pk: [products newest first]} for these ReMakers (live ones only)."""
    out = {}
    qs = (RemakerProduct.objects.filter(remaker_id__in=maker_ids, status__in=LIVE, deleted_at__isnull=True)
          .select_related("category").prefetch_related("images").order_by("-created_at"))
    for p in qs:
        out.setdefault(p.remaker_id, []).append(p)
    return out


def _card(r, request, products):
    p = getattr(r, "profile", None)
    newest = [c for c in (_cover(x, request) for x in products[:4]) if c]
    return {
        "id": r.public_id, "name": (p.studio_name if p and p.studio_name else "") or r.full_name,
        "maker": r.full_name, "username": r.username,
        "specialty": (p.speciality if p else "") or "ReMaker",
        "city": (p.city if p else "") or "",
        "bio": " ".join(((p.bio if p else "") or "").split())[:220],
        "avatar": _url(request, p.profile_image) if p else None,
        "cover": (_url(request, p.cover_image) if p and p.cover_image else None) or (newest[0] if newest else None),
        "rating": float(p.rating_average) if p else 0.0,
        "reviews": p.rating_count if p else 0,
        "creations": getattr(r, "n", 0),
        "category": products[0].category.name if products and products[0].category_id else "",
        "joined": r.created_at.year,
        "works": newest,
    }


def _refs(surface):
    return list(HomePick.objects.filter(surface=surface).order_by("position").values_list("ref", flat=True))


def build(request):
    """What the public page shows."""
    picked_spot = _refs(SPOT)[:1]
    picked_cards = _refs(CARDS)
    active = {r.public_id: r for r in _active().filter(public_id__in=picked_spot + picked_cards)}
    ranked = list(_ranked()[: MAX_CARDS + 2])

    spot = active.get(picked_spot[0]) if picked_spot else None
    if spot is None and ranked:
        spot = ranked[0]
    cards = [active[x] for x in picked_cards if x in active]
    have = {r.pk for r in cards}
    for r in ranked:  # fill the empty places with the defaults (the spotlight may be a card too)
        if len(cards) >= MAX_CARDS:
            break
        if r.pk not in have:
            cards.append(r)
            have.add(r.pk)
    cards = cards[:MAX_CARDS]

    makers = {r.pk for r in cards} | ({spot.pk} if spot else set())
    products = _newest_products(makers)

    spotlight = None
    if spot is not None:
        spotlight = _card(spot, request, products.get(spot.pk, []))
        images = []
        picked_imgs = _refs(IMGS)
        if picked_imgs:
            rows = {x.public_id: x for x in RemakerProduct.objects.filter(
                public_id__in=picked_imgs, remaker=spot, status__in=LIVE, deleted_at__isnull=True)
                .prefetch_related("images")}
            images = [c for c in (_cover(rows[x], request) for x in picked_imgs if x in rows) if c]
        p = getattr(spot, "profile", None)
        auto = ([_url(request, p.cover_image)] if p and p.cover_image else []) + spotlight["works"]
        for img in auto:
            if len(images) >= MAX_IMGS:
                break
            if img and img not in images:
                images.append(img)
        spotlight["images"] = images[:MAX_IMGS]
        spotlight["picked"] = bool(picked_spot)

    card_rows = [_card(r, request, products.get(r.pk, [])) for r in cards]
    hero = [c["cover"] for c in card_rows if c["cover"]][:2]
    return {
        "spotlight": spotlight, "cards": card_rows, "hero_images": hero,
        "stats": {"remakers": ReMakers.objects.filter(status="Active").count(),
                  "creations": RemakerProduct.objects.filter(status__in=LIVE, deleted_at__isnull=True).count()},
    }


def cache_key(host):
    from .spotlight import home_version

    return f"public_discover_rmk:{home_version()}:{host}"


def admin_state(request):
    """What the team picked, and what fills the rest automatically."""
    spot_ids, img_ids, card_ids = _refs(SPOT)[:1], _refs(IMGS), _refs(CARDS)
    found = {r.public_id: r for r in _active().filter(public_id__in=spot_ids + card_ids)}
    products = _newest_products([r.pk for r in found.values()])

    def row(r):
        c = _card(r, request, products.get(r.pk, []))
        return {k: c[k] for k in ("id", "name", "maker", "city", "specialty", "avatar", "cover", "rating", "reviews",
                                  "creations")}

    spot = found.get(spot_ids[0]) if spot_ids else None
    imgs = []
    if spot is not None:
        rows = {x.public_id: x for x in RemakerProduct.objects.filter(public_id__in=img_ids, remaker=spot)
                .prefetch_related("images")}
        imgs = [{"id": x, "title": rows[x].title, "cover": _cover(rows[x], request)} for x in img_ids if x in rows]
    choices = []
    if spot is not None:
        choices = [{"id": x.public_id, "title": x.title, "cover": _cover(x, request)}
                   for x in products.get(spot.pk, [])[:24]]
    live = build(request)
    return {
        "spotlight": row(spot) if spot else None,
        "images": imgs, "image_choices": choices,
        "cards": [row(found[x]) for x in card_ids if x in found],
        "max_cards": MAX_CARDS, "max_images": MAX_IMGS,
        "showing": {"spotlight": live["spotlight"]["id"] if live["spotlight"] else None,
                    "spotlight_name": (live["spotlight"].get("name") or live["spotlight"].get("studio")) if live["spotlight"] else None,
                    "cards": [c["id"] for c in live["cards"]]},
    }


def search(request, q, limit=20):
    t = (q or "").strip()
    qs = _ranked()
    if t:
        qs = qs.filter(Q(full_name__icontains=t) | Q(username__icontains=t) | Q(public_id__iexact=t)
                       | Q(profile__studio_name__icontains=t) | Q(profile__city__icontains=t))
    rows = list(qs[:limit])
    products = _newest_products([r.pk for r in rows])
    out = []
    for r in rows:
        c = _card(r, request, products.get(r.pk, []))
        out.append({k: c[k] for k in ("id", "name", "maker", "city", "specialty", "avatar", "cover", "rating",
                                      "reviews", "creations")})
    return out


@transaction.atomic
def save(spotlight, images, cards, admin):
    spotlight = str(spotlight or "").strip().upper() or None
    images = [str(x).strip().upper() for x in (images or []) if str(x).strip()]
    cards = [str(x).strip().upper() for x in (cards or []) if str(x).strip()]
    if len(cards) > MAX_CARDS:
        raise DiscoverError(f"Feature up to {MAX_CARDS} ReMakers.")
    if len(set(cards)) != len(cards):
        raise DiscoverError("Each ReMaker can only be featured once.")
    if len(images) > MAX_IMGS or len(set(images)) != len(images):
        raise DiscoverError(f"Pick up to {MAX_IMGS} different pictures.")
    wanted = set(cards) | ({spotlight} if spotlight else set())
    ok_ids = set(ReMakers.objects.filter(status="Active", public_id__in=wanted).values_list("public_id", flat=True))
    missing = sorted(wanted - ok_ids)
    if missing:
        raise DiscoverError(f"{', '.join(missing)} is not an active ReMaker.")
    if images:
        if not spotlight:
            raise DiscoverError("Choose the spotlight ReMaker before picking its pictures.")
        mine = set(RemakerProduct.objects.filter(public_id__in=images, remaker__public_id=spotlight)
                   .values_list("public_id", flat=True))
        if mine != set(images):
            raise DiscoverError("The pictures must be creations of the spotlight ReMaker.")
    HomePick.objects.filter(surface__in=(SPOT, IMGS, CARDS)).delete()
    rows = ([HomePick(surface=SPOT, position=1, kind="remaker", ref=spotlight, picked_by=admin)] if spotlight else [])
    rows += [HomePick(surface=IMGS, position=i, kind="remaker", ref=x, picked_by=admin)
             for i, x in enumerate(images, 1)]
    rows += [HomePick(surface=CARDS, position=i, kind="remaker", ref=x, picked_by=admin)
             for i, x in enumerate(cards, 1)]
    HomePick.objects.bulk_create(rows)
    bump_cache()
