# Mounted at /api/rewards/.
from django.urls import path

from . import views

urlpatterns = [path("me/vouchers/", views.MyVouchers.as_view())]
