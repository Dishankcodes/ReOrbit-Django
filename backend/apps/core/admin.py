from django.contrib import admin

from .models import AuditLog, Category, Notification, PlatformSettings, SavedAddress

admin.site.register(Category)
admin.site.register(PlatformSettings)
admin.site.register(SavedAddress)
admin.site.register(Notification)
admin.site.register(AuditLog)
