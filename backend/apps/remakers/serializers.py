from rest_framework import serializers

from .models import ReMaker_Profile, ReMakers


class ReMakerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReMaker_Profile
        fields = [
            "profile_image",
            "cover_image",
            "studio_name",
            "address",
            "city",
            "state",
            "pincode",
            "phone",
            "bio",
            "skills",
            "speciality",
            "experience",
            "certification",
            "social_links",
            # counters: read-only, set by the server
            "environmental_impact",
            "total_uploads",
            "total_sales",
            "total_purchases",
            "rating_average",
            "rating_count",
        ]
        read_only_fields = [
            "environmental_impact",
            "total_uploads",
            "total_sales",
            "total_purchases",
            "rating_average",
            "rating_count",
        ]


class ReMakerSerializer(serializers.ModelSerializer):
    profile = ReMakerProfileSerializer(read_only=True)

    class Meta:
        model = ReMakers
        fields = [
            "public_id",
            "username",
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
