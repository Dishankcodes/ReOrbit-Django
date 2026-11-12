"""Donation rules. Views stay thin: everything that changes a donation lives here.

Every state change runs inside transaction.atomic() with the row locked, writes a timeline
event, tells the donor, and (for admin actions) writes an audit row.
"""

import logging
import secrets
from datetime import date as date_cls, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone

from apps.admins.models import Admins
from apps.core.images import process_image
from apps.core.models import Category, SavedAddress
from apps.core.services import audit, notify
from apps.core.validators import validate_image, validate_phone
from apps.rewards import services as rewards
from apps.warehouse.models import WarehouseItem

from .models import Donation, DonationEvent, DonationPhoto

log = logging.getLogger(__name__)
S = Donation.Status

SLOTS = ("9:00 AM – 12:00 PM", "12:00 PM – 3:00 PM", "3:00 PM – 6:00 PM")
MAX_PHOTOS = 4
MAX_RESCHEDULES = 2
MAX_DAYS_AHEAD = 30
MAX_OPEN = 10  # pending + scheduled donations one member can have at once
SLA_DAYS = 3  # a pending donation should be reviewed within this many days

# Where the pickup team goes. Same ranges the form shows.
PINCODE_RANGES = ((380001, 380063), (382005, 382030), (382345, 382481))
# Rough weight per item (kg), used for the reward and the warehouse record.
WEIGHT_KG = {"Furniture": 12, "Home Decor": 3, "Fashion": 1.2, "Clothing": 3.5, "Kitchen": 4,
             "Electronics": 5, "Books": 4, "Sports": 3}
DEFAULT_WEIGHT = 1.5


class DonationError(Exception):
    def __init__(self, message, errors=None, code=None, status=400):
        super().__init__(message)
        self.message, self.errors, self.code, self.status = message, errors, code, status


def pincode_serviceable(pin):
    pin = str(pin or "").strip()
    return pin.isdigit() and len(pin) == 6 and any(a <= int(pin) <= b for a, b in PINCODE_RANGES)


def estimate_weight(category, quantity):
    return Decimal(str(round(WEIGHT_KG.get(category, DEFAULT_WEIGHT) * max(1, quantity), 1)))


def _text(v, n):
    return " ".join(str(v or "").split())[:n]


def log_event(d, label, detail="", tone="neutral", actor="system"):
    return DonationEvent.objects.create(donation=d, label=label[:120], detail=str(detail or "")[:255], tone=tone, actor=actor)


def _parse_date(raw):
    try:
        day = date_cls.fromisoformat(str(raw or "")[:10])
    except ValueError:
        raise DonationError("Choose a pickup date.", {"date": ["Choose a pickup date."]})
    today = timezone.localdate()
    if day < today or day > today + timedelta(days=MAX_DAYS_AHEAD):
        raise DonationError("Choose a date within the next 30 days.", {"date": ["Choose a date within the next 30 days."]})
    return day


def _check_slot(slot):
    if slot not in SLOTS:
        raise DonationError("Choose a time slot.", {"slot": ["Choose a time slot."]})
    return slot


def _notify_donor(d, title, body, severity=None):
    try:
        with transaction.atomic():
            notify(d.user, title, body, module="donations", target_url=f"/user-donations/{d.public_id}",
                   ref_type="donation", ref_id=d.public_id)
    except Exception:
        log.exception("donation notification failed")


def _notify_admins(d, title, body):
    try:
        with transaction.atomic():
            for a in Admins.objects.filter(status="Active"):
                if a.has_module("donations", "view"):
                    notify(a, title, body, module="donations", target_url=f"/admin-donations/{d.public_id}",
                           ref_type="donation", ref_id=d.public_id)
    except Exception:
        log.exception("donation admin notification failed")


# --------------------------------------------------------------------------- #
# the donor
# --------------------------------------------------------------------------- #
def create(user, data, files):
    errors = {}
    title = _text(data.get("title"), 120)
    if len(title) < 3:
        errors["title"] = ["Give the item a short name (at least 3 characters)."]
    description = " ".join(str(data.get("description") or "").split())[:1000]
    if len(description) < 10:
        errors["description"] = ["Add a few more details (at least 10 characters)."]
    category = _text(data.get("category"), 100)
    if not Category.objects.filter(name=category, status=Category.Status.ACTIVE).exists():
        errors["category"] = ["Choose a category."]
    condition = str(data.get("condition") or "")
    if condition not in Donation.Condition.values:
        errors["condition"] = ["Select the condition of the item."]
    try:
        quantity = int(data.get("quantity") or 1)
        if not 1 <= quantity <= 99:
            raise ValueError
    except (TypeError, ValueError):
        quantity = 1
        errors["quantity"] = ["Quantity must be between 1 and 99."]
    contact = _text(data.get("contact_name"), 120)
    if len(contact) < 2:
        errors["contact_name"] = ["Enter a contact name."]
    phone = _text(data.get("phone"), 20)
    try:
        validate_phone(phone)
    except DjangoValidationError:
        errors["phone"] = ["Enter a valid phone number."]
    try:
        day = _parse_date(data.get("date"))
    except DonationError as e:
        errors.update(e.errors)
        day = None
    try:
        slot = _check_slot(data.get("slot"))
    except DonationError as e:
        errors.update(e.errors)
        slot = ""
    address = SavedAddress.objects.filter(public_id=str(data.get("address_id") or ""), user=user).first()
    if address is None:
        errors["address_id"] = ["Choose a pickup address."]
    elif not pincode_serviceable(address.pincode):
        errors["address_id"] = ["We don't pick up from this address yet."]
    files = list(files or [])
    if not files:
        errors["images"] = ["Add at least one photo."]
    elif len(files) > MAX_PHOTOS:
        errors["images"] = [f"Add up to {MAX_PHOTOS} photos."]
    else:
        for f in files:
            try:
                validate_image(f)
            except DjangoValidationError as e:
                errors["images"] = [e.messages[0]]
                break
    if errors:
        raise DonationError("Please fix the highlighted fields.", errors)

    with transaction.atomic():
        # lock the donor row so two taps cannot slip past the open-donation cap
        type(user).objects.select_for_update().get(pk=user.pk)
        if Donation.objects.filter(user=user, status__in=(S.PENDING, S.SCHEDULED)).count() >= MAX_OPEN:
            raise DonationError(f"You already have {MAX_OPEN} donations waiting. Please wait for some to be picked up.", code="TOO_MANY_OPEN")
        d = Donation.objects.create(
            user=user, title=title, category=category, description=description, condition=condition,
            quantity=quantity, weight_kg=estimate_weight(category, quantity), address=address.snapshot(),
            contact_name=contact, contact_phone=phone, note=_text(data.get("note"), 200), pickup_date=day,
            pickup_slot=slot, handover_code=f"{secrets.randbelow(9000) + 1000}",
        )
        for n, f in enumerate(files):
            DonationPhoto.objects.create(donation=d, image=process_image(f, max_side=1600), display_order=n)
        log_event(d, "Donation submitted", f"{quantity} × {title}", "neutral", "user")
    _notify_donor(d, "Donation received", f"{d.public_id} is with our team. We'll confirm your free pickup soon.")
    _notify_admins(d, "New donation to review", f"{d.public_id}: {quantity} × {title} from {user.full_name}.")
    return d


def _mine(user, public_id):
    return Donation.objects.select_for_update().get(public_id=public_id, user=user)


def cancel(user, public_id, reason):
    reason = _text(reason, 255)
    with transaction.atomic():
        d = _mine(user, public_id)
        if d.status not in (S.PENDING, S.SCHEDULED):
            raise DonationError("This donation can't be cancelled any more.", code="NOT_CANCELLABLE", status=409)
        d.status, d.cancel_reason, d.pickup_date, d.pickup_slot = S.CANCELLED, reason, None, ""
        d.save(update_fields=["status", "cancel_reason", "pickup_date", "pickup_slot", "updated_at"])
        log_event(d, "Cancelled by you", reason, "bad", "user")
    _notify_admins(d, "Donation cancelled", f"{d.public_id} was cancelled by the donor.")
    return d


def reschedule(user, public_id, data):
    day, slot = _parse_date(data.get("date")), _check_slot(data.get("slot"))
    reason = _text(data.get("reason"), 150)
    with transaction.atomic():
        d = _mine(user, public_id)
        if d.status not in (S.PENDING, S.SCHEDULED):
            raise DonationError("The pickup can't be changed any more.", code="NOT_EDITABLE", status=409)
        if d.reschedule_count >= MAX_RESCHEDULES:
            raise DonationError("You've used both reschedules. Please contact support to change it again.", code="RESCHEDULE_LIMIT", status=409)
        d.pickup_date, d.pickup_slot, d.reschedule_count = day, slot, d.reschedule_count + 1
        d.save(update_fields=["pickup_date", "pickup_slot", "reschedule_count", "updated_at"])
        log_event(d, "Pickup rescheduled", f"{slot} · {reason}" if reason else slot, "wait", "user")
    _notify_admins(d, "Pickup rescheduled", f"{d.public_id}: donor chose {day:%d %b}, {slot}.")
    return d


def set_note(user, public_id, note):
    with transaction.atomic():
        d = _mine(user, public_id)
        if d.status in (S.COMPLETED, S.REJECTED, S.CANCELLED, S.RECEIVED):
            raise DonationError("The pickup is over, so the note can't be changed.", code="NOT_EDITABLE", status=409)
        d.note = _text(note, 200)
        d.save(update_fields=["note", "updated_at"])
    return d


# --------------------------------------------------------------------------- #
# ReOrbit (admin)
# --------------------------------------------------------------------------- #
ACTIONS = {
    #  key         from-statuses
    "accept": (S.PENDING,),
    "reject": (S.PENDING,),
    "reschedule": (S.SCHEDULED,),
    "cancelPickup": (S.SCHEDULED,),
    "pickedUp": (S.SCHEDULED,),
    "received": (S.PICKED_UP,),
    "complete": (S.RECEIVED,),
    "reopen": (S.REJECTED,),
}


def admin_action(public_id, key, admin, payload, ip=None):
    if key not in ACTIONS:
        raise DonationError("Unknown action.", code="BAD_ACTION")
    payload = payload or {}
    with transaction.atomic():
        d = Donation.objects.select_for_update().select_related("user").filter(public_id=public_id).first()
        if d is None:
            raise DonationError("Donation not found.", code="NOT_FOUND", status=404)
        if d.status not in ACTIONS[key]:
            raise DonationError(f"This donation is {d.get_status_display().lower()}, so that isn't possible now.",
                                code="BAD_STATE", status=409)
        before = {"status": d.status}
        now = timezone.now()
        mail = None  # (title, body) for the donor, sent after commit

        if key in ("accept", "reschedule"):
            day, slot = _parse_date(payload.get("date")), _check_slot(payload.get("slot"))
            team = _text(payload.get("partner"), 80)
            if not team:
                raise DonationError("Choose the pickup team.", {"partner": ["Choose the pickup team."]})
            d.pickup_date, d.pickup_slot, d.partner = day, slot, team
            if key == "accept":
                d.status, d.reviewed_by, d.reject_reason = S.SCHEDULED, admin, ""
                log_event(d, "Accepted · pickup scheduled", f"{slot} · {team}", "good", "admin")
                mail = ("Your donation was accepted", f"Free pickup on {day:%d %b}, {slot}. Keep code {d.handover_code} ready for the pickup person.")
            else:
                log_event(d, "Pickup rescheduled by ReOrbit", f"{slot} · {team}", "wait", "admin")
                mail = ("Pickup time changed", f"New free pickup: {day:%d %b}, {slot}.")
        elif key in ("reject", "cancelPickup"):
            reason = _text(payload.get("reason"), 255)
            if len(reason) < 3:
                raise DonationError("Tell the donor why.", {"reason": ["Tell the donor why (at least 3 characters)."]})
            d.status, d.reject_reason, d.reviewed_by = S.REJECTED, reason, admin
            d.pickup_date, d.pickup_slot, d.partner = None, "", ""
            log_event(d, "Not accepted" if key == "reject" else "Pickup cancelled · not accepted", reason, "bad", "admin")
            mail = ("Your donation wasn't accepted", reason)
        elif key == "pickedUp":
            d.status, d.picked_up_at = S.PICKED_UP, now
            log_event(d, "Picked up from you", "On its way to our warehouse", "info", "admin")
            mail = ("Your donation was picked up", "Thank you! It's on its way to our warehouse.")
        elif key == "received":
            d.status, d.received_at = S.RECEIVED, now
            _receive(d)
            mail = ("Your donation reached our warehouse",
                    f"Thank you! Your reward: a ₹{d.voucher_amount} marketplace voucher ({d.voucher_code}) and {d.points_awarded} Orbit Points.")
        elif key == "complete":
            ngo = _text(payload.get("ngo"), 120)
            if not ngo:
                raise DonationError("Choose who receives it.", {"ngo": ["Choose who receives it."]})
            d.status, d.ngo, d.completed_at = S.COMPLETED, ngo, now
            d.certificate_id = f"CERT-{d.public_id.split('-')[-1]}"
            WarehouseItem.objects.filter(donation=d).update(status=WarehouseItem.Status.GIVEN_OUT, given_to=ngo, given_at=now)
            log_event(d, "Donation completed", f"Given to {ngo} · certificate issued", "good", "admin")
            mail = ("Your donation made it", f"It was given to {ngo}. Your certificate is ready.")
        elif key == "reopen":
            d.status, d.reject_reason = S.PENDING, ""
            log_event(d, "Back in review", "", "wait", "admin")

        d.save()
        audit(admin, f"donation.{key}", "donation", d.public_id, before=before, after={"status": d.status},
              reason=_text(payload.get("reason"), 255), ip=ip)
    if mail:
        _notify_donor(d, *mail)
    return d


def _receive(d):
    """The item is in the warehouse: file it, and pay the donor's reward (once)."""
    WarehouseItem.objects.get_or_create(
        donation=d,
        defaults=dict(title=d.title, category=d.category, quantity=d.quantity, condition=d.condition,
                      weight_kg=d.weight_kg, received_at=d.received_at),
    )
    voucher = rewards.issue_for_donation(d)
    d.voucher_code, d.voucher_amount = voucher.code, voucher.amount
    d.points_awarded = rewards.points_for(d.quantity)
    log_event(d, "Received at the warehouse", "Checked in", "info", "admin")
    log_event(d, "Reward earned", f"₹{voucher.amount} voucher + {d.points_awarded} Orbit Points", "good", "system")
