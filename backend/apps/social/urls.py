# Mounted at /api/social/. Wishlist works for members, ReMakers and admins.
from django.urls import path

from . import views as v

urlpatterns = [
    path("wishlist/", v.WishlistView.as_view()),
    path("wishlist/<str:public_id>/", v.WishlistItemView.as_view()),
]
