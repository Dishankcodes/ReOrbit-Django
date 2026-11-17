"""Rewards API (mounted at /api/rewards/).

Member
  GET  me/vouchers/   the signed-in member's vouchers (donation-earned and points-redeemed):
                      {vouchers: [...], ready: n}
  GET  me/summary/    points balance, level and the stats the badges are built from
  GET  me/ledger/     paginated history of every points change (?page=&page_size=)
  GET  me/rules/      {rules: [...]} how points are earned
  GET  me/offers/     {offers: [...]} what points can be redeemed for, with this member's
                      eligibility already worked out (claimed_by_me, can_redeem, reason)

Redeeming an offer, and the admin screens for rules/offers/redemptions/adjustments, are not
built yet — see the handover notes.
"""

from datetime import date

from django.db.models import Sum
from django.utils import timezone
from rest_framework.views import APIView

from apps.accounts.permissions import IsReOrbitUser
from apps.core.pagination import StandardPagination
from apps.core.responses import ok

from .models import PointsEntry, RewardOffer, RewardRule, Voucher
from .services import voucher_data

# Mirrors frontend/src/user/data/rewardsStore.js's LEVELS thresholds. Keep the two in sync.
LEVEL_THRESHOLDS = (0, 500, 1500, 3000, 5000)


def level_info(lifetime):
    """(level_index, progress 0..1, points to the next level, or 0 at the top level)."""
    li = 0
    for i, t in enumerate(LEVEL_THRESHOLDS):
        if lifetime >= t:
            li = i
    if li + 1 >= len(LEVEL_THRESHOLDS):
        return li, 1.0, 0
    lo, hi = LEVEL_THRESHOLDS[li], LEVEL_THRESHOLDS[li + 1]
    return li, round((lifetime - lo) / (hi - lo), 4), max(0, hi - lifetime)


class MyVouchers(APIView):
    permission_classes = [IsReOrbitUser]  # vouchers belong to member accounts

    def get(self, request):
        rows = list(Voucher.objects.filter(owner=request.user.account))
        data = [voucher_data(v) for v in rows]
        return ok({"vouchers": data, "ready": sum(1 for v in data if v["status"] == "Active")})


class MySummary(APIView):
    permission_classes = [IsReOrbitUser]

    def get(self, request):
        from apps.donations.models import Donation
        from apps.orders.models import Order, OrderItem
        from apps.reviews.models import ProductReview
        from apps.listings.models import Item
        from apps.social.models import WishlistEntry

        user = request.user.account
        entries = PointsEntry.objects.filter(user=user)
        lifetime = entries.filter(points__gt=0).aggregate(s=Sum("points"))["s"] or 0
        balance = entries.aggregate(s=Sum("points"))["s"] or 0
        li, progress, to_next = level_info(lifetime)

        delivered = Order.objects.filter(buyer_user=user, status=Order.Status.DELIVERED)
        bought_items = OrderItem.objects.filter(order__in=delivered).aggregate(s=Sum("qty"))["s"] or 0
        completed_donations = Donation.objects.filter(donor=user, status=Donation.Status.COMPLETED)
        donated_items = sum(d.effective_quantity for d in completed_donations)
        vouchers_ready = Voucher.objects.filter(owner=user, status=Voucher.Status.ACTIVE,
                                                expires_at__gt=timezone.now()).count()

        stats = {
            "delivered_orders": delivered.count(),
            "bought_items": bought_items,
            "donations_completed": completed_donations.count(),
            "donated_items": donated_items,
            "reviews": ProductReview.objects.filter(reviewer_user=user).count(),
            "listed": Item.objects.filter(user=user).count(),
            "sold": Item.objects.filter(user=user, status=Item.Status.SOLD).count(),
            "wishlist": WishlistEntry.objects.filter(user=user).count(),
        }
        return ok({
            "balance": balance, "lifetime": lifetime, "level_index": li, "progress": progress,
            "to_next": to_next, "vouchers_ready": vouchers_ready, "stats": stats,
        })


class MyLedger(APIView):
    permission_classes = [IsReOrbitUser]
    pagination_class = StandardPagination

    def get(self, request):
        rows = PointsEntry.objects.filter(user=request.user.account).order_by("-created_at", "-pk")
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(rows, request, view=self)
        data = [{
            "id": e.pk, "kind": e.kind, "title": e.title, "detail": e.detail, "points": e.points,
            "at": e.created_at, "ref": {"type": e.ref_type, "id": e.ref_id} if e.ref_type else None,
        } for e in page]
        return paginator.get_paginated_response(data)


class MyRules(APIView):
    permission_classes = [IsReOrbitUser]

    def get(self, request):
        rows = RewardRule.objects.filter(active=True)
        return ok({"rules": [{
            "id": r.key, "group": r.group, "title": r.title, "description": r.description,
            "points": r.points, "unit": r.unit, "active": r.active, "live": True,
        } for r in rows]})


def _offer_status(o, today):
    if o.draft:
        return "Draft"
    if o.paused:
        return "Paused"
    if today < o.valid_from or today > o.valid_to:
        return "Expired"
    return None  # decided against redemption counts by the caller (needs a query)


class MyOffers(APIView):
    permission_classes = [IsReOrbitUser]

    def get(self, request):
        from apps.orders.models import Order  # local: orders doesn't need to import rewards

        user = request.user.account
        today = date.today()
        offers = list(RewardOffer.objects.all())
        balance = PointsEntry.objects.filter(user=user).aggregate(s=Sum("points"))["s"] or 0
        li, _, _ = level_info(
            PointsEntry.objects.filter(user=user, points__gt=0).aggregate(s=Sum("points"))["s"] or 0
        )

        data = []
        for o in offers:
            total_redeemed = Voucher.objects.filter(offer=o).count()
            my_redeemed = Voucher.objects.filter(offer=o, owner=user).count()
            left = max(0, o.usage_limit - total_redeemed)
            status = _offer_status(o, today) or ("Used_Up" if left <= 0 else "Active")
            claimed_by_me = my_redeemed >= o.per_user

            reason = None
            can_redeem = True
            if o.remaker_only:
                can_redeem, reason = False, "This reward is for ReMakers."
            elif status != "Active":
                can_redeem, reason = False, {"Draft": "Not yet available.", "Paused": "Currently paused.",
                                             "Expired": "No longer available.", "Used_Up": "Fully claimed."}[status]
            elif claimed_by_me:
                can_redeem, reason = False, "You've already claimed this."
            elif o.audience == "new" and Order.objects.filter(
                buyer_user=user, status__in=("Delivered", "Confirmed", "Packed", "Shipped")
            ).exists():
                can_redeem, reason = False, "For new members only."
            elif li < o.min_level:
                can_redeem, reason = False, "Reach a higher level to unlock this."
            elif balance < o.points_cost:
                can_redeem, reason = False, "Not enough Orbit Points yet."

            data.append({
                "id": o.public_id, "code": o.code, "title": o.title, "description": o.description,
                "kind": o.kind, "discount_type": o.discount_type, "value": o.value, "min_order": o.min_order,
                "max_discount": o.max_discount, "points_cost": o.points_cost, "left": left,
                "valid_to": o.valid_to.isoformat(), "per_user": o.per_user, "audience": o.audience,
                "min_level": o.min_level, "remaker_only": o.remaker_only, "paused": o.paused,
                "status": status, "claimed_by_me": claimed_by_me, "can_redeem": can_redeem, "reason": reason,
            })
        return ok({"offers": data})
