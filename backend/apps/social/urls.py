# Mounted at /api/social/. Wishlist works for members, ReMakers and admins.
from django.urls import path

from . import views as v

urlpatterns = [
    path("wishlist/", v.WishlistView.as_view()),
    path("wishlist/<str:public_id>/", v.WishlistItemView.as_view()),
    path("cart/", v.CartView.as_view()),
    path("follow/", v.FollowView.as_view()),
    path("follow/<str:public_id>/", v.FollowItemView.as_view()),
    path("followers/", v.FollowersView.as_view()),
    path("followers/<str:public_id>/", v.FollowersView.as_view()),
]
