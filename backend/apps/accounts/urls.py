from django.urls import path

from .views import AccountsStatusView


urlpatterns = [
    path(
        'status/',
        AccountsStatusView.as_view(),
        name='accounts-status'
    ),
]