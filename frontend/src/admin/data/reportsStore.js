/* Reports, from the server (GET /api/analytics/admin/report/).
   The server reads the real orders, donations, pickups, warehouse stock, members, ReMakers and
   payouts and returns them in the shape the screens already read, so every number here comes
   from the same rows the Orders, Donations and Warehouse pages show. */
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { analyticsApi } from "../../api/analytics";
import { isActive, onActive } from "../../shared/activity";

export const RANGES = [
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "6m", label: "Last 6 months", days: 182 },
  { key: "12m", label: "Last 12 months", days: 365 },
  { key: "all", label: "All time", days: 1200 },
];

export const DAY = 86400000;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const t = (v) => new Date(v).getTime();

/* group a list into labelled buckets: weekly for short ranges, monthly otherwise */
export function makeBuckets(start, end, weekly) {
  const out = [];
  if (weekly) {
    for (let s = start; s < end; s += 7 * DAY) {
      const d = new Date(s);
      out.push({
        from: s,
        to: Math.min(s + 7 * DAY, end + 1),
        label: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
      });
    }
  } else {
    const d = new Date(start);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    while (d.getTime() <= end) {
      const from = d.getTime();
      const n = new Date(d);
      n.setMonth(n.getMonth() + 1);
      out.push({
        from: Math.max(from, start),
        to: n.getTime(),
        label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      });
      d.setMonth(d.getMonth() + 1);
    }
  }
  return out;
}
export const inB = (b, v) => t(v) >= b.from && t(v) < b.to;

const zeros = (labels) => labels.map((label) => ({ label, value: 0 }));

/* What the screens get until the server answers: the same shape, all zeros. */
function emptyReport(rangeKey) {
  const range = RANGES.find((r) => r.key === rangeKey) || RANGES[1];
  const end = Date.now();

  return {
    range,
    start: end - range.days * DAY,
    end,
    weekly: range.days <= 60,
    loading: true,
    error: "",
    orders: {
      kpi: {
        revenue: 0,
        revenuePrev: 0,
        orders: 0,
        ordersPrev: 0,
        fees: 0,
        feesPrev: 0,
        aov: 0,
        refunds: 0,
        cancelRate: 0,
      },
      trend: [],
      statusRows: zeros(["Completed", "Confirmed", "Pending", "Cancelled", "Returned"]),
      flowRows: [],
      categoryRows: [],
      payRows: [],
      kindRows: zeros(["Platform products", "Member items"]),
      topSellers: [],
    },
    donations: {
      kpi: { total: 0, totalPrev: 0, items: 0, weight: 0, completion: 0, pending: 0 },
      trend: [],
      cats: [],
      status: [],
      pk: {
        kpi: { total: 0, done: 0, overdue: 0, cancelRate: 0 },
        status: zeros(["Requested", "Scheduled", "Picked up", "Completed", "Cancelled"]),
        agents: [],
      },
    },
    warehouse: {
      kpi: { items: 0, value: 0, listed: 0, alerts: 0, sold: 0, sellThrough: 0 },
      status: zeros(["Received", "Stored", "Assigned", "Refurbishment", "Released"]),
      sale: zeros(["Listed", "Not listed", "Sold", "Donated"]),
      cats: [],
      aging: zeros(["0–7 days", "8–14 days", "15–30 days", "31+ days"]),
      stale: [],
    },
    community: {
      kpi: { users: 0, remakers: 0, newInRange: 0, suspended: 0, redemptions: 0, pointsIssued: 0 },
      trend: [],
      userStatus: [],
      remakerStatus: [],
      cities: [],
    },
    payouts: { pending: 0, pendingAmount: 0, paid: 0, paidAmount: 0, rejected: 0 },
  };
}

/* One cached answer per range, shared by every screen that asks, refreshed every minute. */
const cache = new Map();
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const emit = () => listeners.forEach((l) => l());

function load(rangeKey, force = false) {
  const hit = cache.get(rangeKey);
  if (hit?.inFlight && !force) return;

  cache.set(rangeKey, { ...hit, inFlight: true });
  analyticsApi
    .adminReport(rangeKey)
    .then((data) => cache.set(rangeKey, { data, error: "", loadedAt: Date.now() }))
    .catch((e) =>
      cache.set(rangeKey, {
        data: hit?.data || null,
        /* an admin without the Reports permission simply has no numbers */
        error: e.status === 403 ? "" : e.message || "Could not load the report.",
        loadedAt: Date.now(),
      }),
    )
    .finally(emit);
}

if (typeof window !== "undefined") {
  window.addEventListener("reorbit:session-ended", () => {
    cache.clear();
    emit();
  });
  const again = () => cache.forEach((v, k) => v.loadedAt && load(k, true));
  window.setInterval(() => {
    if (isActive()) again();
  }, 60000);
  onActive(again);
}

export function refreshReport(rangeKey) {
  if (rangeKey) load(rangeKey, true);
  else cache.forEach((_, k) => load(k, true));
}

export function useReport(rangeKey) {
  const key = RANGES.some((r) => r.key === rangeKey) ? rangeKey : RANGES[1].key;
  const version = useSyncExternalStore(
    subscribe,
    () => cache.get(key),
    () => cache.get(key),
  );

  useEffect(() => {
    if (!cache.get(key)?.loadedAt) load(key);
  }, [key]);

  const retry = useCallback(() => load(key, true), [key]);

  if (!version?.data) {
    return { ...emptyReport(key), loading: !version?.error, error: version?.error || "", retry };
  }

  const range = RANGES.find((r) => r.key === key) || RANGES[1];
  /* Fill any section the server left out with zeros, so a partial answer never crashes a page. */
  const data = withDefaults(emptyReport(key), version.data);
  return { ...data, range, loading: false, error: version.error || "", retry };
}

const isPlain = (v) => v && typeof v === "object" && !Array.isArray(v);
function withDefaults(base, got) {
  if (!isPlain(got)) return base;
  const out = { ...base };
  Object.keys(got).forEach((k) => {
    out[k] = isPlain(base[k]) && isPlain(got[k]) ? withDefaults(base[k], got[k]) : got[k] ?? base[k];
  });
  return out;
}

/* ---------- CSV ---------- */
export function toCsv(columns, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    columns.map((c) => esc(c.label)).join(","),
    ...rows.map((r) => columns.map((c) => esc(r[c.key])).join(",")),
  ].join("\n");
}
export function downloadCsv(name, csv) {
  try {
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  } catch {
    /* ignore */
  }
}
