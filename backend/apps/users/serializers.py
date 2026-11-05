from rest_framework import serializers

from apps.core.profile import GujaratOnlyMixin, validate_flag_dict

from .models import User_Profile, Users


class UserProfileSerializer(GujaratOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = User_Profile
        fields = [
            "profile_image",
            "bio",
            "address",
            "city",
            "state",
            "phone",
            "pincode",
            "notification_preferences",
            "privacy_preferences",
            # counters: read-only, set by the server
            "environmental_impact",
            "total_uploads",
            "total_sales",
            "total_purchases",
            "orbit_points",
        ]
        read_only_fields = [
            "environmental_impact",
            "total_uploads",
            "total_sales",
            "total_purchases",
            "orbit_points",
            "profile_image",  # changed only through /profile/photo/
        ]

    def validate_notification_preferences(self, value):
        return validate_flag_dict(value, "notification_preferences")

    def validate_privacy_preferences(self, value):
        return validate_flag_dict(value, "privacy_preferences")


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    has_password = serializers.SerializerMethodField()

    def get_has_password(self, obj):
        return bool(obj.password)

    class Meta:
        model = Users
        fields = [
            "public_id",
            "full_name",
            "email",
            "auth_provider",
            "status",
            "status_reason",
            "email_verified_at",
            "last_login_at",
            "created_at",
            "updated_at",
            "has_password",
            "profile",
        ]
        read_only_fields = fields


class AdminUserSerializer(UserSerializer):
    """What an admin sees about a user (never the password)."""

    class Meta(UserSerializer.Meta):
        fields = [f for f in UserSerializer.Meta.fields if f != "has_password"] + [
            "status_changed_at",
        ]
        read_only_fields = fields
