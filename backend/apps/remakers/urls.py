from django.urls import path

from . import product_views as pv
from .views import (
    CheckEmailView,
    RequestOTPView,
    RegisterView,
    LoginVerifyOTPView,
    GoogleAuthView,
    MeView,
    ProfileView,
    ProfilePhotoView,
    AdminReMakerList,
    AdminReMakerDetail,
    ProfileCoverView,
)

urlpatterns = [
    # ReMaker Authentication
    path(
        "auth/check-email/",
        CheckEmailView.as_view(),
        name="remaker-check-email",
    ),
    path(
        "auth/request-otp/",
        RequestOTPView.as_view(),
        name="remaker-request-otp",
    ),
    path(
        "auth/register/",
        RegisterView.as_view(),
        name="remaker-register",
    ),
    path(
        "auth/login/verify-otp/",
        LoginVerifyOTPView.as_view(),
        name="remaker-login-verify-otp",
    ),
    path(
        "auth/google/",
        GoogleAuthView.as_view(),
        name="remaker-google",
    ),
    # ReMaker Account
    path(
        "me/",
        MeView.as_view(),
        name="remaker-me",
    ),
    path(
        "profile/",
        ProfileView.as_view(),
        name="remaker-profile",
    ),
    path("profile/photo/", ProfilePhotoView.as_view(), name="remaker-profile-photo"),
    path("profile/cover/", ProfileCoverView.as_view(), name="remaker-profile-cover"),
    path("admin/", AdminReMakerList.as_view()),
    path("admin/<str:public_id>/", AdminReMakerDetail.as_view()),
    # Products (ReMaker's own) and admin moderation
    path("products/", pv.ListCreateView.as_view()),
    path("products/admin/", pv.AdminListView.as_view()),
    path("products/admin/<str:public_id>/", pv.AdminDetailView.as_view()),
    path("products/admin/<str:public_id>/deactivate/", pv.AdminDeactivateView.as_view()),
    path("products/admin/<str:public_id>/reactivate/", pv.AdminReactivateView.as_view()),
    path("products/<str:public_id>/", pv.DetailView.as_view()),
    path("products/<str:public_id>/publish/", pv.PublishView.as_view()),
    path("products/<str:public_id>/pause/", pv.PauseView.as_view()),
    path("products/<str:public_id>/images/", pv.ImagesView.as_view()),
    path("products/<str:public_id>/images/order/", pv.ImageOrderView.as_view()),
    path("products/<str:public_id>/images/<int:image_id>/", pv.ImageDetailView.as_view()),
]
