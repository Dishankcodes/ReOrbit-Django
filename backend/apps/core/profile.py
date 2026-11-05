"""Shared building blocks for the User and ReMaker profile endpoints."""

from django.db import transaction
from rest_framework import serializers
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.views import APIView

from apps.core.images import delete_file, process_image
from apps.core.responses import fail, ok
from apps.core.validators import validate_image

PREFERENCE_MAX_KEYS = 40
SOCIAL_KEYS = {"instagram", "facebook", "youtube", "twitter", "linkedin", "website", "pinterest"}


class ImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField(validators=[validate_image])


def validate_flag_dict(value, name):
    """Preferences are a small flat dict of on/off switches."""
    if not isinstance(value, dict):
        raise serializers.ValidationError(f"{name} must be an object.")
    if len(value) > PREFERENCE_MAX_KEYS:
        raise serializers.ValidationError(f"{name} has too many entries.")
    for key, flag in value.items():
        if not isinstance(key, str) or not key or len(key) > 60:
            raise serializers.ValidationError(f"{name} has an invalid key.")
        if not isinstance(flag, bool):
            raise serializers.ValidationError(f"{name}.{key} must be true or false.")
    return value


def validate_social_links(value):
    if not isinstance(value, dict):
        raise serializers.ValidationError("social_links must be an object.")
    cleaned = {}
    for key, link in value.items():
        if key not in SOCIAL_KEYS:
            raise serializers.ValidationError(f"Unknown social link: {key}.")
        link = (link or "").strip() if isinstance(link, str) else ""
        if link and not link.lower().startswith(("http://", "https://")):
            raise serializers.ValidationError(f"{key} must start with http:// or https://")
        if len(link) > 300:
            raise serializers.ValidationError(f"{key} link is too long.")
        if link:
            cleaned[key] = link
    return cleaned


class BaseProfileView(APIView):
    """GET / PATCH the signed-in member's profile together with the account name fields.

    Subclasses set: permission_classes, profile_serializer, account_serializer,
    account_fields (editable fields on the account row).
    """

    parser_classes = [JSONParser, MultiPartParser, FormParser]
    profile_serializer = None
    account_serializer = None
    account_fields = ("full_name",)

    def payload(self, request):
        account = request.user.account
        ctx = {"request": request}
        account.refresh_from_db()
        return {
            "account": self.account_serializer(account, context=ctx).data,
            "profile": self.profile_serializer(account.profile, context=ctx).data,
        }

    def clean_account(self, request, data):
        """Return (changes, errors) for the account row."""
        changes, errors = {}, {}
        if "full_name" in data:
            name = " ".join(str(data.get("full_name") or "").split())
            if not name:
                errors["full_name"] = ["Name is required."]
            elif len(name) > 150:
                errors["full_name"] = ["Name must be 150 characters or fewer."]
            else:
                changes["full_name"] = name
        return changes, errors

    def get(self, request):
        return ok(self.payload(request))

    def patch(self, request):
        account = request.user.account
        data = request.data
        changes, errors = self.clean_account(request, data)
        # profile images only change through the photo endpoints
        profile_data = {
            k: v for k, v in data.items() if k not in ("profile_image", "cover_image")
        }
        serializer = self.profile_serializer(
            account.profile, data=profile_data, partial=True, context={"request": request}
        )
        if not serializer.is_valid():
            errors.update(serializer.errors)
        if errors:
            return fail("Please correct the highlighted fields.", errors=errors)
        with transaction.atomic():
            for key, value in changes.items():
                setattr(account, key, value)
            if changes:
                account.save(update_fields=[*changes.keys(), "updated_at"])
            serializer.save()
        return ok(self.payload(request), "Profile updated successfully.")


class BaseImageView(APIView):
    """POST (multipart, field "image") replaces the picture, DELETE removes it."""

    parser_classes = [MultiPartParser, FormParser]
    profile_serializer = None
    field = "profile_image"
    max_side = 1024
    label = "Profile photo"

    def respond(self, request, message):
        profile = request.user.account.profile
        profile.refresh_from_db()
        data = self.profile_serializer(profile, context={"request": request}).data
        return ok({"profile": data}, message)

    def post(self, request):
        upload = ImageUploadSerializer(data=request.data)
        if not upload.is_valid():
            return fail("Upload a valid image.", errors=upload.errors)
        profile = request.user.account.profile
        old = getattr(profile, self.field)
        old_name, old_storage = (old.name, old.storage) if old else (None, None)
        new_file = process_image(upload.validated_data["image"], self.max_side)
        getattr(profile, self.field).save(new_file.name, new_file, save=False)
        profile.save(update_fields=[self.field])
        if old_name:
            old_storage.delete(old_name)
        return self.respond(request, f"{self.label} updated.")

    def delete(self, request):
        profile = request.user.account.profile
        old = getattr(profile, self.field)
        if old:
            delete_file(old)
            setattr(profile, self.field, None)
            profile.save(update_fields=[self.field])
        return self.respond(request, f"{self.label} removed.")
