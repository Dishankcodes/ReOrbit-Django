"""Readable public IDs such as USR-1001, LST-1042, DON-1007.

The API exposes `public_id`, never the raw database id. Numbers come from a
small counter table that is locked while it is incremented, so two requests can
never receive the same number.
"""

from django.core.exceptions import ImproperlyConfigured
from django.db import connection, models, transaction


class PublicIdSequence(models.Model):
    prefix = models.CharField(max_length=10, primary_key=True)
    last_value = models.PositiveBigIntegerField(default=1000)

    class Meta:
        db_table = "public_id_sequences"

    def __str__(self):
        return f"{self.prefix}: {self.last_value}"


START = 1000  # the first ID handed out is START + 1, e.g. USR-1001

# One round trip on PostgreSQL: the row is created on first use and incremented atomically
# (the row lock is held until the surrounding transaction ends, so two requests never get the
# same number). The old way took 4-6 round trips per ID (savepoint, lock, insert, update,
# release), which added seconds per action when the database is far from the server.
_UPSERT = (
    "INSERT INTO public_id_sequences (prefix, last_value) VALUES (%s, %s) "
    "ON CONFLICT (prefix) DO UPDATE SET last_value = public_id_sequences.last_value + 1 "
    "RETURNING last_value"
)


def next_public_id(prefix):
    """Return the next ID for a prefix, e.g. next_public_id("USR") -> "USR-1001"."""
    if connection.vendor == "postgresql":
        with connection.cursor() as cursor:
            cursor.execute(_UPSERT, [prefix, START + 1])
            value = cursor.fetchone()[0]
        return f"{prefix}-{value}"
    with transaction.atomic():
        seq, _ = PublicIdSequence.objects.select_for_update().get_or_create(
            prefix=prefix
        )
        seq.last_value += 1
        seq.save(update_fields=["last_value"])
    return f"{prefix}-{seq.last_value}"


class PublicIdModel(models.Model):
    """Abstract base. Set `public_id_prefix` on the subclass (e.g. "LST").

    Note: bulk_create() skips save(), so create rows one by one or call
    next_public_id() yourself.
    """

    public_id_prefix = ""

    public_id = models.CharField(
        max_length=24, unique=True, null=True, blank=True, editable=False
    )

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.public_id:
            if not self.public_id_prefix:
                raise ImproperlyConfigured(
                    f"{type(self).__name__} must define public_id_prefix."
                )
            self.public_id = next_public_id(self.public_id_prefix)
            update_fields = kwargs.get("update_fields")
            if update_fields is not None:
                kwargs["update_fields"] = set(update_fields) | {"public_id"}
        super().save(*args, **kwargs)
