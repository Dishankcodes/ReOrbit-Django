from django.urls import path
from .views import RefreshTokenView, LogoutView

urlpatterns = [
    path('token/refresh/', RefreshTokenView.as_view(), name='token-refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
]
