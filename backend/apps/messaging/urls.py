from django.urls import path
from .views import AdminConversationDetail, AdminInbox, ConversationDetail, ConversationList

urlpatterns = [
    path("me/", ConversationList.as_view()),
    path("me/<str:public_id>/", ConversationDetail.as_view()),
    path("admin/", AdminInbox.as_view()),
    path("admin/<str:public_id>/", AdminConversationDetail.as_view()),
]
