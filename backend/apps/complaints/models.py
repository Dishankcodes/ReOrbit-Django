"""Complaints: people report a member, a ReMaker, a listing or a review, and the ReOrbit team works through it.

    Open -> Under_Review -> Resolved   (or Dismissed; either can be reopened)

One row per report. What is reported is one of seven real rows (exactly one FK is set, and the check
constraint ties it to target_type); who reported it is a member / ReMaker, or the admin who logged it
by hand for someone who got in touch another way. Warnings sent to the reported person are rows of
ComplaintWarning, so the history of one person or listing can be read back across complaints.
"""

from django.db import models
from django.db.models import Q

from apps.core.ids import PublicIdModel
from apps.core.models import TimeStampedModel

TARGET_FKS = (
    "target_user", "target_remaker", "target_item", "target_remaker_product",
    "target_admin_item", "target_product_review", "target_seller_review",
)


def _only(*names):
    """Exactly the listed FK columns are set and every other target FK is empty."""
    q = Q()
    for n in TARGET_FKS:
        q &= Q(**{f"{n}__isnull": n not in names})
    return q


class Complaint(PublicIdModel, TimeStampedModel):
    public_id_prefix = "CP"

    class Type(models.TextChoices):
        USER = "User", "User"
        REMAKER = "ReMaker", "ReMaker"
        PRODUCT = "Product", "Product"
        REVIEW = "Review", "Review"

    class Status(models.TextChoices):
        OPEN = "Open", "Open"
        UNDER_REVIEW = "Under_Review", "Under review"
        RESOLVED = "Resolved", "Resolved"
        DISMISSED = "Dismissed", "Dismissed"

    class Source(models.TextChoices):
        MEMBER = "member", "Filed by a member"
        ADMIN = "admin", "Logged by the team"

    target_type = models.CharField(max_length=8, choices=Type.choices)
    target_user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    target_remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    target_item = models.ForeignKey("listings.Item", null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    target_remaker_product = models.ForeignKey(
        "remakers.RemakerProduct", null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    target_admin_item = models.ForeignKey("admins.AdminItem", null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    target_product_review = models.ForeignKey(
        "reviews.ProductReview", null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    target_seller_review = models.ForeignKey(
        "reviews.SellerReview", null=True, blank=True, on_delete=models.PROTECT, related_name="+")

    category = models.CharField(max_length=60)
    description = models.CharField(max_length=1000)
    status = models.CharField(max_length=14, choices=Status.choices, default=Status.OPEN)
    source = models.CharField(max_length=8, choices=Source.choices, default=Source.MEMBER)

    # who reported: a member or a ReMaker, or (logged by hand) the admin who typed it in
    reporter_user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    reporter_remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    logged_by = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    reporter_name = models.CharField(max_length=150)  # for a hand-logged one: who they logged it for
    reporter_role = models.CharField(max_length=10, default="Staff")  # User | ReMaker | Staff

    assignee = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    resolution_action = models.CharField(max_length=20, blank=True)
    resolution_note = models.CharField(max_length=1000, blank=True)
    resolved_by = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "complaints"
        ordering = ["-created_at", "-pk"]
        indexes = [
            models.Index(fields=["status", "created_at"], name="cmp_status_created_idx"),
            models.Index(fields=["assignee", "status"], name="cmp_assignee_status_idx"),
            models.Index(fields=["target_type", "status"], name="cmp_type_status_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                name="cmp_target_matches_type",
                condition=(
                    Q(target_type="User") & _only("target_user")
                    | Q(target_type="ReMaker") & _only("target_remaker")
                    | Q(target_type="Product") & (
                        _only("target_item") | _only("target_remaker_product") | _only("target_admin_item"))
                    | Q(target_type="Review") & (_only("target_product_review") | _only("target_seller_review"))
                ),
            ),
            models.CheckConstraint(
                name="cmp_reporter_matches_source",
                condition=(
                    Q(source="member", logged_by__isnull=True)
                    & (Q(reporter_user__isnull=False, reporter_remaker__isnull=True)
                       | Q(reporter_user__isnull=True, reporter_remaker__isnull=False))
                    | Q(source="admin", reporter_user__isnull=True, reporter_remaker__isnull=True)
                ),
            ),
        ]

    def __str__(self):
        return f"{self.public_id} {self.target_type} {self.status}"


class ComplaintEvent(models.Model):
    class Tone(models.TextChoices):
        GOOD = "good", "Good"
        INFO = "info", "Info"
        WAIT = "wait", "Waiting"
        BAD = "bad", "Bad"
        NEUTRAL = "neutral", "Neutral"

    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="events")
    label = models.CharField(max_length=60)
    detail = models.CharField(max_length=1000, blank=True)
    tone = models.CharField(max_length=8, choices=Tone.choices, default=Tone.NEUTRAL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "complaint_events"
        ordering = ["created_at", "pk"]


class ComplaintNote(TimeStampedModel):
    """Internal notes between team members. The reported person and the reporter never see them."""

    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey("admins.Admins", null=True, on_delete=models.SET_NULL, related_name="+")
    author_name = models.CharField(max_length=150)
    text = models.CharField(max_length=2000)

    class Meta:
        db_table = "complaint_notes"
        ordering = ["created_at", "pk"]


class ComplaintWarning(TimeStampedModel):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="warnings")
    sent_by = models.ForeignKey("admins.Admins", null=True, on_delete=models.SET_NULL, related_name="+")
    sent_by_name = models.CharField(max_length=150)
    message = models.CharField(max_length=1000)

    class Meta:
        db_table = "complaint_warnings"
        ordering = ["created_at", "pk"]
