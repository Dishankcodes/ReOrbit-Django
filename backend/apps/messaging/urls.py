from django.urls import path
from .views import AdminInbox, ConversationDetail, ConversationList

urlpatterns = [
    path("me/", ConversationList.as_view()),
    path("me/<str:public_id>/", ConversationDetail.as_view()),
    path("admin/", AdminInbox.as_view()),
]
