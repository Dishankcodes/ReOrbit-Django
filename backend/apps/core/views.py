from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from .models import Category, PlatformSettings
from .responses import ok
from .serializers import CategorySerializer


class CommerceRulesView(APIView):
    """GET /api/core/settings/ : the money rules the User and ReMaker apps display.

    Public and read-only. Editing is done by Domain B (admin settings)."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return ok(PlatformSettings.load().as_public_dict())


class CategoryListView(APIView):
    """GET /api/core/categories/ : active categories (?applies_to=Item|Product)."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        qs = Category.objects.filter(status=Category.Status.ACTIVE)
        applies_to = request.query_params.get("applies_to")
        if applies_to in (Category.AppliesTo.ITEM, Category.AppliesTo.PRODUCT):
            qs = qs.filter(applies_to__in=[applies_to, Category.AppliesTo.BOTH])
        return ok(CategorySerializer(qs, many=True).data)
