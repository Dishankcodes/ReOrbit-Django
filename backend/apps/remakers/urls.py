from django.urls import path

from .views import (
    CheckEmailView,
    RequestOTPView,
    RegisterView,
    LoginVerifyOTPView,
    MeView,
    ProfileView,
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
]
