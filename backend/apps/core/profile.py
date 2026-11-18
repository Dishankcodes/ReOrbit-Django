"""Shared building blocks for the User and ReMaker profile endpoints."""

from django.db import transaction
from rest_framework import serializers
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.views import APIView

from apps.core.images import delete_file, process_image
from apps.core.responses import fail, ok
from apps.core.validators import (
    validate_gujarat_city,
    validate_gujarat_pincode,
    validate_gujarat_state,
    validate_image,
)

PREFERENCE_MAX_KEYS = 40
SOCIAL_KEYS = {"instagram", "facebook", "youtube", "twitter", "linkedin", "website", "pinterest"}


class GujaratOnlyMixin:
    """Pincode and state of a profile / address must be inside Gujarat."""

    def validate_pincode(self, value):
        return validate_gujarat_pincode(value)

    def validate_city(self, value):
        return validate_gujarat_city(value)

    def validate_state(self, value):
        return validate_gujarat_state(value)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if attrs.get("pincode") or attrs.get("city"):
            attrs["state"] = "Gujarat"
        return attrs


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



def sync_place_from_address(account):
    """The address book is where members and ReMakers keep their phone, city, pincode and address.
    Copy the default saved address onto the profile (which the seller page, forms and admin screens
    read), so there is one place to change them. Called after every address change and when the
    profile opens. Does nothing for admins, or when there is no saved address yet."""
    from apps.core import buyers
    from apps.core.models import SavedAddress

    p = getattr(account, "profile", None)
    if p is None:
        return
    try:
        if buyers.type_of(account) == "admin":
            return
        a = SavedAddress.objects.filter(**buyers.owner(account)).order_by("-is_default", "pk").first()
    except Exception:  # noqa: BLE001  never stop the profile from opening
        return
    if a is None:
        return
    try:
        pin = validate_gujarat_pincode(a.pincode) if a.pincode else ""
    except Exception:  # noqa: BLE001  not a pincode the profile accepts
        pin = ""
    want = {
        "phone": (a.phone or None),
        "city": a.city or "",
        "pincode": pin or None,
        "address": ", ".join(x for x in (a.address_line1, a.address_line2, a.landmark) if x)[:500] or None,
    }
    if getattr(a, "state", None) and hasattr(p, "state"):
        want["state"] = a.state
    changed = [k for k, v in want.items() if hasattr(p, k) and (getattr(p, k) or None) != (v or None)]
    for k in changed:
        setattr(p, k, want[k])
    if changed:
        p.save(update_fields=changed)


def ensure_profile(account, serializer_class):
    """The account's profile row, created on first use (older or imported accounts may not have one)."""
    from django.core.exceptions import ObjectDoesNotExist

    try:
        return account.profile
    except ObjectDoesNotExist:
        from apps.core import buyers

        model = serializer_class.Meta.model
        profile, _ = model.objects.get_or_create(**{buyers.type_of(account): account})
        account.profile = profile
        return profile

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
            "profile": self.profile_serializer(ensure_profile(account, self.profile_serializer), context=ctx).data,
        }

    def clean_account(self, request, data):
        """Return (changes, errors) for the account row."""
        changes, errors = {}, {}
        sent_email = data.get("email")
        if sent_email is not None and str(sent_email).strip().lower() != request.user.account.email:
            errors["email"] = ["Email cannot be changed."]
        if "full_name" in data:
            name = " ".join(str(data.get("full_name") or "").split())
            if not name:
                errors["full_name"] = ["Name is required."]
            elif len(name) > 150:
                errors["full_name"] = ["Name must be 150 characters or fewer."]
            else:
                changes["full_name"] = name
        return changes, errors

    def fill_place(self, account):
        sync_place_from_address(account)

    def get(self, request):
        self.fill_place(request.user.account)
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
            ensure_profile(account, self.profile_serializer), data=profile_data, partial=True, context={"request": request}
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
        profile = ensure_profile(request.user.account, self.profile_serializer)
        profile.refresh_from_db()
        data = self.profile_serializer(profile, context={"request": request}).data
        return ok({"profile": data}, message)

    def post(self, request):
        upload = ImageUploadSerializer(data=request.data)
        if not upload.is_valid():
            return fail("Upload a valid image.", errors=upload.errors)
        profile = ensure_profile(request.user.account, self.profile_serializer)
        old = getattr(profile, self.field)
        old_name, old_storage = (old.name, old.storage) if old else (None, None)
        new_file = process_image(upload.validated_data["image"], self.max_side)
        getattr(profile, self.field).save(new_file.name, new_file, save=False)
        profile.save(update_fields=[self.field])
        if old_name:
            old_storage.delete(old_name)
        return self.respond(request, f"{self.label} updated.")

    def delete(self, request):
        profile = ensure_profile(request.user.account, self.profile_serializer)
        old = getattr(profile, self.field)
        if old:
            delete_file(old)
            setattr(profile, self.field, None)
            profile.save(update_fields=[self.field])
        return self.respond(request, f"{self.label} removed.")
