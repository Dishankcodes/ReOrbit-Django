/* =========================================================
   Admin › Notifications (UI only, in-memory).
   One inbox for the whole admin side. Most notifications are
   DERIVED live from the other modules (warehouse, donations,
   pickups, orders, products, rewards), so they appear when
   something needs attention and disappear once it is dealt with.
   Read / dismissed state and sent announcements live here.
   Backend later: replace with a Notifications API.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { useWarehouseAlerts, useStock } from "./warehouseStore";
import { useDonations } from "./donationsStore";
import { usePickups } from "./pickupsStore";
import { useOrders } from "./ordersStore";
import { useProducts } from "./productsStore";
import { useVouchers } from "./rewardsStore";
import { useSales } from "./sellStore";
import { useUsers } from "./usersStore";
import { useRemakers } from "./remakersStore";
import { useAccess } from "./teamStore";
import { useComplaints, isActive } from "./complaintsStore";

const PERM_OF = { Warehouse: "warehouse", Donations: "donations", Pickups: "pickups", Orders: "orders", Products: "products", Rewards: "rewards", Sales: "sell", Users: "users", Complaints: "complaints" };
import { DEMO_TODAY } from "../utils/format";

const HOUR = 3600000;
const ago = (h) => new Date(DEMO_TODAY.getTime() - h * HOUR).toISOString();
const capNow = (iso) => (new Date(iso).getTime() > DEMO_TODAY.getTime() ? DEMO_TODAY.toISOString() : iso);

/* ---------- read / dismissed / announcements ---------- */
let state = {
  read: new Set(),
  unread: new Set(), // marked unread again by the admin
  dismissed: new Set(),
  announcements: [
    { id: "AN-1003", title: "Diwali Green Sale starts soon", message: "Use DIWALI15 for 15% off upcycled products from 23 Oct. Happy Diwali from ReOrbit!", audience: "everyone", type: "offer", link: "/", at: ago(30), by: "Admin · Nikhil Rao" },
    { id: "AN-1002", title: "Scheduled maintenance on Sunday", message: "The marketplace will be unavailable from 2:00 AM to 4:00 AM on Sunday while we upgrade our servers.", audience: "everyone", type: "maintenance", link: "", at: ago(24 * 6), by: "Admin · Nikhil Rao" },
    { id: "AN-1001", title: "New: earn Orbit Points for donating", message: "Every completed donation now earns Orbit Points. Check your points page to see your balance.", audience: "users", type: "update", link: "/user-orbit-points", at: ago(24 * 15), by: "Admin · You" },
  ],
};
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => state;
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
const useNs = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const MODULES = {
  Warehouse: { label: "Warehouse", path: "/admin-warehouse" },
  Donations: { label: "Donations", path: "/admin-donations" },
  Pickups: { label: "Pickups", path: "/admin-pickups" },
  Orders: { label: "Orders", path: "/admin-orders" },
  Products: { label: "Products", path: "/admin-products" },
  Rewards: { label: "Rewards", path: "/admin-rewards" },
  Sales: { label: "Sales", path: "/admin-sell/sales" },
  Users: { label: "Users", path: "/admin-users" },
  Complaints: { label: "Complaints", path: "/admin-complaints" },
  System: { label: "System", path: "" },
};

/* ---------- build the inbox ---------- */
export function useNotifications() {
  const alerts = useWarehouseAlerts();
  const stock = useStock();
  const donations = useDonations();
  const pickups = usePickups();
  const complaints = useComplaints();
  const orders = useOrders();
  const products = useProducts();
  const vouchers = useVouchers();
  const users = useUsers();
  const remakers = useRemakers();
  const sales = useSales();
  const { read, unread, dismissed } = useNs();
  const access = useAccess();

  return useMemo(() => {
    const out = [];
    const add = (n) => out.push({ severity: "info", needsAction: false, actionLabel: "Open", ...n });

    /* Warehouse */
    const lvl = (k) => alerts.filter((a) => a.alert.key === k);
    const dead = lvl("dead"); const slow = lvl("slow"); const watch = lvl("watch");
    if (dead.length) add({ id: "wh-dead", module: "Warehouse", severity: "critical", needsAction: true, title: `${dead.length} products are dead stock`, message: `${dead[0].title} and ${dead.length - 1 > 0 ? `${dead.length - 1} more` : "others"} have been unsold for 30+ days. Refurbish, cut the price or donate them.`, at: ago(2), path: "/admin-warehouse", actionLabel: "Review stock" });
    if (slow.length) add({ id: "wh-slow", module: "Warehouse", severity: "warning", needsAction: true, title: `${slow.length} products are moving slowly`, message: `Unsold for 14+ days, starting with ${slow[0].title}. A price cut or promotion usually helps.`, at: ago(7), path: "/admin-warehouse", actionLabel: "Review stock" });
    if (watch.length) add({ id: "wh-watch", module: "Warehouse", severity: "warning", needsAction: true, title: `${watch.length} products have not sold in 7 days`, message: `The 7-day unsold alert fired for ${watch.map((w) => w.title).slice(0, 2).join(" and ")}${watch.length > 2 ? " and more" : ""}.`, at: ago(11), path: "/admin-warehouse", actionLabel: "Review stock" });
    const dock = stock.filter((s) => s.warehouse_status === "Received");
    if (dock.length) add({ id: "wh-dock", module: "Warehouse", severity: "info", needsAction: true, title: `${dock.length} items waiting at the receiving dock`, message: "Check them against the purchase orders and put them away on a rack.", at: ago(5), path: "/admin-warehouse", actionLabel: "Open warehouse" });

    /* Donations */
    donations.filter((d) => d.status === "Pending").sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date)).slice(0, 5).forEach((d) =>
      add({ id: `don-${d.id}`, module: "Donations", severity: d.overdue ? "warning" : "info", needsAction: true, title: `New donation: ${d.title}`, message: `${d.donor.name} from ${d.donor.city} offered ${d.quantity} item${d.quantity > 1 ? "s" : ""}. ${d.waitingDays > 0 ? `Waiting ${d.waitingDays} day${d.waitingDays === 1 ? "" : "s"} for a decision.` : "Needs a decision."}`, at: capNow(d.donation_date), path: `/admin-donations/${d.id}`, actionLabel: "Review donation" }));
    const pend = donations.filter((d) => d.status === "Pending").length;
    if (pend > 5) add({ id: "don-more", module: "Donations", severity: "warning", needsAction: true, title: `${pend - 5} more donations waiting for review`, message: "Accept to schedule a free pickup, or reject with a reason.", at: ago(20), path: "/admin-donations", actionLabel: "Open donations" });
    donations.filter((d) => d.status === "Completed").sort((a, b) => new Date(b.events.at(-1).at) - new Date(a.events.at(-1).at)).slice(0, 2).forEach((d) =>
      add({ id: `don-done-${d.id}`, module: "Donations", severity: "success", title: "Donation completed", message: `${d.title} was given to ${d.ngo}. The certificate was issued to ${d.donor.name}.`, at: capNow(d.events.at(-1).at), path: `/admin-donations/${d.id}`, actionLabel: "View" }));

    /* Pickups */
    pickups.filter((p) => p.due?.key === "overdue").slice(0, 4).forEach((p) =>
      add({ id: `pk-${p.id}`, module: "Pickups", severity: "critical", needsAction: true, title: `Pickup overdue: ${p.title}`, message: `${p.customer.name} in ${p.city} is still waiting. It was due ${p.due.label.replace("Overdue ", "")} ago.`, at: capNow(p.date), path: `/admin-pickups/${p.id}`, actionLabel: "Reschedule" }));
    const today = pickups.filter((p) => p.due?.key === "today").length;
    if (today) add({ id: "pk-today", module: "Pickups", severity: "info", title: `${today} pickups scheduled for today`, message: "Your three pickup teams have their route for the day.", at: ago(4), path: "/admin-pickups", actionLabel: "View route" });
    const unsched = pickups.filter((p) => p.status === "Requested" && p.type === "Item").length;
    if (unsched) add({ id: "pk-req", module: "Pickups", severity: "warning", needsAction: true, title: `${unsched} item pickups need scheduling`, message: "Users chose “Managed by platform” and are waiting for a date.", at: ago(9), path: "/admin-pickups", actionLabel: "Schedule" });

    /* Orders */
    const refunds = orders.filter((o) => o.refundDue);
    if (refunds.length) add({ id: "ord-refund", module: "Orders", severity: "critical", needsAction: true, title: `${refunds.length} refunds are due`, message: "Cancelled or returned orders that were paid but not refunded yet.", at: ago(3), path: "/admin-orders", actionLabel: "Review orders" });
    const awaiting = orders.filter((o) => o.order_status === "Pending" && o.transaction.payment_status === "Pending" && !o.isCod).length;
    if (awaiting) add({ id: "ord-pay", module: "Orders", severity: "warning", needsAction: true, title: `${awaiting} orders are waiting for payment`, message: "Mark payments as received once the money arrives, or cancel stale orders.", at: ago(13), path: "/admin-orders", actionLabel: "Review orders" });

    /* Products */
    const review = products.filter((p) => p.state === "pending").length;
    if (review) add({ id: "prd-review", module: "Products", severity: "warning", needsAction: true, title: `${review} listings are waiting for review`, message: "Community items must be verified before they go live on the marketplace.", at: ago(6), path: "/admin-products", actionLabel: "Review listings" });
    const reported = products.filter((p) => (p.reports || []).some((r) => r.status === "Pending")).length;
    if (reported) add({ id: "prd-report", module: "Products", severity: "critical", needsAction: true, title: `${reported} listings were reported`, message: "Users flagged these listings. Check them and take action if needed.", at: ago(15), path: "/admin-products", actionLabel: "Open products" });

    /* Sales (the admin as a seller) */
    const newSales = sales.filter((o) => o.order_status === "Pending" && o.transaction.payment_status !== "Failed").length;
    if (newSales) add({ id: "sale-new", module: "Sales", severity: "warning", needsAction: true, title: `${newSales} new sales order${newSales === 1 ? "" : "s"} to accept`, message: "Buyers are waiting for you to accept their orders for your products.", at: ago(1), path: "/admin-sell/sales", actionLabel: "Open sales" });
    const toShip = sales.filter((o) => o.order_status === "Confirmed" && !o.shipment).length;
    if (toShip) add({ id: "sale-ship", module: "Sales", severity: "info", needsAction: true, title: `${toShip} sales order${toShip === 1 ? "" : "s"} ready to ship`, message: "Hand them to a courier and add the tracking number.", at: ago(4), path: "/admin-sell/sales", actionLabel: "Ship orders" });

    /* Rewards */
    vouchers.filter((v) => v.expiringSoon).forEach((v) => add({ id: `rw-end-${v.id}`, module: "Rewards", severity: "info", title: `Coupon ${v.code} ends in ${v.daysLeft} day${v.daysLeft === 1 ? "" : "s"}`, message: `${v.title} has been used ${v.usagePct}% so far. Extend it or let it end.`, at: ago(18), path: "/admin-rewards", actionLabel: "Open rewards" }));
    vouchers.filter((v) => v.status === "Active" && v.usagePct >= 90).forEach((v) => add({ id: `rw-full-${v.id}`, module: "Rewards", severity: "warning", needsAction: true, title: `${v.code} is almost used up`, message: `${v.used} of ${v.usage_limit} uses are gone. Raise the limit if you want it to keep running.`, at: ago(10), path: "/admin-rewards", actionLabel: "Open rewards" }));

    /* Users / ReMakers */
    const susp = remakers.filter((r) => r.status === "Suspended").length;
    if (susp) add({ id: "rm-susp", module: "Users", severity: "info", title: `${susp} ReMakers are suspended`, message: "Review whether any suspension should be lifted.", at: ago(30), path: "/admin-remakers", actionLabel: "Open ReMakers" });
    const reports = users.reduce((n, u) => n + (u.reports || []).filter((r) => r.status === "Pending").length, 0);
    if (reports) add({ id: "usr-reports", module: "Users", severity: "warning", needsAction: true, title: `${reports} user reports are pending`, message: "Reports about users or their listings are waiting for a decision.", at: ago(22), path: "/admin-users", actionLabel: "Open users" });

    /* Complaints */
    const cpActive = complaints.filter(isActive);
    cpActive.filter((c) => c.sla?.overdue).slice(0, 3).forEach((c) =>
      add({ id: `cp-late-${c.id}`, module: "Complaints", severity: "critical", needsAction: true, title: `Complaint past response time: ${c.category}`, message: `${c.target.name} was reported ${c.sla.overdueH} h ago past the ${c.priority.toLowerCase()}-priority limit. ${c.status === "Open" ? "Nobody has picked it up yet." : "It is still under review."}`, at: ago(Math.max(1, c.sla.ageH - c.sla.limit)), path: `/admin-complaints/${c.id}`, actionLabel: "Decide" }));
    const cpHigh = cpActive.filter((c) => c.priority === "High" && !c.sla?.overdue && c.status === "Open");
    if (cpHigh.length) add({ id: "cp-high", module: "Complaints", severity: "warning", needsAction: true, title: `${cpHigh.length} high-priority complaint${cpHigh.length === 1 ? "" : "s"} waiting`, message: `${cpHigh[0].category} on ${cpHigh[0].target.name}${cpHigh.length > 1 ? " and others" : ""}. Scams and unsafe items should be looked at first.`, at: ago(3), path: "/admin-complaints", actionLabel: "Open complaints" });

    /* System */
    add({ id: "sys-report", module: "System", severity: "success", title: "Weekly report is ready", message: "Orders, donations, pickups and rewards for last week are summarised in Reports.", at: ago(26), path: "/admin-reports", actionLabel: "Open reports" });
    add({ id: "sys-login", module: "System", severity: "info", title: "New sign-in to your admin account", message: "Chrome on Windows · Ahmedabad, India. If this was not you, change your password.", at: ago(34), path: "/admin-profile", actionLabel: "Review" });
    add({ id: "sys-backup", module: "System", severity: "success", title: "Nightly backup completed", message: "All marketplace data was backed up successfully at 2:00 AM.", at: ago(40), path: "", actionLabel: "" });

    return out
      .filter((n) => !dismissed.has(n.id))
      .filter((n) => !PERM_OF[n.module] || access.canSee(PERM_OF[n.module]))
      .map((n) => ({ ...n, read: n.severity === "success" && !unread.has(n.id) ? true : read.has(n.id) && !unread.has(n.id) }))
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [alerts, stock, donations, pickups, complaints, orders, products, vouchers, users, remakers, sales, read, unread, dismissed, access]);
}

export function markRead(ids) {
  const r = new Set(state.read); const u = new Set(state.unread);
  ids.forEach((id) => { r.add(id); u.delete(id); });
  set({ read: r, unread: u });
}
export function markUnread(id) { const u = new Set(state.unread); u.add(id); set({ unread: u }); }
export function dismiss(ids) { const d = new Set(state.dismissed); ids.forEach((id) => d.add(id)); set({ dismissed: d }); }

/* ---------- announcements ---------- */
export const useAnnouncements = () => useNs().announcements;
export function sendAnnouncement({ title, message, audience, type, link, scheduleAt }) {
  const a = { id: `AN-${1000 + state.announcements.length + 1}`, title, message, audience, type, link, at: scheduleAt ? new Date(scheduleAt).toISOString() : DEMO_TODAY.toISOString(), scheduled: !!scheduleAt, by: "Admin · You" };
  set({ announcements: [a, ...state.announcements] });
  return a;
}

export const AUDIENCE_LABEL = { users: "All users", remakers: "All ReMakers", everyone: "Everyone" };
export const ANNOUNCE_TYPES = { offer: "Offer", update: "Update", maintenance: "Maintenance", reminder: "Reminder" };

/* "5 min ago", "3 h ago", "2 days ago" relative to the demo clock */
export function timeAgo(iso) {
  const diff = DEMO_TODAY.getTime() - new Date(iso).getTime();
  if (diff < 0) return "Scheduled";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
