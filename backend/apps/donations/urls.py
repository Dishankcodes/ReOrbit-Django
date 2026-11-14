from django.urls import path

from . import views as v

# Mounted at /api/donations/.
urlpatterns = [
    path("me/", v.MyDonations.as_view()),
    path("me/<str:public_id>/", v.MyDonationDetail.as_view()),
    path("me/<str:public_id>/certificate/", v.MyDonationCertificate.as_view()),
    path("me/<str:public_id>/<str:action>/", v.MyDonationAction.as_view()),
    path("admin/partners/", v.AdminPickupPartners.as_view()),
    path("admin/", v.AdminDonations.as_view()),
    path("admin/<str:public_id>/", v.AdminDonationDetail.as_view()),
    path("admin/<str:public_id>/<str:action>/", v.AdminDonationAction.as_view()),
    path("partner/pickups/", v.PartnerPickups.as_view()),
    path("partner/pickups/<str:public_id>/<str:action>/", v.PartnerPickupAction.as_view()),
]
