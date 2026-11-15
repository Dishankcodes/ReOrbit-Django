from django.urls import path
from .views import (
    AdminConversationDetail,
    AdminInbox,
    AdminMessageImage,
    ConversationDetail,
    ConversationList,
    MessageImage,
)

urlpatterns = [
    path("me/", ConversationList.as_view()),
    path("me/<str:public_id>/", ConversationDetail.as_view()),
    path("me/<str:public_id>/images/<int:message_id>/", MessageImage.as_view()),
    path("admin/", AdminInbox.as_view()),
    path("admin/<str:public_id>/images/<int:message_id>/", AdminMessageImage.as_view()),
    path("admin/<str:public_id>/", AdminConversationDetail.as_view()),
]
