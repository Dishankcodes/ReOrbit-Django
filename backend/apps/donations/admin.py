from django.contrib import admin

from .models import Donation, PickupPartner


@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = ("public_id", "title", "donor", "status", "assigned_partner", "pickup_date", "created_at")
    list_filter = ("status", "category")
    search_fields = ("public_id", "title", "donor__email")
    readonly_fields = ("public_id", "created_at", "updated_at")


@admin.register(PickupPartner)
class PickupPartnerAdmin(admin.ModelAdmin):
    """Tokens are generated on save; copy the value here to give a driver access."""
    list_display = ("public_id", "name", "lead_name", "phone", "status", "token")
    readonly_fields = ("public_id", "token", "created_at", "updated_at")
