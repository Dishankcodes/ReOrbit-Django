# Mounted at /api/reviews/
from django.urls import path

from . import views as v

urlpatterns = [
    path("me/", v.MyReviews.as_view()),
    path("me/orders/<str:order_id>/items/<str:line_id>/product/", v.ProductReviewSave.as_view()),
    path("me/orders/<str:order_id>/seller/", v.SellerReviewSave.as_view()),
    path("received/", v.ReceivedReviews.as_view()),
    path("received/<str:review_id>/reply/", v.ReceivedReply.as_view()),
    path("public/product/<str:ref>/", v.PublicProductReviews.as_view()),
    path("public/seller/<str:seller_type>/<str:seller_id>/", v.PublicSellerReviews.as_view()),
    path("admin/", v.AdminReviews.as_view()),
    path("admin/reports/<str:report_id>/resolve/", v.AdminResolveReport.as_view()),
    path("admin/<str:review_id>/hide/", v.AdminHide.as_view()),
    path("admin/<str:review_id>/restore/", v.AdminRestore.as_view()),
    path("<str:review_id>/report/", v.ReportReview.as_view()),
]
