"""Orders. One checkout = one Payment and one Order per seller."""

from django.db import models
from django.db.models import Q

from apps.core.ids import PublicIdModel
from apps.core.models import TimeStampedModel


class Order(PublicIdModel, TimeStampedModel):
    public_id_prefix = "ORD"

    class Status(models.TextChoices):
        PENDING_PAYMENT = "Pending_Payment", "Waiting for payment"
        CONFIRMED = "Confirmed", "Confirmed"
        PACKED = "Packed", "Packed"
        SHIPPED = "Shipped", "Shipped"
        DELIVERED = "Delivered", "Delivered"
        CANCELLED = "Cancelled", "Cancelled"
        DELIVERY_FAILED = "Delivery_Failed", "Delivery failed"
        RETURNED_TO_ORIGIN = "Returned_To_Origin", "Returned to seller"

    class SellerType(models.TextChoices):
        USER = "user", "Member"
        REMAKER = "remaker", "ReMaker"
        PLATFORM = "platform", "ReOrbit"

    class PayStatus(models.TextChoices):
        PENDING = "Pending", "Pending"
        PAID = "Paid", "Paid"
        COD_DUE = "COD_Due", "Pay on delivery"
        COD_COLLECTED = "COD_Collected", "Cash with the courier"
        REFUND_PENDING = "Refund_Pending", "Refund on its way"
        REFUNDED = "Refunded", "Refunded"
        REFUND_FAILED = "Refund_Failed", "Refund needs attention"
        VOID = "Void", "Not charged"

    buyer_type = models.CharField(max_length=8, default="user")  # user | remaker | admin
    buyer_key = models.CharField(max_length=24, default="", db_index=False)  # "user:5"
    buyer_user = models.ForeignKey("users.Users", null=True, blank=True, on_delete=models.PROTECT, related_name="orders")
    buyer_remaker = models.ForeignKey("remakers.ReMakers", null=True, blank=True, on_delete=models.PROTECT, related_name="orders")
    buyer_admin = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.PROTECT, related_name="orders")
    payment = models.ForeignKey("payments.Payment", on_delete=models.PROTECT, related_name="orders")
    seller_type = models.CharField(max_length=10, choices=SellerType.choices)
    seller_user = models.ForeignKey(
        "users.Users", null=True, blank=True, on_delete=models.PROTECT, related_name="sales"
    )
    seller_remaker = models.ForeignKey(
        "remakers.ReMakers", null=True, blank=True, on_delete=models.PROTECT, related_name="sales"
    )
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PENDING_PAYMENT)
    payment_status = models.CharField(max_length=14, choices=PayStatus.choices, default=PayStatus.PENDING)

    # money, whole rupees, all worked out by the server
    subtotal = models.PositiveIntegerField()
    platform_fee = models.PositiveIntegerField(default=0)
    delivery_fee = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField()

    address = models.JSONField(help_text="Copy of the delivery address at purchase time.")
    note = models.CharField(max_length=300, blank=True)

    courier_name = models.CharField(max_length=60, blank=True)
    tracking_no = models.CharField(max_length=60, blank=True)

    confirmed_at = models.DateTimeField(null=True, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancel_reason = models.CharField(max_length=255, blank=True)
    cancelled_by = models.CharField(max_length=10, blank=True)  # buyer | seller | admin | system

    # cash on delivery: the courier hands the cash to ReOrbit, an admin confirms it arrived
    cod_received_at = models.DateTimeField(null=True, blank=True)
    cod_received_by = models.ForeignKey("admins.Admins", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    cod_reference = models.CharField(max_length=60, blank=True)

    # a delivery that did not happen
    failed_at = models.DateTimeField(null=True, blank=True)
    fail_reason = models.CharField(max_length=24, blank=True)
    fail_note = models.CharField(max_length=255, blank=True)
    fail_fault = models.CharField(max_length=6, blank=True)  # seller | buyer

    class Meta:
        db_table = "orders"
        ordering = ["-created_at", "-pk"]
        indexes = [
            models.Index(fields=["buyer_key", "-created_at"], name="ord_buyer_created_idx"),
            models.Index(fields=["seller_user", "status"], name="ord_suser_status_idx"),
            models.Index(fields=["seller_remaker", "status"], name="ord_sremaker_status_idx"),
            models.Index(fields=["status", "seller_type"], name="ord_status_type_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(seller_type="user", seller_user__isnull=False, seller_remaker__isnull=True)
                    | Q(seller_type="remaker", seller_remaker__isnull=False, seller_user__isnull=True)
                    | Q(seller_type="platform", seller_user__isnull=True, seller_remaker__isnull=True)
                ),
                name="order_seller_matches_type",
            ),
            models.CheckConstraint(
                condition=(
                    Q(buyer_type="user", buyer_user__isnull=False, buyer_remaker__isnull=True, buyer_admin__isnull=True)
                    | Q(buyer_type="remaker", buyer_remaker__isnull=False, buyer_user__isnull=True, buyer_admin__isnull=True)
                    | Q(buyer_type="admin", buyer_admin__isnull=False, buyer_user__isnull=True, buyer_remaker__isnull=True)
                ),
                name="order_exactly_one_buyer",
            ),
        ]

    @property
    def buyer(self):
        return getattr(self, f"buyer_{self.buyer_type}")

    def __str__(self):
        return f"{self.public_id} {self.status}"


class OrderItem(models.Model):
    class Kind(models.TextChoices):
        ITEM = "item", "Member item"
        REMAKER_PRODUCT = "remaker_product", "ReMaker product"
        ADMIN_ITEM = "admin_item", "ReOrbit store item"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="lines")
    kind = models.CharField(max_length=16, choices=Kind.choices)
    # The thing bought. Nullable so a later delete of the listing never loses the order.
    item = models.ForeignKey("listings.Item", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    remaker_product = models.ForeignKey(
        "remakers.RemakerProduct", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    admin_item = models.ForeignKey("admins.AdminItem", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    ref_id = models.CharField(max_length=24, help_text="public_id of the thing bought, kept as text")
    title = models.CharField(max_length=150)
    cover = models.CharField(max_length=255, blank=True, help_text="Image path at purchase time")
    unit_price = models.PositiveIntegerField()
    qty = models.PositiveIntegerField()
    line_total = models.PositiveIntegerField()
    # how stock was taken, so cancelling puts back exactly what was taken
    took_stock = models.PositiveIntegerField(default=0)
    closed_lot = models.BooleanField(default=False, help_text="Member item: the whole listing was sold out by this line")

    class Meta:
        db_table = "order_items"
        ordering = ["pk"]
        indexes = [models.Index(fields=["order"], name="oitem_order_idx")]
        constraints = [
            models.CheckConstraint(condition=Q(qty__gte=1), name="order_item_qty_gte_1"),
        ]


class OrderEvent(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="events")
    label = models.CharField(max_length=40)
    detail = models.CharField(max_length=255, blank=True)
    actor = models.CharField(max_length=10, blank=True)  # buyer | seller | admin | system
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "order_events"
        ordering = ["created_at", "pk"]
        indexes = [models.Index(fields=["order", "created_at"], name="oevent_order_idx")]


# --------------------------------------------------------------------------- #
# Returns after delivery
# --------------------------------------------------------------------------- #
class ReturnRequest(PublicIdModel, TimeStampedModel):
    """One return per order. The buyer asks, the seller answers, the buyer may escalate to ReOrbit."""

    public_id_prefix = "RTN"

    class Status(models.TextChoices):
        REQUESTED = "Requested", "Waiting for the seller"
        APPROVED = "Approved", "Approved, send the item back"
        REJECTED = "Rejected", "Rejected by the seller"
        ESCALATED = "Escalated", "With ReOrbit"
        REFUNDED = "Refunded", "Refunded"
        CLOSED = "Closed", "Closed, no refund"

    OPEN = ("Requested", "Approved", "Escalated")

    order = models.OneToOneField(Order, on_delete=models.PROTECT, related_name="return_request")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.REQUESTED)
    reason_code = models.CharField(max_length=20)
    details = models.CharField(max_length=500, blank=True)
    fault = models.CharField(max_length=6, blank=True, help_text="seller | buyer: who caused it. Decides who pays shipping and the delivery fee")
    seller_note = models.CharField(max_length=300, blank=True)
    admin_note = models.CharField(max_length=300, blank=True)
    decided_by = models.CharField(max_length=6, blank=True)  # seller | admin
    decided_at = models.DateTimeField(null=True, blank=True)
    escalate_until = models.DateTimeField(null=True, blank=True)
    received_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    refund_amount = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "order_returns"
        ordering = ["-created_at", "-pk"]
        indexes = [models.Index(fields=["status", "-created_at"], name="return_status_idx")]

    def __str__(self):
        return f"{self.public_id} {self.status}"


class ReturnPhoto(models.Model):
    request = models.ForeignKey(ReturnRequest, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to="returns/")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "order_return_photos"
        ordering = ["pk"]
