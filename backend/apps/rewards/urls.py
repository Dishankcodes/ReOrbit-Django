from django.urls import path

from . import views as v

# Mounted at /api/rewards/.
urlpatterns = [
    path("me/vouchers/", v.MyVouchers.as_view()),
    path("me/summary/", v.MySummary.as_view()),
    path("me/ledger/", v.MyLedger.as_view()),
    path("me/rules/", v.MyRules.as_view()),
    path("me/offers/", v.MyOffers.as_view()),
]
