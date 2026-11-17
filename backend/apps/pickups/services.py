"""Pickup teams and item pickups (see models.py).

Donation pickups are still run by apps.donations (the admin screen calls those actions directly);
this module covers the people on each team and the pickups of listed items.
"""

import logging
import re

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.admins.models import Admins
from apps.core.services import audit, notify
from apps.core.validators import validate_phone
from apps.donations import services as donation_services
from apps.donations.models import Donation, PickupPartner

from .models import PickupEvent, PickupRequest, PickupTeamMember

log = logging.getLogger(__name__)
R = PickupRequest.Status
Role, MStatus = PickupTeamMember.Role, PickupTeamMember.Status

VEHICLES = (
    "Tata Ace mini-truck", "Mahindra Bolero pickup", "Electric cargo three-wheeler",
    "Maruti Eeco van", "Bike with carrier",
)
MAX_CAPACITY = 50


class PickupError(Exception):
    def __init__(self, message, errors=None, code="PICKUP_ERROR", status=400):
        super().__init__(message)
        self.message, self.errors, self.code, self.status = message, errors, code, status


def _text(value, limit):
    return " ".join(str(value or "").split())[:limit]


def _fix(errors):
    return PickupError("Please fix the highlighted fields.", errors)


def _digits(phone):
    return re.sub(r"[\s-]", "", str(phone or ""))


def _phone(raw, field="phone"):
    value = _text(raw, 20)
    try:
        validate_phone(value)  # 10-digit Indian mobile, the same rule as everywhere else
    except ValidationError:
        raise _fix({field: ["Enter a 10-digit mobile number."]})
    return value


def _phone_free(phone, except_member=None):
    clean = _digits(phone)
    for m in PickupTeamMember.objects.exclude(pk=except_member):
        if _digits(m.phone) == clean:
            raise _fix({"phone": ["This number already belongs to someone on a pickup team."]})


# --------------------------------------------------------------------------- #
# teams
# --------------------------------------------------------------------------- #
def sync_lead(team):
    """The team label shown to donors and customers follows the current Lead."""
    members = list(team.members.all())
    lead = next((m for m in members if m.role == Role.LEAD and m.status == MStatus.ACTIVE), None) \
        or next((m for m in members if m.role == Role.LEAD), None) or (members[0] if members else None)
    team.lead_name = lead.name if lead else ""
    team.phone = lead.phone if lead else ""
    team.save(update_fields=["lead_name", "phone", "updated_at"])


def _has_active_lead(team):
    return team.members.filter(role=Role.LEAD, status=MStatus.ACTIVE).exists()


def _team_fields(data, *, name_required=True, current=None):
    errors, out = {}, {}
    if name_required or "name" in data:
        name = _text(data.get("name"), 60)
        if len(name) < 2:
            errors["name"] = ["Give the team a name."]
        elif PickupPartner.objects.filter(name__iexact=name).exclude(pk=getattr(current, "pk", None)).exists():
            errors["name"] = ["A pickup team with this name already exists."]
        out["name"] = name
    area = _text(data.get("area"), 120)
    if not area:
        errors["area"] = ["Say where this team works."]
    vehicle = _text(data.get("vehicle"), 60)
    if not vehicle:
        errors["vehicle"] = ["Choose a vehicle."]
    try:
        capacity = int(str(data.get("capacity")).strip())
        if not 1 <= capacity <= MAX_CAPACITY:
            raise ValueError
    except ValueError:
        errors["capacity"] = [f"Capacity must be between 1 and {MAX_CAPACITY} pickups a day."]
        capacity = None
    if errors:
        raise _fix(errors)
    out.update(area=area, vehicle=vehicle, capacity=capacity, note=_text(data.get("note"), 300))
    return out


@transaction.atomic
def create_team(admin, data, ip=None):
    fields = _team_fields(data)
    lead = data.get("lead") or {}
    lead_name = _text(lead.get("name"), 120)
    if len(lead_name) < 2:
        raise _fix({"lead.name": ["Enter the lead's name."]})
    lead_phone = _phone(lead.get("phone"), "lead.phone")
    _phone_free(lead_phone)
    crew = []
    for c in data.get("crew") or []:
        n, p = _text(c.get("name"), 120), _text(c.get("phone"), 20)
        if not n and not p:
            continue
        if len(n) < 2:
            raise _fix({"crew": ["Enter the crew member's name."]})
        p = _phone(p, "crew")
        role = c.get("role") if c.get("role") in (Role.DRIVER, Role.HELPER) else Role.HELPER
        crew.append((n, p, role))
    phones = [_digits(lead_phone)] + [_digits(p) for _, p, _ in crew]
    for p in phones:
        _phone_free(p)
    if len(set(phones)) != len(phones):
        raise _fix({"phone": ["Two people on this team have the same number."]})
    team = PickupPartner.objects.create(**fields, status=PickupPartner.Status.ACTIVE)
    PickupTeamMember.objects.create(team=team, name=lead_name, phone=lead_phone, role=Role.LEAD)
    for n, p, role in crew:
        PickupTeamMember.objects.create(team=team, name=n, phone=p, role=role)
    sync_lead(team)
    audit(admin, "pickupTeam.create", "pickup_team", team.public_id, after={"name": team.name}, ip=ip)
    return team


@transaction.atomic
def update_team(team_id, admin, data, ip=None):
    team = PickupPartner.objects.select_for_update().get(public_id=team_id)
    # a team's name stays once it has had pickups, since donors' history refers to it
    had_work = Donation.objects.filter(assigned_partner=team).exists() or team.item_pickups.exists()
    keep_name = had_work or "name" not in data
    fields = _team_fields(data, name_required=False, current=team)
    if keep_name:
        fields.pop("name", None)
    for k, v in fields.items():
        setattr(team, k, v)
    team.save()
    audit(admin, "pickupTeam.update", "pickup_team", team.public_id, after={"name": team.name}, ip=ip)
    return team


def upcoming_pickups(team):
    """Scheduled pickups still to do for a team (donations and items)."""
    don = list(Donation.objects.filter(
        assigned_partner=team, status__in=(Donation.Status.SCHEDULED, Donation.Status.FAILED_PICKUP)))
    items = list(PickupRequest.objects.filter(assigned_partner=team, status=R.SCHEDULED))
    return don, items


@transaction.atomic
def set_team_status(team_id, admin, status, reason="", move_to=None, ip=None):
    """Pause or resume. Pausing can move the team's upcoming pickups to another team in the same step."""
    team = PickupPartner.objects.select_for_update().get(public_id=team_id)
    if status == "Paused":
        reason = _text(reason, 200)
        if len(reason) < 3:
            raise _fix({"reason": ["Say why the team is paused."]})
        don, items = upcoming_pickups(team)
        if (don or items) and not move_to:
            raise PickupError("This team has upcoming pickups. Move them to another team first.",
                              {"move_to": ["Choose a team to take the upcoming pickups."]}, code="HAS_PICKUPS", status=409)
        if move_to:
            target = _ready_team(move_to, exclude=team)
            reassign(team, target, admin)
        team.status, team.paused_reason = PickupPartner.Status.INACTIVE, reason
    elif status == "Active":
        if not _has_active_lead(team):
            raise PickupError("Add an active lead before resuming this team.", code="NO_LEAD", status=409)
        team.status, team.paused_reason = PickupPartner.Status.ACTIVE, ""
    else:
        raise _fix({"status": ["Unknown status."]})
    team.save(update_fields=["status", "paused_reason", "updated_at"])
    audit(admin, f"pickupTeam.{status.lower()}", "pickup_team", team.public_id, reason=reason, ip=ip)
    return team


def _ready_team(key, exclude=None):
    t = PickupPartner.objects.filter(Q(public_id=key) | Q(name__iexact=str(key)),
                                     status=PickupPartner.Status.ACTIVE).exclude(pk=getattr(exclude, "pk", None)).first()
    if t is None or not _has_active_lead(t):
        raise _fix({"move_to": ["Choose a team that is active and has a lead."]})
    return t


def reassign(source, target, admin):
    """Hand every scheduled pickup of one team to another; date and slot stay."""
    don, items = upcoming_pickups(source)
    for d in don:
        Donation.objects.filter(pk=d.pk).update(assigned_partner=target)
        donation_services.event(d, "Pickup team changed", f"{source.name} → {target.name}", "wait", "admin")
    for r in items:
        r.assigned_partner = target
        r.save(update_fields=["assigned_partner", "updated_at"])
        _event(r, "Pickup team changed", f"{source.name} → {target.name}", "wait", "admin")


@transaction.atomic
def remove_team(team_id, admin, ip=None):
    team = PickupPartner.objects.select_for_update().get(public_id=team_id)
    if Donation.objects.filter(assigned_partner=team).exists() or team.item_pickups.exists():
        raise PickupError("This team has pickup history, so it can't be deleted. Pause it instead.",
                          code="HAS_HISTORY", status=409)
    audit(admin, "pickupTeam.delete", "pickup_team", team.public_id, before={"name": team.name}, ip=ip)
    team.delete()


# --------------------------------------------------------------------------- #
# members
# --------------------------------------------------------------------------- #
def _member_values(data, partial=False):
    name = _text(data.get("name"), 120)
    if len(name) < 2:
        raise _fix({"name": ["Enter the person's name."]})
    role = data.get("role")
    if role not in Role.values:
        raise _fix({"role": ["Choose Lead, Driver or Helper."]})
    status = data.get("status") or MStatus.ACTIVE
    if status not in MStatus.values:
        raise _fix({"status": ["Choose Active or On leave."]})
    return name, role, status


def _demote_other_leads(team, keep=None):
    team.members.filter(role=Role.LEAD).exclude(pk=getattr(keep, "pk", None)).update(role=Role.DRIVER)


def _guard_team_still_works(team):
    """A team that is taking pickups needs somebody on duty as Lead."""
    if team.status == PickupPartner.Status.ACTIVE and not _has_active_lead(team):
        don, items = upcoming_pickups(team)
        if don or items:
            raise PickupError("This team has upcoming pickups. Move them or keep an active lead.",
                              code="NO_LEAD", status=409)


@transaction.atomic
def add_member(team_id, admin, data):
    team = PickupPartner.objects.select_for_update().get(public_id=team_id)
    name, role, _ = _member_values(data)
    phone = _phone(data.get("phone"))
    _phone_free(phone)
    if role == Role.LEAD:
        _demote_other_leads(team)
    m = PickupTeamMember.objects.create(team=team, name=name, phone=phone, role=role)
    sync_lead(team)
    return m


def _member(team_id, member_id, lock=True):
    team = PickupPartner.objects.select_for_update().get(public_id=team_id)
    m = PickupTeamMember.objects.select_for_update().get(pk=member_id, team=team)
    return team, m


@transaction.atomic
def update_member(team_id, member_id, admin, data):
    team, m = _member(team_id, member_id)
    name, role, status = _member_values({**{"status": m.status}, **data})
    phone = _phone(data.get("phone", m.phone))
    _phone_free(phone, except_member=m.pk)
    if role == Role.LEAD:
        _demote_other_leads(team, keep=m)
    m.name, m.phone, m.role, m.status = name, phone, role, status
    m.save()
    _guard_team_still_works(team)
    sync_lead(team)
    return m


@transaction.atomic
def make_lead(team_id, member_id, admin):
    team, m = _member(team_id, member_id)
    _demote_other_leads(team, keep=m)
    m.role, m.status = Role.LEAD, MStatus.ACTIVE
    m.save()
    sync_lead(team)
    return m


@transaction.atomic
def set_member_status(team_id, member_id, admin, status):
    team, m = _member(team_id, member_id)
    if status not in MStatus.values:
        raise _fix({"status": ["Choose Active or On leave."]})
    m.status = status
    m.save(update_fields=["status", "updated_at"])
    _guard_team_still_works(team)
    sync_lead(team)
    return m


@transaction.atomic
def remove_member(team_id, member_id, admin):
    team, m = _member(team_id, member_id)
    m.delete()
    _guard_team_still_works(team)
    sync_lead(team)


@transaction.atomic
def move_member(team_id, member_id, admin, to_id):
    team, m = _member(team_id, member_id)
    target = PickupPartner.objects.select_for_update().filter(public_id=to_id).exclude(pk=team.pk).first()
    if target is None:
        raise _fix({"to": ["Choose the team to move them to."]})
    role = Role.DRIVER if m.role == Role.LEAD and target.members.filter(role=Role.LEAD).exists() else m.role
    m.team, m.role = target, role
    m.save(update_fields=["team", "role", "updated_at"])
    _guard_team_still_works(team)
    sync_lead(team)
    sync_lead(target)
    return m


# --------------------------------------------------------------------------- #
# item pickups
# --------------------------------------------------------------------------- #
def _event(r, label, detail="", tone="neutral", actor="system"):
    return PickupEvent.objects.create(request=r, label=label[:60], detail=str(detail or "")[:255], tone=tone, actor=actor)


def _snapshot(user):
    p = getattr(user, "profile", None)
    return {"line": getattr(p, "address", "") or "", "city": getattr(p, "city", "") or "",
            "state": getattr(p, "state", "") or "", "pincode": getattr(p, "pincode", "") or "",
            "phone": getattr(p, "phone", "") or ""}


def request_for_item(item):
    """Called when a listing goes live. One request per listing, however often it is published."""
    if item.pickup_preference != item.Pickup.PLATFORM_PICKUP:
        return None
    r, created = PickupRequest.objects.get_or_create(
        item=item, defaults={"user": item.user, "address_snapshot": _snapshot(item.user)})
    if created:
        _event(r, "Pickup requested", f"{item.user.full_name} chose “Managed by ReOrbit”", "neutral", "user")
        try:
            with transaction.atomic():
                for a in Admins.objects.filter(status="Active"):
                    if a.has_module("pickups", "view"):
                        notify(a, "New pickup to schedule", f"{item.title} is waiting for a pickup.",
                               module="pickups", target_url=f"/admin-pickups/PK-I{r.public_id.split('-')[-1]}",
                               ref_type="pickup", ref_id=r.public_id)
        except Exception:  # noqa: BLE001
            log.exception("pickup notification failed")
    return r


def _lock_request(public_id):
    try:
        return PickupRequest.objects.select_for_update(of=("self",)).select_related(
            "user", "assigned_partner", "item").get(public_id=public_id)
    except PickupRequest.DoesNotExist:
        raise PickupError("That pickup no longer exists.", code="NOT_FOUND", status=404)


def _need(r, *statuses):
    if r.status not in statuses:
        raise PickupError(f"This pickup is {r.get_status_display().lower()}, so you can't do that.",
                          code="BAD_STATE", status=409)


def _notify_seller(r, title, body):
    try:
        with transaction.atomic():
            notify(r.user, title, body, module="pickups", target_url="/user-sell",
                   ref_type="pickup", ref_id=r.public_id)
    except Exception:  # noqa: BLE001
        log.exception("pickup notification failed")


def _schedule(r, admin, p, *, again=False):
    _need(r, R.SCHEDULED) if again else _need(r, R.REQUESTED)
    try:
        day, slot = donation_services.parse_schedule(p.get("date"), p.get("slot"), admin=True)
        partner = donation_services._partner(p.get("partner"))
    except donation_services.DonationError as e:
        raise PickupError(e.message, e.errors, e.code, e.status)
    if not _has_active_lead(partner):
        raise _fix({"partner": ["This team has no active lead yet."]})
    r.pickup_date, r.pickup_slot, r.assigned_partner, r.status = day, slot, partner, R.SCHEDULED
    r.save(update_fields=["pickup_date", "pickup_slot", "assigned_partner", "status", "updated_at"])
    label = "Pickup rescheduled" if again else "Pickup scheduled"
    detail = f"{donation_services.when(day, slot)} · {partner.name}"
    _event(r, label, detail, "wait" if again else "good", "admin")
    _notify_seller(r, "Pickup scheduled" if not again else "Pickup rescheduled",
                   f"{r.item.title}: {donation_services.when(day, slot)}, team {partner.name}.")


def _picked_up(r, admin, p):
    _need(r, R.SCHEDULED)
    r.status = R.PICKED_UP
    r.save(update_fields=["status", "updated_at"])
    _event(r, "Picked up from customer", r.assigned_partner.name if r.assigned_partner else "", "info", "admin")
    _notify_seller(r, "Item picked up", f"{r.item.title} was collected.")


def _complete(r, admin, p):
    _need(r, R.PICKED_UP)
    r.status, r.completed_at = R.COMPLETED, timezone.now()
    r.save(update_fields=["status", "completed_at", "updated_at"])
    _event(r, "Delivered to warehouse", "Checked in and stored", "good", "admin")


def _cancel(r, admin, p):
    _need(r, R.REQUESTED, R.SCHEDULED)
    reason = _text(p.get("reason"), 255)
    if len(reason) < 5:
        raise _fix({"reason": ["Say why (at least 5 characters)."]})
    r.status, r.pickup_date, r.pickup_slot, r.cancel_reason = R.CANCELLED, None, "", reason
    r.save(update_fields=["status", "pickup_date", "pickup_slot", "cancel_reason", "updated_at"])
    _event(r, "Pickup cancelled", reason, "bad", "admin")
    _notify_seller(r, "Pickup cancelled", f"{r.item.title}: {reason}")


def _reopen(r, admin, p):
    _need(r, R.CANCELLED)
    r.status, r.cancel_reason = R.REQUESTED, ""
    r.assigned_partner = None
    r.save(update_fields=["status", "cancel_reason", "assigned_partner", "updated_at"])
    _event(r, "Pickup reopened", "", "wait", "admin")


ITEM_HANDLERS = {
    "schedule": lambda r, a, p: _schedule(r, a, p),
    "reschedule": lambda r, a, p: _schedule(r, a, p, again=True),
    "pickedUp": _picked_up, "complete": _complete, "cancel": _cancel, "reopen": _reopen,
}


def run_item_action(public_id, key, admin, payload=None, ip=None):
    handler = ITEM_HANDLERS.get(key)
    if handler is None:
        raise PickupError("Unknown action.", code="UNKNOWN_ACTION", status=404)
    payload = payload if hasattr(payload, "get") else {}
    with transaction.atomic():
        r = _lock_request(public_id)
        before = r.status
        handler(r, admin, payload)
        audit(admin, f"pickup.{key}", "pickup_request", r.public_id, before={"status": before},
              after={"status": r.status}, ip=ip)
    return r
