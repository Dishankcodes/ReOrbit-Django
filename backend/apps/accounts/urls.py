from django.urls import path

from .views import LogoutView, RefreshTokenView

urlpatterns = [
    path("token/refresh/", RefreshTokenView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
]
