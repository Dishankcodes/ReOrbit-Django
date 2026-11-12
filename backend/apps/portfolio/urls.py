# Mounted at /api/portfolio/.
from django.urls import path

from . import views

urlpatterns = [
    # a ReMaker's own works
    path("me/", views.ListCreateView.as_view(), name="portfolio-mine"),
    path("me/<str:public_id>/", views.DetailView.as_view(), name="portfolio-mine-detail"),
    path("me/<str:public_id>/restore/", views.RestoreView.as_view(), name="portfolio-restore"),
    # admin (read only) and public
    path("admin/<str:remaker_id>/", views.AdminListView.as_view(), name="portfolio-admin"),
    path("public/<str:remaker_id>/", views.PublicListView.as_view(), name="portfolio-public"),
]
