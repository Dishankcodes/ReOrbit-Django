from django.urls import path

from .views import CategoryListView, CommerceRulesView

urlpatterns = [
    path("settings/", CommerceRulesView.as_view()),
    path("categories/", CategoryListView.as_view()),
]
