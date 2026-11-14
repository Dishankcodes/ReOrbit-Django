"""Plain dict builders (same style as apps/orders/serializers.py).

Two shapes of the same donation: what the donor sees, and what an admin sees. The field names are
the ones frontend/src/user/data/donationsStore.js and frontend/src/admin/data/donationsStore.js read.
"""

from django.core.files.storage import default_storage
from django.utils import timezone

from .models import Donation
from .services import SLA_DAYS


def media_url(request, name):
    if not name:
        return None
    url = default_storage.url(name)
    return request.build_absolute_uri(url) if request else url


def partner_data(partner):
    """The donor sees the lead's name, the team label, and a phone to call. No partner
    assigned yet: nothing to show. `name` is a person; `team` is the crew label."""
    if partner is None:
        return None
    return {"id": partner.public_id, "name": partner.lead_name or partner.name,
            "team": partner.name, "phone": partner.phone}


def voucher_brief(v):
    if v is None:
        return None
    return {"id": v.public_id, "code": v.code, "amount": v.amount, "min_order": v.min_order,
            "expires_at": v.expires_at, "status": v.effective_status}


def _events(d, with_actor=False):
    rows = []
    for e in d.events.all():
        row = {"id": e.pk, "label": e.label, "detail": e.detail, "tone": e.tone, "at": e.created_at}
        if with_actor:
            row["actor"] = e.actor
        rows.append(row)
    return rows


def _show_code(d):
    # the donor shows this at the door, so it's visible exactly while a collection could happen
    return d.handover_code if d.status in (Donation.Status.SCHEDULED, Donation.Status.FAILED_PICKUP) else ""


def donation_data(d, request):
    """The donor's view."""
    return {
        "id": d.public_id, "title": d.title, "category": d.category, "description": d.description,
        "condition": d.condition, "quantity": d.quantity, "weight_kg": float(d.weight_kg),
        "images": [media_url(request, i.image.name) for i in d.images.all()],
        "status": d.status, "created_at": d.created_at,
        "pickup": {
            "date": d.pickup_date.isoformat() if d.pickup_date else None,
            "slot": d.pickup_slot or None,
            "address": d.pickup_address,
            "contact_name": d.contact_name, "phone": d.phone, "note": d.note,
            "partner": partner_data(d.assigned_partner),
            "handover_code": _show_code(d),
            "reschedule_count": d.reschedule_count, "failed_attempts": d.failed_pickup_count,
        },
        "accepted_quantity": d.accepted_quantity, "partial_reject_reason": d.partial_reject_reason or None,
        "received": ({"quantity": d.received_quantity, "condition": d.received_condition or None,
                      "quantity_mismatch": d.quantity_mismatch, "condition_mismatch": d.condition_mismatch}
                     if d.received_quantity is not None or d.received_condition else None),
        "ngo": d.ngo or None, "certificate_id": d.certificate_id or None,
        "certificate_url": media_url(request, d.certificate_file.name) if d.certificate_file else None,
        "reject_reason": d.reject_reason, "cancel_reason": d.cancel_reason,
        "reward": {"points": d.reward_points, "voucher": voucher_brief(d.reward_voucher)},
        "events": _events(d),
    }


def admin_donation_data(d, request):
    """The admin's view: the donor, the contact, the history with who did what."""
    donor = d.donor
    profile = getattr(donor, "profile", None)
    addr = d.pickup_address or {}
    images = [media_url(request, i.image.name) for i in d.images.all()]
    waiting = (timezone.now() - d.created_at).days if d.status == Donation.Status.PENDING else 0
    v = d.reward_voucher
    return {
        "id": d.public_id, "title": d.title, "category": d.category,
        "image": images[0] if images else None, "images": images,
        "quantity": d.quantity, "accepted_quantity": d.accepted_quantity,
        "partial_reject_reason": d.partial_reject_reason or None,
        "donation_date": d.created_at, "status": d.status,
        "pickup_date": d.pickup_date.isoformat() if d.pickup_date else None,
        "pickup_slot": d.pickup_slot or None,
        # a plain team label here, same as the old partner_team string: the admin dashboard
        # enriches it client-side (lead, phone, area) via its own pickupTeamsStore.
        "partner": d.assigned_partner.name if d.assigned_partner else None,
        # the handover code itself is NOT shown here: only the donor and the assigned partner see
        # it, so that an admin-side "picked up" override still needs it read back from one of them.
        "failed_attempts": d.failed_pickup_count,
        "received_quantity": d.received_quantity, "received_condition": d.received_condition or None,
        "received_note": d.received_note or None,
        "quantity_mismatch": d.quantity_mismatch, "condition_mismatch": d.condition_mismatch,
        "ngo": d.ngo or None, "distributed_quantity": d.distributed_quantity, "distributed_at": d.distributed_at,
        "certificate": bool(d.certificate_id), "certificate_id": d.certificate_id or None,
        "certificate_url": media_url(request, d.certificate_file.name) if d.certificate_file else None,
        "reject_reason": d.reject_reason, "cancel_reason": d.cancel_reason,
        "condition": d.condition, "description": d.description, "weight_kg": float(d.weight_kg), "note": d.note,
        "contact": {"name": d.contact_name, "phone": d.phone},
        "reward": {"points": d.reward_points, "voucher_code": v.code if v else None,
                   "voucher_amount": v.amount if v else None},
        "waiting_days": waiting, "overdue": d.status == Donation.Status.PENDING and waiting >= SLA_DAYS,
        "events": _events(d, with_actor=True),
        "donor": {
            "id": donor.public_id, "name": donor.full_name, "email": donor.email,
            "phone": (profile.phone if profile and profile.phone else d.phone), "status": donor.status,
            "image": media_url(request, profile.profile_image.name) if profile and profile.profile_image else None,
            "address": addr.get("line", ""), "city": addr.get("city", ""), "state": addr.get("state", ""),
            "pincode": addr.get("pincode", ""), "path": f"/admin-users/{donor.public_id}",
        },
    }


def partner_pickup_data(d):
    """What the pickup-partner endpoint shows: just enough to find the door and confirm the code."""
    addr = d.pickup_address or {}
    return {
        "id": d.public_id, "title": d.title, "quantity": d.accepted_quantity or d.quantity,
        "status": d.status, "pickup_date": d.pickup_date.isoformat() if d.pickup_date else None,
        "pickup_slot": d.pickup_slot or None, "failed_attempts": d.failed_pickup_count,
        "contact_name": d.contact_name, "phone": d.phone, "note": d.note,
        "address": {"line": addr.get("line", ""), "landmark": addr.get("landmark", ""),
                    "city": addr.get("city", ""), "pincode": addr.get("pincode", "")},
    }


def pickup_partner_data(p):
    return {"id": p.public_id, "name": p.name, "lead_name": p.lead_name, "phone": p.phone, "status": p.status}
