"""Donation rules. Every status change goes through this file, inside one transaction with the
row locked, so two admins (or a donor and an admin, or a partner and an admin) can never move
the same donation twice.

  donor:   create, cancel (Pending/Scheduled/Failed_Pickup), reschedule, edit the pickup note
  admin:   accept (optionally partial), reject, reschedule, cancelPickup, pickedUp (needs the
           donor's code), failed, received (records what actually arrived), complete, reopen
  partner: list their own pickups, collect (needs the donor's code), failed

  Pending -> Scheduled -> Picked_Up -> Received -> Completed
                  \\-> Failed_Pickup -/        (reschedule instead of rejecting)

Received is the moment of reward: Orbit Points and one marketplace voucher are based on what
the warehouse actually counted and the condition it actually found, not what the donor declared.
"""

import logging
import re
import secrets
from datetime import date, timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from apps.admins.models import Admins
from apps.core import buyers as buyer_kit
from apps.core.images import process_image
from apps.core.models import Category, SavedAddress
from apps.core.services import audit, notify
from apps.core.validators import validate_image, validate_phone
from apps.rewards import services as rewards
from apps.users.models import User_Profile

from . import certificates
from .models import Donation, DonationEvent, DonationImage, PickupPartner

log = logging.getLogger(__name__)

S = Donation.Status
MAX_PHOTOS = 5
MAX_RESCHEDULES = 2  # how often a donor may move the pickup
MAX_FAILED_PICKUPS = 2  # after this many failed attempts, admin is nudged to step in
PICKUP_DAYS = 14  # donors pick from the next 14 days, starting tomorrow (Sundays off)
ADMIN_PICKUP_DAYS = 90
SLA_DAYS = 3  # a pending donation should be reviewed within this many days

# same slots as the app (frontend/src/user/data/donationsStore.js SLOTS)
SLOTS = ("9:00 AM \u2013 12:00 PM", "12:00 PM \u2013 3:00 PM", "3:00 PM \u2013 6:00 PM")
# the pincodes we collect from (frontend checkPincode RANGES)
SERVICE_RANGES = ((380001, 380063), (382005, 382030), (382345, 382481))


class DonationError(Exception):
    def __init__(self, message, errors=None, code="DONATION_ERROR", status=400):
        super().__init__(message)
        self.message, self.errors, self.code, self.status = message, errors, code, status


# --------------------------------------------------------------------------- #
# small helpers
# --------------------------------------------------------------------------- #
def _text(value, limit):
    return " ".join(str(value or "").split())[:limit]


def _fix(errors):
    return DonationError("Please fix the highlighted fields.", errors)


def serviceable(pincode):
    p = str(pincode or "").strip()
    if not (p.isascii() and p.isdigit() and len(p) == 6):
        return False
    return any(lo <= int(p) <= hi for lo, hi in SERVICE_RANGES)


def event(d, label, detail="", tone="neutral", actor="system"):
    return DonationEvent.objects.create(
        donation=d, label=label[:60], detail=str(detail or "")[:255], tone=tone, actor=actor)


def when(day, slot):
    return f"{day.strftime('%d %b %Y')}, {slot}"


def parse_schedule(raw_date, raw_slot, *, admin=False):
    """(date, slot) or DonationError with field messages. Donors: tomorrow .. 14 days, no Sundays."""
    errors = {}
    day = None
    try:
        day = date.fromisoformat(str(raw_date or "").strip())
    except ValueError:
        errors["date"] = ["Choose a pickup date."]
    slot = _text(raw_slot, 30)
    if slot not in SLOTS:
        errors["slot"] = ["Choose a time slot."]
    if day is not None:
        today = timezone.localdate()
        if admin:
            if day < today:
                errors["date"] = ["The pickup date can't be in the past."]
            elif day > today + timedelta(days=ADMIN_PICKUP_DAYS):
                errors["date"] = [f"Choose a date within the next {ADMIN_PICKUP_DAYS} days."]
        elif day < today + timedelta(days=1) or day > today + timedelta(days=PICKUP_DAYS):
            errors["date"] = [f"Choose a day in the next {PICKUP_DAYS} days, starting tomorrow."]
        elif day.weekday() == 6:
            errors["date"] = ["We don't collect on Sundays. Choose another day."]
    if errors:
        raise _fix(errors)
    return day, slot


def _notify_donor(d, title, body):
    try:
        with transaction.atomic():  # savepoint: a failed notification must not break the donation
            notify(d.donor, title, body, module="donations", target_url=f"/user-donations/{d.public_id}",
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


def _lock(pk):
    return Donation.objects.select_for_update(of=("self",)).select_related("donor", "assigned_partner").get(pk=pk)


def _need(d, *statuses):
    if d.status not in statuses:
        raise DonationError(
            f"This donation is {d.get_status_display().lower()}, so you can't do that.", code="BAD_STATE", status=409)


def _save(d, *fields):
    d.save(update_fields=[*fields, "updated_at"])


def _partner(raw):
    """A pickup partner by public_id or exact name. Used by admin accept/reschedule."""
    key = _text(raw, 60)
    if not key:
        raise _fix({"partner": ["Choose a pickup partner."]})
    p = PickupPartner.objects.filter(Q(public_id=key) | Q(name__iexact=key),
                                     status=PickupPartner.Status.ACTIVE).first()
    if p is None:
        raise _fix({"partner": ["Choose an active pickup partner."]})
    return p


# --------------------------------------------------------------------------- #
# the donor
# --------------------------------------------------------------------------- #
def create_donation(donor, data, files):
    """Validate everything, then create the donation, its photos and its first history line."""
    errors = {}
    title = _text(data.get("title"), 200)
    if len(title) < 3:
        errors["title"] = ["Give the item a short name (at least 3 characters)."]
    elif len(title) > 100:
        errors["title"] = ["Keep the name to 100 characters."]

    raw_cat = _text(data.get("category"), 100)
    cat = Category.objects.filter(name__iexact=raw_cat, status=Category.Status.ACTIVE).first() if raw_cat else None
    if cat is None:
        errors["category"] = ["Choose a category."]

    description = str(data.get("description") or "").strip()
    if len(description) < 10:
        errors["description"] = ["Add a few more details (at least 10 characters)."]
    elif len(description) > 1000:
        errors["description"] = ["Keep the description under 1000 characters."]

    condition = str(data.get("condition") or "").strip()
    if condition not in Donation.Condition.values:
        errors["condition"] = ["Select the condition of the item."]

    raw_quantity = data.get("quantity")
    try:
        quantity = int(str(1 if raw_quantity in (None, "") else raw_quantity).strip())
    except ValueError:
        quantity = 0
    if not 1 <= quantity <= 99:
        errors["quantity"] = ["Quantity must be between 1 and 99."]

    files = list(files or [])
    if not files:
        errors["images"] = ["Add at least one photo."]
    elif len(files) > MAX_PHOTOS:
        errors["images"] = [f"You can add up to {MAX_PHOTOS} photos."]
    else:
        for f in files:
            try:
                validate_image(f)
            except DjangoValidationError as e:
                errors["images"] = [e.messages[0]]
                break

    address = SavedAddress.objects.filter(
        public_id=str(data.get("address_id") or ""), **buyer_kit.owner(donor)).first()
    if address is None:
        errors["address_id"] = ["Choose a pickup address."]
    elif not serviceable(address.pincode):
        errors["address_id"] = ["We don't pick up from this address yet."]

    contact_name = _text(data.get("contact_name"), 120)
    if len(contact_name) < 2:
        errors["contact_name"] = ["Enter a contact name."]
    phone = _text(data.get("phone"), 20)
    try:
        validate_phone(phone)
        if len(re.sub(r"\D", "", phone)) < 10:
            raise DjangoValidationError("Enter a valid 10-digit phone number.")
    except DjangoValidationError as e:
        errors["phone"] = [e.messages[0]]

    note = _text(data.get("note"), 200)
    day = slot = None
    try:
        day, slot = parse_schedule(data.get("date"), data.get("slot"))
    except DonationError as e:
        errors.update(e.errors)

    if errors:
        raise _fix(errors)

    with transaction.atomic():
        d = Donation.objects.create(
            donor=donor, title=title, category=cat.name, description=description, condition=condition,
            quantity=quantity, weight_kg=rewards.weight_kg(cat.name, quantity), pickup_date=day, pickup_slot=slot,
            pickup_address=_address_snapshot(address), contact_name=contact_name, phone=phone, note=note)
        for f in files:
            DonationImage.objects.create(donation=d, image=process_image(f, max_side=1600))
        event(d, "Donation submitted", f"{quantity} item(s) in {cat.name}. We are reviewing it.", "wait", "donor")
        _notify_admins(d, "New donation", f"{d.public_id}: {title} ({quantity} item(s)) needs review.")
    return d


def _address_snapshot(a):
    return {
        "label": a.label, "line": ", ".join(x for x in (a.address_line1, a.address_line2) if x),
        "landmark": a.landmark, "city": a.city, "state": a.state, "pincode": a.pincode,
    }


def cancel_by_donor(pk, donor, reason):
    reason = _text(reason, 255)
    if len(reason) < 3:
        raise _fix({"reason": ["Tell us why you are cancelling."]})
    with transaction.atomic():
        d = _lock(pk)
        if d.donor_id != donor.pk:
            raise DonationError("Donation not found.", code="NOT_FOUND", status=404)
        _need(d, S.PENDING, S.SCHEDULED, S.FAILED_PICKUP)
        was_scheduled = d.status in (S.SCHEDULED, S.FAILED_PICKUP)
        d.status, d.cancel_reason, d.handover_code = S.CANCELLED, reason, ""
        _save(d, "status", "cancel_reason", "handover_code")
        event(d, "Cancelled by you", reason, "bad", "donor")
        if was_scheduled:
            _notify_admins(d, "Pickup cancelled", f"{d.public_id}: the donor cancelled. {reason}")
    return d


def reschedule_by_donor(pk, donor, raw_date, raw_slot, reason=""):
    day, slot = parse_schedule(raw_date, raw_slot)
    reason = _text(reason, 255)
    with transaction.atomic():
        d = _lock(pk)
        if d.donor_id != donor.pk:
            raise DonationError("Donation not found.", code="NOT_FOUND", status=404)
        _need(d, S.PENDING, S.SCHEDULED, S.FAILED_PICKUP)
        if d.reschedule_count >= MAX_RESCHEDULES:
            raise DonationError(
                f"You can change the pickup time {MAX_RESCHEDULES} times. Please contact support to change it again.",
                code="RESCHEDULE_LIMIT", status=409)
        was_failed = d.status == S.FAILED_PICKUP
        d.pickup_date, d.pickup_slot, d.reschedule_count = day, slot, d.reschedule_count + 1
        if was_failed:
            d.status = S.SCHEDULED
            _save(d, "pickup_date", "pickup_slot", "reschedule_count", "status")
        else:
            _save(d, "pickup_date", "pickup_slot", "reschedule_count")
        event(d, "Pickup rescheduled", when(day, slot) + (f" \u00b7 {reason}" if reason else ""), "info", "donor")
        if d.status == S.SCHEDULED:
            _notify_admins(d, "Pickup rescheduled", f"{d.public_id}: the donor asked for {when(day, slot)}.")
    return d


def update_note(pk, donor, note):
    note = _text(note, 200)
    with transaction.atomic():
        d = _lock(pk)
        if d.donor_id != donor.pk:
            raise DonationError("Donation not found.", code="NOT_FOUND", status=404)
        _need(d, S.PENDING, S.SCHEDULED, S.FAILED_PICKUP)
        d.note = note
        _save(d, "note")
        event(d, "Pickup note updated", note, "neutral", "donor")
    return d


# --------------------------------------------------------------------------- #
# admin actions
# --------------------------------------------------------------------------- #
def _reason(payload, minimum=5, field="reason"):
    reason = _text(payload.get(field), 255)
    if len(reason) < minimum:
        raise _fix({field: ["Write a short reason for the donor (at least 5 characters)."]})
    return reason


def _accept(d, admin, p):
    """Schedule the pickup. If `accepted_quantity` is less than what was donated, the rest is
    turned away now (partial acceptance) with its own reason, instead of all-or-nothing."""
    _need(d, S.PENDING)
    day, slot = parse_schedule(p.get("date"), p.get("slot"), admin=True)
    partner = _partner(p.get("partner"))

    raw_accept = p.get("accepted_quantity")
    accepted = d.quantity if raw_accept in (None, "") else None
    if accepted is None:
        try:
            accepted = int(str(raw_accept).strip())
        except ValueError:
            raise _fix({"accepted_quantity": ["Enter a whole number."]})
    if not 1 <= accepted <= d.quantity:
        raise _fix({"accepted_quantity": [f"Enter between 1 and {d.quantity}."]})
    partial = accepted < d.quantity
    partial_reason = _reason(p, field="partial_reason") if partial else ""

    d.status, d.pickup_date, d.pickup_slot, d.assigned_partner = S.SCHEDULED, day, slot, partner
    d.accepted_quantity = accepted if partial else None
    d.partial_reject_reason = partial_reason
    d.handover_code = f"{secrets.randbelow(9000) + 1000}"  # 4 digits: shown to the donor, entered by the partner
    _save(d, "status", "pickup_date", "pickup_slot", "assigned_partner", "accepted_quantity",
          "partial_reject_reason", "handover_code")
    if partial:
        event(d, f"Partially accepted ({accepted} of {d.quantity})",
              f"{partial_reason} \u00b7 {when(day, slot)} \u00b7 {partner.name}", "good", "admin")
        _notify_donor(d, "Donation partially accepted",
                      f"{d.public_id}: we can take {accepted} of your {d.quantity} item(s). {partial_reason} "
                      f"Pickup on {when(day, slot)}.")
    else:
        event(d, "Accepted, pickup scheduled", f"{when(day, slot)} \u00b7 {partner.name}", "good", "admin")
        _notify_donor(d, "Donation accepted", f"{d.public_id} was accepted. Free pickup on {when(day, slot)}.")
    return ""


def _reject(d, admin, p):
    _need(d, S.PENDING)
    reason = _reason(p)
    d.status, d.reject_reason = S.REJECTED, reason
    _save(d, "status", "reject_reason")
    event(d, "Not accepted", reason, "bad", "admin")
    _notify_donor(d, "Donation not accepted", f"{d.public_id} could not be accepted. {reason}")
    return reason


def _reschedule(d, admin, p):
    """Admin reschedule. Also the way out of Failed_Pickup: it returns to Scheduled."""
    _need(d, S.SCHEDULED, S.FAILED_PICKUP)
    day, slot = parse_schedule(p.get("date"), p.get("slot"), admin=True)
    partner = _partner(p.get("partner")) if p.get("partner") else d.assigned_partner
    if partner is None:
        raise _fix({"partner": ["Choose a pickup partner."]})
    was_failed = d.status == S.FAILED_PICKUP
    d.status, d.pickup_date, d.pickup_slot, d.assigned_partner = S.SCHEDULED, day, slot, partner
    fields = ["status", "pickup_date", "pickup_slot", "assigned_partner"]
    _save(d, *fields)
    event(d, "Pickup rescheduled", f"{when(day, slot)} \u00b7 {partner.name}", "info", "admin")
    _notify_donor(d, "Pickup rescheduled", f"{d.public_id}: your pickup is now {when(day, slot)}.")
    if was_failed:
        _notify_admins(d, "Pickup re-booked", f"{d.public_id}: re-scheduled with {partner.name} after a failed attempt.")
    return ""


def _cancel_pickup(d, admin, p):
    _need(d, S.SCHEDULED, S.FAILED_PICKUP)
    reason = _reason(p)
    d.status, d.reject_reason, d.handover_code = S.REJECTED, reason, ""
    _save(d, "status", "reject_reason", "handover_code")
    event(d, "Pickup cancelled, donation not accepted", reason, "bad", "admin")
    _notify_donor(d, "Pickup cancelled", f"{d.public_id}: the pickup was cancelled. {reason}")
    return reason


def _confirm_pickup(d, code, actor_label):
    """Shared by the admin 'pickedUp' action and the partner 'collect' endpoint.
    Requires the donor's own handover code: this is the collection check, not a rubber stamp."""
    _need(d, S.SCHEDULED)
    entered = _text(code, 4)
    if not entered or entered != d.handover_code:
        raise DonationError("That handover code doesn't match. Ask the donor to confirm it.",
                            code="CODE_MISMATCH", status=400)
    d.status = S.PICKED_UP
    _save(d, "status")
    who = d.assigned_partner.name if d.assigned_partner else "our pickup team"
    event(d, "Picked up", f"Collected by {who} and on its way to the warehouse. Code verified.", "info", actor_label)
    _notify_donor(d, "Item picked up", f"{d.public_id} was collected and is on its way to our warehouse.")


def _mark_failed(d, reason, actor_label):
    _need(d, S.SCHEDULED)
    d.status, d.failed_pickup_count = S.FAILED_PICKUP, d.failed_pickup_count + 1
    _save(d, "status", "failed_pickup_count")
    event(d, "Pickup attempt failed", reason, "bad", actor_label)
    _notify_donor(d, "We missed your pickup",
                  f"{d.public_id}: {reason} Please pick a new time and we'll try again.")
    if d.failed_pickup_count >= MAX_FAILED_PICKUPS:
        _notify_admins(d, "Repeated failed pickup",
                       f"{d.public_id} has failed {d.failed_pickup_count} times. Please follow up.")
    else:
        _notify_admins(d, "Pickup attempt failed", f"{d.public_id}: {reason}")


def _picked_up(d, admin, p):
    _confirm_pickup(d, p.get("code"), "admin")
    return ""


def _failed(d, admin, p):
    reason = _reason(p)
    _mark_failed(d, reason, "admin")
    return reason


def _received(d, admin, p):
    """The reward moment. Only a Picked_Up donation gets here, so it happens once. The reward is
    based on what the warehouse actually counted and the condition it actually found."""
    _need(d, S.PICKED_UP)
    base_qty = d.accepted_quantity or d.quantity
    raw_qty = p.get("received_quantity")
    received_qty = base_qty if raw_qty in (None, "") else None
    if received_qty is None:
        try:
            received_qty = int(str(raw_qty).strip())
        except ValueError:
            raise _fix({"received_quantity": ["Enter a whole number."]})
    if received_qty < 0:
        raise _fix({"received_quantity": ["Can't be negative."]})
    received_condition = _text(p.get("received_condition"), 10) or d.condition
    if received_condition not in Donation.Condition.values:
        raise _fix({"received_condition": ["Select the condition that actually arrived."]})
    note = _text(p.get("note"), 255)

    voucher = rewards.issue_for_donation(d)  # one voucher per donation, also enforced by the database
    points = rewards.reward_points(received_qty) if received_qty else 0
    weight = rewards.weight_kg(d.category, received_qty) if received_qty else 0
    d.status, d.received_at = S.RECEIVED, timezone.now()
    d.received_quantity, d.received_condition, d.received_note = received_qty, received_condition, note
    d.reward_points, d.reward_voucher, d.weight_kg = points, voucher, weight
    _save(d, "status", "received_at", "received_quantity", "received_condition", "received_note",
          "reward_points", "reward_voucher", "weight_kg")
    User_Profile.objects.filter(user_id=d.donor_id).update(
        orbit_points=F("orbit_points") + points, environmental_impact=F("environmental_impact") + rewards.co2_saved(weight))

    mismatch_bits = []
    if d.quantity_mismatch:
        mismatch_bits.append(f"donor said {base_qty}, warehouse counted {received_qty}")
    if d.condition_mismatch:
        mismatch_bits.append(f"declared {d.condition}, arrived {received_condition}")
    detail = f"You earned {points} Orbit Points and a \u20b9{voucher.amount} voucher ({voucher.code})."
    if mismatch_bits:
        detail += " " + "; ".join(mismatch_bits) + "."
    if note:
        detail += f" {note}"
    event(d, "Received at the warehouse", detail, "good", "admin")
    _notify_donor(d, "Donation received", f"{d.public_id} reached our warehouse. You earned {points} Orbit Points "
                  f"and a \u20b9{voucher.amount} voucher: {voucher.code}.")
    if mismatch_bits:
        _notify_admins(d, "Mismatch at check-in", f"{d.public_id}: " + "; ".join(mismatch_bits) + ".")
    return ""


def _complete(d, admin, p):
    _need(d, S.RECEIVED)
    ngo = _text(p.get("ngo"), 100)
    if len(ngo) < 2:
        raise _fix({"ngo": ["Say who this was handed on to."]})
    qty = d.effective_quantity
    d.status, d.ngo, d.completed_at = S.COMPLETED, ngo, timezone.now()
    d.distributed_quantity, d.distributed_at = qty, d.completed_at
    d.certificate_id = f"ROC-{timezone.localdate().year}-{d.public_id.split('-')[-1]}"
    _save(d, "status", "ngo", "completed_at", "distributed_quantity", "distributed_at", "certificate_id")
    certificates.attach(d)
    _save(d, "certificate_file")
    event(d, "Completed, certificate issued", f"{qty} item(s) given to {ngo}. Certificate {d.certificate_id}.", "good", "admin")
    _notify_donor(d, "Your donation made a difference", f"{d.public_id} was given to {ngo}. Your certificate is ready.")
    return ""


def _reopen(d, admin, p):
    _need(d, S.REJECTED)
    d.status, d.reject_reason = S.PENDING, ""
    d.pickup_date, d.pickup_slot, d.assigned_partner, d.handover_code = None, "", None, ""
    d.accepted_quantity, d.partial_reject_reason = None, ""
    _save(d, "status", "reject_reason", "pickup_date", "pickup_slot", "assigned_partner", "handover_code",
          "accepted_quantity", "partial_reject_reason")
    event(d, "Back under review", "ReOrbit is looking at this donation again.", "wait", "admin")
    _notify_donor(d, "Donation under review again", f"{d.public_id} is being reviewed again.")
    return ""


HANDLERS = {
    "accept": _accept, "reject": _reject, "reschedule": _reschedule, "cancelPickup": _cancel_pickup,
    "pickedUp": _picked_up, "failed": _failed, "received": _received, "complete": _complete, "reopen": _reopen,
}
# the app sends camelCase; kebab-case and lower-case work too
ALIASES = {"cancel-pickup": "cancelPickup", "cancelpickup": "cancelPickup", "picked-up": "pickedUp", "pickedup": "pickedUp"}


def run_action(pk, key, admin, payload=None, ip=None):
    key = ALIASES.get(key, key)
    handler = HANDLERS.get(key)
    if handler is None:
        raise DonationError("Unknown action.", code="UNKNOWN_ACTION", status=404)
    payload = payload if hasattr(payload, "get") else {}
    with transaction.atomic():
        d = _lock(pk)
        before = d.status
        reason = handler(d, admin, payload)
        audit(admin, f"donation.{key}", "donation", d.public_id, before={"status": before},
              after={"status": d.status}, reason=reason or "", ip=ip)
    return d


# --------------------------------------------------------------------------- #
# pickup partner (token-authenticated, no ReOrbit account)
# --------------------------------------------------------------------------- #
def partner_for_token(raw_token):
    token = _text(raw_token, 40)
    partner = PickupPartner.objects.filter(token=token, status=PickupPartner.Status.ACTIVE).first() if token else None
    if partner is None:
        raise DonationError("Invalid or missing partner token.", code="PARTNER_AUTH", status=401)
    return partner


def partner_pickups(partner):
    """What this partner still has to collect: scheduled or failed, soonest first."""
    return (Donation.objects.filter(assigned_partner=partner, status__in=(S.SCHEDULED, S.FAILED_PICKUP))
            .select_related("donor").order_by("pickup_date", "pk"))


def partner_collect(pk, partner, code):
    with transaction.atomic():
        d = _lock(pk)
        if d.assigned_partner_id != partner.pk:
            raise DonationError("This pickup isn't assigned to you.", code="NOT_YOURS", status=403)
        _confirm_pickup(d, code, "partner")
        audit(None, "donation.partner_collect", "donation", d.public_id, after={"status": d.status})
    return d


def partner_mark_failed(pk, partner, reason):
    reason = _text(reason, 255)
    if len(reason) < 3:
        raise _fix({"reason": ["Say briefly what happened."]})
    with transaction.atomic():
        d = _lock(pk)
        if d.assigned_partner_id != partner.pk:
            raise DonationError("This pickup isn't assigned to you.", code="NOT_YOURS", status=403)
        _mark_failed(d, reason, "partner")
        audit(None, "donation.partner_failed", "donation", d.public_id, after={"status": d.status}, reason=reason)
    return d
