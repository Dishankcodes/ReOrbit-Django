from rest_framework import serializers

from apps.core.models import Category

from .models import Item, MediaImage


class ImageSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    url = serializers.SerializerMethodField()

    class Meta:
        model = MediaImage
        fields = ["id", "url", "image_type", "display_order"]

    def get_url(self, obj):
        request = self.context.get("request")
        url = obj.image.url
        return request.build_absolute_uri(url) if request else url


class CategorySerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="public_id")

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "icon"]


def _images(obj):
    # uses prefetch_related("images") when the view did it
    return sorted(obj.images.all(), key=lambda i: (i.display_order, i.pk))


class ItemSerializer(serializers.ModelSerializer):
    """What the owner (and the admin) see."""

    id = serializers.CharField(source="public_id")
    category = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    seller = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = [
            "id",
            "title",
            "description",
            "category",
            "condition",
            "quantity",
            "estimated_price",
            "listing_price",
            "pickup_preference",
            "item_status",
            "moderation_status",
            "moderation_note",
            "moderated_at",
            "suggested_price",
            "suggested_note",
            "suggested_at",
            "suggestion_status",
            "city",
            "pincode",
            "images",
            "seller",
            "created_at",
            "updated_at",
        ]

    def get_category(self, obj):
        c = obj.category
        return {"id": c.public_id, "name": c.name, "slug": c.slug}

    def get_images(self, obj):
        return ImageSerializer(_images(obj), many=True, context=self.context).data

    def get_seller(self, obj):
        u = obj.user
        return {"id": u.public_id, "name": u.full_name}


class PublicItemSerializer(ItemSerializer):
    """Buyers never see moderation details or the seller's email."""

    class Meta(ItemSerializer.Meta):
        fields = [
            f
            for f in ItemSerializer.Meta.fields
            if f
            not in (
                "estimated_price",
                "moderation_status",
                "moderation_note",
                "moderated_at",
                "suggested_price",
                "suggested_note",
                "suggested_at",
                "suggestion_status",
                "updated_at",
            )
        ]


class AdminItemSerializer(ItemSerializer):
    """The admin sees who the seller is, not just a name."""

    def get_seller(self, obj):
        u = obj.user
        return {
            "id": u.public_id,
            "name": u.full_name,
            "email": u.email,
            "status": u.status,
            "city": u.city or "",
            "since": u.created_at,
        }
