from django.urls import path

from . import views as v

# Mounted at /api/rewards/.
urlpatterns = [
    path("me/vouchers/", v.MyVouchers.as_view()),
]
