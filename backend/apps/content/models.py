"""Content the ReOrbit team looks after: banners, FAQs and policies.

Written in Admin > Content, read by the public site, the member app and the ReMaker app.
(Categories live in the core app.)
"""

from django.db import models

from apps.core.ids import PublicIdModel
from apps.core.models import TimeStampedModel


class Banner(PublicIdModel, TimeStampedModel):
    public_id_prefix = "BNR"

    PLACEMENTS = ("Home hero", "Home strip", "Shop top")
    AUDIENCES = ("Everyone", "Signed-in members", "Visitors only", "ReMakers")

    title = models.CharField(max_length=60)
    subtitle = models.CharField(max_length=110, blank=True)
    cta = models.CharField(max_length=20, blank=True)
    link = models.CharField(max_length=300, blank=True)
    placement = models.CharField(max_length=20)
    audience = models.CharField(max_length=20, default="Everyone")
    image = models.CharField(max_length=500)
    start = models.DateField(null=True, blank=True)
    end = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=False)  # false = draft
    position = models.PositiveIntegerField(default=0)
    views = models.PositiveBigIntegerField(default=0)
    clicks = models.PositiveBigIntegerField(default=0)
    created_by = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        db_table = "banners"
        ordering = ["placement", "position", "id"]


class Faq(PublicIdModel, TimeStampedModel):
    public_id_prefix = "FAQ"

    TOPICS = ("Buying", "Selling", "Donating", "ReMakers", "Payments & refunds", "Account")

    topic = models.CharField(max_length=30)
    question = models.CharField(max_length=200)
    answer = models.TextField()
    published = models.BooleanField(default=True)
    position = models.PositiveIntegerField(default=0)
    helpful = models.PositiveIntegerField(default=0)
    not_helpful = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "faqs"
        ordering = ["position", "id"]


class Policy(TimeStampedModel):
    key = models.SlugField(max_length=30, unique=True)
    title = models.CharField(max_length=80)
    icon = models.CharField(max_length=20, default="ScrollText")
    summary = models.CharField(max_length=160, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    # what the public sees; empty until the first publish
    body = models.TextField(blank=True)
    version = models.CharField(max_length=10, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    published_by = models.CharField(max_length=150, blank=True)
    # the next version being written
    draft_body = models.TextField(blank=True)
    draft_note = models.CharField(max_length=200, blank=True)
    draft_at = models.DateTimeField(null=True, blank=True)
    draft_by = models.CharField(max_length=150, blank=True)
    has_draft = models.BooleanField(default=False)
    # never published: the text below is only a starting point for the team
    starter_body = models.TextField(blank=True)

    class Meta:
        db_table = "policies"
        ordering = ["sort_order", "id"]


class PolicyVersion(models.Model):
    policy = models.ForeignKey(Policy, on_delete=models.CASCADE, related_name="versions")
    version = models.CharField(max_length=10)
    body = models.TextField()
    note = models.CharField(max_length=200, blank=True)
    by_name = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "policy_versions"
        ordering = ["-created_at", "-id"]
        constraints = [models.UniqueConstraint(fields=["policy", "version"], name="policy_version_once")]


class ContentLog(models.Model):
    """What the team did in Content, newest first (the 'Recent changes' list)."""

    by_name = models.CharField(max_length=150)
    text = models.CharField(max_length=300)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "content_log"
        ordering = ["-created_at", "-id"]
