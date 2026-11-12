"""Plain dict builders for donations (member view and admin view)."""

from django.core.files.storage import default_storage
from django.utils import timezone

from .services import SLA_DAYS


def media_url(request, name):
    if not name:
        return None
    url = default_storage.url(name)
    return request.build_absolute_uri(url) if request else url


def _partner(raw):
    if not raw:
        return None
    team, _, lead = raw.partition(" · ")
    return {"team": team.strip(), "name": lead.strip(), "phone": ""}


def _events(d):
    return [{"id": e.pk, "label": e.label, "detail": e.detail, "tone": e.tone, "actor": e.actor, "at": e.created_at}
            for e in d.events.all()]


def _address(d):
    a = d.address or {}
    return {"label": a.get("label", ""), "name": a.get("recipient_name", ""), "phone": a.get("phone", ""),
            "line": ", ".join(x for x in (a.get("address_line1"), a.get("address_line2")) if x),
            "city": a.get("city", ""), "state": a.get("state", ""), "pincode": a.get("pincode", "")}


def _pickup_at(d):
    return d.pickup_date.isoformat() if d.pickup_date else None


def member_data(d, request=None):
    return {
        "id": d.public_id, "title": d.title, "category": d.category, "description": d.description,
        "condition": d.condition, "quantity": d.quantity, "weight_kg": float(d.weight_kg),
        "images": [media_url(request, p.image.name) for p in d.photos.all()],
        "status": d.status, "created_at": d.created_at,
        "pickup": {
            "date": _pickup_at(d), "slot": d.pickup_slot, "address": _address(d), "contact_name": d.contact_name,
            "phone": d.contact_phone, "note": d.note, "partner": _partner(d.partner),
            "handover_code": d.handover_code if d.status in ("Pending", "Scheduled") else "",
            "reschedule_count": d.reschedule_count,
        },
        "ngo": d.ngo or None, "certificate_id": d.certificate_id or None,
        "reject_reason": d.reject_reason, "cancel_reason": d.cancel_reason,
        "reward": {
            "points": d.points_awarded,
            "voucher": {"code": d.voucher_code, "amount": d.voucher_amount} if d.voucher_code else None,
        },
        "events": _events(d),
    }


def admin_data(d, request=None):
    u = d.user
    profile = getattr(u, "profile", None)
    waiting = (timezone.now() - d.created_at).days if d.status == "Pending" else 0
    a = _address(d)
    return {
        "id": d.public_id, "title": d.title, "category": d.category,
        "image": media_url(request, d.photos.all()[0].image.name) if d.photos.all() else None,
        "images": [media_url(request, p.image.name) for p in d.photos.all()],
        "quantity": d.quantity, "donation_date": d.created_at, "status": d.status,
        "pickup_date": _pickup_at(d), "pickup_slot": d.pickup_slot or None, "partner": d.partner or None,
        "ngo": d.ngo or None, "certificate": bool(d.certificate_id), "certificate_id": d.certificate_id or None,
        "reject_reason": d.reject_reason, "cancel_reason": d.cancel_reason, "condition": d.condition,
        "description": d.description, "weight_kg": float(d.weight_kg), "waiting_days": waiting,
        "overdue": d.status == "Pending" and waiting >= SLA_DAYS, "note": d.note,
        "contact": {"name": d.contact_name, "phone": d.contact_phone},
        "reward": {"points": d.points_awarded, "voucher_code": d.voucher_code, "voucher_amount": d.voucher_amount},
        "events": _events(d),
        "donor": {
            "id": u.public_id, "name": u.full_name, "email": u.email, "phone": d.contact_phone,
            "address": a["line"], "city": a["city"], "state": a["state"], "pincode": a["pincode"],
            "image": media_url(request, profile.profile_image.name) if profile and profile.profile_image else None,
            "status": u.status, "path": f"/admin-users/{u.public_id}",
        },
    }
