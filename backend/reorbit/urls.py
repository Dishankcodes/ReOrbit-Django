from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/core/", include("apps.core.urls")),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/users/", include("apps.users.urls")),
    path("api/remakers/", include("apps.remakers.urls")),
    path("api/admins/", include("apps.admins.urls")),
    # Domain A: marketplace money flow
    path("api/listings/", include("apps.listings.urls")),
    path("api/marketplace/", include("apps.listings.marketplace_urls")),
    path("api/public/", include("apps.listings.public_urls")),
    path("api/portfolio/", include("apps.portfolio.urls")),
    path("api/social/", include("apps.social.urls")),
    path("api/orders/", include("apps.orders.urls")),
    path("api/payments/", include("apps.payments.urls")),
    path("api/reviews/", include("apps.reviews.urls")),
    path("api/earnings/", include("apps.earnings.urls")),
    path("api/analytics/", include("apps.analytics.urls")),
    # Domain B: platform operations
    path("api/content/", include("apps.content.urls")),
    path("api/platform/", include("apps.platform.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/support/", include("apps.support.urls")),
    path("api/complaints/", include("apps.complaints.urls")),
    path("api/donations/", include("apps.donations.urls")),
    path("api/pickups/", include("apps.pickups.urls")),
    path("api/warehouse/", include("apps.warehouse.urls")),
    path("api/rewards/", include("apps.rewards.urls")),
    path("api/messaging/", include("apps.messaging.urls")),
    path("api/adminops/", include("apps.adminops.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
