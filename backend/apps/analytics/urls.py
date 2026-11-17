# Mounted at /api/analytics/.
from django.urls import path

from .views import AdminEarnings, AdminReport, MyAnalytics, MyDashboard, RecordView

urlpatterns = [
    path("me/", MyAnalytics.as_view()),
    path("me/dashboard/", MyDashboard.as_view()),
    path("admin/report/", AdminReport.as_view()),
    path("admin/earnings/", AdminEarnings.as_view()),
    path("view/", RecordView.as_view()),
]
