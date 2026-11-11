from rest_framework import serializers

from apps.admins.models import AdminItem
from apps.remakers.models import RemakerProduct

from .serializers import ImageSerializer, _images


class _Base(serializers.ModelSerializer):
    id = serializers.CharField(source="public_id")
    category = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    cover = serializers.SerializerMethodField()

    def get_category(self, obj):
        c = obj.category
        return {"id": c.public_id, "name": c.name, "slug": c.slug}

    def get_images(self, obj):
        return ImageSerializer(_images(obj), many=True, context=self.context).data

    def get_cover(self, obj):
        imgs = _images(obj)
        return ImageSerializer(imgs[0], context=self.context).data["url"] if imgs else None


COMMON = ["id", "title", "description", "category", "price", "stock", "status",
          "images", "cover", "created_at", "updated_at"]


class RemakerProductSerializer(_Base):
    """The ReMaker's own view of a product, also used by admin moderation."""

    remaker = serializers.SerializerMethodField()
    deactivation = serializers.SerializerMethodField()

    class Meta:
        model = RemakerProduct
        fields = COMMON + ["materials", "dimensions", "customization_available",
                           "pickup_preference", "remaker", "deactivation"]

    def get_remaker(self, obj):
        r = obj.remaker
        return {"id": r.public_id, "name": r.full_name, "username": r.username}

    def get_deactivation(self, obj):
        if obj.deactivated_by_id is None:
            return None
        return {"reason": obj.deactivation_reason, "at": obj.deactivated_at}


class AdminItemSerializer(_Base):
    admin = serializers.SerializerMethodField()

    class Meta:
        model = AdminItem
        fields = COMMON + ["sku", "admin"]

    def get_admin(self, obj):
        return {"id": obj.admin.public_id, "name": obj.admin.full_name}
