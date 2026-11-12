# Mounted at /api/reviews/
from django.urls import path

from . import views as v

urlpatterns = [
    path("me/", v.MyReviews.as_view()),
    path("me/orders/<str:order_id>/items/<str:line_id>/product/", v.ProductReviewSave.as_view()),
    path("me/orders/<str:order_id>/seller/", v.SellerReviewSave.as_view()),
    path("received/", v.ReceivedReviews.as_view()),
    path("received/<str:review_id>/reply/", v.ReceivedReply.as_view()),
]
