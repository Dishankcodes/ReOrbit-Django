from django.urls import path

from . import account_status, accounts
from . import views as v

# Mounted at /api/adminops/.
urlpatterns = [
    path("admin/dashboard/", v.AdminDashboard.as_view()),
    path("admin/operations/", v.AdminOperations.as_view()),
    path("admin/accounts/<str:public_id>/", accounts.AdminAccountDetail.as_view()),
    path("admin/accounts/<str:public_id>/status/", account_status.AdminAccountStatus.as_view()),
]
