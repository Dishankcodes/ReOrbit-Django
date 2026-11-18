"""GET /api/users/me/export/   Settings › Account › Download my data.

A JSON file of what ReOrbit holds about the signed-in member: profile, addresses, listings, orders
(bought and sold), donations, reviews, Orbit Points, vouchers, wishlist and follows. Card or bank
details are never included (ReOrbit doesn't keep card numbers; payout details stay encrypted).
"""

import json

from django.http import HttpResponse
from django.utils import timezone
from rest_framework.views import APIView

from apps.accounts.permissions import IsReOrbitUser


def _d(v):
    return v.isoformat() if hasattr(v, "isoformat") else v


def build_export(user):
    from apps.core.models import SavedAddress
    from apps.donations.models import Donation
    from apps.listings.models import Item
    from apps.orders.models import Order
    from apps.reviews.models import ProductReview, SellerReview
    from apps.rewards.models import PointsEntry, Voucher
    from apps.social.models import Follow, WishlistEntry

    p = getattr(user, "profile", None)

    def order_row(o):
        return {"id": o.public_id, "status": o.status, "total": o.total, "placed": _d(o.created_at),
                "delivered": _d(o.delivered_at), "items": [{"title": ln.title, "qty": ln.qty, "price": ln.unit_price}
                                                           for ln in o.lines.all()]}

    return {
        "exported_at": _d(timezone.now()),
        "account": {"id": user.public_id, "name": user.full_name, "email": user.email, "status": user.status,
                    "joined": _d(user.created_at), "sign_in": getattr(user, "auth_provider", "")},
        "profile": {k: getattr(p, k, None) for k in ("bio", "phone", "address", "city", "state", "pincode",
                                                      "notification_preferences", "privacy_preferences")} if p else {},
        "addresses": [{"label": a.label, "name": a.recipient_name, "phone": a.phone, "line1": a.address_line1,
                       "line2": a.address_line2, "city": a.city, "state": a.state, "pincode": a.pincode}
                      for a in SavedAddress.objects.filter(user=user)],
        "listings": [{"id": i.public_id, "title": i.title, "status": i.item_status, "price": str(i.listing_price or ""),
                      "created": _d(i.created_at)} for i in Item.objects.filter(user=user, deleted_at__isnull=True)],
        "orders_bought": [order_row(o) for o in Order.objects.filter(buyer_user=user).prefetch_related("lines")],
        "orders_sold": [order_row(o) for o in Order.objects.filter(seller_user=user).prefetch_related("lines")],
        "donations": [{"id": d.public_id, "title": d.title, "quantity": d.quantity, "status": d.status,
                       "created": _d(d.created_at)} for d in Donation.objects.filter(donor=user)],
        "reviews_written": (
            [{"id": r.public_id, "rating": r.rating, "title": r.title, "text": r.body, "at": _d(r.created_at)}
             for r in ProductReview.objects.filter(reviewer_user=user)]
            + [{"id": r.public_id, "rating": r.rating, "text": r.body, "at": _d(r.created_at)}
               for r in SellerReview.objects.filter(reviewer_user=user)]),
        "orbit_points": [{"points": e.points, "title": e.title, "at": _d(e.created_at)}
                         for e in PointsEntry.objects.filter(user=user)],
        "vouchers": [{"code": v.code, "amount": v.amount, "status": v.status, "expires": _d(v.expires_at)}
                     for v in Voucher.objects.filter(owner=user)],
        "wishlist": list(WishlistEntry.objects.filter(user=user).values_list("item_ref", flat=True)),
        "following": list(Follow.objects.filter(follower_type="user", user=user).values_list("target__public_id", flat=True)),
    }


class MyDataExport(APIView):
    permission_classes = [IsReOrbitUser]
    support_endpoint = True  # a suspended member can still download their data

    def get(self, request):
        user = request.user.account
        data = json.dumps(build_export(user), indent=2, default=str, ensure_ascii=False)
        resp = HttpResponse(data, content_type="application/json; charset=utf-8")
        resp["Content-Disposition"] = f'attachment; filename="reorbit-{user.public_id.lower()}-data.json"'
        return resp
