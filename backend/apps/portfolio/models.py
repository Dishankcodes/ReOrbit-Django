"""ReMaker portfolio (the design's ReMaker_Portfolio table).

A work is one before-and-after story. Its two photos live in Media_Images
(listings.MediaImage) with image_type "Before" and "After"; the database allows at
most one of each per work. A ReMaker may optionally link a work to one of their own
products. Deleting a work is soft (deleted_at) so the app can offer Undo; a purge
command removes old deleted works and their files for good.
"""

from django.db import models
from django.db.models import Q
from django.db.models.functions import Length
from django.db.models.lookups import LessThanOrEqual

from apps.core.ids import PublicIdModel

# The limits shown in the form (0/70 on the title, the story length). The API and the
# database both use these, so a value that passes one can never fail the other.
TITLE_MAX_LENGTH = 70
DESCRIPTION_MAX_LENGTH = 500


class PortfolioEntry(PublicIdModel):
    public_id_prefix = "PF"

    class Visibility(models.TextChoices):
        PUBLIC = "Public", "Public"
        PRIVATE = "Private", "Private"

    remaker = models.ForeignKey(
        "remakers.ReMakers", on_delete=models.CASCADE, related_name="portfolio_entries"
    )
    title = models.CharField(max_length=TITLE_MAX_LENGTH)
    description = models.TextField(blank=True)
    category = models.ForeignKey(
        "core.Category",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="portfolio_entries",
    )
    # Optional: one of this ReMaker's own products that came out of this work.
    linked_product = models.ForeignKey(
        "remakers.RemakerProduct",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="portfolio_entries",
    )
    materials = models.TextField(blank=True)
    technique = models.TextField(blank=True)
    year_completed = models.SmallIntegerField(null=True, blank=True)
    visibility = models.CharField(
        max_length=10, choices=Visibility.choices, default=Visibility.PUBLIC
    )
    # Reserved by the design for a future "featured work" pin. No screen or API sets it yet.
    is_featured = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "remaker_portfolio"
        ordering = ["-uploaded_at", "-pk"]
        verbose_name_plural = "portfolio entries"
        indexes = [
            models.Index(
                fields=["remaker", "deleted_at", "-uploaded_at"], name="portfolio_remaker_idx"
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(year_completed__isnull=True)
                | Q(year_completed__gte=1900, year_completed__lte=2100),
                name="portfolio_year_range",
            ),
            models.CheckConstraint(
                condition=LessThanOrEqual(Length("description"), DESCRIPTION_MAX_LENGTH),
                name="portfolio_description_length",
            ),
        ]

    def __str__(self):
        return f"{self.public_id} {self.title}"

    @property
    def is_deleted(self):
        return self.deleted_at is not None
