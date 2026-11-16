from django.urls import path

from . import views as v

# Mounted at /api/adminops/.
urlpatterns = [
    path("admin/dashboard/", v.AdminDashboard.as_view()),
    path("admin/operations/", v.AdminOperations.as_view()),
]
