from django.contrib import admin

from .models import Voucher


@admin.register(Voucher)
class VoucherAdmin(admin.ModelAdmin):
    list_display = ("code", "owner", "amount", "min_order", "status", "expires_at", "source_id")
    list_filter = ("status",)
    search_fields = ("code", "owner__email", "source_id")
    readonly_fields = ("public_id", "created_at", "updated_at", "used_at", "used_checkout")
