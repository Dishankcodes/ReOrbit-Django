from django.urls import path

from . import category_admin as ca
from .views import CategoryListView, CommerceRulesView

urlpatterns = [
    path("settings/", CommerceRulesView.as_view()),
    path("categories/", CategoryListView.as_view()),
    path("admin/categories/", ca.AdminCategories.as_view()),
    path("admin/categories/<str:public_id>/", ca.AdminCategoryDetail.as_view()),
    path("admin/categories/<str:public_id>/move/", ca.AdminCategoryMove.as_view()),
]
