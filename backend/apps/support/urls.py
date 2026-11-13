from django.urls import path
from . import views as v

urlpatterns = [
    path("me/", v.MyTickets.as_view()),
    path("me/<str:public_id>/", v.MyTicketDetail.as_view()),
    path("admin/", v.AdminTickets.as_view()),
    path("admin/<str:public_id>/", v.AdminTickets.as_view()),
]
