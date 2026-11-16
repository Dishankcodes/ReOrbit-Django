"""Daily view counters for ReMaker products and profiles.

One row per product, per day and per source (where the shopper came from), holding a count.
No visitor is stored: not an account, not an address, nothing that identifies a person.
"""

from django.db import models


class ProductViewDay(models.Model):
    class Source(models.TextChoices):
        MARKETPLACE = "marketplace", "Marketplace"
        PROFILE = "profile", "Your profile page"
        FEED = "feed", "Followers' feed"
        LINK = "link", "Shared links"
        OTHER = "other", "Elsewhere on ReOrbit"

    remaker_product = models.ForeignKey(
        "remakers.RemakerProduct", on_delete=models.CASCADE, related_name="view_days"
    )
    day = models.DateField()
    source = models.CharField(max_length=12, choices=Source.choices)
    views = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "analytics_product_view_days"
        constraints = [
            models.UniqueConstraint(
                fields=["remaker_product", "day", "source"], name="productview_one_row_per_day_source"
            ),
        ]
        indexes = [models.Index(fields=["day"], name="productview_day_idx")]


class ProfileViewDay(models.Model):
    remaker = models.ForeignKey("remakers.ReMakers", on_delete=models.CASCADE, related_name="profile_view_days")
    day = models.DateField()
    views = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "analytics_profile_view_days"
        constraints = [
            models.UniqueConstraint(fields=["remaker", "day"], name="profileview_one_row_per_day"),
        ]
        indexes = [models.Index(fields=["day"], name="profileview_day_idx")]
