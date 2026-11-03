from rest_framework import serializers

from .models import Admins


class AdminSerializer(serializers.ModelSerializer):
    modules = serializers.SerializerMethodField()

    class Meta:
        model = Admins
        fields = [
            "public_id",
            "full_name",
            "email",
            "permission_level",
            "modules",
            "status",
            "last_login_at",
            "created_at",
            "updated_at",
            "activated_at",
        ]
        read_only_fields = fields

    def get_modules(self, obj):
        return obj.effective_modules()
