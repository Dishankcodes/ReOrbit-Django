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
import { useListings } from "./listingsStore";
import { useTickets } from "./supportStore";
import { useRewards } from "./rewardsStore";
import { useSettings } from "./settingsStore";
import { useMyAnnouncements } from "../../shared/announcements";

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
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => readIds;
const commit = (next) => {
  readIds = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
};

export const markRead = (id) => {
  if (!readIds.includes(id)) commit([...readIds, id]);
};
export const markAllRead = (ids) => commit([...new Set([...readIds, ...ids])]);

export const NOTIFICATION_TYPES = {
  order: { label: "Orders", pref: "orderUpdates" },
  donation: { label: "Donations", pref: "donationUpdates" },
  sell: { label: "Selling", pref: "orderUpdates" },
  support: { label: "Support", pref: null },
  reward: { label: "Rewards", pref: "rewards" },
  announcement: { label: "From ReOrbit", pref: null },
};

export function useNotifications() {
  const read = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const orders = useOrders();
  const donations = useDonations();
  const listings = useListings();
  const tickets = useTickets();
  const { ledger } = useRewards();
  const settings = useSettings();
  const announcements = useMyAnnouncements("users");

  return useMemo(() => {
    const since = Date.now() - WINDOW_DAYS * DAY;
    const out = [];

    const lastOf = (list) => (Array.isArray(list) && list.length ? list[list.length - 1] : null);
    const ORDER_TEXT = {
      Pending_Payment: "Waiting for payment", Confirmed: "Order confirmed", Packed: "Order packed",
      Shipped: "Order shipped", Delivered: "Order delivered", Cancelled: "Order cancelled",
    };

    orders.forEach((o) => {
      /* the list from the server carries no event history; the status says the same thing */
      const e = lastOf(o.events) || {
        id: o.apiStatus || "status",
        label: ORDER_TEXT[o.apiStatus] || "Order update",
        at: o.deliveredAt || o.placedAt,
      };
      out.push({
        id: `order-${o.id}-${e.id}`,
        type: "order",
        title: e.label,
        message: `${o.lines?.[0]?.title || "Your order"}${o.lines?.length > 1 ? ` +${o.lines.length - 1} more` : ""} · ${o.id}`,
        at: e.at,
        to: `/user-orders/${o.id}`,
      });
    });
    donations.forEach((d) => {
      const e = lastOf(d.events);
      if (!e) return;
      out.push({
        id: `don-${d.id}-${e.id}`,
        type: "donation",
        title: e.label,
        message: `${d.title} · ${d.id}`,
        at: e.at,
        to: `/user-donations/${d.id}`,
      });
    });
    listings.forEach((l) => {
      if (!["Live", "Rejected", "Pending"].includes(l.status)) return;
      const e = lastOf(l.events);
      if (!e) return;
      out.push({
        id: `lst-${l.id}-${e.id}`,
        type: "sell",
        title: e.label,
        message: l.title,
        at: e.at,
        to: `/user-sell/${l.id}`,
      });
    });
    tickets.forEach((t) => {
      const last = lastOf(t.messages);
      if (!last || last.from !== "team") return;
      out.push({
        id: `tkt-${t.id}-${last.id}`,
        type: "support",
        title: t.status === "Resolved" ? "Ticket resolved" : "Support replied",
        message: `${t.id} · ${t.subject}`,
        at: last.at,
        to: `/user-help/tickets/${t.id}`,
      });
    });
    announcements.forEach((a) => {
      out.push({
        id: a.id,
        type: "announcement",
        title: a.title,
        message: a.message,
        at: a.at,
        to:
          a.link && a.link.startsWith("/") && !a.link.startsWith("/admin")
            ? a.link
            : "/user-notifications",
      });
    });
    ledger
      .filter((e) => e.points >= 100)
      .slice(0, 4)
      .forEach((e) => {
        out.push({
          id: `pts-${e.id}`,
          type: "reward",
          title: `+${e.points} Orbit Points`,
          message: e.title,
          at: e.at,
          to: "/user-orbit-points/history",
        });
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
  }, [
    read,
    orders,
    donations,
    listings,
    tickets,
    ledger,
    settings,
    announcements,
  ]);
}
