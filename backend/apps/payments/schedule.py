"""When seller money has to be paid, for the admin Payouts page.

The timeline of one rupee a seller earns:
  delivered  ->  clearing for `payout_hold_days` (the return window; COD waits for the cash too)
             ->  available in the wallet
             ->  payout created (the seller asks, or the automatic run does it)
             ->  ReOrbit sends the bank/UPI transfer within PAYOUT_SLA_DAYS working days ("pay by")
             ->  marked paid with the transfer reference.

Nothing here changes money; it only reads the ledger and works out dates.
"""

from datetime import timedelta
from zoneinfo import ZoneInfo

from django.db.models import Count, Max, Min, Sum
from django.utils import timezone

from .models import Payout, PayoutAccount, WalletEntry
from .wallet import held_q

IST = ZoneInfo("Asia/Kolkata")
PAYOUT_SLA_DAYS = 2  # working days (Mon–Fri) ReOrbit has to send a requested payout


def _local(dt):
    return timezone.localtime(dt, IST).date()


def add_working_days(day, n):
    """`day` plus n working days (Saturday and Sunday skipped)."""
    d = day
    while n > 0:
        d += timedelta(days=1)
        if d.weekday() < 5:
            n -= 1
    return d


def working_days_between(a, b):
    """Working days from date a to date b (negative when b is before a)."""
    if a == b:
        return 0
    step = 1 if b > a else -1
    d, n = a, 0
    while d != b:
        d += timedelta(days=step)
        if d.weekday() < 5:
            n += step
    return n


def due_by(p):
    return add_working_days(_local(p.created_at), PAYOUT_SLA_DAYS)


def due_info(p, now=None):
    """Pay-by date and how urgent it is, for one payout."""
    now = now or timezone.now()
    due = due_by(p)
    info = {"due_by": due.isoformat(), "sla_days": PAYOUT_SLA_DAYS}
    if p.status == Payout.Status.PENDING:
        today = _local(now)
        left = (due - today).days
        info["days_left"] = left
        info["state"] = "overdue" if left < 0 else "today" if left == 0 else "soon" if left == 1 else "ok"
    elif p.status == Payout.Status.PAID and p.paid_at:
        paid = _local(p.paid_at)
        info["paid_on_time"] = paid <= due
        info["took_days"] = max(0, working_days_between(_local(p.created_at), paid))
    return info


def _owner_filter(p):
    return {"seller_user_id": p.seller_user_id} if p.seller_user_id else {"seller_remaker_id": p.seller_remaker_id}


def statement(p):
    """What one payout pays for: the seller's earnings (and refunds taken back) that became
    available after their previous payout and before this one was created."""
    owner = _owner_filter(p)
    prev = (Payout.objects.filter(**owner, created_at__lt=p.created_at).exclude(status=Payout.Status.REJECTED)
            .order_by("-created_at").values_list("created_at", flat=True).first())
    qs = (WalletEntry.objects.filter(**owner, kind__in=(WalletEntry.Kind.EARNING, WalletEntry.Kind.REVERSAL),
                                     available_at__lte=p.created_at)
          .select_related("order").order_by("available_at", "pk"))
    if prev:
        qs = qs.filter(available_at__gt=prev)
    rows = [{
        "kind": e.kind, "amount": e.amount, "note": e.note,
        "order": e.order.public_id if e.order_id else None,
        "order_total": e.order.total if e.order_id else None,
        "managed_delivery": bool(e.order_id and e.order.managed_delivery),
        "delivered_at": e.order.delivered_at if e.order_id else None,
        "available_at": e.available_at,
    } for e in qs[:200]]
    covered = sum(r["amount"] for r in rows)
    return {
        "period_from": prev, "period_to": p.created_at, "rows": rows, "covered": covered,
        # earlier balance left in the wallet (e.g. a smaller earlier payout) makes up any difference
        "carried": p.amount - covered,
    }


def _seller(e_or_row, field):
    s = getattr(e_or_row, field)
    return {"type": "user" if field == "seller_user" else "remaker", "id": s.public_id, "name": s.full_name, "email": s.email}


def upcoming(days=30, now=None):
    """Seller money that becomes available in the next `days` days, by date."""
    now = now or timezone.now()
    until = now + timedelta(days=days)
    held = held_q(now)
    base = WalletEntry.objects.filter(kind__in=(WalletEntry.Kind.EARNING, WalletEntry.Kind.REVERSAL))
    soon = (base.filter(available_at__gt=now, available_at__lte=until).exclude(held)
            .select_related("order", "seller_user", "seller_remaker").order_by("available_at", "pk"))
    by_day = {}
    for e in soon[:500]:
        key = _local(e.available_at).isoformat()
        day = by_day.setdefault(key, {"date": key, "amount": 0, "rows": []})
        day["amount"] += e.amount
        day["rows"].append({
            "seller": _seller(e, "seller_user" if e.seller_user_id else "seller_remaker"),
            "order": e.order.public_id if e.order_id else None,
            "amount": e.amount, "kind": e.kind, "available_at": e.available_at,
        })
    later = base.filter(available_at__gt=until).exclude(held).aggregate(n=Count("pk"), s=Sum("amount"))
    frozen = base.filter(held).aggregate(n=Count("pk"), s=Sum("amount"))
    cod = base.filter(available_at__isnull=True).aggregate(n=Count("pk"), s=Sum("amount"))
    return {
        "days": days,
        "schedule": list(by_day.values()),
        "total": sum(d["amount"] for d in by_day.values()),
        "later": {"count": later["n"] or 0, "amount": later["s"] or 0},
        "held_by_returns": {"count": frozen["n"] or 0, "amount": frozen["s"] or 0},
        "waiting_for_cod_cash": {"count": cod["n"] or 0, "amount": cod["s"] or 0},
    }


def ready_sellers(min_amount, now=None, limit=200):
    """Sellers with money available right now and no payout waiting: who could be paid next."""
    now = now or timezone.now()
    out = []
    for field in ("seller_user", "seller_remaker"):
        waiting = Payout.objects.filter(status=Payout.Status.PENDING, **{f"{field}__isnull": False}).values(field)
        accounts = set(PayoutAccount.objects.filter(**{f"{field}__isnull": False}).values_list(field, flat=True))
        rows = (WalletEntry.objects.filter(**{f"{field}__isnull": False}, available_at__lte=now)
                .exclude(held_q(now)).exclude(**{f"{field}__in": waiting})
                .order_by().values(field).annotate(total=Sum("amount"), since=Min("available_at"))
                .filter(total__gt=0).order_by("-total")[:limit])
        ids = [r[field] for r in rows]
        model = WalletEntry._meta.get_field(field).related_model
        people = {m.pk: m for m in model.objects.filter(pk__in=ids)}
        last_paid = dict(Payout.objects.filter(**{f"{field}__in": ids}, status=Payout.Status.PAID)
                         .order_by().values(field).annotate(m=Max("paid_at")).values_list(field, "m"))
        for r in rows:
            m = people.get(r[field])
            if not m:
                continue
            out.append({
                "seller": {"type": "user" if field == "seller_user" else "remaker", "id": m.public_id,
                           "name": m.full_name, "email": m.email},
                "available": r["total"], "available_since": r["since"],
                "has_account": r[field] in accounts,
                "meets_minimum": r["total"] >= min_amount,
                "last_paid_at": last_paid.get(r[field]),
            })
    out.sort(key=lambda x: -x["available"])
    return out[:limit]


def due_counts(now=None):
    """Pending payouts that are overdue / due today, for the summary cards."""
    now = now or timezone.now()
    today = _local(now)
    overdue = today_n = 0
    overdue_amt = today_amt = 0
    oldest = None
    for p in Payout.objects.filter(status=Payout.Status.PENDING).only("created_at", "amount", "status"):
        due = due_by(p)
        if due < today:
            overdue += 1
            overdue_amt += p.amount
        elif due == today:
            today_n += 1
            today_amt += p.amount
        oldest = p.created_at if oldest is None or p.created_at < oldest else oldest
    nxt = (WalletEntry.objects.filter(kind=WalletEntry.Kind.EARNING, available_at__gt=now).exclude(held_q(now))
           .aggregate(at=Min("available_at"))["at"])
    week = (WalletEntry.objects.filter(kind__in=(WalletEntry.Kind.EARNING, WalletEntry.Kind.REVERSAL),
                                       available_at__gt=now, available_at__lte=now + timedelta(days=7))
            .exclude(held_q(now)).aggregate(s=Sum("amount"))["s"] or 0)
    return {"overdue": overdue, "overdue_amount": overdue_amt, "due_today": today_n, "due_today_amount": today_amt,
            "oldest_pending_at": oldest, "next_release_at": nxt, "releasing_7d": week, "sla_days": PAYOUT_SLA_DAYS}


