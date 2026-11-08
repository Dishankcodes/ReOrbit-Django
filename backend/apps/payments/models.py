"""One Payment per checkout. A checkout can create several Orders (one per seller)."""

from django.db import models
from django.db.models import Q

from apps.core.ids import PublicIdModel
from apps.core.models import TimeStampedModel


class Payment(PublicIdModel, TimeStampedModel):
    public_id_prefix = "PAY"

    class Method(models.TextChoices):
        RAZORPAY = "RAZORPAY", "Online (Razorpay)"
        COD = "COD", "Cash on delivery"

    class Status(models.TextChoices):
        CREATED = "Created", "Created"        # waiting for the buyer to pay (stock is held)
        PAID = "Paid", "Paid"
        FAILED = "Failed", "Failed"
        CANCELLED = "Cancelled", "Cancelled"  # buyer closed the payment window
        EXPIRED = "Expired", "Expired"        # not paid in time, stock released
        COD = "COD", "Pay on delivery"
        REFUNDED = "Refunded", "Refunded"     # paid after we released the stock, money returned

    buyer = models.ForeignKey("users.Users", on_delete=models.PROTECT, related_name="payments")
    method = models.CharField(max_length=10, choices=Method.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.CREATED)
    amount = models.PositiveIntegerField(help_text="Whole rupees, the grand total of every order in this checkout.")
    currency = models.CharField(max_length=3, default="INR")
    idempotency_key = models.CharField(max_length=64, null=True, blank=True)
    razorpay_order_id = models.CharField(max_length=64, null=True, blank=True, unique=True)
    razorpay_payment_id = models.CharField(max_length=64, null=True, blank=True)
    failure_reason = models.CharField(max_length=255, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "payments"
        ordering = ["-created_at", "-pk"]
        indexes = [
            models.Index(fields=["status", "expires_at"], name="pay_status_expires_idx"),
            models.Index(fields=["buyer", "created_at"], name="pay_buyer_created_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["buyer", "idempotency_key"],
                condition=Q(idempotency_key__isnull=False),
                name="pay_buyer_idem_unique",
            ),
        ]

    def __str__(self):
        return f"{self.public_id} {self.method} {self.status} ₹{self.amount}"


class WebhookEvent(models.Model):
    """Razorpay may deliver the same event more than once. We process each id once."""

    event_id = models.CharField(max_length=80, unique=True)
    event_type = models.CharField(max_length=60)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payment_webhook_events"
