# Mounted at /api/listings/
from django.urls import path

from . import views as v

urlpatterns = [
    path("categories/", v.CategoryListView.as_view()),
    path("me/", v.MyListView.as_view()),
    path("me/<str:public_id>/", v.MyDetailView.as_view()),
    path("me/<str:public_id>/publish/", v.MyPublishView.as_view()),
    path("me/<str:public_id>/price-suggestion/", v.MyPriceSuggestionView.as_view()),
    path("me/<str:public_id>/withdraw/", v.MyWithdrawView.as_view()),
    path("me/<str:public_id>/images/", v.MyImagesView.as_view()),
    path("me/<str:public_id>/images/order/", v.MyImageOrderView.as_view()),
    path("me/<str:public_id>/images/<int:image_id>/", v.MyImageDetailView.as_view()),
    path("admin/", v.AdminListView.as_view()),
    path("admin/<str:public_id>/", v.AdminDetailView.as_view()),
    path("admin/<str:public_id>/suggest-price/", v.AdminSuggestPriceView.as_view()),
    path("admin/<str:public_id>/moderate/", v.AdminModerateView.as_view()),
    path("", v.PublicListView.as_view()),
    path("<str:public_id>/", v.PublicDetailView.as_view()),
]
