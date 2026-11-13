"""The admin Settings screen: read, validate and save PlatformSettings.

The screen works in four groups (commerce, warehouse, notifications, platform). Money and
limits that checkout needs live in real columns (so the server can use them directly);
the rest is stored as validated JSON. Every rule here mirrors the form on the screen,
so the server never accepts something the form would have refused.
"""

import re
from decimal import Decimal, InvalidOperation

from apps.core.models import DEFAULT_SUPPORT_EMAIL, PlatformSettings

DEFAULT_WAREHOUSE = {
    "unsoldDays": 7,
    "slowDays": 14,
    "deadDays": 30,
    "autoPriceCut": False,
    "priceCutPct": 15,
}
NOTIFICATION_MODULES = (
    "Warehouse", "Donations", "Pickups", "Orders", "Products", "Rewards", "Sales", "Users",
)
DEFAULT_NOTIFICATIONS = {
    "channels": {"email": True, "push": True, "digest": False},
    "modules": {name: True for name in NOTIFICATION_MODULES},
    "quietHours": False,
}

# commerce key -> (column, low, high)
COMMERCE_INTS = {
    "productDelivery": ("product_delivery", 0, 10_000),
    "freeDeliveryFrom": ("free_delivery_from", 0, 1_000_000),
    "itemDelivery": ("item_delivery", 0, 10_000),
    "sellDelivery": ("admin_item_delivery", 0, 10_000),
    "sellFreeFrom": ("admin_item_free_from", 0, 1_000_000),
    "codLimit": ("cod_limit", 0, 10_000_000),
    "maxListingsPerDay": ("max_listings_per_day", 1, 100),
}
COMMERCE_KEYS = {"platformFeePct", "codEnabled", *COMMERCE_INTS}
WAREHOUSE_KEYS = set(DEFAULT_WAREHOUSE)
PLATFORM_KEYS = {"maintenance", "supportEmail", "minDonationItems", "sessionMinutes"}
SECTIONS = ("commerce", "warehouse", "notifications", "platform")
EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


# ---------------------------------------------------------------- reading
def current(s: PlatformSettings) -> dict:
    """All four groups as the screen expects them."""
    commerce = {
        "platformFeePct": float(s.platform_fee_pct),
        "codEnabled": s.cod_enabled,
    }
    for key, (column, _lo, _hi) in COMMERCE_INTS.items():
        commerce[key] = getattr(s, column)

    stored = s.platform_settings or {}
    return {
        "commerce": commerce,
        "warehouse": {**DEFAULT_WAREHOUSE, **(s.warehouse_rules or {})},
        "notifications": _merge_notifications(DEFAULT_NOTIFICATIONS, s.notification_settings or {}),
        "platform": {
            "maintenance": bool(stored.get("maintenance", False)),
            "supportEmail": s.support_email or DEFAULT_SUPPORT_EMAIL,
            "minDonationItems": s.min_donation_items,
            "sessionMinutes": int(stored.get("sessionMinutes", 60)),
        },
    }


def _merge_notifications(base, extra):
    return {
        "channels": {**base["channels"], **(extra.get("channels") or {})},
        "modules": {**base["modules"], **(extra.get("modules") or {})},
        "quietHours": extra.get("quietHours", base["quietHours"]),
    }


# ------------------------------------------------------------- validating
def _whole(value, low, high):
    """An integer between low and high, or None. Accepts 12 and "12", never 12.5 or True."""
    if isinstance(value, bool):
        return None
    if isinstance(value, str):
        value = value.strip()
        if not re.fullmatch(r"-?\d+", value):
            return None
    elif isinstance(value, float):
        if not value.is_integer():
            return None
    elif not isinstance(value, int):
        return None
    number = int(value)
    return number if low <= number <= high else None


def _flag(value):
    return value if isinstance(value, bool) else None


def _check_unknown(section, data, allowed, errors):
    extra = sorted(set(data) - set(allowed))
    if extra:
        errors[section] = [f"Unknown setting: {', '.join(extra)}."]
        return True
    return False


def _commerce(data, errors):
    out = {}
    bad = {}
    if "platformFeePct" in data:
        try:
            fee = Decimal(str(data["platformFeePct"]).strip())
        except (InvalidOperation, ValueError):
            fee = None
        if (
            isinstance(data["platformFeePct"], bool)
            or fee is None
            or not fee.is_finite()
            or not Decimal(0) <= fee <= Decimal(30)
            or fee != fee.quantize(Decimal("0.01"))
        ):
            bad["platformFeePct"] = "Enter a percentage from 0 to 30 (up to 2 decimals)."
        else:
            out["platform_fee_pct"] = fee
    if "codEnabled" in data:
        flag = _flag(data["codEnabled"])
        if flag is None:
            bad["codEnabled"] = "Use on or off."
        else:
            out["cod_enabled"] = flag
    for key, (column, low, high) in COMMERCE_INTS.items():
        if key in data:
            number = _whole(data[key], low, high)
            if number is None:
                bad[key] = f"Enter a whole number from {low:,} to {high:,}."
            else:
                out[column] = number
    if bad:
        errors["commerce"] = bad
    return out


def _warehouse(data, base, errors):
    merged = {**base, **data}
    bad = {}
    values = {}
    for key, low, high in (("unsoldDays", 1, 365), ("slowDays", 2, 730), ("deadDays", 3, 1095),
                           ("priceCutPct", 1, 60)):
        number = _whole(merged[key], low, high)
        if number is None:
            bad[key] = f"Enter a whole number from {low} to {high}."
        values[key] = number
    values["autoPriceCut"] = _flag(merged["autoPriceCut"])
    if values["autoPriceCut"] is None:
        bad["autoPriceCut"] = "Use on or off."
    if not bad:
        if values["slowDays"] <= values["unsoldDays"]:
            bad["slowDays"] = "Must be more than the alert day."
        if values["deadDays"] <= values["slowDays"]:
            bad["deadDays"] = "Must be more than the slow day."
    if bad:
        errors["warehouse"] = bad
        return None
    return values


def _notifications(data, base, errors):
    bad = {}
    channels = {**base["channels"], **(data.get("channels") or {})}
    modules = {**base["modules"], **(data.get("modules") or {})}
    quiet = data.get("quietHours", base["quietHours"])
    if set(channels) != set(base["channels"]) or any(_flag(v) is None for v in channels.values()):
        bad["channels"] = "Use on or off for email, push and digest."
    if set(modules) != set(base["modules"]) or any(_flag(v) is None for v in modules.values()):
        bad["modules"] = "Use on or off for each module."
    if _flag(quiet) is None:
        bad["quietHours"] = "Use on or off."
    if bad:
        errors["notifications"] = bad
        return None
    return {"channels": channels, "modules": modules, "quietHours": quiet}


def _platform(data, base, errors):
    merged = {**base, **data}
    bad, out = {}, {}
    flag = _flag(merged["maintenance"])
    if flag is None:
        bad["maintenance"] = "Use on or off."
    email = str(merged["supportEmail"]).strip()
    if not EMAIL.match(email) or len(email) > 254:
        bad["supportEmail"] = "Enter a valid email address."
    minimum = _whole(merged["minDonationItems"], 1, 99)
    if minimum is None:
        bad["minDonationItems"] = "Enter a whole number from 1 to 99."
    minutes = _whole(merged["sessionMinutes"], 5, 1440)
    if minutes is None:
        bad["sessionMinutes"] = "Enter a whole number from 5 to 1440."
    if bad:
        errors["platform"] = bad
        return None
    out.update(maintenance=flag, supportEmail=email, minDonationItems=minimum, sessionMinutes=minutes)
    return out


def validate(payload, now: dict):
    """-> (new_values: {group: dict}, errors: {group: ...}). Partial groups are merged on `now`."""
    errors, result = {}, {}
    if not isinstance(payload, dict) or not any(k in payload for k in SECTIONS):
        return {}, {"_": ["Send at least one of: " + ", ".join(SECTIONS) + "."]}
    extra = sorted(set(payload) - set(SECTIONS))
    if extra:
        return {}, {"_": [f"Unknown group: {', '.join(extra)}."]}

    for section in SECTIONS:
        if section not in payload:
            continue
        data = payload[section]
        if not isinstance(data, dict):
            errors[section] = ["Expected an object."]
            continue
        allowed = {
            "commerce": COMMERCE_KEYS, "warehouse": WAREHOUSE_KEYS,
            "platform": PLATFORM_KEYS, "notifications": {"channels", "modules", "quietHours"},
        }[section]
        if _check_unknown(section, data, allowed, errors):
            continue
        if section == "commerce":
            result[section] = _commerce(data, errors)
        elif section == "warehouse":
            checked = _warehouse(data, now["warehouse"], errors)
            if checked is not None:
                result[section] = checked
        elif section == "notifications":
            checked = _notifications(data, now["notifications"], errors)
            if checked is not None:
                result[section] = checked
        else:
            checked = _platform(data, now["platform"], errors)
            if checked is not None:
                result[section] = checked
    return result, errors


# ---------------------------------------------------------------- writing
def apply(s: PlatformSettings, values: dict, admin):
    """Write validated values onto the settings row. The caller saves inside a transaction."""
    for column, value in values.get("commerce", {}).items():
        setattr(s, column, value)
    if "warehouse" in values:
        s.warehouse_rules = values["warehouse"]
    if "notifications" in values:
        s.notification_settings = values["notifications"]
    if "platform" in values:
        p = values["platform"]
        s.support_email = p["supportEmail"]
        s.min_donation_items = p["minDonationItems"]
        s.platform_settings = {"maintenance": p["maintenance"], "sessionMinutes": p["sessionMinutes"]}
    s.updated_by = admin
    s.save()


def diff(before: dict, after: dict, sections):
    """{group: {key: [old, new]}} for what actually changed."""
    changes = {}
    for section in sections:
        old, new = before[section], after[section]
        keys = {k for k in new if new[k] != old.get(k)}
        if keys:
            changes[section] = {k: [old.get(k), new[k]] for k in sorted(keys)}
    return changes
