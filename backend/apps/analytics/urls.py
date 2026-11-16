# Mounted at /api/analytics/.
from django.urls import path

from .views import MyAnalytics, RecordView

urlpatterns = [
    path("me/", MyAnalytics.as_view()),
    path("view/", RecordView.as_view()),
]
