"""Super Admin › System: pause switches and where the server / database time goes.

GET  /api/adminops/admin/system/?days=7     pause switches + ReOrbit's own usage log
POST /api/adminops/admin/system/pause/      {"user": true, "remaker": false, "admin": false}
GET  /api/adminops/admin/system/providers/  Neon / Render numbers from their own APIs (when keys are set)
"""

from datetime import timedelta

from django.db import transaction
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.views import APIView

from apps.accounts.permissions import IsSuperAdmin
from apps.core import pause, usage
from apps.core.models import PlatformSettings, UsageHour
from apps.core.responses import fail, ok
from apps.core.services import audit

from . import providers


def _pause_info(s):
    stored = (s.platform_settings or {}).get("paused_info") or {}
    return {"paused": s.paused, "changedAt": stored.get("at"), "changedBy": stored.get("by")}


def _sum(qs):
    a = qs.aggregate(requests=Sum("requests"), queries=Sum("queries"), db_ms=Sum("db_ms"),
                     app_ms=Sum("app_ms"), errors=Sum("errors"), slow=Sum("slow"))
    return {k: int(v or 0) for k, v in a.items()}


def usage_report(days):
    usage.flush()  # this process's latest counts first
    since = timezone.now() - timedelta(days=days)
    qs = UsageHour.objects.filter(hour__gte=since)
    totals = _sum(qs)
    awake = qs.values("hour").distinct().count()
    sides = [
        {"side": r["side"], **{k: int(r[k] or 0) for k in ("requests", "queries", "db_ms", "app_ms")}}
        for r in qs.values("side").annotate(requests=Sum("requests"), queries=Sum("queries"),
                                             db_ms=Sum("db_ms"), app_ms=Sum("app_ms")).order_by("-queries")
    ]
    routes = []
    for r in (qs.values("route", "method").annotate(requests=Sum("requests"), queries=Sum("queries"),
                                                   db_ms=Sum("db_ms"), app_ms=Sum("app_ms"),
                                                   slow=Sum("slow"), errors=Sum("errors"))
              .order_by("-db_ms", "-queries")[:25]):
        n = max(1, r["requests"])
        routes.append({
            "route": r["route"], "method": r["method"], "requests": r["requests"], "queries": r["queries"],
            "dbMs": r["db_ms"], "appMs": r["app_ms"], "slow": r["slow"], "errors": r["errors"],
            "queriesPerRequest": round(r["queries"] / n, 1), "msPerRequest": round(r["app_ms"] / n),
        })
    by_route_side = {}
    for r in qs.values("route", "method", "side").annotate(n=Sum("requests")):
        by_route_side.setdefault((r["route"], r["method"]), {})[r["side"]] = r["n"]
    for r in routes:
        r["sides"] = by_route_side.get((r["route"], r["method"]), {})
    bots = list(qs.filter(side="bot").values("agent").annotate(requests=Sum("requests"), queries=Sum("queries"))
                .order_by("-requests")[:10])
    daily = [
        {"day": r["day"].isoformat(), "requests": int(r["requests"] or 0), "queries": int(r["queries"] or 0),
         "dbMs": int(r["db_ms"] or 0), "awakeHours": r["hours"]}
        for r in qs.annotate(day=TruncDate("hour")).values("day")
        .annotate(requests=Sum("requests"), queries=Sum("queries"), db_ms=Sum("db_ms"),
                  hours=Count("hour", distinct=True)).order_by("day")
    ]
    last = qs.order_by("-hour").values_list("hour", flat=True).first()
    return {
        "days": days, "since": since.isoformat(), "totals": {**totals, "awakeHours": awake},
        "sides": sides, "routes": routes, "bots": bots, "daily": daily,
        "lastRequestHour": last.isoformat() if last else None,
        "flushMinutes": round(usage.FLUSH_SECONDS / 60),
    }


class AdminSystem(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        try:
            days = max(1, min(30, int(request.query_params.get("days", 7))))
        except ValueError:
            days = 7
        s = PlatformSettings.load()
        return ok({**_pause_info(s), "usage": usage_report(days), "providersConfigured": providers.configured()})


class AdminSystemPause(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request):
        body = request.data if isinstance(request.data, dict) else {}
        unknown = set(body) - set(pause.SIDES)
        if unknown or not body:
            return fail("Send user, remaker and/or admin as true (pause) or false (start).", status=400)
        if any(not isinstance(v, bool) for v in body.values()):
            return fail("Use true or false.", status=400)
        admin = request.user.account
        with transaction.atomic():
            s = PlatformSettings.objects.select_for_update().get_or_create(pk=1)[0]
            before = s.paused
            after = {**before, **body}
            if after != before:
                info = {"at": timezone.now().isoformat(), "by": admin.full_name or admin.email}
                s.platform_settings = {**(s.platform_settings or {}), "paused": after, "paused_info": info}
                s.updated_by = admin
                s.save(update_fields=["platform_settings", "updated_by", "updated_at"])
                audit(admin, "system.pause", "PlatformSettings", 1, before={"paused": before},
                      after={"paused": after}, ip=request.META.get("REMOTE_ADDR"))
        pause.flags(force=True)
        return ok(_pause_info(s), message=_message(before, after))


def _message(before, after):
    names = {"user": "Members", "remaker": "ReMakers", "admin": "Other admins"}
    changed = [k for k in pause.SIDES if before[k] != after[k]]
    if not changed:
        return "Nothing changed."
    parts = [f"{names[k]} {'paused' if after[k] else 'started again'}" for k in changed]
    return ", ".join(parts) + "."


class AdminSystemProviders(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        return ok(providers.report(force=request.query_params.get("refresh") == "1"))
