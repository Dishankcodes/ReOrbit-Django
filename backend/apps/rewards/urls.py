# Mounted at /api/rewards/.
from django.urls import path

from . import views as v

urlpatterns = [
    path("me/summary/", v.MySummary.as_view()),
    path("me/ledger/", v.MyLedger.as_view()),
    path("me/rules/", v.MyRules.as_view()),
    path("me/offers/", v.MyOffers.as_view()),
    path("me/offers/<str:offer_id>/redeem/", v.MyRedeem.as_view()),
    path("me/vouchers/", v.MyVouchers.as_view()),
    path("admin/rules/", v.AdminRules.as_view()),
    path("admin/rules/<str:key>/", v.AdminRule.as_view()),
    path("admin/offers/", v.AdminOffers.as_view()),
    path("admin/offers/<str:public_id>/", v.AdminOffer.as_view()),
    path("admin/redemptions/", v.AdminRedemptions.as_view()),
    path("admin/redemptions/<str:public_id>/cancel/", v.AdminRedemptionCancel.as_view()),
    path("admin/users/", v.AdminUsers.as_view()),
    path("admin/users/<str:public_id>/adjust/", v.AdminUserAdjust.as_view()),
    path("admin/users/<str:public_id>/ledger/", v.AdminUserLedger.as_view()),
    path("admin/donation-rewards/", v.AdminDonationRewards.as_view()),
    path("admin/donation-rewards/<str:public_id>/revoke/", v.AdminDonationRewardRevoke.as_view()),
    path("admin/donation-rewards/<str:public_id>/restore/", v.AdminDonationRewardRestore.as_view()),
]
