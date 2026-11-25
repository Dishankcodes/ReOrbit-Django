"""Where the server's time and the database's work go (Super Admin › System › Usage).

Every API request is counted in memory: which endpoint, which side (user / remaker / admin /
guest / bot), how many database queries it ran and how long it took. The counts are written to the
usage_hours table in ONE statement at most every FLUSH_SECONDS, and only while requests are coming
in, so the tracking itself never wakes the server or the database. When the server shuts down
(deploy, or Render putting the free instance to sleep) whatever is still in memory is written too
(gunicorn.conf.py: worker_exit).

Rows older than KEEP_DAYS are removed once a day.
"""

import logging
import os
import re
import threading
import time
from datetime import timedelta

from django.db import close_old_connections, connection
from django.utils import timezone

log = logging.getLogger(__name__)

FLUSH_SECONDS = int(os.getenv("USAGE_FLUSH_SECONDS", "600"))
KEEP_DAYS = 35
ENABLED = os.getenv("USAGE_TRACKING", "True").lower() not in ("0", "false", "no")

BOT_RX = re.compile(
    r"bot|crawl|spider|slurp|monitor|uptime|pingdom|statuscake|cron-job|curl|wget|python-requests|"
    r"python-urllib|httpx|aiohttp|go-http-client|okhttp|java/|axios|node-fetch|headless|render|vercel-|"
    r"facebookexternalhit|preview|scan",
    re.I,
)

_lock = threading.Lock()
_buf = {}  # (hour, route, method, side, agent) -> [requests, queries, db_ms, app_ms, errors, slow]
_state = {"last_flush": time.monotonic(), "flushing": False, "pruned_on": None}


def _agent(ua):
    """A short name for a non-browser caller: 'UptimeRobot/2.0', 'curl/8.5', 'Googlebot'..."""
    ua = (ua or "").strip()
    if not ua:
        return "(no user agent)"
    m = re.search(r"([A-Za-z][\w.\-]*(?:bot|Bot|BOT|monitor|Monitor|crawler|spider)[\w.\-/]*)", ua)
    if m:
        return m.group(1)[:60]
    return ua.split(" ")[0][:60]


def side_and_agent(request):
    side = getattr(request, "_usage_side", None)
    user = getattr(request, "user", None)
    kind = getattr(user, "account_type", None)
    if not side and kind in ("user", "remaker", "admin"):
        side = kind
    if not side:
        token = getattr(request, "_reorbit_token", None)
        side = token[0] if token else None
    if side:
        return side, ""
    ua = request.headers.get("User-Agent", "")
    if BOT_RX.search(ua) or not ua:
        return "bot", _agent(ua)
    return "guest", ""


def route_of(request):
    match = getattr(request, "resolver_match", None)
    if match is not None and getattr(match, "route", None):
        return "/" + match.route.lstrip("/")
    return "(not found)"


def record(request, response, queries, db_seconds, app_seconds, slow):
    if not ENABLED or not request.path.startswith("/api/"):
        return
    try:
        side, agent = side_and_agent(request)
        hour = timezone.now().replace(minute=0, second=0, microsecond=0)
        key = (hour, route_of(request)[:200], request.method[:8], side, agent)
        status = getattr(response, "status_code", 200)
        err = 1 if status >= 500 and status != 503 else 0  # 503 = a paused side, not a fault
        with _lock:
            row = _buf.setdefault(key, [0, 0, 0, 0, 0, 0])
            row[0] += 1
            row[1] += queries
            row[2] += int(db_seconds * 1000)
            row[3] += int(app_seconds * 1000)
            row[4] += err
            row[5] += 1 if slow else 0
            due = time.monotonic() - _state["last_flush"] >= FLUSH_SECONDS and not _state["flushing"]
            if due:
                _state["flushing"] = True
        if due:
            threading.Thread(target=_flush_in_thread, name="usage-flush", daemon=True).start()
    except Exception:  # noqa: BLE001 - counting must never break a request
        log.exception("usage: could not count a request")


def _take():
    with _lock:
        rows = dict(_buf)
        _buf.clear()
        _state["last_flush"] = time.monotonic()
    return rows


SQL = """
INSERT INTO usage_hours (hour, route, method, side, agent, requests, queries, db_ms, app_ms, errors, slow)
VALUES {values}
ON CONFLICT (hour, route, method, side, agent) DO UPDATE SET
  requests = usage_hours.requests + EXCLUDED.requests,
  queries = usage_hours.queries + EXCLUDED.queries,
  db_ms = usage_hours.db_ms + EXCLUDED.db_ms,
  app_ms = usage_hours.app_ms + EXCLUDED.app_ms,
  errors = usage_hours.errors + EXCLUDED.errors,
  slow = usage_hours.slow + EXCLUDED.slow
"""


def flush():
    """Write what is in memory (one INSERT ... ON CONFLICT). Returns the number of rows written."""
    rows = _take()
    if not rows:
        return 0
    params, values = [], []
    for (hour, route, method, side, agent), n in rows.items():
        values.append("(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)")
        params += [hour, route, method, side, agent, *n]
    try:
        with connection.cursor() as c:
            c.execute(SQL.format(values=", ".join(values)), params)
            today = timezone.localdate()
            if _state["pruned_on"] != today:
                _state["pruned_on"] = today
                c.execute("DELETE FROM usage_hours WHERE hour < %s", [timezone.now() - timedelta(days=KEEP_DAYS)])
    except Exception:  # noqa: BLE001 - put the counts back and try again next time
        with _lock:
            for k, n in rows.items():
                row = _buf.setdefault(k, [0, 0, 0, 0, 0, 0])
                for i, v in enumerate(n):
                    row[i] += v
        log.exception("usage: could not save the counts")
        return 0
    return len(rows)


def _flush_in_thread():
    try:
        flush()
    finally:
        close_old_connections()
        _state["flushing"] = False


def pending():
    """This process's counts not written yet (shown live on the Usage page)."""
    with _lock:
        return dict(_buf)
