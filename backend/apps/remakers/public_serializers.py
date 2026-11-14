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
    followers_count = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = ReMakers
        fields = [
            "public_id",
            "username",
            "full_name",
            "created_at",
            "profile",
            "followers_count",
            "products_count",
        ]
        read_only_fields = fields

    # The list/detail views annotate these counts (one query for the whole
    # page). The fallbacks keep the serializer correct anywhere else it is used.
    def get_followers_count(self, obj):
        if hasattr(obj, "followers_total"):
            return obj.followers_total
        from apps.social.models import Follow

        return Follow.objects.filter(
            target=obj, follower_type__in=FOLLOWER_TYPES
        ).count()

    def get_products_count(self, obj):
        if hasattr(obj, "products_total"):
            return obj.products_total
        return live_products(obj).count()


# Admin accounts can follow too, but only members and ReMakers count as followers.
FOLLOWER_TYPES = ("user", "remaker")


def live_products(remaker):
    from apps.core.models import SellableBase

    return remaker.products.filter(
        status__in=(SellableBase.Status.LISTED, SellableBase.Status.SOLD_OUT),
        deleted_at__isnull=True,
    )


def with_public_counts(queryset):
    """Annotate ReMakers with followers_total and products_total (no N+1)."""
    from django.db.models import Count, Q

    from apps.core.models import SellableBase

    return queryset.annotate(
        followers_total=Count(
            "followers",
            filter=Q(followers__follower_type__in=FOLLOWER_TYPES),
            distinct=True,
        ),
        products_total=Count(
            "products",
            filter=Q(
                products__status__in=(
                    SellableBase.Status.LISTED,
                    SellableBase.Status.SOLD_OUT,
                ),
                products__deleted_at__isnull=True,
            ),
            distinct=True,
        ),
    )
