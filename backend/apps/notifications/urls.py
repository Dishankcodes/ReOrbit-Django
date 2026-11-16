# Mounted at /api/notifications/. /me/ is the member's or ReMaker's own inbox, /admin/ an admin's.
from django.urls import path

from . import views as v

urlpatterns = [
    path("me/", v.MeList.as_view()),
    path("me/unread-count/", v.MeCount.as_view()),
    path("me/read-all/", v.MeReadAll.as_view()),
    path("me/dismiss-read/", v.MeDismissRead.as_view()),
    path("me/<str:public_id>/", v.MeDetail.as_view()),
    path("me/<str:public_id>/read/", v.MeRead.as_view()),
    path("admin/", v.AdminList.as_view()),
    path("admin/unread-count/", v.AdminCount.as_view()),
    path("admin/read-all/", v.AdminReadAll.as_view()),
    path("admin/dismiss-read/", v.AdminDismissRead.as_view()),
    path("admin/<str:public_id>/", v.AdminDetail.as_view()),
    path("admin/<str:public_id>/read/", v.AdminRead.as_view()),
]
