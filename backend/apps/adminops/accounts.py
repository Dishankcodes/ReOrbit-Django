"""Everything an admin sees on one member's or ReMaker's profile page.

GET /api/adminops/admin/accounts/<public_id>/      (USR-... needs the "users" module, RMK-... "remakers")

One request fills every tab of Admin > Users > profile and Admin > ReMakers > profile:
listings or products, orders bought and sold, donations, wishlist, reviews, reports, activity and totals.
Field names match the tabs (frontend/src/admin/pages/Users/tabs, .../Remakers/tabs).
"""

from datetime import timedelta

from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework.permissions import BasePermission
from rest_framework.views import APIView

from apps.accounts.permissions import IsReOrbitAdmin
from apps.complaints.models import Complaint
from apps.core.responses import ok
from apps.donations.models import Donation
from apps.listings.marketplace import _cover
from apps.listings.models import Item
from apps.orders.models import Order
from apps.orders.serializers import media_url
from apps.remakers.models import RemakerProduct, ReMakers
from apps.reviews.models import ProductReview, SellerReview
from apps.social.models import Follow, WishlistEntry
from apps.users.models import Users
from apps.warehouse.models import WarehouseItem

LIMIT = 200  # rows per tab; a profile is a summary, the module pages hold the full history


class _CanSeeAccount(BasePermission):
    message = "You do not have access to this area."

    def has_permission(self, request, view):
        module = "remakers" if str(view.kwargs.get("public_id", "")).upper().startswith("RMK-") else "users"
        account = getattr(request.user, "account", None)
        return bool(account and account.has_module(module, "view"))


def _money(v):
    return int(v or 0)


def _order_rows(request, qs, me):
    """Orders this account bought or sold, newest first, as the Orders tab wants them."""
    rows = []
    for o in qs.select_related("payment", "seller_user", "seller_remaker", "buyer_user", "buyer_remaker", "buyer_admin") \
               .prefetch_related("lines").order_by("-created_at")[:LIMIT]:
        lines = list(o.lines.all())
        first = lines[0] if lines else None
        buying = (o.buyer_user_id and isinstance(me, Users) and o.buyer_user_id == me.pk) or \
                 (o.buyer_remaker_id and isinstance(me, ReMakers) and o.buyer_remaker_id == me.pk)
        if buying:
            other = o.seller_user or o.seller_remaker
            other_type = o.seller_type if other else "platform"
            other_name = other.full_name if other else "ReOrbit"
        else:
            other = o.buyer_user or o.buyer_remaker or o.buyer_admin
            other_type = o.buyer_type
            other_name = other.full_name if other else "Buyer"
        title = first.title if first else o.public_id
        if len(lines) > 1:
            title += f" + {len(lines) - 1} more"
        rows.append({
            "order_id": o.public_id,
            "title": title,
            "image": media_url(request, first.cover) if first and first.cover else None,
            "role": "Buyer" if buying else "Seller",
            "counterparty": other_name,
            "counterparty_type": other_type,
            "amount": o.total if buying else o.subtotal,
            "payment_method": getattr(o.payment, "method", "") or "",
            "payment_status": o.payment_status,
            "order_status": o.status,
            "order_date": o.created_at,
        })
    return rows


def _report_rows(me, kind):
    by_me = Q(**{f"reporter_{kind}": me})
    about_me = Q(**{f"target_{kind}": me})
    if kind == "user":
        about_me |= Q(target_item__user=me)
    else:
        about_me |= Q(target_remaker_product__remaker=me)
    rows = []
    for c in Complaint.objects.filter(by_me | about_me).select_related(
            "reporter_user", "reporter_remaker", "target_user", "target_remaker").order_by("-created_at")[:LIMIT]:
        mine = getattr(c, f"reporter_{kind}_id") == me.pk
        if mine:
            other = c.target_user or c.target_remaker
            other_name = other.full_name if other else c.get_target_type_display()
        else:
            other = c.reporter_user or c.reporter_remaker
            other_name = other.full_name if other else (c.reporter_name or "ReOrbit team")
        rows.append({
            "report_id": c.public_id,
            "report_type": c.get_target_type_display(),
            "reason": c.category,
            "description": c.description,
            "direction": "By this account" if mine else "Against this account",
            "other_party": other_name,
            "status": c.status,
            "created_at": c.created_at,
        })
    return rows


def _wishlist_rows(request, me, kind):
    from apps.listings.marketplace import _admin_qs, _remaker_qs, _user_qs, card

    entries = list(WishlistEntry.objects.filter(**{kind: me}).order_by("-created_at")[:LIMIT])
    found = {}
    for k, make in (("user", _user_qs), ("remaker", _remaker_qs), ("admin", _admin_qs)):
        refs = [e.item_ref for e in entries if e.item_kind == k]
        if refs:
            for o in make().filter(public_id__in=refs).prefetch_related("images"):
                found[o.public_id] = card(k, o, request)
    rows = []
    for e in entries:
        c = found.get(e.item_ref)
        rows.append({
            "wishlist_id": f"{e.item_ref}",
            "title": c["title"] if c else f"{e.item_ref} (no longer for sale)",
            "image": c["cover"] if c else None,
            "kind": {"user": "Member listing", "remaker": "ReMaker product", "admin": "ReOrbit store"}.get(e.item_kind, e.item_kind),
            "by": (c.get("seller") or {}).get("name", "") if c else "",
            "price": c["price"] if c else 0,
            "added_at": e.created_at,
        })
    return rows


ONLINE_FOR = 5  # minutes: seen this recently = "Online now"

ACCOUNT_EVENTS = {
    "account.suspended": ("status", "Suspended by ReOrbit"),
    "account.blocked": ("status", "Blocked by ReOrbit"),
    "account.closed": ("status", "Account closed by ReOrbit"),
    "account.reactivated": ("status", "Made active again by ReOrbit"),
    "account.delete_requested": ("deleted", "Deleted their account (30 days to come back)"),
    "account.delete_cancelled": ("restored", "Came back: signed in again within 30 days"),
}


def presence(account):
    """{"online": bool, "last_seen": datetime | None}: "Online now" when the app was used in the last
    few minutes, otherwise when it was last used (or signed in to)."""
    from django.utils import timezone

    seen = max([t for t in (getattr(account, "last_seen_at", None), account.last_login_at) if t], default=None)
    online = bool(seen and timezone.now() - seen < timedelta(minutes=ONLINE_FOR)
                  and account.status != "Deleted")
    return {"online": online, "last_seen": seen}


def _account_events(account, kind):
    """Sign-ins, status changes and deleting / coming back, from the account and the audit log."""
    from apps.core.models import AuditLog

    rows = []
    for a in AuditLog.objects.filter(entity_type=kind, entity_id=account.public_id,
                                     action__in=ACCOUNT_EVENTS).order_by("-created_at")[:30]:
        kind_, text = ACCOUNT_EVENTS[a.action]
        if a.reason and kind_ == "status" and a.action != "account.reactivated":
            text = f"{text}: {a.reason}"
        rows.append({"type": kind_, "text": text, "at": a.created_at})
    if account.last_login_at:
        rows.append({"type": "signin", "text": "Signed in", "at": account.last_login_at})
    p = presence(account)
    if p["last_seen"] and (not account.last_login_at or p["last_seen"] > account.last_login_at):
        rows.append({"type": "online" if p["online"] else "offline",
                     "text": "Online now" if p["online"] else "Last used the app", "at": p["last_seen"]})
    return rows


def _activity(*groups):
    rows = [row for group in groups for row in group]
    rows.sort(key=lambda r: r["at"], reverse=True)
    return rows[:60]


def user_detail(request, u):
    items = []
    for i in Item.objects.filter(user=u, deleted_at__isnull=True).select_related("category") \
                         .prefetch_related("images").order_by("-created_at")[:LIMIT]:
        items.append({
            "item_id": i.public_id, "title": i.title, "category": i.category.name if i.category_id else "",
            "condition": i.condition, "created_at": i.created_at, "image": _cover(i, request),
            "estimated_price": _money(i.listing_price or i.estimated_price), "quantity": i.quantity,
            "item_status": i.item_status, "is_disabled": i.moderation_status == Item.Moderation.DISABLED,
            "disabled_reason": i.moderation_note or "",
            "suggested_price": _money(i.suggested_price) if i.suggested_price else None,
            "suggested_price_message": i.suggested_note or "",
        })

    orders = _order_rows(request, Order.objects.filter(Q(buyer_user=u) | Q(seller_user=u)), u)

    donations = []
    for d in Donation.objects.filter(donor=u).prefetch_related("images").order_by("-created_at")[:LIMIT]:
        first = d.images.first()
        donations.append({
            "donation_id": d.public_id, "title": d.title, "category": d.category, "quantity": d.effective_quantity,
            "image": media_url(request, first.image.name) if first and first.image else None,
            "donation_status": d.status, "donation_date": d.created_at, "pickup_date": d.pickup_date,
            "pickup_slot": d.pickup_slot, "reject_reason": d.reject_reason,
            "certificate": bool(d.certificate_id),
        })

    reviews = []
    for r in ProductReview.objects.filter(reviewer_user=u).select_related("order_item").order_by("-created_at")[:LIMIT]:
        reviews.append({"review_id": r.public_id, "kind": "Product", "target": r.order_item.title,
                        "rating": r.rating, "text": r.body or r.title, "created_at": r.created_at, "status": r.status})
    for r in SellerReview.objects.filter(reviewer_user=u).select_related("seller_user", "seller_remaker") \
                                 .order_by("-created_at")[:LIMIT]:
        seller = r.seller_user or r.seller_remaker
        reviews.append({"review_id": r.public_id, "kind": "Seller", "target": seller.full_name if seller else "ReOrbit",
                        "rating": r.rating, "text": r.body, "created_at": r.created_at, "status": r.status})
    reviews.sort(key=lambda r: r["created_at"], reverse=True)

    delivered = Order.objects.filter(status=Order.Status.DELIVERED)
    totals = {
        "spent": _money(delivered.filter(buyer_user=u).aggregate(s=Sum("total"))["s"]),
        "earned": _money(delivered.filter(seller_user=u).aggregate(s=Sum("subtotal"))["s"]),
    }
    activity = _activity(
        [{"type": "account", "text": "Created a ReOrbit account", "at": u.created_at}],
        _account_events(u, "user"),
        [{"type": "listing", "text": f"Listed {i['title']}", "at": i["created_at"]} for i in items[:20]],
        [{"type": "order", "text": f"{'Bought' if o['role'] == 'Buyer' else 'Sold'} {o['title']} ({o['order_id']})",
          "at": o["order_date"]} for o in orders[:20]],
        [{"type": "donation", "text": f"Donated {d['title']} ({d['donation_id']})", "at": d["donation_date"]}
         for d in donations[:20]],
        [{"type": "review", "text": f"Reviewed {r['target']} ({r['rating']}★)", "at": r["created_at"]} for r in reviews[:20]],
    )
    return {
        "items": items, "orders": orders, "donations": donations, "wishlist": _wishlist_rows(request, u, "user"),
        "reviews": reviews, "reports": _report_rows(u, "user"), "activity": activity, "totals": totals,
        "presence": presence(u),
    }


def remaker_detail(request, m):
    products = []
    for p in RemakerProduct.objects.filter(remaker=m, deleted_at__isnull=True).select_related("category", "source_item") \
                                   .prefetch_related("images").order_by("-created_at")[:LIMIT]:
        products.append({
            "product_id": p.public_id, "title": p.title, "category": p.category.name if p.category_id else "",
            "image": _cover(p, request), "price": _money(p.price), "stock": p.stock, "status": p.status,
            "created_at": p.created_at, "is_disabled": bool(p.deactivated_at),
            "disabled_reason": p.deactivation_reason or "", "suggested_price": None, "suggested_price_message": "",
            "source_item": p.source_item.public_id if p.source_item_id else None,
        })

    orders = _order_rows(request, Order.objects.filter(Q(buyer_remaker=m) | Q(seller_remaker=m)), m)

    refurbishments = []
    for w in WarehouseItem.objects.filter(refurb_remaker=m).order_by("-refurb_assigned_at")[:LIMIT]:
        refurbishments.append({
            "refurbishment_id": w.public_id, "item_id": w.public_id, "title": w.title,
            "before_image": None, "after_image": None, "assigned_by": "ReOrbit",
            "assigned_date": w.refurb_assigned_at, "start_date": w.refurb_assigned_at,
            "completion_date": w.refurb_due_at,
            "refurbishment_status": (w.refurb_progress or "Assigned").replace("_", " "),
            "quality_status": "Pending", "notes": "",
        })

    reviews = []
    for r in ProductReview.objects.filter(order__seller_remaker=m).select_related(
            "order_item", "reviewer_user", "reviewer_remaker", "reviewer_admin").order_by("-created_at")[:LIMIT]:
        who = r.reviewer_user or r.reviewer_remaker or r.reviewer_admin
        reviews.append({"review_id": r.public_id, "kind": "Product", "product": r.order_item.title,
                        "reviewer": who.full_name if who else "Buyer", "rating": r.rating,
                        "text": r.body or r.title, "created_at": r.created_at, "status": r.status})
    for r in SellerReview.objects.filter(seller_remaker=m).select_related(
            "reviewer_user", "reviewer_remaker", "reviewer_admin").order_by("-created_at")[:LIMIT]:
        who = r.reviewer_user or r.reviewer_remaker or r.reviewer_admin
        reviews.append({"review_id": r.public_id, "kind": "Seller", "product": "Seller review",
                        "reviewer": who.full_name if who else "Buyer", "rating": r.rating, "text": r.body,
                        "created_at": r.created_at, "status": r.status})
    reviews.sort(key=lambda r: r["created_at"], reverse=True)

    delivered = Order.objects.filter(status=Order.Status.DELIVERED)
    totals = {
        "earned": _money(delivered.filter(seller_remaker=m).aggregate(s=Sum("subtotal"))["s"]),
        "spent": _money(delivered.filter(buyer_remaker=m).aggregate(s=Sum("total"))["s"]),
    }
    activity = _activity(
        [{"type": "account", "text": "Created a ReMaker account", "at": m.created_at}],
        _account_events(m, "remaker"),
        [{"type": "listing", "text": f"Added {p['title']}", "at": p["created_at"]} for p in products[:20]],
        [{"type": "order", "text": f"{'Bought' if o['role'] == 'Buyer' else 'Sold'} {o['title']} ({o['order_id']})",
          "at": o["order_date"]} for o in orders[:20]],
        [{"type": "review", "text": f"{r['reviewer']} left {r['rating']}★ on {r['product']}", "at": r["created_at"]}
         for r in reviews[:20]],
    )
    return {
        "products": products, "orders": orders, "refurbishments": refurbishments, "reviews": reviews,
        "reports": _report_rows(m, "remaker"), "activity": activity, "totals": totals,
        "presence": presence(m),
        "followers": Follow.objects.filter(target=m).count(),
        "sales": sum(1 for o in orders if o["role"] == "Seller" and o["order_status"] == Order.Status.DELIVERED),
    }


class AdminAccountDetail(APIView):
    permission_classes = [IsReOrbitAdmin, _CanSeeAccount]

    def get(self, request, public_id):
        pid = str(public_id).upper()
        if pid.startswith("RMK-"):
            return ok(remaker_detail(request, get_object_or_404(ReMakers, public_id=pid)))
        return ok(user_detail(request, get_object_or_404(Users, public_id=pid)))
