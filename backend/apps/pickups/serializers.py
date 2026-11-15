"""Pickup data as the admin screens read it (same field names the UI already uses)."""

from apps.donations.serializers import media_url

from .models import PickupRequest


def member_data(m):
    return {"id": f"PM-{m.pk}", "name": m.name, "phone": m.phone, "role": m.role, "status": m.status,
            "joinedAt": m.created_at}


def team_data(t, token=False):
    row = {
        "id": t.public_id, "name": t.name, "area": t.area, "vehicle": t.vehicle, "capacity": t.capacity,
        "status": "Active" if t.status == "Active" else "Paused", "pausedReason": t.paused_reason,
        "note": t.note, "createdAt": t.created_at,
        "members": [member_data(m) for m in t.members.all()],
    }
    if token:
        row["token"] = t.token
    return row


def request_data(r, request):
    item, user = r.item, r.user
    profile = getattr(user, "profile", None)
    snap = r.address_snapshot or {}
    images = list(item.images.all())
    cover = media_url(request, images[0].image.name) if images else None
    photo = profile.profile_image.name if profile and profile.profile_image else ""
    return {
        "id": r.public_id,
        "item": {"id": item.public_id, "title": item.title, "category": item.category.name,
                 "image": cover, "quantity": item.quantity},
        "status": r.status,
        "date": r.pickup_date.isoformat() if r.pickup_date else None,
        "slot": r.pickup_slot or None,
        "partner": r.assigned_partner.name if r.assigned_partner else None,
        "requested_at": r.created_at,
        "cancel_reason": r.cancel_reason,
        "customer": {
            "id": user.public_id, "name": user.full_name, "email": user.email,
            "phone": snap.get("phone") or (profile.phone if profile else "") or "",
            "image": media_url(request, photo) if photo else None, "status": user.status,
            "address": snap.get("line", ""), "city": snap.get("city", ""), "state": snap.get("state", ""),
            "pincode": snap.get("pincode", ""), "path": f"/admin-users/{user.public_id}",
        },
        "events": [{"id": e.pk, "label": e.label, "detail": e.detail, "tone": e.tone, "at": e.created_at,
                    "actor": e.actor} for e in r.events.all()],
    }


def request_queryset():
    return (PickupRequest.objects.select_related("item", "item__category", "user", "user__profile", "assigned_partner")
            .prefetch_related("events", "item__images"))
