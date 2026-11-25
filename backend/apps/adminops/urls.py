from django.urls import path

from . import account_status, accounts, system_control, system_status
from . import views as v

# Mounted at /api/adminops/.
urlpatterns = [
    path("admin/dashboard/", v.AdminDashboard.as_view()),
    path("admin/operations/", v.AdminOperations.as_view()),
    path("admin/system-status/", system_status.AdminSystemStatus.as_view()),
    # Super Admin › System: pause switches + usage log
    path("admin/system/", system_control.AdminSystem.as_view()),
    path("admin/system/pause/", system_control.AdminSystemPause.as_view()),
    path("admin/system/providers/", system_control.AdminSystemProviders.as_view()),
    path("admin/accounts/<str:public_id>/", accounts.AdminAccountDetail.as_view()),
    path("admin/accounts/<str:public_id>/status/", account_status.AdminAccountStatus.as_view()),
]
