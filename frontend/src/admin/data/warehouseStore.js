/* =========================================================
   Warehouse stock, live from the server (/api/warehouse/admin/).
   The list is loaded once and kept; every action goes to the server, which checks
   the rules, changes the stock, keeps the marketplace listing in step and writes the
   history. What comes back replaces the row here, so the screens always show what the
   server holds. Alerts use the rules saved in Admin › Settings › Warehouse.
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useSettings } from "./settingsStore";
import { ZONES } from "./adminWarehouse";
import { warehouseApi } from "../../api/warehouse";

/* shown while a donated lot has no photo yet */
const NO_PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#e8f0ec"/><text x="200" y="158" font-family="sans-serif" font-size="18" fill="#6c8b7d" text-anchor="middle">No photo yet</text></svg>',
  );

let state = { items: [], loaded: false, loading: false, error: "" };
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;
const set = (patch) => {
  state = { ...state, ...patch };
  emit();
};

/* another account signing in on this tab must not see the previous stock */
if (typeof window !== "undefined") {
  window.addEventListener("reorbit:session-ended", () => {
    state = { items: [], loaded: false, loading: false, error: "" };
    emit();
  });
}

const row = (item) => ({ ...item, image: item.image || NO_PHOTO });

let inFlight = null;
export function loadStock({ force = false } = {}) {
  if (inFlight && !force) return inFlight;
  set({ loading: true, error: "" });
  inFlight = warehouseApi
    .list()
    .then((items) => set({ items: items.map(row), loaded: true, loading: false }))
    .catch((e) =>
      set({ loading: false, error: e.message || "We couldn't load the warehouse." }),
    )
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

function useLoaded() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (!current.loaded && !current.loading && !current.error) loadStock();
  }, [current.loaded, current.loading, current.error]);
  return current;
}

/* { loaded, loading, error, retry } for screens that want a loading or error state */
export function useStockStatus() {
  const { loaded, loading, error } = useLoaded();
  return { loaded, loading, error, retry: () => loadStock({ force: true }) };
}

const DAY = 86400000;

export const ALERT_LEVELS = {
  watch: { key: "watch", label: "Unsold 7+ days", short: "7+ days" },
  slow: { key: "slow", label: "Slow moving", short: "14+ days" },
  dead: { key: "dead", label: "Dead stock", short: "30+ days" },
};

function withDerived(item, rules, now) {
  const inShop =
    item.warehouse_status === "Stored" && item.sale_status === "Listed";
  const inside = item.warehouse_status !== "Released";
  const end = inside ? now : new Date(item.released_at).getTime();
  const daysInStock = Math.max(
    0,
    Math.floor((end - new Date(item.received_at).getTime()) / DAY),
  );
  const daysListed =
    item.listed_at && inShop
      ? Math.max(0, Math.floor((now - new Date(item.listed_at).getTime()) / DAY))
      : 0;
  const snoozed = !!(item.snoozed_until && new Date(item.snoozed_until) > now);
  let rawAlert = null;
  if (inShop && daysListed >= rules.unsoldDays) {
    const level =
      daysListed >= rules.deadDays
        ? "dead"
        : daysListed >= rules.slowDays
          ? "slow"
          : "watch";
    rawAlert = { ...ALERT_LEVELS[level], days: daysListed };
  }
  const zone = ZONES.find((z) => z.key === item.location?.zone) || null;
  return {
    ...item,
    inside,
    daysInStock,
    daysListed,
    rawAlert,
    snoozed: snoozed && !!rawAlert,
    alert: snoozed ? null : rawAlert,
    zone,
    locationLabel: item.location ? item.location.bin : "—",
  };
}

export function useStock() {
  const { items } = useLoaded();
  const { warehouse } = useSettings();
  return useMemo(() => {
    const now = Date.now();
    return items.map((i) => withDerived(i, warehouse, now));
  }, [items, warehouse]);
}
export function useStockItem(id) {
  return useStock().find((i) => i.inventory_id === id) || null;
}
/* every product that needs attention, worst first (used by the header bell) */
export function useWarehouseAlerts() {
  const all = useStock();
  return useMemo(
    () =>
      all.filter((i) => i.alert).sort((a, b) => b.daysListed - a.daysListed),
    [all],
  );
}

function put(rows) {
  const incoming = new Map(rows.map((r) => [r.inventory_id, row(r)]));
  const known = new Set(state.items.map((i) => i.inventory_id));
  const merged = state.items.map((i) => incoming.get(i.inventory_id) || i);
  incoming.forEach((r, id) => {
    if (!known.has(id)) merged.unshift(r);
  });
  set({ items: merged });
}

/* One action on one lot. Resolves with the updated row; rejects with the server's reason
   (an Error with .errors) when it isn't allowed, and then nothing has changed.
   extra: { price } for "list", { remaker } for "refurbish". */
export async function runWarehouseAction(id, key, reason = "", extra = {}) {
  const updated = await warehouseApi.action(id, key, { reason, ...extra });
  put([updated]);
  return updated;
}

/* The same action on several lots. Each lot stands alone, so some can fail while the rest go
   through. Resolves with { done: [ids], failed: [{ id, message }] }. */
export async function runWarehouseActions(ids, key, reason = "", extra = {}) {
  if (ids.length === 1) {
    try {
      await runWarehouseAction(ids[0], key, reason, extra);
      return { done: [ids[0]], failed: [] };
    } catch (e) {
      return { done: [], failed: [{ id: ids[0], message: failureText(e) }] };
    }
  }
  try {
    const result = await warehouseApi.bulk(ids, key, { reason, ...extra });
    put(result.items || []);
    return { done: result.done, failed: result.failed };
  } catch (e) {
    return {
      done: [],
      failed: ids.map((id) => ({ id, message: failureText(e) })),
    };
  }
}

/* The first reason the server gave for refusing */
export function failureText(e) {
  const fields = e?.errors || {};
  for (const messages of Object.values(fields)) {
    const first = Array.isArray(messages) ? messages[0] : messages;
    if (first) return String(first);
  }
  return e?.message || "That didn't work. Try again.";
}

/* Stock management */
export async function checkInStock(values) {
  const created = await warehouseApi.checkIn(values);
  put([created]);
  return created;
}
export async function updateStock(id, values) {
  const updated = await warehouseApi.update(id, values);
  put([updated]);
  return updated;
}
