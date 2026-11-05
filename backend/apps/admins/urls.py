from django.urls import path

from .views import ChangePasswordView, LoginView, MeView, ProfileView

urlpatterns = [
    path("auth/login/", LoginView.as_view()),
    path("me/", MeView.as_view()),
    path("profile/", ProfileView.as_view()),
    path("password/change/", ChangePasswordView.as_view()),
]
