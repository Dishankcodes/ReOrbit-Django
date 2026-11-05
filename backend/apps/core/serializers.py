from rest_framework import serializers

from .models import Category, SavedAddress
from .profile import GujaratOnlyMixin


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["public_id", "name", "slug", "description", "icon", "applies_to", "status", "sort_order"]
        read_only_fields = ["public_id"]


class SavedAddressSerializer(GujaratOnlyMixin, serializers.ModelSerializer):
    class Meta:
        model = SavedAddress
        fields = [
            "public_id", "label", "recipient_name", "phone", "address_line1",
            "address_line2", "landmark", "city", "state", "pincode", "is_default",
        ]
        read_only_fields = ["public_id"]
