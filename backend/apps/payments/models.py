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


# --------------------------------------------------------------------------- #
# Seller wallet and payouts (members and ReMakers)
# --------------------------------------------------------------------------- #
def _one_seller_check(name):
    return models.CheckConstraint(
        condition=(Q(seller_user__isnull=False, seller_remaker__isnull=True)
                   | Q(seller_user__isnull=True, seller_remaker__isnull=False)),
        name=name,
    )


class PayoutAccount(TimeStampedModel):
    """Where a seller wants to be paid. One per seller."""

    class Method(models.TextChoices):
        BANK = "bank", "Bank account"
        UPI = "upi", "UPI"

    seller_user = models.OneToOneField("users.Users", null=True, blank=True, on_delete=models.CASCADE, related_name="payout_account")
    seller_remaker = models.OneToOneField("remakers.ReMakers", null=True, blank=True, on_delete=models.CASCADE, related_name="payout_account")
    method = models.CharField(max_length=4, choices=Method.choices)
    holder_name = models.CharField(max_length=100)
    bank_name = models.CharField(max_length=80, blank=True)
    account_number = models.CharField(max_length=20, blank=True)
    ifsc = models.CharField(max_length=11, blank=True)
    upi_id = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = "payout_accounts"
        constraints = [_one_seller_check("payacct_one_seller")]

    def snapshot(self):
        return {"method": self.method, "holder_name": self.holder_name, "bank_name": self.bank_name,
                "account_number": self.account_number, "ifsc": self.ifsc, "upi_id": self.upi_id}

    def masked(self):
        d = self.snapshot()
        if d["account_number"]:
            d["account_number"] = "•" * max(len(d["account_number"]) - 4, 0) + d["account_number"][-4:]
        if d["upi_id"]:
            name, _, host = d["upi_id"].partition("@")
            d["upi_id"] = name[:2] + "•" * max(len(name) - 2, 0) + "@" + host
        return d


class Payout(PublicIdModel, TimeStampedModel):
    public_id_prefix = "PYO"

    class Status(models.TextChoices):
        PENDING = "Pending", "Waiting for ReOrbit to pay"
        PAID = "Paid", "Paid"
        REJECTED = "Rejected", "Rejected"

    seller_user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.PROTECT, related_name="payouts")
    seller_remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.PROTECT, related_name="payouts")
    amount = models.PositiveIntegerField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    source = models.CharField(max_length=6, default="seller")  # seller | auto
    account = models.JSONField(help_text="Payout details at the time of the request")
    reference = models.CharField(max_length=60, blank=True, help_text="Bank/UPI transfer reference (UTR)")
    paid_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    reject_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "payouts"
        ordering = ["-created_at", "-pk"]
        indexes = [
            models.Index(fields=["status", "-created_at"], name="payout_status_idx"),
            models.Index(fields=["seller_user", "-created_at"], name="payout_suser_idx"),
            models.Index(fields=["seller_remaker", "-created_at"], name="payout_sremaker_idx"),
        ]
        constraints = [
            _one_seller_check("payout_one_seller"),
            models.CheckConstraint(condition=Q(amount__gte=1), name="payout_amount_gte_1"),
        ]


class WalletEntry(TimeStampedModel):
    """Append-only ledger. Balance = sum of amounts. Never edited, only added to."""

    class Kind(models.TextChoices):
        EARNING = "Earning", "Sale earning"
        PAYOUT = "Payout", "Payout requested"
        RELEASE = "Release", "Payout returned to wallet"

    seller_user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.PROTECT, related_name="wallet_entries")
    seller_remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.PROTECT, related_name="wallet_entries")
    kind = models.CharField(max_length=8, choices=Kind.choices)
    amount = models.IntegerField(help_text="Rupees. Positive adds to the wallet, negative takes out.")
    available_at = models.DateTimeField(help_text="When this amount can be paid out")
    order = models.ForeignKey("orders.Order", null=True, blank=True, on_delete=models.PROTECT, related_name="wallet_entries")
    payout = models.ForeignKey(Payout, null=True, blank=True, on_delete=models.PROTECT, related_name="entries")
    note = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = "wallet_entries"
        ordering = ["-created_at", "-pk"]
        indexes = [
            models.Index(fields=["seller_user", "available_at"], name="wallet_suser_avail_idx"),
            models.Index(fields=["seller_remaker", "available_at"], name="wallet_sremaker_avail_idx"),
        ]
        constraints = [
            _one_seller_check("wallet_one_seller"),
            models.UniqueConstraint(fields=["order", "kind"], condition=Q(kind="Earning"), name="wallet_one_earning_per_order"),
        ]
