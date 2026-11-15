"""The three pictures in the Home hero, chosen by the team (Admin > Content > Banners > Home spotlight).

Member Home and ReMaker Home each have three slots. A product the team picks shows there as long as it is
still live; a product that sells out of the shop or is unlisted drops out by itself, so the Home page never
points at something that cannot be bought. Slots nobody filled keep the page's own default pictures.
"""

import time

from django.core.cache import cache
from django.db import transaction
from django.db.models import Q

from apps.core.models import SellableBase
from apps.listings.marketplace import _admin_qs, _remaker_qs, _user_qs, card

from .models import HomePick

PREFIX_KIND = {"LST": "user", "RPR": "remaker", "ADI": "admin"}


def _buyable(make):
    """Live and still in stock: a sold-out product stays in the shop but is not worth a Home slot."""
    def qs():
        q = make()
        return q if make is _user_qs else q.exclude(status=SellableBase.Status.SOLD_OUT)
    return qs


_QS = {"user": _buyable(_user_qs), "remaker": _buyable(_remaker_qs), "admin": _buyable(_admin_qs)}
_REL = {"user": "user", "remaker": "remaker", "admin": "admin"}


class PickError(Exception):
    pass


def kind_of(ref):
    return PREFIX_KIND.get(str(ref)[:3])


def _fetch(kind, refs):
    """{public_id: object} for the live products among `refs`."""
    if not refs:
        return {}
    qs = _QS[kind]().filter(public_id__in=refs).select_related("category", _REL[kind]).prefetch_related("images")
    return {o.public_id: o for o in qs}


def _cards(rows, request):
    """Cards for [(kind, ref)] in order, skipping anything no longer live."""
    found = {k: _fetch(k, [r for kk, r in rows if kk == k]) for k in _QS}
    return [card(k, found[k][r], request) for k, r in rows if r in found[k]]


def picks_for(surface, request):
    rows = HomePick.objects.filter(surface=surface).order_by("position").values_list("kind", "ref")
    return _cards(list(rows), request)


def search(request, q="", limit=24):
    out = []
    t = (q or "").strip()
    for kind, make in _QS.items():
        qs = make().select_related("category", _REL[kind]).prefetch_related("images")
        if t:
            qs = qs.filter(Q(title__icontains=t) | Q(public_id__iexact=t))
        out += [(kind, o) for o in qs.order_by("-created_at")[:limit]]
    out.sort(key=lambda r: r[1].created_at, reverse=True)
    return [card(k, o, request) for k, o in out[:limit]]


def bump_cache():
    """Make the public Home page read the new picks at once."""
    cache.set("public_home_ver", int(time.time() * 1000), None)


def home_cache_key(host):
    return f"public_home:{cache.get('public_home_ver', 0)}:{host}"


@transaction.atomic
def set_picks(surface, refs, admin):
    if surface not in HomePick.SURFACES:
        raise PickError("Choose which Home page this is for.")
    refs = [str(r).strip() for r in (refs or [])]
    if len(set(refs)) != len(refs):
        raise PickError("Each product can only be picked once.")
    if len(refs) > HomePick.MAX:
        raise PickError(f"Pick up to {HomePick.MAX} products.")
    rows = []
    for ref in refs:
        kind = kind_of(ref)
        if not kind or ref not in _fetch(kind, [ref]):
            raise PickError(f"{ref} is not a live product, so it cannot be shown on Home.")
        rows.append((kind, ref))
    HomePick.objects.filter(surface=surface).delete()
    HomePick.objects.bulk_create([
        HomePick(surface=surface, position=i, kind=k, ref=r, picked_by=admin) for i, (k, r) in enumerate(rows, start=1)
    ])
    bump_cache()
    return rows
