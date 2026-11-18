# Mounted at /api/public/
from django.urls import path

from apps.content.feedback import PublicTestimonials

from . import public as p

urlpatterns = [
    path("home/", p.HomeView.as_view()),
    path("remakers/", p.RemakersView.as_view()),
    path("top-selling/", p.TopSellingView.as_view()),
    path("discover-remakers/", p.DiscoverRemakersView.as_view()),
    path("testimonials/", PublicTestimonials.as_view()),
]
