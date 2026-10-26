/* =========================================================
   User › Notifications (UI only).
   Nothing is typed in by hand: every notification is built from
   real activity (order and donation updates, sales, listing
   reviews, support replies, rewards). Read state is saved in
   localStorage, and the types follow the switches in
   Settings › Notifications.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { useOrders } from "./ordersStore";
import { useDonations } from "./donationsStore";
import { useListings, useSales } from "./listingsStore";
import { useTickets } from "./supportStore";
import { useRewards } from "./rewardsStore";
import { useSettings } from "./settingsStore";

const KEY = "reorbit_user_notif_read";
const DAY = 86400000;
const WINDOW_DAYS = 14;

const load = () => {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

let readIds = load();
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => readIds;
const commit = (next) => {
  readIds = next;
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
};

export const markRead = (id) => { if (!readIds.includes(id)) commit([...readIds, id]); };
export const markAllRead = (ids) => commit([...new Set([...readIds, ...ids])]);

export const NOTIFICATION_TYPES = {
  order: { label: "Orders", pref: "orderUpdates" },
  donation: { label: "Donations", pref: "donationUpdates" },
  sell: { label: "Selling", pref: "orderUpdates" },
  support: { label: "Support", pref: null },
  reward: { label: "Rewards", pref: "rewards" },
};

export function useNotifications() {
  const read = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const orders = useOrders();
  const donations = useDonations();
  const listings = useListings();
  const sales = useSales();
  const tickets = useTickets();
  const { ledger } = useRewards();
  const settings = useSettings();

  return useMemo(() => {
    const since = Date.now() - WINDOW_DAYS * DAY;
    const out = [];

    orders.forEach((o) => {
      const e = o.events[o.events.length - 1];
      out.push({ id: `order-${o.id}-${e.id}`, type: "order", title: e.label, message: `${o.item.title} · ${o.id}`, at: e.at, to: `/user-orders/${o.id}` });
    });
    donations.forEach((d) => {
      const e = d.events[d.events.length - 1];
      out.push({ id: `don-${d.id}-${e.id}`, type: "donation", title: e.label, message: `${d.title} · ${d.id}`, at: e.at, to: `/user-donations/${d.id}` });
    });
    listings.forEach((l) => {
      if (!["Live", "Rejected", "Pending"].includes(l.status)) return;
      const e = l.events[l.events.length - 1];
      out.push({ id: `lst-${l.id}-${e.id}`, type: "sell", title: e.label, message: l.title, at: e.at, to: `/user-sell/${l.id}` });
    });
    sales.filter((s) => ["Confirmed", "Packed"].includes(s.status)).forEach((s) => {
      out.push({ id: `sale-${s.id}-${s.status}`, type: "sell", title: s.status === "Confirmed" ? "New order to pack" : "Ready to ship", message: `${s.title} · ${s.id}`, at: s.events[s.events.length - 1].at, to: `/user-sell/sales/${s.id}` });
    });
    tickets.forEach((t) => {
      const last = t.messages[t.messages.length - 1];
      if (last.from !== "team") return;
      out.push({ id: `tkt-${t.id}-${last.id}`, type: "support", title: t.status === "Resolved" ? "Ticket resolved" : "Support replied", message: `${t.id} · ${t.subject}`, at: last.at, to: `/user-help/tickets/${t.id}` });
    });
    ledger.filter((e) => e.points >= 100).slice(0, 4).forEach((e) => {
      out.push({ id: `pts-${e.id}`, type: "reward", title: `+${e.points} Orbit Points`, message: e.title, at: e.at, to: "/user-orbit-points/history" });
    });

    const prefs = settings.prefs.notifications;
    const items = out
      .filter((n) => new Date(n.at).getTime() >= since)
      .filter((n) => {
        const pref = NOTIFICATION_TYPES[n.type].pref;
        return pref ? prefs[pref] : true;
      })
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .map((n) => ({ ...n, read: read.includes(n.id) }));

    return { items, unread: items.filter((n) => !n.read).length };
  }, [read, orders, donations, listings, sales, tickets, ledger, settings]);
}
