from django.urls import path
from . import contact
from . import views as v

urlpatterns = [
    path("contact/", contact.PublicContact.as_view()),
    path("admin/contact/", contact.AdminContactMessages.as_view()),
    path("admin/contact/<str:public_id>/", contact.AdminContactMessage.as_view()),
    path("me/", v.MyTickets.as_view()),
    path("me/<str:public_id>/", v.MyTicketDetail.as_view()),
    path("admin/", v.AdminTickets.as_view()),
    path("admin/<str:public_id>/", v.AdminTickets.as_view()),
]
