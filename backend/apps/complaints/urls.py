from django.urls import path

from . import views as v

# Mounted at /api/complaints/. Members file reports; the team (module "complaints") works them.
urlpatterns = [
    path("me/", v.MyReport.as_view()),
    path("admin/", v.AdminComplaints.as_view()),
    path("admin/targets/", v.AdminTargets.as_view()),
    path("admin/<str:public_id>/notes/", v.AdminNotes.as_view()),
    path("admin/<str:public_id>/<str:action>/", v.AdminAction.as_view()),
]
