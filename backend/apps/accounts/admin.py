from django.contrib import admin

from .models import OTP_Verification


@admin.register(OTP_Verification)
class OTPVerificationAdmin(admin.ModelAdmin):
    list_display = ("email", "purpose", "account_type", "attempts", "is_verified", "expires_at", "consumed_at")
    exclude = ("otp_hash",)
    readonly_fields = ("created_at",)
