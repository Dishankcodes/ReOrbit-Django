from rest_framework import serializers
from .models import Users, User_Profile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User_Profile
        fields = [
            "profile_id",
            "profile_image",
            "address",
            "city",
            "state",
            "phone",
            "pincode",
            "environmental_impact",
            "total_uploads",
            "total_sales",
            "total_purchases",
        ]


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = Users
        fields = [
            "user_id",
            "full_name",
            "email",
            "auth_provider",
            "status",
            "created_at",
            "updated_at",
            "profile",
        ]
