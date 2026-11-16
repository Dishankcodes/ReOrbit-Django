from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.accounts.authentication import ReOrbitJWTAuthentication
from apps.accounts.permissions import IsReOrbitReMaker
from apps.core.responses import fail, ok
from apps.remakers.models import RemakerProduct, ReMakers

from . import services


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
