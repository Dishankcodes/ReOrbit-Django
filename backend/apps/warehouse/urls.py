# Mounted at /api/warehouse/.
from django.urls import path

from . import views

urlpatterns = [
    path("admin/", views.AdminItems.as_view()),
    path("admin/<str:public_id>/", views.AdminItemDetail.as_view()),
]
