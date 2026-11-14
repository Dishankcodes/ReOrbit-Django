# Mounted at /api/warehouse/.
from django.urls import path

from . import views

urlpatterns = [
    path("admin/", views.ListCreateView.as_view(), name="warehouse-list"),
    path("admin/actions/", views.BulkActionView.as_view(), name="warehouse-bulk"),
    path("admin/<str:public_id>/", views.DetailView.as_view(), name="warehouse-detail"),
    path("admin/<str:public_id>/actions/<str:key>/", views.ActionView.as_view(), name="warehouse-action"),
]
