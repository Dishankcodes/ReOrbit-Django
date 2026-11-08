# Mounted at /api/public/
from django.urls import path

from . import public as p

urlpatterns = [
    path("home/", p.HomeView.as_view()),
    path("remakers/", p.RemakersView.as_view()),
]
