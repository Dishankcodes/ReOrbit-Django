"""Complaints: filing, the team's actions, and the real effects of those actions.

A complaint points at one real row. Actions on it really change that row:
  suspend / block   -> the account's status changes (it cannot sign in or trade while it holds)
  removeProduct     -> a member listing is switched off (Moderation=Disabled), a ReMaker product or
                       ReOrbit store item is set to Inactive; the owner is told why
  removeReview      -> the review is hidden through the Reviews moderation service
  warn              -> a warning is kept on the complaint and sent to the person's inbox
Every change is audited and the people involved are notified.
"""

import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.admins.models import AdminItem, Admins
from apps.core.services import audit, notify
from apps.listings.models import Item
from apps.remakers.models import RemakerProduct, ReMakers
from apps.reviews import services as review_services
from apps.reviews.models import ProductReview, SellerReview
from apps.reviews.moderation import hide_review
from apps.reviews.services import ReviewError
from apps.users.models import Users

from .models import Complaint, ComplaintEvent, ComplaintNote, ComplaintWarning

log = logging.getLogger(__name__)
C = Complaint
Status, Type = C.Status, C.Type
ACTIVE = (Status.OPEN, Status.UNDER_REVIEW)

CATEGORIES = {
    "User": ["Scam or fraud", "Abusive behaviour", "Fake account", "Spam", "No-show or unreliable", "Other"],
    "ReMaker": ["Item not as described", "Late delivery", "Poor quality", "Scam or fraud", "Rude behaviour",
                "Counterfeit or copied work", "Other"],
    "Product": ["Misleading photos or description", "Unrealistic price", "Duplicate listing",
                "Prohibited or unsafe item", "Counterfeit or copied work", "Already sold", "Other"],
    "Review": ["Fake or paid review", "Abusive language", "Personal information", "Off-topic", "Other"],
}
MEMBER_TYPES = ("User", "ReMaker", "Product")  # reviews are reported through the Reviews flow
DAILY_LIMIT = 10
DUPLICATE_DAYS = 7
RESULT_NOTE_MAX = 1000


class ComplaintError(Exception):
    def __init__(self, message, errors=None, code="COMPLAINT_ERROR", status=400):
        super().__init__(message)
        self.message, self.errors, self.code, self.status = message, errors or {}, code, status


def _fix(errors):
    return ComplaintError("Please fix the highlighted fields.", errors)


def _text(value, limit):
    return " ".join(str(value or "").split())[:limit]


# --------------------------------------------------------------------------- #
# the reported thing
# --------------------------------------------------------------------------- #
def resolve_target(ttype, public_id):
    """(fk_name, row) for a public id, or a validation error. The id must match the type."""
    pid = str(public_id or "").strip()
    table = {
        "User": {"USR-": ("target_user", Users)},
        "ReMaker": {"RMK-": ("target_remaker", ReMakers)},
        "Product": {"LST-": ("target_item", Item), "RPR-": ("target_remaker_product", RemakerProduct),
                    "ADI-": ("target_admin_item", AdminItem)},
        "Review": {"PRV-": ("target_product_review", ProductReview), "SRV-": ("target_seller_review", SellerReview)},
    }.get(ttype)
    if table is None:
        raise _fix({"type": ["Choose what you are reporting."]})
    for prefix, (fk, model) in table.items():
        if pid.startswith(prefix):
            row = model.objects.filter(public_id=pid).first()
            if row is None:
                break
            if ttype in ("User", "ReMaker") and row.status == "Deleted":
                break
            return fk, row
    raise ComplaintError("We couldn't find what you are reporting.", {"target": ["Not found."]}, "NOT_FOUND", 404)


def target_row(c):
    for fk in ("target_user", "target_remaker", "target_item", "target_remaker_product", "target_admin_item",
               "target_product_review", "target_seller_review"):
        row = getattr(c, fk)
        if row is not None:
            return row
    return None


def target_fk(c):
    for fk in ("target_user", "target_remaker", "target_item", "target_remaker_product", "target_admin_item",
               "target_product_review", "target_seller_review"):
        if getattr(c, f"{fk}_id") is not None:
            return fk
    return None


def owner_of(c):
    """The account behind the reported thing, or None (ReOrbit's own store has no member owner)."""
    row = target_row(c)
    if c.target_type in (Type.USER, Type.REMAKER):
        return row
    if c.target_type == Type.PRODUCT:
        return getattr(row, "user", None) or getattr(row, "remaker", None)
    return None


def reviewer_of(review):
    """A review is written by a member, a ReMaker or a ReOrbit admin shopping as the platform."""
    return review.reviewer_user or review.reviewer_remaker or review.reviewer_admin


def is_live(row):
    if isinstance(row, Item):
        return row.item_status in (Item.Status.LISTED, Item.Status.RESERVED) \
            and row.moderation_status != Item.Moderation.DISABLED
    return row.status == "Listed"


def can_remove(row):
    if isinstance(row, Item):
        return row.moderation_status != Item.Moderation.DISABLED and row.item_status in (
            Item.Status.LISTED, Item.Status.RESERVED)
    return row.status in ("Listed", "Sold_Out")


# --------------------------------------------------------------------------- #
# events
# --------------------------------------------------------------------------- #
def event(c, label, detail="", tone="neutral"):
    return ComplaintEvent.objects.create(complaint=c, label=label[:60], detail=str(detail or "")[:1000], tone=tone)


def _tell_admins(c):
    try:
        with transaction.atomic():
            for a in Admins.objects.filter(status="Active"):
                if a.has_module("complaints", "view"):
                    notify(a, "New complaint", f"{c.category} · {c.target_type} ({c.public_id})",
                           module="complaints", target_url=f"/admin-complaints/{c.public_id}",
                           ref_type="complaint", ref_id=c.public_id,
                           severity="warning" if c.category in HIGH else "info")
    except Exception:  # noqa: BLE001
        log.exception("could not notify admins about %s", c.public_id)


HIGH = {"Scam or fraud", "Prohibited or unsafe item", "Counterfeit or copied work", "Abusive behaviour",
        "Personal information", "Abusive language"}


def _check_report(ttype, category, description):
    errors = {}
    if category not in CATEGORIES.get(ttype, []):
        errors["category"] = ["Choose one of the reasons."]
    desc = _text(description, 1000)
    if len(desc) < 10:
        errors["description"] = ["Tell us a little more (at least 10 characters)."]
    if errors:
        raise _fix(errors)
    return desc


# --------------------------------------------------------------------------- #
# filing
# --------------------------------------------------------------------------- #
@transaction.atomic
def file_member(account, data):
    """A member or ReMaker reports a person or a listing."""
    ttype = data.get("type")
    if ttype == Type.REVIEW:
        raise ComplaintError("Reviews are reported from the review itself.", {"type": ["Use “Report review”."]})
    if ttype not in MEMBER_TYPES:
        raise _fix({"type": ["Choose what you are reporting."]})
    fk, row = resolve_target(ttype, data.get("target_id"))
    desc = _check_report(ttype, data.get("category"), data.get("description"))
    kind = "remaker" if isinstance(account, ReMakers) else "user"

    probe = C(target_type=ttype, **{fk: row})
    owner = owner_of(probe)
    if owner is not None and type(owner) is type(account) and owner.pk == account.pk:
        raise ComplaintError("You can't report your own " + ("account." if ttype in ("User", "ReMaker") else "listing."),
                             code="OWN_TARGET", status=409)
    mine = {f"reporter_{kind}": account}
    since = timezone.now() - timedelta(days=1)
    if C.objects.filter(source=C.Source.MEMBER, created_at__gte=since, **mine).count() >= DAILY_LIMIT:
        raise ComplaintError("You've sent a lot of reports today. Please try again tomorrow.", code="RATE_LIMITED", status=429)
    if C.objects.filter(status__in=ACTIVE, category=data.get("category"), **{fk: row}, **mine).exists():
        raise ComplaintError("You've already reported this and our team is looking into it.", code="DUPLICATE", status=409)

    c = C.objects.create(
        target_type=ttype, **{fk: row}, category=data["category"], description=desc, source=C.Source.MEMBER,
        reporter_name=account.full_name, reporter_role="ReMaker" if kind == "remaker" else "User", **mine)
    event(c, "Complaint filed", f"Reported by {account.full_name}", "wait")
    audit(account, "complaint.file", "complaint", c.public_id, after={"type": ttype, "category": c.category})
    _tell_admins(c)
    return c


@transaction.atomic
def log_by_admin(admin, data, ip=None):
    """The team logs a complaint that came by email, phone or from the pickup team."""
    ttype = data.get("type")
    fk, row = resolve_target(ttype, data.get("targetId") or data.get("target_id"))
    desc = _check_report(ttype, data.get("category"), data.get("description"))
    role = data.get("reporterRole") if data.get("reporterRole") in ("User", "ReMaker", "Staff") else "Staff"
    name = _text(data.get("reporterName"), 150) or "ReOrbit team"
    c = C.objects.create(
        target_type=ttype, **{fk: row}, category=data["category"], description=desc, source=C.Source.ADMIN,
        logged_by=admin, reporter_name=name, reporter_role=role)
    event(c, "Complaint logged", f"Logged by {admin.full_name} on behalf of {name}", "wait")
    audit(admin, "complaint.log", "complaint", c.public_id, after={"type": ttype, "category": c.category}, ip=ip)
    _tell_admins(c)
    return c


# --------------------------------------------------------------------------- #
# actions
# --------------------------------------------------------------------------- #
def _reason(p, minimum=5):
    reason = _text(p.get("reason"), 500)
    if len(reason) < minimum:
        raise _fix({"reason": [f"Say why (at least {minimum} characters)."]})
    return reason


def _need_active(c):
    if c.status not in ACTIVE:
        raise ComplaintError("This complaint is already closed. Reopen it first.", code="BAD_STATE", status=409)


def _close(c, admin, status, action, note, label, tone):
    c.status, c.resolution_action, c.resolution_note = status, action, note[:RESULT_NOTE_MAX]
    c.resolved_by, c.resolved_at = admin, timezone.now()
    c.save(update_fields=["status", "resolution_action", "resolution_note", "resolved_by", "resolved_at", "updated_at"])
    event(c, label, note, tone)


def _finish(c, admin, p, status, action, note, label, tone):
    _close(c, admin, status, action, note, label, tone)
    if p.get("alsoResolve"):
        fk = target_fk(c)
        for x in C.objects.select_for_update().filter(status__in=ACTIVE, **{f"{fk}_id": getattr(c, f"{fk}_id")}).exclude(pk=c.pk):
            _close(x, admin, Status.RESOLVED, action, f"Handled together with {c.public_id}. {note}",
                   "Resolved", "good")
            _tell_reporter(x, "Your report was handled", f"{x.public_id}: our team took action on what you reported.")


def _tell_reporter(c, title, body):
    who = c.reporter_user or c.reporter_remaker
    if who is None:
        return
    try:
        with transaction.atomic():
            notify(who, title, body, module="complaints", ref_type="complaint", ref_id=c.public_id)
    except Exception:  # noqa: BLE001
        log.exception("could not notify the reporter of %s", c.public_id)


def _tell(account, title, body, *, severity="warning", url="", ref=None):
    try:
        with transaction.atomic():
            notify(account, title, body, module="complaints", target_url=url, severity=severity,
                   ref_type=ref[0] if ref else "", ref_id=ref[1] if ref else "")
    except Exception:  # noqa: BLE001
        log.exception("complaint notification failed")


def _a_start(c, admin, p):
    if c.status != Status.OPEN:
        raise ComplaintError("Only an open complaint can be started.", code="BAD_STATE", status=409)
    assignee = _assignee(p.get("assigneeId")) if p.get("assigneeId") else (c.assignee or admin)
    c.status, c.assignee = Status.UNDER_REVIEW, assignee
    c.save(update_fields=["status", "assignee", "updated_at"])
    event(c, "Review started", f"{admin.full_name} started looking into this", "info")


def _assignee(public_id):
    a = Admins.objects.filter(public_id=public_id, status="Active").first()
    if a is None or not a.has_module("complaints", "view"):
        raise _fix({"assigneeId": ["Choose a team member who can handle complaints."]})
    return a


def _a_assign(c, admin, p):
    _need_active(c)
    if p.get("assigneeId"):
        a = _assignee(p["assigneeId"])
        c.assignee = a
        c.save(update_fields=["assignee", "updated_at"])
        event(c, "Assigned", f"Assigned to {a.full_name}", "info")
        if a.pk != admin.pk:
            _tell(a, "A complaint was assigned to you", f"{c.public_id} · {c.category}", severity="info",
                  url=f"/admin-complaints/{c.public_id}", ref=("complaint", c.public_id))
    else:
        c.assignee = None
        c.save(update_fields=["assignee", "updated_at"])
        event(c, "Assigned", "Assignee removed", "info")


def _a_reopen(c, admin, p):
    if c.status in ACTIVE:
        raise ComplaintError("This complaint is already open.", code="BAD_STATE", status=409)
    c.status = Status.OPEN
    c.resolution_action = c.resolution_note = ""
    c.resolved_by = c.resolved_at = None
    c.save(update_fields=["status", "resolution_action", "resolution_note", "resolved_by", "resolved_at", "updated_at"])
    event(c, "Reopened", f"{admin.full_name} reopened this complaint", "wait")


def _a_dismiss(c, admin, p):
    _need_active(c)
    reason = _reason(p)
    _finish(c, admin, p, Status.DISMISSED, "dismissed", reason, "Dismissed", "neutral")
    _tell_reporter(c, "Your report was reviewed", f"{c.public_id}: we didn't find a rule was broken. {reason}")


def _a_resolve(c, admin, p):
    """Close a complaint as handled without a penalty (e.g. sorted out with the people involved)."""
    _need_active(c)
    note = _reason(p)
    _finish(c, admin, p, Status.RESOLVED, "resolved", note, "Resolved", "good")
    _tell_reporter(c, "Your report was handled", f"{c.public_id}: our team looked into it and closed it. {note}")


def can_act(admin, c):
    """Who may change a complaint: anyone with Complaints edit access (Super Admins always),
    and the admin it is assigned to, even with view-only access."""
    return admin.has_module("complaints", "edit") or (c is not None and c.assignee_id == admin.pk)


def _warn_recipient(c):
    if c.target_type == Type.REVIEW:
        return reviewer_of(target_row(c))
    owner = owner_of(c)
    if owner is None:
        raise ComplaintError("This listing belongs to ReOrbit's own store, so there is nobody to warn.",
                             code="NO_OWNER", status=409)
    return owner


def _a_warn(c, admin, p):
    _need_active(c)
    message = _text(p.get("message"), 1000)
    if len(message) < 15:
        raise _fix({"message": ["Write the warning (at least 15 characters)."]})
    who = _warn_recipient(c)
    ComplaintWarning.objects.create(complaint=c, sent_by=admin, sent_by_name=admin.full_name, message=message)
    _tell(who, "A warning from ReOrbit", message, ref=("complaint", c.public_id))
    _finish(c, admin, p, Status.RESOLVED, "warned", f"Warning sent: “{message}”", "Warning sent", "wait")
    _tell_reporter(c, "Your report was handled", f"{c.public_id}: we sent a warning.")


def _account_for_penalty(c):
    if c.target_type == Type.REVIEW:
        raise ComplaintError("A review can't be suspended.", code="BAD_TARGET", status=409)
    owner = owner_of(c)
    if owner is None:
        raise ComplaintError("This listing belongs to ReOrbit's own store.", code="NO_OWNER", status=409)
    return owner


def _a_penalty(c, admin, p, key):
    _need_active(c)
    reason = _reason(p)
    acct = _account_for_penalty(c)
    nxt = "Suspended" if key == "suspend" else "Blocked"
    if key == "suspend" and acct.status != "Active":
        raise ComplaintError(f"This account is already {acct.status.lower()}.", code="BAD_STATE", status=409)
    if key == "block" and acct.status in ("Blocked", "Deleted"):
        raise ComplaintError(f"This account is already {acct.status.lower()}.", code="BAD_STATE", status=409)
    before = acct.status
    acct.status = nxt
    acct.save(update_fields=["status", "updated_at"] if hasattr(acct, "updated_at") else ["status"])
    audit(admin, f"account.{key}", "user" if isinstance(acct, Users) else "remaker", acct.public_id,
          before={"status": before}, after={"status": nxt}, reason=reason)
    _tell(acct, f"Your account was {nxt.lower()}", reason, severity="critical", ref=("complaint", c.public_id))
    _finish(c, admin, p, Status.RESOLVED, "suspended" if key == "suspend" else "blocked",
            f"{acct.full_name} {nxt.lower()}. {reason}",
            "Account suspended" if key == "suspend" else "Account blocked", "bad")
    _tell_reporter(c, "Your report was handled", f"{c.public_id}: we took action on the account you reported.")


def _a_remove_product(c, admin, p):
    _need_active(c)
    if c.target_type != Type.PRODUCT:
        raise ComplaintError("Only a listing can be removed.", code="BAD_TARGET", status=409)
    reason = _reason(p)
    row = target_row(c)
    if not can_remove(row):
        raise ComplaintError("This listing is already off the marketplace.", code="BAD_STATE", status=409)
    now = timezone.now()
    if isinstance(row, Item):
        before = row.moderation_status
        row.moderation_status, row.moderation_note = Item.Moderation.DISABLED, reason
        row.moderated_by, row.moderated_at = admin, now
        row.save()
        audit(admin, "listing.moderate", "item", row.public_id, before={"moderation_status": before},
              after={"moderation_status": row.moderation_status}, reason=reason)
        owner = row.user
    elif isinstance(row, RemakerProduct):
        before = row.status
        row.status, row.deactivated_by, row.deactivated_at = RemakerProduct.Status.INACTIVE, admin, now
        row.deactivation_reason = reason
        row.save()
        audit(admin, "product.deactivate", "product", row.public_id, before={"status": before},
              after={"status": row.status}, reason=reason)
        owner = row.remaker
    else:  # ReOrbit's own store item
        before = row.status
        row.status = AdminItem.Status.INACTIVE
        row.save()
        audit(admin, "store.pause", "store_item", row.public_id, before={"status": before},
              after={"status": row.status}, reason=reason)
        owner = None
    if owner is not None:
        _tell(owner, "Your listing was turned off", f"“{row.title}” is hidden from buyers. Reason: {reason}",
              ref=("complaint", c.public_id))
    _finish(c, admin, p, Status.RESOLVED, "removedProduct", f"Listing taken down. {reason}", "Listing removed", "bad")
    _tell_reporter(c, "Your report was handled", f"{c.public_id}: the listing was taken down.")


def _a_remove_review(c, admin, p):
    _need_active(c)
    if c.target_type != Type.REVIEW:
        raise ComplaintError("Only a review can be removed.", code="BAD_TARGET", status=409)
    reason = _reason(p)
    review = target_row(c)
    if review.status != review.Status.VISIBLE:
        raise ComplaintError("This review is already hidden.", code="BAD_STATE", status=409)
    try:
        hide_review(admin, review.public_id, reason)
    except ReviewError as e:
        raise ComplaintError(e.message, e.errors, e.code or "REVIEW_ERROR", e.status)
    _finish(c, admin, p, Status.RESOLVED, "removedReview", f"Review removed. {reason}", "Review removed", "bad")
    _tell_reporter(c, "Your report was handled", f"{c.public_id}: the review was removed.")


HANDLERS = {
    "start": _a_start, "assign": _a_assign, "reopen": _a_reopen, "dismiss": _a_dismiss, "resolve": _a_resolve,
    "warn": _a_warn,
    "suspend": lambda c, a, p: _a_penalty(c, a, p, "suspend"),
    "block": lambda c, a, p: _a_penalty(c, a, p, "block"),
    "removeProduct": _a_remove_product, "removeReview": _a_remove_review,
}


def run_action(public_id, key, admin, payload=None, ip=None):
    handler = HANDLERS.get(key)
    if handler is None:
        raise ComplaintError("Unknown action.", code="UNKNOWN_ACTION", status=404)
    payload = payload if hasattr(payload, "get") else {}
    with transaction.atomic():
        c = C.objects.select_for_update(of=("self",)).filter(public_id=public_id).first()
        if c is None:
            raise ComplaintError("That complaint no longer exists.", code="NOT_FOUND", status=404)
        before = c.status
        handler(c, admin, payload)
        audit(admin, f"complaint.{key}", "complaint", c.public_id, before={"status": before},
              after={"status": c.status}, ip=ip)
    return c


@transaction.atomic
def add_note(public_id, admin, text):
    c = C.objects.select_for_update(of=("self",)).filter(public_id=public_id).first()
    if c is None:
        raise ComplaintError("That complaint no longer exists.", code="NOT_FOUND", status=404)
    text = _text(text, 2000)
    if len(text) < 2:
        raise _fix({"text": ["Write a note."]})
    return ComplaintNote.objects.create(complaint=c, author=admin, author_name=admin.full_name, text=text)
