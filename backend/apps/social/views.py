"""Wishlist, one list per account, for members, ReMakers and admins alike.

  GET    /api/social/wishlist/        saved items, newest first (each is a marketplace card;
                                      gone / unlisted ones come back as {id, unavailable: true})
  POST   /api/social/wishlist/        {"id": "LST-.."} save one (saving twice is fine)
  DELETE /api/social/wishlist/        clear the list
  DELETE /api/social/wishlist/<id>/   remove one (removing twice is fine)
"""

from django.db import IntegrityError, transaction
from rest_framework.views import APIView

from apps.accounts.permissions import IsReOrbitAuthenticated
from apps.core import buyers
from apps.core.responses import created, fail, ok
from apps.listings.marketplace import PREFIX, _admin_qs, _remaker_qs, _user_qs, card

from .models import Cart, CartLine, Follow, WishlistEntry

MAX_SAVED = 200


def _mine(request):
    return WishlistEntry.objects.filter(**buyers.owner(request.user.account))


def _live(kind, ref):
    qs = {"user": _user_qs, "remaker": _remaker_qs, "admin": _admin_qs}[kind]()
    rel = {"user": ("category", "user"), "remaker": ("category", "remaker"), "admin": ("category", "admin")}[kind]
    return qs.select_related(*rel).prefetch_related("images").filter(public_id__in=ref)


def _cards(entries, request):
    wanted = {"user": [], "remaker": [], "admin": []}
    for e in entries:
        wanted[e.item_kind].append(e.item_ref)
    found = {}
    for kind, refs in wanted.items():
        if refs:
            found.update({o.public_id: card(kind, o, request) for o in _live(kind, refs)})
    return [found.get(e.item_ref) or {"id": e.item_ref, "kind": e.item_kind, "unavailable": True} for e in entries]


class WishlistView(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def get(self, request):
        entries = list(_mine(request))
        items = _cards(entries, request)
        for e, it in zip(entries, items):
            it["saved_at"] = e.created_at
        return ok({"items": items, "count": len(items)})

    def post(self, request):
        ref = str(request.data.get("id") or "").strip()
        kind = PREFIX.get(ref[:3])
        if not kind or not _live(kind, [ref]).exists():
            return fail("That product is not available to save.", status=404)
        account = request.user.account
        own = buyers.owner(account)
        with transaction.atomic():
            mine = WishlistEntry.objects.filter(**own)
            if not mine.filter(item_ref=ref).exists():
                if mine.count() >= MAX_SAVED:
                    return fail(f"You can save up to {MAX_SAVED} items. Remove a few first.")
                try:
                    with transaction.atomic():
                        WishlistEntry.objects.create(actor_type=buyers.type_of(account), item_kind=kind, item_ref=ref, **own)
                except IntegrityError:  # two taps at once: it is saved either way
                    pass
        return created({"saved": True, "id": ref, "count": _mine(request).count()})

    def delete(self, request):
        n, _ = _mine(request).delete()
        return ok({"removed": n, "count": 0})


class WishlistItemView(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def delete(self, request, public_id):
        _mine(request).filter(item_ref=public_id).delete()
        return ok({"saved": False, "id": public_id, "count": _mine(request).count()})


def _cart(request):
    account = request.user.account
    owner = buyers.owner(account)
    actor = buyers.type_of(account)
    cart, _ = Cart.objects.get_or_create(actor_type=actor, **owner)
    return cart


def _cart_data(cart, request):
    refs = list(cart.lines.order_by("created_at", "pk").values_list("item_ref", flat=True))
    by_ref = {}
    for ref in refs:
        kind = PREFIX.get(ref[:3])
        if kind:
            obj = _live(kind, [ref]).first()
            if obj:
                by_ref[ref] = card(kind, obj, request)
    rows = []
    for line in cart.lines.order_by("created_at", "pk"):
        product = by_ref.get(line.item_ref)
        rows.append({"id": line.item_ref, "qty": line.quantity, "unavailable": product is None,
                     **({"item": product} if product else {})})
    return {"items": rows, "count": len(rows), "updated_at": cart.updated_at}


class CartView(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def get(self, request):
        return ok(_cart_data(_cart(request), request))

    def put(self, request):
        items = request.data.get("items")
        if not isinstance(items, list) or len(items) > 100:
            return fail("Send a list of up to 100 cart items.")
        normalized = {}
        for row in items:
            try:
                ref, qty = str(row.get("id") or ""), int(row.get("qty", 0))
            except (AttributeError, TypeError, ValueError):
                return fail("Each cart item needs an id and a quantity.")
            kind = PREFIX.get(ref[:3])
            obj = _live(kind, [ref]).first() if kind else None
            stock = (getattr(obj, "quantity", None) if kind == "user" else getattr(obj, "stock", None)) if obj else None
            if not kind or not 1 <= qty <= 99 or obj is None or stock is None or qty > stock:
                return fail("A cart item is unavailable or its quantity is invalid.")
            normalized[ref] = qty
        cart = _cart(request)
        with transaction.atomic():
            cart.lines.all().delete()
            CartLine.objects.bulk_create([CartLine(cart=cart, item_ref=ref, quantity=qty) for ref, qty in normalized.items()])
        cart.refresh_from_db()
        return ok(_cart_data(cart, request))


class FollowView(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def get(self, request):
        own = buyers.owner(request.user.account)
        qs = Follow.objects.filter(**own).select_related("target", "target__profile")
        rows = [{"id": f.target.public_id, "name": f.target.full_name, "username": f.target.username,
                 "followedAt": f.created_at, "type": "ReMaker"} for f in qs]
        return ok({"following": rows, "count": len(rows)})

    def post(self, request):
        ref = str(request.data.get("id") or "").strip()
        from apps.remakers.models import ReMakers
        target = ReMakers.objects.filter(public_id=ref, status="Active").first()
        if not target:
            return fail("That ReMaker is not available to follow.", status=404)
        account = request.user.account
        actor = buyers.type_of(account)
        if actor == "remaker" and account.pk == target.pk:
            return fail("You cannot follow yourself.")
        row, _ = Follow.objects.get_or_create(follower_type=actor, target=target, **buyers.owner(account))
        return created({"following": True, "id": target.public_id, "followedAt": row.created_at})


class FollowItemView(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def delete(self, request, public_id):
        deleted, _ = Follow.objects.filter(**buyers.owner(request.user.account), target__public_id=public_id).delete()
        return ok({"following": False, "id": public_id, "removed": bool(deleted)})


class FollowersView(APIView):
    permission_classes = [IsReOrbitAuthenticated]

    def get(self, request):
        account = request.user.account
        if buyers.type_of(account) != "remaker":
            return fail("Only a ReMaker can view their follower list.", status=403)
        rows = Follow.objects.filter(target=account).select_related("user", "remaker", "admin")
        people = []
        for f in rows:
            actor = getattr(f, f.follower_type)
            profile = getattr(actor, "profile", None)
            people.append({"id": actor.public_id, "name": actor.full_name, "type": "ReMaker" if f.follower_type == "remaker" else "User",
                           "city": getattr(profile, "city", "") if profile else "", "image": getattr(profile, "profile_image", "") if profile else "",
                           "followedAt": f.created_at, "customerId": actor.public_id if f.follower_type == "user" else ""})
        return ok({"followers": people, "count": len(people)})

    def delete(self, request, public_id):
        account = request.user.account
        if buyers.type_of(account) != "remaker":
            return fail("Only a ReMaker can manage their follower list.", status=403)
        from django.db.models import Q
        removed, _ = Follow.objects.filter(target=account).filter(
            Q(user__public_id=public_id) | Q(remaker__public_id=public_id)
        ).delete()
        return ok({"removed": bool(removed), "id": public_id})
