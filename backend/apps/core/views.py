import time

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

    CACHE_SECONDS = 30
    _cached = {"at": -1e9, "data": None, "ver": None}

    def get(self, request):
        # Every open tab reads these rules: keep them in memory for a few seconds instead of running
        # 5 queries each time. A save in this server process is seen at once (pause.forget bumps
        # the version), other processes within CACHE_SECONDS.
        from . import pause

        c = self._cached
        ver = pause.version()
        if c["data"] is None or c["ver"] != ver or time.monotonic() - c["at"] > self.CACHE_SECONDS:
            c.update(data=PlatformSettings.load().as_public_dict(), at=time.monotonic(), ver=ver)
        return ok(c["data"])


class PauseStatusView(APIView):
    """GET /api/core/status/ : which sides are paused (Super Admin › System). No sign-in needed and
    usually no database query (apps/core/pause.py)."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request):
        from . import pause

        f = pause.flags()
        return ok({"paused": f, "messages": {k: pause.MESSAGE[k] for k in f if f[k]}})


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
