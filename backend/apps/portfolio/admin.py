from django.contrib import admin

from .models import PortfolioEntry


@admin.register(PortfolioEntry)
class PortfolioEntryAdmin(admin.ModelAdmin):
    list_display = ("public_id", "title", "remaker", "visibility", "uploaded_at", "deleted_at")
    list_filter = ("visibility",)
    search_fields = ("public_id", "title", "remaker__username", "remaker__full_name")
    readonly_fields = ("public_id", "uploaded_at", "updated_at")
