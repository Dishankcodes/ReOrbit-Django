from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    ForgotPasswordRequestOTPView,
    ForgotPasswordVerifyOTPView,
    ForgotPasswordResetView,
    MeView,
    ProfileView,
)

urlpatterns = [
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", LoginView.as_view()),
    path("auth/forgot-password/request-otp/", ForgotPasswordRequestOTPView.as_view()),
    path("auth/forgot-password/verify-otp/", ForgotPasswordVerifyOTPView.as_view()),
    path("auth/forgot-password/reset/", ForgotPasswordResetView.as_view()),
    path("me/", MeView.as_view()),
    path("profile/", ProfileView.as_view()),
]
