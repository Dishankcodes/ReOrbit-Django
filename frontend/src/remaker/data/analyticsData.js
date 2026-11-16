/* =========================================================
   REMAKER ANALYTICS - real numbers from the server
   (GET /api/analytics/me/?range=7|30|90|365).

   Earnings, orders, cities, categories, the busiest-time grid and the
   funnel come from the ReMaker's real orders. Saves and new followers come
   from wishlists and follows. Views and where shoppers came from are counted
   when someone opens a product or profile.

   Every range is also compared with the period of the same length before it.
   ========================================================= */

import { useCallback, useEffect, useRef, useState } from "react";

import { analyticsApi } from "../../api/analytics";
import { getAccount } from "../../api/session";

export const RANGES = [
  { key: "7", label: "7 days", days: 7, long: "Last 7 days" },
  { key: "30", label: "30 days", days: 30, long: "Last 30 days" },
  { key: "90", label: "90 days", days: 90, long: "Last 90 days" },
  { key: "365", label: "12 months", days: 365, long: "Last 12 months" },
];

/* The last answer for each range, so switching tabs back and forth is instant.
   It is shown straight away and refreshed in the background once it is a minute old. */
const FRESH_MS = 60 * 1000;
let cache = { owner: "", byRange: {} };

const owner = () => getAccount("remaker")?.public_id || "";
const cached = (range) => {
  if (cache.owner !== owner()) cache = { owner: owner(), byRange: {} };
  return cache.byRange[range] || null;
};

if (typeof window !== "undefined") {
  window.addEventListener("reorbit:session-ended", () => {
    cache = { owner: "", byRange: {} };
  });
}

/* { data, loading, refreshing, error, reload } for one range */
export function useAnalytics(range) {
  const [, bump] = useState(0);
  const [state, setState] = useState({ loading: false, error: "" });
  const latest = useRef(0);

  const load = useCallback(
    async (force = false) => {
      const hit = cached(range);
      if (hit && !force && Date.now() - hit.at < FRESH_MS) return;
      const ticket = ++latest.current;
      setState({ loading: true, error: "" });
      try {
        const data = await analyticsApi.report(range);
        cache.byRange[range] = { data, at: Date.now() };
        if (ticket === latest.current) setState({ loading: false, error: "" });
      } catch (e) {
        if (ticket === latest.current)
          setState({
            loading: false,
            error: e.message || "We couldn't load your analytics.",
          });
      } finally {
        bump((n) => n + 1);
      }
    },
    [range],
  );

  useEffect(() => {
    load();
  }, [load]);

  const hit = cached(range);
  return {
    data: hit?.data || null,
    loading: state.loading && !hit,
    refreshing: state.loading && !!hit,
    error: hit ? "" : state.error,
    reload: () => load(true),
  };
}
