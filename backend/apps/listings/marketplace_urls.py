# Mounted at /api/marketplace/
from django.urls import path

from . import marketplace as m

urlpatterns = [
    path("categories/", m.CategoriesView.as_view()),
    path("", m.BrowseView.as_view()),
    path("<str:public_id>/", m.DetailView.as_view()),
]
