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
    path("auth/check-email/", CheckEmailView.as_view()),
    path("auth/request-otp/", RequestOTPView.as_view()),
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/verify-otp/", LoginVerifyOTPView.as_view()),
    path("me/", MeView.as_view()),
    path("profile/", ProfileView.as_view()),
]
