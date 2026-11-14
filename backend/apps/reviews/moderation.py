"""Reports on reviews and what the ReOrbit team can do about them.

* Any member or ReMaker can report a review (not their own). One report per person per review.
* An admin can hide a review (it leaves public pages and the rating) or restore it, and
  can settle a report: "uphold" hides the review, "dismiss" keeps it.
"""

from django.db import transaction
from django.utils import timezone

from apps.core import buyers
from apps.core.services import audit, notify

from . import services
from .models import ReviewReport
from .services import ReviewError, find_review, refresh_rating


def _reporter(account):
    t = buyers.type_of(account)
    if t not in ("user", "remaker"):
        raise ReviewError("Only members and ReMakers can report reviews.", status=403)
    return {"reporter_type": t, "reporter_key": buyers.key_of(account), f"reporter_{t}": account}


def _link(review):
    return {"product_review": review} if review.public_id.startswith("PRV-") else {"seller_review": review}


def my_report(account, review):
    key = buyers.key_of(account)
    return ReviewReport.objects.filter(reporter_key=key, **_link(review)).first()


@transaction.atomic
def report_review(account, review_id, reason, note=""):
    who = _reporter(account)
    review = find_review(review_id)
    if review is None:
        raise ReviewError("We couldn't find that review.", status=404)
    if who["reporter_key"] == review.reviewer_key:
        raise ReviewError("You can't report your own review.", status=403)
    reason = " ".join(str(reason or "").split())
    note = " ".join(str(note or "").split())
    errors = {}
    if not reason:
        errors["reason"] = ["Choose a reason."]
    elif len(reason) > 60:
        errors["reason"] = ["Keep the reason under 60 characters."]
    if len(note) > 500:
        errors["note"] = ["Keep this under 500 characters."]
    if errors:
        raise ReviewError("Please fix the highlighted fields.", errors=errors)
    if my_report(account, review):
        raise ReviewError("You have already reported this review.", status=409, code="already_reported")
    rep = ReviewReport.objects.create(reason=reason, note=note, **who, **_link(review))
    return rep


@transaction.atomic
def withdraw_report(account, review_id):
    review = find_review(review_id)
    rep = my_report(account, review) if review else None
    if rep is None:
        raise ReviewError("We couldn't find your report.", status=404)
    if rep.status != ReviewReport.Status.PENDING:
        raise ReviewError("This report was already looked at, so it can't be withdrawn.", status=409, code="report_settled")
    rep.delete()


# ------------------------------------------------------------------------- admin
def _tell_reviewer_hidden(review, reason):
    reviewer = getattr(review, f"reviewer_{review.reviewer_type}")
    url = "/remaker-my-reviews" if review.reviewer_type == "remaker" else "/user-reviews"
    notify(reviewer, "ReOrbit hid your review", f"It broke our review rules. {reason}".strip(),
           module="reviews", target_url=url, severity="warning", ref_type="review", ref_id=review.public_id)


def _set_status(review, admin, status, reason, ip):
    before = {"status": review.status, "hidden_reason": review.hidden_reason}
    hidden = status == review.Status.HIDDEN
    review.status = status
    review.hidden_reason = reason if hidden else ""
    review.hidden_at = timezone.now() if hidden else None
    review.hidden_by = admin if hidden else None
    review.save(update_fields=["status", "hidden_reason", "hidden_at", "hidden_by", "updated_at"])
    refresh_rating(review.order)
    audit(admin, "review.hide" if hidden else "review.restore", "review", review.public_id,
          before=before, after={"status": status, "hidden_reason": review.hidden_reason}, reason=reason, ip=ip)


@transaction.atomic
def hide_review(admin, review_id, reason, ip=None):
    review = find_review(review_id)
    if review is None:
        raise ReviewError("We couldn't find that review.", status=404)
    reason = " ".join(str(reason or "").split())
    if len(reason) < 5:
        raise ReviewError("Please fix the highlighted fields.", errors={"reason": ["Say why (at least 5 characters)."]})
    if len(reason) > 300:
        raise ReviewError("Please fix the highlighted fields.", errors={"reason": ["Keep this under 300 characters."]})
    if review.status == review.Status.VISIBLE:
        _set_status(review, admin, review.Status.HIDDEN, reason, ip)
        _tell_reviewer_hidden(review, reason)
    return review


@transaction.atomic
def restore_review(admin, review_id, ip=None):
    review = find_review(review_id)
    if review is None:
        raise ReviewError("We couldn't find that review.", status=404)
    if review.status == review.Status.HIDDEN:
        _set_status(review, admin, review.Status.VISIBLE, "", ip)
    return review


@transaction.atomic
def resolve_report(admin, report_id, action, note="", ip=None):
    rep = ReviewReport.objects.select_for_update().filter(public_id=report_id).first()
    if rep is None:
        raise ReviewError("We couldn't find that report.", status=404)
    if action not in ("uphold", "dismiss"):
        raise ReviewError("Choose uphold or dismiss.", errors={"action": ["Choose uphold or dismiss."]})
    note = " ".join(str(note or "").split())[:300]
    if action == "uphold" and len(note) < 5:
        raise ReviewError("Please fix the highlighted fields.", errors={"note": ["Say why the review is being hidden (at least 5 characters)."]})
    if rep.status != ReviewReport.Status.PENDING:
        raise ReviewError("This report was already settled.", status=409, code="report_settled")
    review = rep.product_review or rep.seller_review
    review = find_review(review.public_id)
    now = timezone.now()
    if action == "uphold":
        if review.status == review.Status.VISIBLE:
            _set_status(review, admin, review.Status.HIDDEN, note, ip)
            _tell_reviewer_hidden(review, note)
        # every open report on the same review is settled by the same decision
        others = ReviewReport.objects.select_for_update().filter(status="Pending", **_link(review))
    else:
        others = ReviewReport.objects.select_for_update().filter(pk=rep.pk)
    status = ReviewReport.Status.UPHELD if action == "uphold" else ReviewReport.Status.DISMISSED
    for r in list(others):
        r.status, r.resolved_by, r.resolved_at, r.resolution_note = status, admin, now, note
        r.save(update_fields=["status", "resolved_by", "resolved_at", "resolution_note", "updated_at"])
        reporter = getattr(r, f"reporter_{r.reporter_type}")
        url = "/remaker-reviews" if r.reporter_type == "remaker" else "/user-reviews"
        notify(reporter, "We looked at your review report",
               ("The review was hidden." if action == "uphold" else "The review follows our rules, so it stays up.")
               + (f" {note}" if note else ""),
               module="reviews", target_url=url, ref_type="review", ref_id=review.public_id)
    audit(admin, f"review.report_{action}", "review", review.public_id, reason=note, ip=ip)
    return review
