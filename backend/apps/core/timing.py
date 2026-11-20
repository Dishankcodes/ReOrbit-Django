"""How long each request took, and how much of it was the database.

- Adds a `Server-Timing` header (visible in the browser's Network tab, under Timing) only while
  DEBUG is on, or when SERVER_TIMING=True is set to look at the live site for a while. Live, it would
  tell anyone how many queries each endpoint runs (audit L7).
- Writes a line to the server log for anything slower than SLOW_REQUEST_SECONDS (default 1.5 s):
      SLOW 3.42s POST /api/orders/checkout/ -> 201 | db 2.91s in 34 queries
  On Render this shows up under Logs, so a slow action can be traced to the database
  (far-away region, cold start) or to the app itself.
"""

import logging
import os
import time

from django.conf import settings
from django.db import connection

log = logging.getLogger("reorbit.timing")
SLOW = float(os.getenv("SLOW_REQUEST_SECONDS", "1.5"))


class _DbClock:
    def __init__(self):
        self.count = 0
        self.seconds = 0.0

    def __call__(self, execute, sql, params, many, context):
        start = time.perf_counter()
        try:
            return execute(sql, params, many, context)
        finally:
            self.seconds += time.perf_counter() - start
            self.count += 1


class RequestTimingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        clock = _DbClock()
        start = time.perf_counter()
        with connection.execute_wrapper(clock):
            response = self.get_response(request)
        total = time.perf_counter() - start
        if settings.DEBUG or os.getenv("SERVER_TIMING", "").lower() in ("1", "true", "yes"):
            response["Server-Timing"] = (
                f'db;dur={clock.seconds * 1000:.0f};desc="{clock.count} queries", app;dur={total * 1000:.0f}'
            )
        if total >= SLOW:
            log.warning("SLOW %.2fs %s %s -> %s | db %.2fs in %d queries", total, request.method,
                        request.path, response.status_code, clock.seconds, clock.count)
        return response
