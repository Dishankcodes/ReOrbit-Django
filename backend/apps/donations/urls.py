# Mounted at /api/donations/.
from django.urls import path

from . import views

urlpatterns = [
    path("me/", views.MyDonations.as_view()),
    path("me/<str:public_id>/", views.MyDonation.as_view()),
    path("me/<str:public_id>/cancel/", views.MyCancel.as_view()),
    path("me/<str:public_id>/reschedule/", views.MyReschedule.as_view()),
    path("me/<str:public_id>/note/", views.MyNote.as_view()),
    path("admin/", views.AdminDonations.as_view()),
    path("admin/<str:public_id>/", views.AdminDonation.as_view()),
    path("admin/<str:public_id>/action/", views.AdminDonationAction.as_view()),
]
