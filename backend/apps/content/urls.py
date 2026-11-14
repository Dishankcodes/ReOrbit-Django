# Mounted at /api/content/. Public reads + counters, and /admin/... for the admin console.
from django.urls import path

from . import public_views as pub
from . import views as a

urlpatterns = [
    path("banners/", pub.PublicBanners.as_view()),
    path("banners/<str:public_id>/view/", pub.BannerView.as_view()),
    path("banners/<str:public_id>/click/", pub.BannerClick.as_view()),
    path("faqs/", pub.PublicFaqs.as_view()),
    path("faqs/<str:public_id>/vote/", pub.FaqVote.as_view()),
    path("policies/", pub.PublicPolicies.as_view()),
    path("policies/<slug:key>/", pub.PublicPolicy.as_view()),

    path("admin/banners/", a.AdminBanners.as_view()),
    path("admin/banners/<str:public_id>/", a.AdminBannerDetail.as_view()),
    path("admin/banners/<str:public_id>/duplicate/", a.AdminBannerDuplicate.as_view()),
    path("admin/banners/<str:public_id>/move/", a.AdminBannerMove.as_view()),
    path("admin/faqs/", a.AdminFaqs.as_view()),
    path("admin/faqs/<str:public_id>/", a.AdminFaqDetail.as_view()),
    path("admin/faqs/<str:public_id>/move/", a.AdminFaqMove.as_view()),
    path("admin/policies/", a.AdminPolicies.as_view()),
    path("admin/policies/<slug:key>/draft/", a.AdminPolicyDraft.as_view()),
    path("admin/policies/<slug:key>/publish/", a.AdminPolicyPublish.as_view()),
    path("admin/policies/<slug:key>/restore/", a.AdminPolicyRestore.as_view()),
    path("admin/log/", a.AdminLog.as_view()),
]
