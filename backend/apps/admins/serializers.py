from rest_framework import serializers
from .models import Admins


class AdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Admins
        fields = [
            "admin_id",
            "full_name",
            "email",
            "permission_level",
            "status",
            "created_at",
            "updated_at",
            "activated_at",
        ]
