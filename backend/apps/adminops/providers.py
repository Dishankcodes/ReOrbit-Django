"""Usage numbers straight from Neon and Render, for Super Admin › System.

Optional: each one shows up once its keys are set in the server's environment (Render › Environment):

    NEON_API_KEY, NEON_PROJECT_ID          Neon console › Account settings › API keys; the project id is
                                           in Project settings (looks like "cool-name-123456")
    RENDER_API_KEY, RENDER_SERVICE_ID      Render › Account settings › API keys; the service id is in the
                                           service URL (starts with "srv-")

Asking these APIs does not wake the database or the server. Answers are kept for 10 minutes.
Vercel only serves the built website files (no server code runs there), so its usage is bandwidth,
shown on the Vercel dashboard; there is nothing in ReOrbit that keeps Vercel busy.
"""

import os
import time
from datetime import datetime, timedelta, timezone as tz

import requests

CACHE_SECONDS = 600
_cache = {"at": -1e9, "data": None}
TIMEOUT = 8


def _env(name):
    return (os.getenv(name) or "").strip()


def configured():
    return {
        "neon": bool(_env("NEON_API_KEY") and _env("NEON_PROJECT_ID")),
        "render": bool(_env("RENDER_API_KEY") and _env("RENDER_SERVICE_ID")),
    }


def _hours(seconds):
    return round((seconds or 0) / 3600, 2)


def _mb(b):
    return round((b or 0) / (1024 * 1024), 1)


def neon():
    key, project = _env("NEON_API_KEY"), _env("NEON_PROJECT_ID")
    if not (key and project):
        return {"configured": False}
    h = {"Authorization": f"Bearer {key}", "Accept": "application/json"}
    base = f"https://console.neon.tech/api/v2/projects/{project}"
    r = requests.get(base, headers=h, timeout=TIMEOUT)
    r.raise_for_status()
    p = r.json().get("project", {})
    out = {
        "configured": True,
        "project": p.get("name") or project,
        "periodStart": p.get("consumption_period_start"),
        "periodEnd": p.get("consumption_period_end"),
        "computeHours": _hours(p.get("compute_time_seconds")),
        "activeHours": _hours(p.get("active_time_seconds")),
        "cpuSeconds": p.get("cpu_used_sec"),
        "dataTransferMb": _mb(p.get("data_transfer_bytes")),
        "writtenMb": _mb(p.get("written_data_bytes")),
        "storageMb": _mb(p.get("synthetic_storage_size")),
        "lastActive": p.get("compute_last_active_at"),
        "computes": [],
    }
    try:
        e = requests.get(f"{base}/endpoints", headers=h, timeout=TIMEOUT)
        e.raise_for_status()
        for ep in e.json().get("endpoints", []):
            out["computes"].append({
                "id": ep.get("id"), "type": ep.get("type"), "state": ep.get("current_state"),
                "lastActive": ep.get("last_active"),
                "sleepsAfterSeconds": ep.get("suspend_timeout_seconds"),
                "minCu": ep.get("autoscaling_limit_min_cu"), "maxCu": ep.get("autoscaling_limit_max_cu"),
            })
    except requests.RequestException:
        pass
    return out


def _render_metric(name, key, service, start, end, step):
    r = requests.get(
        f"https://api.render.com/v1/metrics/{name}",
        headers={"Authorization": f"Bearer {key}", "Accept": "application/json"},
        params={"resource": service, "startTime": start, "endTime": end, "resolutionSeconds": step},
        timeout=TIMEOUT,
    )
    r.raise_for_status()
    series = r.json()
    if isinstance(series, dict):
        series = series.get("data") or series.get("series") or [series]
    points = []
    for s in series or []:
        for v in (s or {}).get("values") or []:
            points.append((v.get("timestamp"), float(v.get("value") or 0)))
    return points


def render():
    key, service = _env("RENDER_API_KEY"), _env("RENDER_SERVICE_ID")
    if not (key and service):
        return {"configured": False}
    end = datetime.now(tz.utc)
    start = end - timedelta(hours=24)
    iso = lambda d: d.strftime("%Y-%m-%dT%H:%M:%SZ")  # noqa: E731
    out = {"configured": True, "service": service, "window": "last 24 hours"}
    s = requests.get(f"https://api.render.com/v1/services/{service}",
                     headers={"Authorization": f"Bearer {key}", "Accept": "application/json"}, timeout=TIMEOUT)
    s.raise_for_status()
    info = s.json()
    out.update(name=info.get("name"), suspended=info.get("suspended"),
               plan=(info.get("serviceDetails") or {}).get("plan"))
    try:
        inst = _render_metric("instance-count", key, service, iso(start), iso(end), 3600)
        out["awakeHours"] = sum(1 for _, v in inst if v > 0)
        out["hourly"] = [{"at": t, "instances": v} for t, v in inst]
    except requests.RequestException as e:
        out["instanceError"] = str(e)[:160]
    try:
        reqs = _render_metric("http-requests", key, service, iso(start), iso(end), 3600)
        out["httpRequests"] = int(sum(v for _, v in reqs))
    except requests.RequestException as e:
        out["requestsError"] = str(e)[:160]
    return out


def _safe(fn):
    try:
        return fn()
    except requests.HTTPError as e:
        code = e.response.status_code if e.response is not None else ""
        hint = " (check the API key)" if code in (401, 403) else " (check the id)" if code == 404 else ""
        return {"configured": True, "error": f"{fn.__name__.title()} answered {code}{hint}"}
    except requests.RequestException as e:
        return {"configured": True, "error": f"Could not reach {fn.__name__.title()}: {type(e).__name__}"}
    except Exception as e:  # noqa: BLE001
        return {"configured": True, "error": f"{type(e).__name__}: {str(e)[:120]}"}


def report(force=False):
    if not force and _cache["data"] and time.monotonic() - _cache["at"] < CACHE_SECONDS:
        return _cache["data"]
    data = {
        "neon": _safe(neon),
        "render": _safe(render),
        "vercel": {"configured": False, "note": "Static website files only: no server code runs on Vercel."},
        "checkedAt": datetime.now(tz.utc).isoformat(),
    }
    _cache.update(at=time.monotonic(), data=data)
    return data
