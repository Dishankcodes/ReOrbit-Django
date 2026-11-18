from rest_framework import serializers

from apps.core.profile import GujaratOnlyMixin, validate_flag_dict, validate_social_links

from .models import ReMaker_Profile, ReMakers


class ReMakerProfileSerializer(GujaratOnlyMixin, serializers.ModelSerializer):
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
            "notification_preferences",
            "privacy_preferences",
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
            "profile_image",  # changed only through /profile/photo/
            "cover_image",  # changed only through /profile/cover/
        ]

    def validate_social_links(self, value):
        return validate_social_links(value)

    def validate_notification_preferences(self, value):
        return validate_flag_dict(value, "notification_preferences")

    def validate_privacy_preferences(self, value):
        return validate_flag_dict(value, "privacy_preferences")


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


class AdminReMakerSerializer(ReMakerSerializer):
    # filled by the admin list/detail querysets (see remakers.views._with_counts)
    products_count = serializers.SerializerMethodField()
    sales_count = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()

    class Meta(ReMakerSerializer.Meta):
        fields = ReMakerSerializer.Meta.fields + ["status_changed_at", "products_count", "sales_count", "followers_count"]
        read_only_fields = fields

    def get_products_count(self, obj):
        return getattr(obj, "products_count", 0)

    def get_sales_count(self, obj):
        return getattr(obj, "sales_count", 0)

    def get_followers_count(self, obj):
        return getattr(obj, "followers_count", 0)
