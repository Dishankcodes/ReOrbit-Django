/* Earnings: how ReOrbit itself makes (and spends) money, from the server
   (GET /api/analytics/admin/earnings/).

   Income
   - Platform fee: added to every order a User or ReMaker places. Orders the platform buys carry none.
   - Product sales: the platform's own store products, plus the delivery charges collected on them.
   Money out
   - Refunds: fees and sales given back on refunded orders.
   - Purchases: what the platform spends when an admin buys something.

   "Earned" means the money is in and the order is confirmed or completed, the same rule as Reports,
   so the two pages always agree. The server reads the real orders; this file only keeps one cached
   answer per range and refreshes it every minute. */
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { analyticsApi } from "../../api/analytics";
import { RANGES, DAY } from "./reportsStore";

export { RANGES };

const zeroTotals = {
  fees: 0,
  sales: 0,
  delivery: 0,
  vouchers: 0,
  refunds: 0,
  purchases: 0,
  earnings: 0,
  net: 0,
};

/* What the screen gets until the server answers: the same shape, all zeros. */
function emptyEarnings(rangeKey) {
  const range = RANGES.find((r) => r.key === rangeKey) || RANGES[1];
  const end = Date.now();
  return {
    range,
    start: end - range.days * DAY,
    end,
    weekly: range.days <= 60,
    cur: zeroTotals,
    prev: zeroTotals,
    trend: [],
    flow: [
      { key: "fees", label: "Platform fees", value: 0, kind: "gain" },
      { key: "sales", label: "Product sales", value: 0, kind: "gain" },
      { key: "delivery", label: "Delivery fees", value: 0, kind: "gain" },
      { key: "vouchers", label: "Voucher discounts", value: 0, kind: "loss" },
      { key: "refunds", label: "Refunds", value: 0, kind: "loss" },
      { key: "earnings", label: "Earnings", value: 0, kind: "total" },
      { key: "purchases", label: "Purchases", value: 0, kind: "loss" },
      { key: "net", label: "Net cash flow", value: 0, kind: "total" },
    ],
    feeByCategory: [],
    feeByBuyer: [],
    feeBySeller: [],
    salesByCategory: [],
    topSellers: [],
    pending: { orders: 0, fees: 0, sales: 0 },
    entries: [],
    takeRate: 0,
    feeOrders: 0,
    feePct: 0,
  };
}

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
    .adminEarnings(rangeKey)
    .then((data) => cache.set(rangeKey, { data, error: "", loadedAt: Date.now() }))
    .catch((e) =>
      cache.set(rangeKey, {
        data: hit?.data || null,
        error: e.status === 403 ? "" : e.message || "Could not load earnings.",
        loadedAt: Date.now(),
      }),
    )
    .finally(emit);
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("reorbit:session-ended", () => {
    cache.clear();
    emit();
  });
  window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    cache.forEach((v, k) => v.loadedAt && load(k, true));
  }, 60000);
}

export function refreshEarnings(rangeKey) {
  if (rangeKey) load(rangeKey, true);
  else cache.forEach((_, k) => load(k, true));
}

export function useEarnings(rangeKey) {
  const key = RANGES.some((r) => r.key === rangeKey) ? rangeKey : RANGES[1].key;
  const version = useSyncExternalStore(
    subscribe,
    () => cache.get(key),
    () => cache.get(key),
  );

  useEffect(() => {
    if (!cache.get(key)?.loadedAt && !cache.get(key)?.inFlight) load(key);
  }, [key]);

  const retry = useCallback(() => load(key, true), [key]);

  if (!version?.data) {
    return {
      ...emptyEarnings(key),
      loading: !version?.error,
      error: version?.error || "",
      retry,
    };
  }
  const range = RANGES.find((r) => r.key === key) || RANGES[1];
  return { ...version.data, range, loading: false, error: version.error || "", retry };
}
