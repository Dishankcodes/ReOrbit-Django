from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.accounts.authentication import ReOrbitJWTAuthentication
from apps.accounts.permissions import HasAdminModule, IsReOrbitAdmin, IsReOrbitReMaker
from apps.core.responses import fail, ok
from apps.remakers.models import RemakerProduct, ReMakers

from . import aggregate, dashboard, earnings, services


class OptionalAuth(ReOrbitJWTAuthentication):
    """Shoppers need not be signed in. A bad or expired token just means 'anonymous' here,
    because counting a page view must never fail the page."""

    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except AuthenticationFailed:
            return None


class MyAnalytics(APIView):
    """GET /api/analytics/me/?range=7|30|90|365: the signed-in ReMaker's numbers."""

    permission_classes = [IsReOrbitReMaker]

    def get(self, request):
        key = str(request.query_params.get("range", "30"))
        if key not in services.RANGES:
            return fail("Choose 7, 30, 90 or 365 days.", errors={"range": ["Choose 7, 30, 90 or 365 days."]})
        return ok(services.report(request.user.account, key, request))


class MyDashboard(APIView):
    """GET /api/analytics/me/dashboard/: the numbers on the signed-in ReMaker's home screen."""

    permission_classes = [IsReOrbitReMaker]

    def get(self, request):
        return ok(dashboard.dashboard(request.user.account))


def _admin_range(request):
    key = str(request.query_params.get("range", aggregate.DEFAULT_RANGE))
    return key if key in aggregate.RANGES else None


class AdminReport(APIView):
    """GET /api/analytics/admin/report/?range=30d|90d|6m|12m|all: orders, donations, pickups, warehouse,
    community and payouts for the admin Reports and Dashboard."""

    permission_classes = [IsReOrbitAdmin, HasAdminModule("reports")]

    def get(self, request):
        key = _admin_range(request)
        if key is None:
            return fail("Choose 30d, 90d, 6m, 12m or all.", errors={"range": ["Not a range we know."]})
        return ok(aggregate.build_report(key))


class AdminEarnings(APIView):
    """GET /api/analytics/admin/earnings/?range=...: what ReOrbit itself earns and spends."""

    permission_classes = [IsReOrbitAdmin, HasAdminModule("earnings")]

    def get(self, request):
        key = _admin_range(request)
        if key is None:
            return fail("Choose 30d, 90d, 6m, 12m or all.", errors={"range": ["Not a range we know."]})
        return ok(earnings.build_earnings(key))


class RecordView(APIView):
    """POST /api/analytics/view/  {type: "product" | "profile", id, source}.

    Counts one view of a ReMaker's listed product or public profile. The ReMaker looking at their
    own page is not counted, and nothing about the visitor is stored."""

    authentication_classes = [OptionalAuth]
    permission_classes = [AllowAny]

    def post(self, request):
        kind = str(request.data.get("type", ""))
        ref = str(request.data.get("id", "")).strip()
        viewer = request.user if getattr(request.user, "is_authenticated", False) else None
        mine = viewer.account if viewer and viewer.account_type == "remaker" else None

        if kind == "product" and ref[:4] in ("LST-", "ADI-"):
            # member listings and ReOrbit store items: one counter on the row
            from django.db.models import F

            from apps.admins.models import AdminItem
            from apps.listings.models import Item

            if ref.startswith("LST-"):
                row = Item.objects.filter(public_id=ref).only("pk", "user_id").first()
                own = bool(row and viewer and viewer.account_type == "user" and viewer.account.pk == row.user_id)
                model = Item
            else:
                row = AdminItem.objects.filter(public_id=ref).only("pk").first()
                own = bool(viewer and viewer.account_type == "admin")
                model = AdminItem
            if row is None:
                return fail("We couldn't find that product.", status=404)
            if own:
                return ok({"counted": False})
            model.objects.filter(pk=row.pk).update(view_count=F("view_count") + 1)
            return ok({"counted": True})

        if kind == "product":
            product = RemakerProduct.objects.filter(
                public_id=ref, deleted_at__isnull=True,
                status__in=(RemakerProduct.Status.LISTED, RemakerProduct.Status.SOLD_OUT),
            ).first()
            if product is None:
                return fail("We couldn't find that product.", status=404)
            if mine and mine.pk == product.remaker_id:
                return ok({"counted": False})
            services.record_product_view(product, str(request.data.get("source", "")))
            return ok({"counted": True})

        if kind == "profile":
            remaker = ReMakers.objects.filter(public_id=ref, status=ReMakers.Status.ACTIVE).first()
            if remaker is None:
                return fail("We couldn't find that profile.", status=404)
            if mine and mine.pk == remaker.pk:
                return ok({"counted": False})
            services.record_profile_view(remaker)
            return ok({"counted": True})

        return fail("Say what was viewed: a product or a profile.", errors={"type": ["Use product or profile."]})
