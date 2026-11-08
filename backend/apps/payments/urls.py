from django.urls import path

from . import payout_views as w
from . import views as v

urlpatterns = [
    path("config/", v.ConfigView.as_view()),
    path("verify/", v.VerifyView.as_view()),
    path("webhook/", v.WebhookView.as_view()),
    path("wallet/", w.WalletView.as_view()),
    path("wallet/entries/", w.EntriesView.as_view()),
    path("account/", w.AccountView.as_view()),
    path("payouts/", w.MyPayoutsView.as_view()),
    path("payouts/request/", w.RequestPayoutView.as_view()),
    path("admin/payouts/", w.AdminPayouts.as_view()),
    path("admin/payouts/run-auto/", w.AdminRunAuto.as_view()),
    path("admin/payouts/<str:public_id>/pay/", w.AdminPay.as_view()),
    path("admin/payouts/<str:public_id>/reject/", w.AdminReject.as_view()),
    path("admin/rules/", w.AdminRules.as_view()),
    path("admin/summary/", w.AdminSummary.as_view()),
    path("<str:public_id>/cancel/", v.CancelView.as_view()),
]
