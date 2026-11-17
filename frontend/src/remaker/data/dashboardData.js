/* =========================================================
   REMAKER HOME DASHBOARD - real numbers from the server
   (GET /api/analytics/me/dashboard/).

   Sales, orders, the order pipeline, top products, recent orders, recent
   activity, studio performance and impact all come from the ReMaker's own
   orders, products, reviews and followers. The last answer is kept so the
   page opens instantly, and is refreshed when it is a minute old.
   ========================================================= */

import { useCallback, useEffect, useRef, useState } from "react";

import { analyticsApi } from "../../api/analytics";
import { getAccount } from "../../api/session";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* The same shape as the server's answer, all zeros: what the page shows while it loads. */
export function emptyDashboard() {
  const now = new Date();
  return {
    stats: {
      sales: { value: 0, previous: 0, change: null },
      orders: { value: 0, previous: 0, change: null },
      products: { value: 0, new: 0 },
      followers: { value: 0, last30: 0 },
    },
    revenue: {
      series: Array.from({ length: 12 }, (_, i) => ({
        label: MONTHS[(now.getMonth() - 11 + i + 12) % 12],
        value: 0,
      })),
      total: 0,
      previous: 0,
      change: null,
    },
    pipeline: [
      { key: "pending", label: "Pending", value: 0 },
      { key: "processing", label: "Processing", value: 0 },
      { key: "shipped", label: "Shipped", value: 0 },
      { key: "delivered", label: "Delivered", value: 0 },
    ],
    topProducts: [],
    recentOrders: [],
    activity: [],
    performance: { score: null, grade: null, views: 0, saves: 0, rating: 0, ratingCount: 0, aov: 0 },
    impact: { items: 0, co2: 0 },
  };
}

const FRESH_MS = 60 * 1000;
let cache = { owner: "", data: null, at: 0 };
const owner = () => getAccount("remaker")?.public_id || "";
const cached = () => {
  if (cache.owner !== owner()) cache = { owner: owner(), data: null, at: 0 };
  return cache.data ? cache : null;
};

if (typeof window !== "undefined") {
  window.addEventListener("reorbit:session-ended", () => {
    cache = { owner: "", data: null, at: 0 };
  });
}

/* { data, loading, error, reload }. `data` always has the full shape. */
export function useDashboard() {
  const [, bump] = useState(0);
  const [state, setState] = useState({ loading: false, error: "" });
  const latest = useRef(0);

  const load = useCallback(async (force = false) => {
    const hit = cached();
    if (hit && !force && Date.now() - hit.at < FRESH_MS) return;
    const ticket = ++latest.current;
    setState({ loading: true, error: "" });
    try {
      const data = await analyticsApi.dashboard();
      cache = { owner: owner(), data, at: Date.now() };
      if (ticket === latest.current) setState({ loading: false, error: "" });
    } catch (e) {
      if (ticket === latest.current)
        setState({ loading: false, error: e.message || "We couldn't load your dashboard." });
    } finally {
      bump((n) => n + 1);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hit = cached();
  return {
    data: hit?.data || emptyDashboard(),
    loaded: !!hit,
    loading: state.loading && !hit,
    error: hit ? "" : state.error,
    reload: () => load(true),
  };
}

/* "₹1.2k" for chart axes */
export function shortMoney(n) {
  const v = Math.round(Number(n) || 0);
  if (v >= 100000) return `₹${(v / 100000).toFixed(v % 100000 ? 1 : 0)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k`;
  return `₹${v}`;
}

/* A friendly top value for the chart: 1, 2, 2.5, 5 or 10 times a power of ten */
export function niceCeil(value) {
  if (value <= 0) return 1000;
  const power = 10 ** Math.floor(Math.log10(value));
  const n = value / power;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * power;
}

export function whenLabel(iso) {
  if (!iso) return "";
  const then = new Date(iso);
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? "hr" : "hrs"} ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function changeLabel(change) {
  if (change === null || change === undefined) return "New";
  return `${change >= 0 ? "+" : ""}${change}%`;
}
