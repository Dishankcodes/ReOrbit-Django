"""Public, read-only content for the storefronts + counters.

  GET  /api/content/banners/?placement=Home hero&audience=member   live banners
  POST /api/content/banners/<id>/view|click/                       count an impression / click
  GET  /api/content/faqs/                                          published FAQs
  POST /api/content/faqs/<id>/vote/ {helpful: bool}
  GET  /api/content/policies/            ·  GET /api/content/policies/<key>/   published text only
"""

from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.core.responses import ok

from .models import Banner, Faq, Policy
from .views import banner_row, faq_row


class _Public(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []


class _Count(AnonRateThrottle):
    rate = "60/min"


# audience shown to each kind of visitor ("member" = signed-in buyer, "remaker", "visitor")
_AUDIENCES = {
    "visitor": ("Everyone", "Visitors only"),
    "member": ("Everyone", "Signed-in members"),
    "remaker": ("Everyone", "Signed-in members", "ReMakers"),
}


class PublicBanners(_Public):
    def get(self, request):
        today = timezone.localdate()
        qs = Banner.objects.filter(active=True).filter(Q(start__isnull=True) | Q(start__lte=today)) \
            .filter(Q(end__isnull=True) | Q(end__gte=today))
        if request.query_params.get("placement") in Banner.PLACEMENTS:
            qs = qs.filter(placement=request.query_params["placement"])
        who = request.query_params.get("audience", "visitor")
        qs = qs.filter(audience__in=_AUDIENCES.get(who, _AUDIENCES["visitor"]))
        return ok({"results": [{k: v for k, v in banner_row(b, today).items() if k in
                                ("id", "title", "subtitle", "cta", "link", "placement", "image")} for b in qs]})


class _BannerCount(_Public):
    throttle_classes = [_Count]
    field = ""

    def post(self, request, public_id):
        n = Banner.objects.filter(public_id=public_id, active=True).update(**{self.field: F(self.field) + 1})
        return ok({"counted": bool(n)})


class BannerView(_BannerCount):
    field = "views"


class BannerClick(_BannerCount):
    field = "clicks"


class PublicFaqs(_Public):
    def get(self, request):
        return ok({"results": [faq_row(f) for f in Faq.objects.filter(published=True)]})


class FaqVote(_Public):
    throttle_classes = [_Count]

    def post(self, request, public_id):
        f = get_object_or_404(Faq, public_id=public_id, published=True)
        field = "helpful" if request.data.get("helpful") is True else "not_helpful"
        Faq.objects.filter(pk=f.pk).update(**{field: F(field) + 1})
        return ok({})


class PublicPolicies(_Public):
    def get(self, request):
        return ok({"results": [{"key": p.key, "title": p.title, "icon": p.icon, "summary": p.summary,
                                "version": p.version, "body": p.body, "updatedAt": p.published_at}
                               for p in Policy.objects.exclude(version="")]})


class PublicPolicy(_Public):
    def get(self, request, key):
        p = get_object_or_404(Policy.objects.exclude(version=""), key=key)
        return ok({"policy": {"key": p.key, "title": p.title, "version": p.version, "body": p.body,
                              "updatedAt": p.published_at}})
