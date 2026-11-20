"""Background jobs that run by themselves: no cron, no command to remember.

While the server is handling requests, this middleware checks (in memory, so it costs nothing)
whether a job is due, and if so runs it in a background thread after the request has started,
so nobody waits for it:

  - scheduled announcements   every 2 minutes   (apps.notifications.announcements.deliver_due)
  - finish 30-day deletions   every 6 hours     (apps.core.account_deletion.purge_due)
  - auto-confirm deliveries   every hour        (apps.orders.services.auto_confirm_due)

Both jobs are safe to run twice or from several server processes at once: an announcement is
locked and marked sent when it goes out, and an account that was already cleaned up is skipped.
The management commands (send_due_announcements, purge_deleted_accounts) still work if you ever
want to run them by hand.

Turn it off with AUTO_JOBS = False in settings (it is off while tests run).
"""

import logging
import sys
import threading
import time

from django.conf import settings
from django.db import close_old_connections

log = logging.getLogger(__name__)


def _announcements():
    from apps.notifications.announcements import deliver_due

    return deliver_due()


def _purge():
    from apps.core.account_deletion import purge_due

    return purge_due()


def _auto_confirm():
    from apps.orders.services import auto_confirm_due

    return auto_confirm_due()


# name -> (seconds between runs, job)
JOBS = {
    "announcements": (120, _announcements),
    "purge_deleted_accounts": (6 * 3600, _purge),
    "auto_confirm_deliveries": (3600, _auto_confirm),
}

_last = {}  # name -> monotonic time of the last start (per server process)
_running = set()
_lock = threading.Lock()


def enabled():
    if "test" in sys.argv:
        return False
    return getattr(settings, "AUTO_JOBS", True)


def _run(name, job):
    try:
        done = job()
        if done:
            log.info("auto job %s: %s", name, done)
    except Exception:  # noqa: BLE001 - a failing job must never break the site
        log.exception("auto job %s failed", name)
    finally:
        close_old_connections()
        with _lock:
            _running.discard(name)


def kick():
    """Start every job that is due. Returns the names started (used by tests)."""
    now = time.monotonic()
    started = []
    with _lock:
        for name, (every, job) in JOBS.items():
            if name in _running or now - _last.get(name, -every) < every:
                continue
            _last[name] = now
            _running.add(name)
            started.append((name, job))
    for name, job in started:
        threading.Thread(target=_run, args=(name, job), name=f"autojob-{name}", daemon=True).start()
    return [n for n, _ in started]


class AutoJobsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.on = enabled()

    def __call__(self, request):
        if self.on:
            try:
                kick()
            except Exception:  # noqa: BLE001
                log.exception("auto jobs could not start")
        return self.get_response(request)
