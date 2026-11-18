"""GET /api/users/public/<USR-id>/  A member's public seller profile (no login needed).

Only what a buyer should see: name, city, photo, short bio, when they joined, and how much they
have listed and sold. Email, phone and address are never included. Blocked or closed accounts
are not shown.
"""

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.core.responses import ok
from apps.listings.models import Item

from .models import Users


def _photo(request, user):
    p = getattr(user, "profile", None)
    if p is None or not p.profile_image:
        return None
    try:
        return request.build_absolute_uri(p.profile_image.url)
    except ValueError:
        return None


class PublicMemberDetail(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, public_id):
        user = get_object_or_404(
            Users.objects.exclude(status__in=["Blocked", "Deleted"]).select_related("profile"),
            public_id=str(public_id).upper(),
        )
        from django.db.models import Sum
        from django.db.models.functions import Coalesce

        from apps.orders.models import Order, OrderItem
        from apps.rewards.services import earned_badges

        counts = Item.objects.filter(user=user).aggregate(
            live=Count("pk", filter=Q(item_status=Item.Status.LISTED, deleted_at__isnull=True)),
        )
        # pieces actually sold through ReOrbit (a listing with several pieces counts each one sold)
        sold = OrderItem.objects.filter(
            order__seller_user=user,
            order__status__in=(Order.Status.CONFIRMED, Order.Status.PACKED, Order.Status.SHIPPED,
                               Order.Status.DELIVERED),
        ).aggregate(n=Coalesce(Sum("qty"), 0))["n"]
        profile = getattr(user, "profile", None)
        privacy = (getattr(profile, "privacy_preferences", None) or {}) if profile else {}
        if privacy.get("publicProfile") is False:
            # Settings › Privacy: profile hidden. Buyers still see the name on listings, nothing more.
            return ok({"member": {"id": user.public_id, "name": user.full_name.split()[0] if user.full_name else "Member",
                                  "private": True, "city": "", "state": "", "bio": "", "image": None,
                                  "joined": user.created_at.year, "joined_at": user.created_at,
                                  "live_listings": counts["live"] or 0, "items_sold": sold, "badges": []}})
        return ok({"member": {
            "id": user.public_id,
            "name": user.full_name,
            "city": (profile.city if profile else "") or "",
            "state": (profile.state if profile else "") or "",
            "bio": (profile.bio if profile else "") or "",
            "image": _photo(request, user),
            "joined": user.created_at.year,
            "joined_at": user.created_at,
            "live_listings": counts["live"] or 0,
            "items_sold": sold,
            "badges": earned_badges(user) if privacy.get("showActivity", True) else [],
            "private": False,
        }})
