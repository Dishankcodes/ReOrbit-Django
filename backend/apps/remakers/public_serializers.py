from rest_framework import serializers

from .models import ReMaker_Profile, ReMakers


class PublicReMakerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReMaker_Profile
        fields = [
            "profile_image",
            "cover_image",
            "studio_name",
            "city",
            "bio",
            "skills",
            "speciality",
            "experience",
            "environmental_impact",
            "total_uploads",
            "rating_average",
            "rating_count",
        ]
        read_only_fields = fields


class PublicReMakerSerializer(serializers.ModelSerializer):
    profile = PublicReMakerProfileSerializer(read_only=True)

    class Meta:
        model = ReMakers
        fields = ["public_id", "username", "full_name", "created_at", "profile"]
        read_only_fields = fields
