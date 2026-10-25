/* =========================================================
   REMAKER NOTIFICATIONS - UI STORE (no backend yet)
   One list of notifications for the whole ReMaker side. The header
   bell and the Notifications page both read from here, so reading
   something in one place updates the other.

   Saved in localStorage so read / deleted state survives a refresh.
   Swap the functions below for API calls later.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";

const KEY = "reorbit_remaker_notifications_v1";
const NOW = Date.now();
const ago = (hours) => new Date(NOW - hours * 3600000).toISOString();

export const CATEGORIES = [
  { key: "orders", label: "Sales", note: "Orders from customers" },
  { key: "purchases", label: "Purchases", note: "Things you bought" },
  { key: "reviews", label: "Reviews", note: "Customer feedback" },
  { key: "followers", label: "Followers", note: "People who follow you" },
  { key: "payouts", label: "Payouts", note: "Money and withdrawals" },
  { key: "products", label: "Products", note: "Stock and listings" },
  { key: "system", label: "ReOrbit", note: "News and security" },
];

const P = "/images/portfolio/";
const U = "/images/users/";

/* [category, title, text, hoursAgo, read, link, label, image] */
const RAW = [
  ["orders", "New order from Meera Iyer", "Teak Door Console Table for ₹12,500. Accept it within 24 hours to keep it.", 1, false, "/remaker-sales/SO-31084", "Accept order", P + "tara-console.jpg"],
  ["followers", "Ishita Joshi started following you", "She saw your Teak Door Console in the marketplace.", 2, false, "/remaker-followers", "See followers", ""],
  ["purchases", "Your order is out for delivery", "RO-48213, the Vintage reading chair, should reach you today.", 3, false, "/remaker-orders/RO-48213/track", "Track order", "/images/products/vintage-chair.jpg"],
  ["payouts", "₹5,106 is ready to withdraw", "Your earnings from the Denim Patchwork Tote order have cleared.", 5, false, "/remaker-earnings/payouts", "Withdraw", ""],
  ["purchases", "Your order is ready for pickup", "RO-47990, the Handmade ceramic table lamp, is waiting for you. Use code 4821.", 4, false, "/remaker-orders/RO-47990", "View order", "/images/products/ceramic-lamp.jpg"],
  ["orders", "Pack Rohan Shah's order", "2 × Reclaimed Wood Floor Lamp is accepted. Pack it so ReOrbit can collect it.", 7, false, "/remaker-sales/SO-31079", "Mark as packed", P + "arjun-lamp.jpg"],
  ["reviews", "New 5-star review from Meera Iyer", "\u201CThe light is gorgeous. You can see every knot in the wood.\u201D Reply to say thanks.", 30, false, "/remaker-reviews", "Reply", U + "meera-iyer.jpg"],
  ["products", "Teak Door Console Table: only 2 left", "Stock is running low. Add more or switch the product off to avoid missed orders.", 26, false, "/remaker-products/rp-1001/edit", "Update stock", P + "tara-console.jpg"],
  ["orders", "Order SO-31040 is on its way", "ReOrbit collected the Floor Lamp for Kabir Verma. It is now in transit.", 30, true, "/remaker-sales/SO-31040", "View order", P + "arjun-lamp.jpg"],
  ["followers", "Aarav Patel started following you", "Aarav is also one of your customers.", 90, true, "/remaker-followers", "See followers", U + "aarav-patel.jpg"],
  ["system", "New: Analytics for your studio", "See views, orders, buyer cities and the best time to post. Open Analytics from the sidebar.", 48, false, "/remaker-analytics", "Open analytics", ""],
  ["reviews", "New 2-star review needs your attention", "Dev Malhotra said the strap seam came apart. A kind reply helps future buyers.", 60, false, "/remaker-reviews", "Reply", ""],
  ["products", "3 people saved the Denim Patchwork Tote", "Your tote is being added to wishlists. A small price drop can turn saves into orders.", 52, true, "/remaker-products/rp-1003/edit", "View product", P + "priya-bag.jpg"],
  ["system", "New sign-in to your account", "Chrome on Windows, Ahmedabad. If this was not you, change your password.", 100, true, "/remaker-settings?section=security", "Review security", ""],
  ["orders", "Order SO-31011 was delivered", "Meera Iyer received the Reclaimed Wood Floor Lamp. Earnings clear in 3 days.", 40, true, "/remaker-sales/SO-31011", "View order", U + "meera-iyer.jpg"],
  ["followers", "Anaya Singh and 4 others started following you", "Your portfolio post brought new followers this week.", 130, true, "/remaker-followers", "See followers", U + "anaya-singh.jpg"],
  ["payouts", "Payout PO-2203 was paid", "₹15,364 was sent to your State Bank of India account ending 6209.", 480, true, "/remaker-earnings/payouts", "View payouts", ""],
  ["products", "Your product was approved", "Reclaimed Wood Floor Lamp passed the quality check and is live in the marketplace.", 150, true, "/remaker-products/rp-1002/edit", "View product", P + "arjun-lamp.jpg"],
  ["reviews", "Tara Bose reviewed Iron Grille Wall Shelf", "5 stars. \u201CThe wire brushing and sealing is very clean.\u201D", 190, true, "/remaker-reviews", "Read review", "/images/remakers/tara-bose.jpg"],
  ["orders", "Order SO-30901 was cancelled", "Isha Kapoor cancelled the Floor Lamp. She was refunded and you were not charged.", 285, true, "/remaker-sales/SO-30901", "View order", ""],
  ["purchases", "Your report RP-30211 was resolved", "We refunded the Classic novel collection to your wallet.", 740, true, "/remaker-orders/RO-47544/report", "See outcome", ""],
  ["system", "Platform fee stays at 8%", "No change to how much ReOrbit keeps from each sale. Delivery is still paid by the customer.", 800, true, "/remaker-earnings", "How you get paid", ""],
  ["followers", "Tara Bose follows you back", "Fellow ReMakers who follow you can see your new portfolio work first.", 4200, true, "/remaker-followers", "See followers", "/images/remakers/tara-bose.jpg"],
  ["products", "Add a before and after to your portfolio", "Products with portfolio proof get more followers and saves.", 1000, true, "/remaker-portfolio/new", "Add work", P + "tara-teak-cabinet.jpg"],
  ["system", "Scheduled maintenance on Sunday", "Payouts may take a few extra hours between 2 and 4 am. Nothing is needed from you.", 1500, true, "", "", ""],
  ["payouts", "Payout PO-2187 was paid", "₹3,542 reached your bank account.", 940, true, "/remaker-earnings/payouts", "View payouts", ""],
  ["orders", "Order SO-30991 was delivered", "Aarav Patel received 3 Denim Patchwork Totes.", 150, true, "/remaker-sales/SO-30991", "View order", U + "aarav-patel.jpg"],
];

function seed() {
  return RAW.map((row, index) => {
    const [category, title, text, hours, read, to, label, image] = row;

    return {
      id: `nt-${2000 + index}`,
      category,
      title,
      text,
      createdAt: ago(hours),
      read,
      link: to ? { to, label } : null,
      image,
    };
  });
}

/* ---------- store ---------- */

function load() {
  try {
    const raw = localStorage.getItem(KEY);

    if (raw) {
      const value = JSON.parse(raw);
      if (Array.isArray(value)) return value;
    }
  } catch {
    /* fall back to the seed */
  }

  return seed();
}

let items = load();
const listeners = new Set();

function commit(next) {
  items = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full or blocked: the change still lives for this session */
  }

  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => items;

export function useNotifications() {
  const list = useSyncExternalStore(subscribe, getSnapshot);

  return useMemo(() => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [list]);
}

export function useUnreadCount() {
  const list = useSyncExternalStore(subscribe, getSnapshot);

  return useMemo(() => list.filter((item) => !item.read).length, [list]);
}

/* ---------- actions ---------- */

export function markRead(ids) {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  commit(items.map((item) => (set.has(item.id) ? { ...item, read: true } : item)));
}

export function markUnread(ids) {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  commit(items.map((item) => (set.has(item.id) ? { ...item, read: false } : item)));
}

export function markAllRead(category = "all") {
  commit(items.map((item) => (category === "all" || item.category === category ? { ...item, read: true } : item)));
}

/* Returns what was removed so the UI can offer Undo */
export function removeNotifications(ids) {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  const removed = items.filter((item) => set.has(item.id));

  if (removed.length) commit(items.filter((item) => !set.has(item.id)));

  return removed;
}

export function restoreNotifications(list) {
  const existing = new Set(items.map((item) => item.id));
  const back = list.filter((item) => !existing.has(item.id));

  if (back.length) commit([...items, ...back]);
}

export function resetNotifications() {
  commit(seed());
}

/* ---------- display helpers ---------- */

export function categoryLabel(key) {
  return CATEGORIES.find((item) => item.key === key)?.label || key;
}

export function timeLabel(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;

  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/* Group a sorted list into Today / Yesterday / This week / Earlier */
export function groupByDay(list) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const day = 86400000;

  const groups = [
    { key: "today", label: "Today", items: [] },
    { key: "yesterday", label: "Yesterday", items: [] },
    { key: "week", label: "Earlier this week", items: [] },
    { key: "earlier", label: "Earlier", items: [] },
  ];

  list.forEach((item) => {
    const time = new Date(item.createdAt).getTime();

    if (time >= today) groups[0].items.push(item);
    else if (time >= today - day) groups[1].items.push(item);
    else if (time >= today - 6 * day) groups[2].items.push(item);
    else groups[3].items.push(item);
  });

  return groups.filter((group) => group.items.length > 0);
}
