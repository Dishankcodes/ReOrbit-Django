from rest_framework import serializers

from .models import User_Profile, Users


class UserProfileSerializer(serializers.ModelSerializer):
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
        ]


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

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
            "profile",
        ]
        read_only_fields = fields
