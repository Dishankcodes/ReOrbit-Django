from django.urls import path

from . import views as v

urlpatterns = [
    path("config/", v.ConfigView.as_view()),
    path("verify/", v.VerifyView.as_view()),
    path("webhook/", v.WebhookView.as_view()),
    path("<str:public_id>/cancel/", v.CancelView.as_view()),
]
