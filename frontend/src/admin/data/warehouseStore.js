/* =========================================================
   In-memory store for the Warehouse pages (UI only).
   Resets on refresh. Backend later: swap for API calls.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { getSettings, useSettings } from "./settingsStore";
import { INITIAL_WAREHOUSE, ZONES, makeLocation, refurbFor } from "./adminWarehouse";
import { DEMO_TODAY } from "../utils/format";

let stock = INITIAL_WAREHOUSE;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => stock;

const DAY = 86400000;
const wholeDays = (iso) => Math.floor((DEMO_TODAY.getTime() - new Date(iso).getTime()) / DAY);

export const ALERT_LEVELS = {
  watch: { key: "watch", label: "Unsold 7+ days", short: "7+ days" },
  slow: { key: "slow", label: "Slow moving", short: "14+ days" },
  dead: { key: "dead", label: "Dead stock", short: "30+ days" },
};

function withDerived(item, rules) {
  const inShop = item.warehouse_status === "Stored" && item.sale_status === "Listed";
  const inside = item.warehouse_status !== "Released";
  const end = inside ? DEMO_TODAY.getTime() : new Date(item.released_at).getTime();
  const daysInStock = Math.max(0, Math.floor((end - new Date(item.received_at).getTime()) / DAY));
  const daysListed = item.listed_at && inShop ? wholeDays(item.listed_at) : 0;
  const snoozed = !!(item.snoozed_until && new Date(item.snoozed_until) > DEMO_TODAY);
  let rawAlert = null;
  if (inShop && daysListed >= rules.unsoldDays) {
    const level = daysListed >= rules.deadDays ? "dead" : daysListed >= rules.slowDays ? "slow" : "watch";
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
  const raw = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { warehouse } = useSettings();
  return useMemo(() => raw.map((i) => withDerived(i, warehouse)), [raw, warehouse]);
}
export function useStockItem(id) {
  return useStock().find((i) => i.inventory_id === id) || null;
}
/* every product that needs attention, worst first (used by the header bell) */
export function useWarehouseAlerts() {
  const all = useStock();
  return useMemo(() => all.filter((i) => i.alert).sort((a, b) => b.daysListed - a.daysListed), [all]);
}


export function runWarehouseAction(id, key, reason = "") {
  const at = new Date().toISOString();
  const nowDemo = DEMO_TODAY.toISOString();
  stock = stock.map((item) => {
    if (item.inventory_id !== id) return item;
    const next = { ...item };
    let label = ""; let detail = "Admin · You"; let tone = "neutral";
    switch (key) {
      case "putAway":
        next.warehouse_status = "Stored"; next.stored_at = nowDemo;
        next.location = makeLocation(item.category, Number(item.inventory_id.slice(3)));
        label = "Stored on shelf"; detail = `Location ${next.location.bin} · Admin`; tone = "good"; break;
      case "list":
        next.sale_status = "Listed"; next.listed_at = nowDemo; next.snoozed_until = null;
        label = "Listed on marketplace"; tone = "good"; break;
      case "discount":
        next.list_price = Math.round((item.list_price * 0.85) / 10) * 10; next.price_cuts += 1; next.listed_at = nowDemo; next.snoozed_until = null;
        label = "Price cut by 15%"; detail = `New price ₹${next.list_price.toLocaleString("en-IN")} · unsold timer restarted`; tone = "wait"; break;
      case "promote":
        next.promoted = true; next.snoozed_until = new Date(DEMO_TODAY.getTime() + 7 * DAY).toISOString();
        label = "Promoted on homepage"; detail = "Featured for 7 days · Admin"; tone = "good"; break;
      case "refurbish": {
        next.warehouse_status = "Refurbishment"; next.sale_status = "Not listed"; next.listed_at = null; next.promoted = false;
        next.location = { zone: "QC", rack: "01", level: 1, bin: "QC-01" };
        next.refurb = refurbFor(item.category, nowDemo);
        label = "Sent to refurbishment"; detail = `Assigned to ${next.refurb.name} · Admin`; tone = "wait"; break; }
      case "donate":
        next.warehouse_status = "Released"; next.sale_status = "Donated"; next.released_at = nowDemo; next.location = null; next.listed_at = null;
        label = "Donated"; detail = `${reason} · Admin`; break;
      case "snooze":
        next.snoozed_until = new Date(DEMO_TODAY.getTime() + 3 * DAY).toISOString();
        label = "Alert snoozed"; detail = "For 3 days · Admin"; break;
      case "receiveBack":
        next.warehouse_status = "Stored"; next.refurb = null; next.condition = "Good";
        next.location = makeLocation(item.category, Number(item.inventory_id.slice(3)));
        label = "Received back from ReMaker"; detail = `Quality check passed · ${next.location.bin}`; tone = "good"; break;
      case "dispatch":
        next.warehouse_status = "Released"; next.released_at = nowDemo; next.location = null;
        label = "Dispatched to buyer"; detail = "Left the warehouse · Admin"; break;
      default: return item;
    }
    next.events = [...item.events, { id: `e-${Date.now()}`, label, detail, at: nowDemo, tone }];
    return next;
  });
  emit();
}
