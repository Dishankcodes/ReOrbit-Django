from django.contrib import admin

from .models import Admins


@admin.register(Admins)
class AdminsAdmin(admin.ModelAdmin):
    list_display = ("public_id", "email", "permission_level", "status")
    exclude = ("password",)
