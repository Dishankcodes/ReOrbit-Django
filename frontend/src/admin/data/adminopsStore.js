/* =========================================================
   Admin Dashboard data, from the server (GET /api/adminops/admin/dashboard/).
   People, live listings, impact, what is waiting for the team and the recent
   activity, all counted from the real tables. Loaded once, then refreshed
   every minute and when the tab comes back into view.
   ========================================================= */

import { useEffect, useSyncExternalStore } from "react";
import { adminOpsApi } from "../../api/adminops";

const EMPTY = {
  users: { total: 0, active: 0 },
  remakers: { total: 0, active: 0 },
  products: { live: 0, off_market: 0 },
  impact: { kg: 0, reused: 0, co2_tonnes: 0 },
  operations: {},
  approvals: [],
  pending_count: 0,
  activities: [],
};

let state = { data: EMPTY, loaded: false, error: "" };
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;
const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

let inFlight = null;
export function loadDashboard({ force = false } = {}) {
  if (inFlight && !force) return inFlight;
  inFlight = adminOpsApi
    .dashboard()
    .then((data) => set({ data: { ...EMPTY, ...data }, loaded: true, error: "" }))
    .catch((e) =>
      set({
        loaded: true,
        error: e.status === 403 ? "" : e.message || "Could not load the dashboard.",
      }),
    )
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

let started = false;
function startRefreshing() {
  if (started) return;
  started = true;
  const again = () => {
    if (document.visibilityState === "visible" && state.loaded)
      loadDashboard({ force: true });
  };
  window.setInterval(again, 60000);
  document.addEventListener("visibilitychange", again);
  /* another account signing in on this tab must not see the previous numbers */
  window.addEventListener("reorbit:session-ended", () => {
    state = { data: EMPTY, loaded: false, error: "" };
    listeners.forEach((l) => l());
  });
}

export function useDashboard() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!state.loaded) loadDashboard();
    startRefreshing();
  }, []);

  return { ...s.data, loaded: s.loaded, error: s.error, retry: () => loadDashboard({ force: true }) };
}

export const refreshDashboard = () => loadDashboard({ force: true });
