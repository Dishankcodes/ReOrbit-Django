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


EMPTY_PROFILE = {
    "profile_image": None,
    "bio": "",
    "address": "",
    "city": "",
    "state": "",
    "phone": "",
    "pincode": "",
    "notification_preferences": {},
    "privacy_preferences": {},
    "environmental_impact": 0,
    "total_uploads": 0,
    "total_sales": 0,
    "total_purchases": 0,
    "orbit_points": 0,
}


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    has_password = serializers.SerializerMethodField()

    def get_has_password(self, obj):
        return bool(obj.password)

    def to_representation(self, instance):
        """A user saved without a profile row (old data, a half-finished import) still gets an
        empty profile, so screens that read user.profile.city never crash on null."""
        data = super().to_representation(instance)
        if data.get("profile") is None:
            data["profile"] = EMPTY_PROFILE.copy()
        return data

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
            "last_seen_at",
            "created_at",
            "updated_at",
            "has_password",
            "profile",
        ]
        read_only_fields = fields


class AdminUserSerializer(UserSerializer):
    """What an admin sees about a user (never the password)."""

    uploads_count = serializers.SerializerMethodField()
    sold_count = serializers.SerializerMethodField()
    bought_count = serializers.SerializerMethodField()

    class Meta(UserSerializer.Meta):
        fields = [f for f in UserSerializer.Meta.fields if f != "has_password"] + [
            "status_changed_at", "uploads_count", "sold_count", "bought_count",
        ]
        read_only_fields = fields

    # filled by the admin list/detail querysets (users.views._with_counts); counted here anywhere else
    def get_uploads_count(self, obj):
        if hasattr(obj, "uploads_count"):
            return obj.uploads_count
        from apps.listings.models import Item

        return Item.objects.filter(user=obj, deleted_at__isnull=True).exclude(item_status="Draft").count()

    def get_sold_count(self, obj):
        if hasattr(obj, "sold_count"):
            return obj.sold_count
        from apps.orders.models import Order

        return Order.objects.filter(seller_user=obj, status=Order.Status.DELIVERED).count()

    def get_bought_count(self, obj):
        if hasattr(obj, "bought_count"):
            return obj.bought_count
        from apps.orders.models import Order

        return Order.objects.filter(buyer_user=obj).exclude(
            status__in=(Order.Status.CANCELLED, Order.Status.PENDING_PAYMENT)).count()
