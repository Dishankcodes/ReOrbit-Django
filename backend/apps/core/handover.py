"""The 4-digit handover code for ReOrbit pickups (donations and "Managed by ReOrbit" orders).

The person handing the parcel over (the donor, or the seller) sees the code in the app; the pickup
team enters it to mark the pickup collected. After MAX_TRIES wrong codes the pickup is locked until
it is rescheduled, which makes a new code, so the code can't be guessed (10,000 combinations).
"""

import secrets

from django.db import transaction
from django.db.models import F

MAX_TRIES = 5


def new_code():
    return f"{secrets.randbelow(9000) + 1000}"


class WrongCode(Exception):
    """Raised inside the action's transaction; the caller records the miss after it rolls back."""


class CodeLocked(Exception):
    pass


def check(obj, entered):
    """Raises CodeLocked or WrongCode. obj has handover_code and handover_tries."""
    if (obj.handover_tries or 0) >= MAX_TRIES:
        raise CodeLocked()
    entered = "".join(ch for ch in str(entered or "") if ch.isdigit())[:4]
    if not obj.handover_code or not entered or not secrets.compare_digest(entered, obj.handover_code):
        raise WrongCode()


def record_miss(model, pk):
    """Count one wrong code (in its own transaction, so it sticks). Returns how many tries are left."""
    with transaction.atomic():
        model.objects.filter(pk=pk).update(handover_tries=F("handover_tries") + 1)
        tries = model.objects.filter(pk=pk).values_list("handover_tries", flat=True).first() or 0
    return max(0, MAX_TRIES - tries)


def miss_message(left, who):
    if left <= 0:
        return (f"Too many wrong codes, so this pickup is locked. Reschedule it to send {who} a new code.")
    return f"That code doesn't match. Ask {who} to check it. {left} tr{'y' if left == 1 else 'ies'} left."


LOCKED_MESSAGE = "Too many wrong codes, so this pickup is locked. Reschedule it to make a new code."
