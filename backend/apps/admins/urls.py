from django.urls import path

from . import store_views as sv
from .team import (
    TeamActivityView,
    TeamDetailView,
    TeamListView,
    TeamResetPasswordView,
    TeamStatusView,
)
from .views import ChangePasswordView, NotificationPrefsView, ForgotPasswordRequestOTP, ForgotPasswordReset, LoginView, MeView, ProfileView

urlpatterns = [
    path("auth/login/", LoginView.as_view()),
    path("auth/forgot-password/request-otp/", ForgotPasswordRequestOTP.as_view()),
    path("auth/forgot-password/reset/", ForgotPasswordReset.as_view()),
    path("me/", MeView.as_view()),
    path("notification-preferences/", NotificationPrefsView.as_view()),
    path("profile/", ProfileView.as_view()),
    path("password/change/", ChangePasswordView.as_view()),
    path("store/", sv.ListCreateView.as_view()),
    path("store/stats/", sv.StatsView.as_view()),
    path("store/<str:public_id>/", sv.DetailView.as_view()),
    path("store/<str:public_id>/publish/", sv.PublishView.as_view()),
    path("store/<str:public_id>/pause/", sv.PauseView.as_view()),
    path("store/<str:public_id>/images/", sv.ImagesView.as_view()),
    path("store/<str:public_id>/images/order/", sv.ImageOrderView.as_view()),
    path("store/<str:public_id>/images/<int:image_id>/", sv.ImageDetailView.as_view()),
    path("team/", TeamListView.as_view()),
    path("team/activity/", TeamActivityView.as_view()),
    path("team/<str:public_id>/", TeamDetailView.as_view()),
    path("team/<str:public_id>/status/", TeamStatusView.as_view()),
    path("team/<str:public_id>/reset-password/", TeamResetPasswordView.as_view()),
]
