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
        counts = Item.objects.filter(user=user).aggregate(
            live=Count("pk", filter=Q(item_status=Item.Status.LISTED)),
            sold=Count("pk", filter=Q(item_status=Item.Status.SOLD)),
        )
        profile = getattr(user, "profile", None)
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
            "items_sold": counts["sold"] or 0,
        }})
