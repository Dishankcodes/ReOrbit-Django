from django.urls import path

from . import views as v

# Mounted at /api/pickups/. Admin only (module "pickups").
urlpatterns = [
    path("admin/requests/", v.AdminRequests.as_view()),
    path("admin/requests/<str:public_id>/<str:action>/", v.AdminRequestAction.as_view()),
    path("admin/teams/", v.AdminTeams.as_view()),
    path("admin/teams/<str:public_id>/", v.AdminTeamDetail.as_view()),
    path("admin/teams/<str:public_id>/status/", v.AdminTeamStatus.as_view()),
    path("admin/teams/<str:public_id>/members/", v.AdminTeamMembers.as_view()),
    path("admin/teams/<str:public_id>/members/<str:member>/", v.AdminTeamMember.as_view()),
    path("admin/teams/<str:public_id>/members/<str:member>/<str:action>/", v.AdminTeamMemberAction.as_view()),
]
