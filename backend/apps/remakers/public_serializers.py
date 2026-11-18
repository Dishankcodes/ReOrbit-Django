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
    rescued_count = serializers.SerializerMethodField()

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
            "rescued_count",
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

    def get_rescued_count(self, obj):
        return int(getattr(obj, "rescued_total", 0) or 0)

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
    """Annotate ReMakers with followers_total, products_total and rescued_total (no N+1).

    rescued_total: pieces the ReMaker bought from members on ReOrbit and received (delivered orders),
    which is the material they rescue for new work."""
    from django.db.models import Count, IntegerField, OuterRef, Q, Subquery, Sum
    from django.db.models.functions import Coalesce

    from apps.core.models import SellableBase
    from apps.orders.models import Order, OrderItem

    rescued = (OrderItem.objects.filter(order__buyer_remaker=OuterRef("pk"), order__seller_user__isnull=False,
                                        order__status=Order.Status.DELIVERED)
               .values("order__buyer_remaker").annotate(n=Sum("qty")).values("n")[:1])

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
        rescued_total=Coalesce(Subquery(rescued, output_field=IntegerField()), 0),
    )
