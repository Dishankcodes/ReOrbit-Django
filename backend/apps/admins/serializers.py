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
            "role_key",
            "phone",
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


class TeamMemberSerializer(serializers.ModelSerializer):
    """One row of the Team page."""

    modules = serializers.SerializerMethodField()
    invited = serializers.BooleanField(read_only=True)
    created_by = serializers.SlugRelatedField(slug_field="public_id", read_only=True)

    class Meta:
        model = Admins
        fields = [
            "public_id",
            "full_name",
            "email",
            "phone",
            "note",
            "role_key",
            "permission_level",
            "modules",
            "status",
            "invited",
            "last_login_at",
            "created_at",
            "created_by",
        ]
        read_only_fields = fields

    def get_modules(self, obj):
        return obj.effective_modules()
