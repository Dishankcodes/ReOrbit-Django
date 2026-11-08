from django.urls import path

from . import views as v

urlpatterns = [
    path("addresses/", v.AddressList.as_view()),
    path("addresses/<str:public_id>/", v.AddressDetail.as_view()),
    path("addresses/<str:public_id>/default/", v.AddressDefault.as_view()),
    path("quote/", v.QuoteView.as_view()),
    path("checkout/", v.CheckoutView.as_view()),
    path("me/", v.MyOrders.as_view()),
    path("me/<str:public_id>/", v.MyOrderDetail.as_view()),
    path("me/<str:public_id>/cancel/", v.MyOrderCancel.as_view()),
    path("sales/", v.SalesList.as_view()),
    path("sales/<str:public_id>/", v.SalesDetail.as_view()),
    path("sales/<str:public_id>/<str:action>/", v.SalesAction.as_view()),
    path("admin/", v.AdminList.as_view()),
    path("admin/<str:public_id>/", v.AdminDetail.as_view()),
    path("admin/<str:public_id>/<str:action>/", v.AdminAction.as_view()),
]
