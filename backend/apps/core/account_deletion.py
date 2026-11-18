"""Deleting your own account, with 30 days to change your mind (like Instagram).

GET  /api/users/me/delete/      and /api/remakers/me/delete/   -> {blockers, grace_days}
POST /api/users/me/delete/      and /api/remakers/me/delete/   {confirm: "DELETE", password?, reason?}

1. Request: the account becomes "Deleted" with deletion_requested_at = now. It disappears at once:
   listings leave the marketplace, nobody can buy from it or message it, the ReMaker studio is hidden.
   Nothing is removed yet, so orders, payments, earnings and donations stay intact.
2. Within 30 days: signing in again restores everything (restore_if_pending, called by the login views).
3. After 30 days: purge() removes personal details (name, email, phone, address, photos, saved addresses,
   wishlist, follows, notifications) and soft-deletes listings. Order, payment and donation rows stay
   for the records, pointing at an anonymous "Deleted member". The email becomes free to sign up again.
   It runs lazily on login and from `python manage.py purge_deleted_accounts` (daily cron).

An account can't be deleted while money or parcels are in motion (open orders, open returns,
donations being collected, wallet money not yet paid out), so nothing is left half-done.
"""

import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework.views import APIView

from apps.core import buyers, mailer
from apps.core.responses import fail, ok
from apps.core.services import audit

log = logging.getLogger(__name__)
GRACE_DAYS = 30
OPEN_ORDER = ("Pending_Payment", "Confirmed", "Packed", "Shipped", "Delivery_Failed")


def _kind(account):
    return buyers.type_of(account)  # user | remaker


def blockers(account):
    """Plain-language reasons this account can't be deleted right now (empty list = it can)."""
    from apps.orders.models import Order, ReturnRequest
    from apps.payments.models import Payout, WalletEntry

    kind = _kind(account)
    out = []
    buying = Order.objects.filter(**{f"buyer_{kind}": account}, status__in=OPEN_ORDER).count()
    if buying:
        out.append(f"{buying} order{'s' if buying > 1 else ''} you bought {'are' if buying > 1 else 'is'} still on the way.")
    selling = Order.objects.filter(**{f"seller_{kind}": account}, status__in=OPEN_ORDER).count()
    if selling:
        out.append(f"{selling} order{'s' if selling > 1 else ''} you sold still need{'' if selling > 1 else 's'} to be delivered.")
    returns = ReturnRequest.objects.filter(status__in=ReturnRequest.OPEN).filter(
        Q(**{f"order__buyer_{kind}": account}) | Q(**{f"order__seller_{kind}": account})).count()
    if returns:
        out.append("A return is still open.")
    if kind == "user":
        from apps.donations.models import Donation

        if Donation.objects.filter(donor=account, status__in=("Pending", "Scheduled", "Failed_Pickup", "Picked_Up")).exists():
            out.append("A donation is still being reviewed or collected.")
    owner = {f"seller_{kind}": account}
    try:
        from apps.payments.wallet import balances

        b = balances(owner)
        if (b.get("available") or 0) > 0:
            out.append(f"Your wallet has ₹{b['available']:,} ready. Withdraw it first.")
        elif (b.get("pending") or 0) > 0:
            out.append(f"₹{b['pending']:,} of your earnings is still clearing. Try again once it's in your wallet.")
    except Exception:  # noqa: BLE001
        if WalletEntry.objects.filter(**owner).aggregate(s=Sum("amount"))["s"]:
            out.append("You still have money in your wallet.")
    if Payout.objects.filter(**owner, status=Payout.Status.PENDING).exists():
        out.append("A withdrawal is still waiting to be paid.")
    return out


def _restore_date(account):
    return (account.deletion_requested_at + timedelta(days=GRACE_DAYS)).date()


def request_deletion(account, reason=""):
    with transaction.atomic():
        type(account).objects.select_for_update().filter(pk=account.pk).first()
        now = timezone.now()
        account.status, account.status_changed_at, account.deletion_requested_at = "Deleted", now, now
        account.save(update_fields=["status", "status_changed_at", "deletion_requested_at", "updated_at"])
        audit(account, "account.delete_requested", _kind(account), account.public_id, reason=reason[:200])
    mailer.send(
        account.email, "Your ReOrbit account will be deleted",
        heading=f"Sorry to see you go, {account.full_name.split()[0] if account.full_name else 'there'}",
        intro=(f"Your account is now hidden and will be deleted for good on {_restore_date(account):%d %B %Y}. "
               "Changed your mind? Just sign in before then and everything comes back."),
        facts=[("Account", account.email), ("Deleted for good on", f"{_restore_date(account):%d %b %Y}")],
        footer="Didn't ask for this? Sign in now and change your password.",
    )


def restore_if_pending(account):
    """Called on every successful sign-in. Returns True if a pending deletion was undone."""
    if account.status != "Deleted" or not getattr(account, "deletion_requested_at", None):
        return False
    if timezone.now() - account.deletion_requested_at > timedelta(days=GRACE_DAYS):
        purge(account)
        return False
    account.status, account.status_changed_at, account.deletion_requested_at = "Active", timezone.now(), None
    account.save(update_fields=["status", "status_changed_at", "deletion_requested_at", "updated_at"])
    audit(account, "account.delete_cancelled", _kind(account), account.public_id, reason="Signed in within 30 days")
    mailer.send(account.email, "Welcome back to ReOrbit",
                heading="Your account is back",
                intro="You signed in, so we cancelled the deletion. Your listings, orders and points are all here.")
    return True


def is_past_grace(account):
    return (account.status == "Deleted" and getattr(account, "deletion_requested_at", None)
            and timezone.now() - account.deletion_requested_at > timedelta(days=GRACE_DAYS))


def purge(account):
    """Remove personal details for good. Orders, payments and donations stay, anonymised."""
    from apps.core.models import Notification, SavedAddress
    from apps.social.models import Follow, WishlistEntry

    kind = _kind(account)
    with transaction.atomic():
        p = getattr(account, "profile", None)
        if p is not None:
            for f in ("bio", "address", "phone", "city", "pincode"):
                if hasattr(p, f):
                    setattr(p, f, "" if f != "phone" else None)
            for img in ("profile_image", "cover_image"):
                if getattr(p, img, None):
                    try:
                        getattr(p, img).delete(save=False)
                    except Exception:  # noqa: BLE001
                        pass
                    setattr(p, img, None)
            if hasattr(p, "studio_name"):
                p.studio_name = ""
            p.save()
        SavedAddress.objects.filter(**{kind: account}).delete()
        WishlistEntry.objects.filter(**{kind: account}).delete()
        Follow.objects.filter(**{kind: account}).delete()
        if kind == "remaker":
            Follow.objects.filter(target=account).delete()
            account.products.filter(deleted_at__isnull=True).update(deleted_at=timezone.now())
        else:
            from apps.listings.models import Item

            Item.objects.filter(user=account, deleted_at__isnull=True).update(deleted_at=timezone.now())
        Notification.objects.filter(**{kind: account}).delete()
        account.full_name = "Deleted member" if kind == "user" else "Deleted ReMaker"
        account.email = f"deleted-{account.public_id.lower()}@deleted.reorbit.invalid"
        if hasattr(account, "username"):
            account.username = f"deleted-{account.public_id.lower()}"
        if hasattr(account, "google_id"):
            account.google_id = None
        if hasattr(account, "password"):
            from django.contrib.auth.hashers import make_password

            account.password = make_password(None)  # can never sign in with it
        account.save()
        audit(None, "account.purged", kind, account.public_id)
    return True


def purge_due():
    from apps.remakers.models import ReMakers
    from apps.users.models import Users

    cutoff = timezone.now() - timedelta(days=GRACE_DAYS)
    n = 0
    for model in (Users, ReMakers):
        for a in model.objects.filter(status="Deleted", deletion_requested_at__lt=cutoff).exclude(
                email__endswith="@deleted.reorbit.invalid"):
            try:
                purge(a)
                n += 1
            except Exception:  # noqa: BLE001
                log.exception("could not purge %s", a.public_id)
    return n


class DeleteMyAccount(APIView):
    """GET what stops deletion right now; POST {confirm: "DELETE", password?, reason?} to delete."""

    def get(self, request):
        a = request.user.account
        return ok({"blockers": blockers(a), "grace_days": GRACE_DAYS,
                   "has_password": bool(getattr(a, "password", ""))})

    def post(self, request):
        a = request.user.account
        if str(request.data.get("confirm") or "").strip().upper() != "DELETE":
            return fail("Type DELETE to confirm.", errors={"confirm": ["Type DELETE to confirm."]})
        pw = request.data.get("password") or ""
        if getattr(a, "password", "") and hasattr(a, "check_password") and not a.check_password(pw):
            return fail("That password isn't right.", errors={"password": ["That password isn't right."]}, status=400)
        reasons = blockers(a)
        if reasons:
            return fail("Finish these first, then you can delete your account.", errors={"blockers": reasons},
                        code="DELETE_BLOCKED", status=409)
        request_deletion(a, str(request.data.get("reason") or ""))
        return ok({"restore_until": _restore_date(a)},
                  message=f"Your account is deleted. Sign in before {_restore_date(a):%d %b %Y} to undo it.")
