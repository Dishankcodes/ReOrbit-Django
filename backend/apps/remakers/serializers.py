from rest_framework import serializers
from .models import ReMakers, ReMaker_Profile


class ReMakerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReMaker_Profile
        fields = "__all__"


class ReMakerSerializer(serializers.ModelSerializer):
    profile = ReMakerProfileSerializer(read_only=True)

    class Meta:
        model = ReMakers
        fields = [
            "remaker_id",
            "username",
            "full_name",
            "email",
            "auth_provider",
            "status",
            "created_at",
            "updated_at",
            "profile",
        ]
