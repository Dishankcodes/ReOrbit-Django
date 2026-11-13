"""Money rules. The SERVER computes every amount from PlatformSettings.

Money is a whole-rupee integer everywhere. Mirrors frontend/src/shared/commerce.js
so the browser preview and the server always agree.
"""

from decimal import ROUND_HALF_UP, Decimal

from .models import PlatformSettings


def platform_fee(subtotal, seller_type, settings=None):
    """The BUYER pays the fee on member orders. ReOrbit's own listings carry none."""
    if seller_type == "platform":
        return 0
    s = settings or PlatformSettings.load()
    fee = Decimal(subtotal) * s.platform_fee_pct / Decimal(100)
    return int(fee.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def delivery_charge(seller_type, subtotal, platform_pickup=False, settings=None):
    s = settings or PlatformSettings.load()
    if seller_type == "user":
        return s.item_delivery if platform_pickup else 0
    if seller_type == "platform":  # ReOrbit's own listings
        return 0 if subtotal >= s.admin_item_free_from else s.admin_item_delivery
    return 0 if subtotal >= s.free_delivery_from else s.product_delivery


def cod_block_reason(total, settings=None):
    """Return "" when pay-on-delivery is allowed, otherwise the reason."""
    s = settings or PlatformSettings.load()
    if not s.cod_enabled:
        return "Pay on delivery is switched off right now."
    if total > s.cod_limit:
        return f"Pay on delivery is available for orders up to ₹{s.cod_limit:,}."
    return ""


MAINTENANCE_MESSAGE = "ReOrbit is taking a short break for maintenance. Please try again soon."


def maintenance_block_reason(settings=None):
    """Return "" normally; the message to show members while maintenance mode is on."""
    s = settings or PlatformSettings.load()
    return MAINTENANCE_MESSAGE if s.maintenance else ""
