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

    buyer_type = models.CharField(max_length=8, default="user")  # user | remaker | admin
    buyer_key = models.CharField(max_length=24, default="", db_index=False)  # "user:5"
    buyer_user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.PROTECT, related_name="payments")
    buyer_remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.PROTECT, related_name="payments")
    buyer_admin = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.PROTECT, related_name="payments")
    method = models.CharField(max_length=10, choices=Method.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.CREATED)
    amount = models.PositiveIntegerField(help_text="Whole rupees, the grand total of every order in this checkout.")
    discount = models.PositiveIntegerField(default=0, help_text="Voucher discount already taken off `amount`.")
    voucher = models.ForeignKey("rewards.Voucher", null=True, blank=True, on_delete=models.PROTECT, related_name="payments")
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
            models.Index(fields=["buyer_key", "created_at"], name="pay_buyer_created_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["buyer_key", "idempotency_key"],
                condition=Q(idempotency_key__isnull=False),
                name="pay_buyer_idem_unique",
            ),
            models.CheckConstraint(
                condition=(
                    Q(buyer_type="user", buyer_user__isnull=False, buyer_remaker__isnull=True, buyer_admin__isnull=True)
                    | Q(buyer_type="remaker", buyer_remaker__isnull=False, buyer_user__isnull=True, buyer_admin__isnull=True)
                    | Q(buyer_type="admin", buyer_admin__isnull=False, buyer_user__isnull=True, buyer_remaker__isnull=True)
                ),
                name="pay_exactly_one_buyer",
            ),
        ]

    @property
    def buyer(self):
        return getattr(self, f"buyer_{self.buyer_type}")

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
    ifsc = models.CharField(max_length=11, blank=True)  # a bank branch code is public information
    # Sensitive values are encrypted at rest (apps/core/crypto.py). Only a masked hint is kept in clear.
    account_number_enc = models.TextField(blank=True)
    account_last4 = models.CharField(max_length=4, blank=True)
    upi_enc = models.TextField(blank=True)
    upi_hint = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = "payout_accounts"
        constraints = [_one_seller_check("payacct_one_seller")]

    @staticmethod
    def mask_number(number):
        return ("•" * max(len(number) - 4, 0) + number[-4:]) if number else ""

    @staticmethod
    def mask_upi(upi):
        if not upi:
            return ""
        name, _, host = upi.partition("@")
        return name[:2] + "•" * max(len(name) - 2, 0) + "@" + host

    def set_secrets(self, account_number="", upi_id=""):
        from apps.core.crypto import encrypt

        self.account_number_enc = encrypt(account_number) if account_number else ""
        self.account_last4 = account_number[-4:] if account_number else ""
        self.upi_enc = encrypt(upi_id) if upi_id else ""
        self.upi_hint = self.mask_upi(upi_id)

    def masked(self):
        """What sellers and lists see. Never contains the full number or UPI id."""
        return {"method": self.method, "holder_name": self.holder_name, "bank_name": self.bank_name,
                "account_number": ("•" * 8 + self.account_last4) if self.account_last4 else "",
                "ifsc": self.ifsc, "upi_id": self.upi_hint}

    def full(self):
        """Decrypted details. Only for the code path that pays a payout (and it is audited)."""
        from apps.core.crypto import decrypt

        return {"method": self.method, "holder_name": self.holder_name, "bank_name": self.bank_name,
                "account_number": decrypt(self.account_number_enc) if self.account_number_enc else "",
                "ifsc": self.ifsc, "upi_id": decrypt(self.upi_enc) if self.upi_enc else ""}


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
    account = models.JSONField(help_text="Masked payout details at the time of the request (safe to show)")
    account_enc = models.TextField(blank=True, help_text="Encrypted full details, kept only while the payout is pending")
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
        REVERSAL = "Reversal", "Earning taken back (refund)"

    seller_user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.PROTECT, related_name="wallet_entries")
    seller_remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.PROTECT, related_name="wallet_entries")
    kind = models.CharField(max_length=8, choices=Kind.choices)
    amount = models.IntegerField(help_text="Rupees. Positive adds to the wallet, negative takes out.")
    available_at = models.DateTimeField(
        null=True, blank=True,
        help_text="When this amount can be paid out. Empty = not clearing yet (cash on delivery not received by ReOrbit)")
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


# --------------------------------------------------------------------------- #
# Refunds. Every refund is a row, so nothing depends on a log line or an email.
# --------------------------------------------------------------------------- #
class Refund(PublicIdModel, TimeStampedModel):
    public_id_prefix = "RFD"

    class Reason(models.TextChoices):
        CANCELLED = "cancelled", "Order cancelled"
        LATE_PAYMENT = "late_payment", "Paid after the stock was released"
        RETURN = "return", "Return accepted"
        DELIVERY_FAILED = "delivery_failed", "Delivery failed"
        ADMIN = "admin", "Goodwill / dispute"

    class Status(models.TextChoices):
        PENDING = "Pending", "Waiting to be sent"
        SENDING = "Sending", "Being sent"
        DONE = "Done", "Refunded"
        FAILED = "Failed", "Needs attention"

    class Method(models.TextChoices):
        RAZORPAY = "RAZORPAY", "Back to the original payment (Razorpay)"
        MANUAL = "MANUAL", "Sent by ReOrbit (cash on delivery order)"

    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name="refunds")
    order = models.ForeignKey("orders.Order", null=True, blank=True, on_delete=models.PROTECT, related_name="refunds")
    amount = models.PositiveIntegerField(help_text="Whole rupees")
    reason = models.CharField(max_length=16, choices=Reason.choices)
    note = models.CharField(max_length=255, blank=True)
    method = models.CharField(max_length=8, choices=Method.choices)
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.PENDING)
    razorpay_refund_id = models.CharField(max_length=64, blank=True)
    reference = models.CharField(max_length=60, blank=True, help_text="Bank/UPI reference for manual refunds")
    attempts = models.PositiveIntegerField(default=0)
    last_error = models.CharField(max_length=255, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        db_table = "refunds"
        ordering = ["-created_at", "-pk"]
        indexes = [models.Index(fields=["status", "-created_at"], name="refund_status_idx")]
        constraints = [models.CheckConstraint(condition=Q(amount__gte=1), name="refund_amount_gte_1")]

    def __str__(self):
        return f"{self.public_id} ₹{self.amount} {self.status}"
