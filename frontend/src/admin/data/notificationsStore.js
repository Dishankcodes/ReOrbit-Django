/* =========================================================
   Admin › Notifications.
   One inbox for the whole admin side, from the server
   (GET /api/notifications/admin/): orders, donations, pickups, complaints,
   support, products, rewards and the warehouse notify the admins whose access
   lets them act. Unread conversations are added from the live messaging data.
   Announcements are saved on the server and delivered to every member / ReMaker
   inbox. Nothing here is sample data.
   ========================================================= */

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { adminAnnouncementsApi, adminNotificationsApi } from "../../api/notifications";
import { useAccess } from "./teamStore";
import {
  lastMessage,
  markConversationRead,
  markConversationUnread,
  useUnreadConversations,
} from "../../shared/messagingStore";
import { isActive, onActive } from "../../shared/activity";

const PAGE = 50;
const POLL_MS = 60000;
const UNREAD_KEY = "reorbit_admin_notif_unread";

export const MODULES = {
  Warehouse: { label: "Warehouse", path: "/admin-warehouse" },
  Donations: { label: "Donations", path: "/admin-donations" },
  Pickups: { label: "Pickups", path: "/admin-pickups" },
  Orders: { label: "Orders", path: "/admin-orders" },
  Products: { label: "Products", path: "/admin-products" },
  Reviews: { label: "Reviews", path: "/admin-reviews" },
  Rewards: { label: "Rewards", path: "/admin-rewards" },
  Sales: { label: "Sales", path: "/admin-sell/sales" },
  Users: { label: "Users", path: "/admin-users" },
  Complaints: { label: "Complaints", path: "/admin-complaints" },
  Support: { label: "Support", path: "/admin-support" },
  Messages: { label: "Messages", path: "/admin-messages" },
  System: { label: "System", path: "" },
};

/* server module -> inbox section */
const MODULE_OF = {
  warehouse: "Warehouse",
  donations: "Donations",
  pickups: "Pickups",
  orders: "Orders",
  payments: "Orders",
  products: "Products",
  listings: "Products",
  reviews: "Reviews",
  rewards: "Rewards",
  sell: "Sales",
  users: "Users",
  remakers: "Users",
  account: "Users",
  complaints: "Complaints",
  support: "Support",
  messages: "Messages",
};

const ACTION_LABEL = {
  Orders: "Open order",
  Donations: "Review donation",
  Pickups: "Open pickup",
  Complaints: "Decide",
  Support: "Reply",
  Products: "Open product",
  Reviews: "Review",
  Warehouse: "Open warehouse",
};

/* ---------- "mark as unread" stays on this device (the server only records reads) ---------- */
const loadUnread = () => {
  try {
    const v = JSON.parse(window.localStorage.getItem(UNREAD_KEY) || "[]");
    return new Set(Array.isArray(v) ? v : []);
  } catch {
    return new Set();
  }
};
const saveUnread = (set) => {
  try {
    window.localStorage.setItem(UNREAD_KEY, JSON.stringify([...set].slice(-300)));
  } catch {
    /* ignore */
  }
};

/* ---------- state ---------- */
let state = {
  server: [],
  loaded: false,
  error: "",
  unread: loadUnread(), // marked unread again by the admin
  dismissed: new Set(),
  announcements: [], // loaded from /api/notifications/admin/announcements/
  announcementsLoaded: false,
};
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
const useNs = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

let inFlight = null;
export function loadNotifications({ force = false } = {}) {
  if (inFlight && !force) return inFlight;
  inFlight = adminNotificationsApi
    .list(`?page_size=${PAGE}`)
    .then((d) => set({ server: d.results || [], loaded: true, error: "" }))
    .catch((e) =>
      set({ loaded: true, error: e.status === 403 ? "" : e.message || "Could not load notifications." }),
    )
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  loadNotifications();
  window.setInterval(() => {
    if (isActive()) loadNotifications({ force: true });
  }, POLL_MS);
  onActive(() => loadNotifications({ force: true }));
  window.addEventListener("reorbit:session-ended", () => set({ server: [], loaded: false }));
}

function fromServer(n, unread) {
  const module = MODULE_OF[n.module] || "System";
  const path = n.target_url && n.target_url.startsWith("/") ? n.target_url : MODULES[module]?.path || "";
  return {
    id: n.id,
    module,
    severity: n.severity || "info",
    needsAction: !n.is_read && n.severity !== "info",
    title: n.title,
    message: n.body,
    at: n.created_at,
    path,
    actionLabel: path ? ACTION_LABEL[module] || "Open" : "",
    read: n.is_read && !unread.has(n.id),
  };
}

/* ---------- build the inbox ---------- */
export function useNotifications() {
  const { server, unread, dismissed } = useNs();
  const access = useAccess();
  const unreadConversations = useUnreadConversations(access.canSee("messages"));

  useEffect(() => {
    start();
  }, []);

  return useMemo(() => {
    const out = server.filter((n) => !dismissed.has(n.id)).map((n) => fromServer(n, unread));
    unreadConversations.forEach((conversation) => {
      const message = lastMessage(conversation);
      out.push({
        id: `message:${conversation.id}`,
        module: "Messages",
        severity: "info",
        needsAction: true,
        title: `New message from ${conversation.name || "a member"}`,
        message: message.text || "You have an unread message.",
        at: message.at || conversation.updated_at || conversation.updatedAt,
        path: `/admin-messages/${conversation.id}`,
        actionLabel: "Reply",
        read: false,
      });
    });
    return out.sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [server, unread, dismissed, unreadConversations]);
}

export function markRead(ids) {
  const list = Array.isArray(ids) ? ids : [ids];
  const unread = new Set(state.unread);
  const serverIds = [];
  list.forEach((id) => {
    if (String(id).startsWith("message:")) {
      markConversationRead(String(id).slice("message:".length), "admin").catch(() => {});
      return;
    }
    unread.delete(id);
    serverIds.push(id);
  });
  saveUnread(unread);
  set({
    unread,
    server: state.server.map((n) => (serverIds.includes(n.id) ? { ...n, is_read: true } : n)),
  });
  serverIds.forEach((id) => adminNotificationsApi.markRead(id).catch(() => loadNotifications({ force: true })));
}
export function markUnread(id) {
  if (String(id).startsWith("message:")) {
    markConversationUnread(String(id).slice("message:".length), "admin").catch(() => {});
    return;
  }
  const unread = new Set(state.unread);
  unread.add(id);
  saveUnread(unread);
  set({ unread });
}
export function dismiss(ids) {
  const list = Array.isArray(ids) ? ids : [ids];
  const d = new Set(state.dismissed);
  list.forEach((id) => {
    if (String(id).startsWith("message:")) {
      markConversationRead(String(id).slice("message:".length), "admin").catch(() => {});
    } else {
      d.add(id);
      adminNotificationsApi.dismiss(id).catch(() => {});
    }
  });
  set({ dismissed: d });
}

/* ---------- announcements ---------- */
const announcementFromServer = (a) => ({ ...a, at: a.at });

let loadingAnnouncements = false;
export function loadAnnouncements() {
  if (loadingAnnouncements) return;
  loadingAnnouncements = true;
  adminAnnouncementsApi
    .list()
    .then((rows) => set({ announcements: rows.map(announcementFromServer), announcementsLoaded: true }))
    .catch(() => set({ announcementsLoaded: true }))
    .finally(() => {
      loadingAnnouncements = false;
    });
}

export function useAnnouncements() {
  const ns = useNs();
  useEffect(() => {
    if (!ns.announcementsLoaded) loadAnnouncements();
  }, [ns.announcementsLoaded]);
  return ns.announcements;
}

/* How many people each audience would reach (real, from the server) */
export function useAnnouncementReach() {
  const [reach, setReach] = useState({ users: 0, remakers: 0, everyone: 0 });
  useEffect(() => {
    let live = true;
    adminAnnouncementsApi
      .reach()
      .then((r) => live && setReach(r))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return reach;
}

/* Sends now, or schedules when `scheduleAt` is set. Rejects with the server's message. */
export async function sendAnnouncement({
  title,
  message,
  audience,
  type,
  link,
  scheduleAt,
}) {
  const a = await adminAnnouncementsApi.send({
    title,
    message,
    audience,
    type,
    link: link || "",
    scheduleAt: scheduleAt ? new Date(scheduleAt).toISOString() : "",
  });
  set({ announcements: [announcementFromServer(a), ...state.announcements] });
  return a;
}

const replaceAnnouncement = (a) =>
  set({ announcements: state.announcements.map((x) => (x.id === a.id ? announcementFromServer(a) : x)) });

/* edit a scheduled one: same fields as sendAnnouncement */
export async function updateAnnouncement(id, { title, message, audience, type, link, scheduleAt }) {
  const a = await adminAnnouncementsApi.update(id, {
    title,
    message,
    audience,
    type,
    link: link || "",
    scheduleAt: scheduleAt ? new Date(scheduleAt).toISOString() : "",
  });
  replaceAnnouncement(a);
  return a;
}
/* action: "send_now" | "recall" -> the server's message */
export async function announcementAction(id, action) {
  const r = await adminAnnouncementsApi.act(id, action);
  replaceAnnouncement(r.announcement);
  return r.message;
}
export async function cancelAnnouncement(id) {
  await adminAnnouncementsApi.cancel(id);
  set({ announcements: state.announcements.filter((x) => x.id !== id) });
}
export const refreshAnnouncements = () => loadAnnouncements();

/* where a tap on the announcement takes people (paths work on both apps: /user-* opens the
   matching ReMaker page for ReMakers) */
export const ANNOUNCE_LINKS = [
  ["", "No link (just the message)"],
  ["/user-marketplace", "Marketplace"],
  ["/user-orbit-points", "Orbit Points and rewards"],
  ["/user-sell/new", "Sell an item"],
  ["/user-donations/new", "Donate items"],
  ["/user-orders", "My orders"],
  ["/user-help", "Help and support"],
  ["/remaker-products/new", "ReMaker: add a product"],
  ["/remaker-dashboard", "ReMaker: dashboard"],
];
/* starting points per type: tap one to fill the title and message */
export const ANNOUNCE_TEMPLATES = {
  offer: [
    { title: "Weekend green sale", message: "Pre-loved finds are extra affordable this weekend. Grab yours before they're gone!" },
    { title: "New coupon for you", message: "Use your new coupon at checkout and save on your next order." },
  ],
  update: [
    { title: "Something new on ReOrbit", message: "We've made ReOrbit easier to use. Open the app to see what's new." },
    { title: "Faster pickups in your city", message: "Our pickup team now covers more areas, so pickups happen sooner." },
  ],
  maintenance: [
    { title: "Short maintenance tonight", message: "ReOrbit will be unavailable for about 30 minutes tonight while we make improvements. Thanks for your patience." },
  ],
  reminder: [
    { title: "Don't forget your rewards", message: "You have Orbit Points waiting. Redeem them for vouchers before they expire." },
    { title: "Items waiting for a review", message: "Tell others how your recent purchase went. It only takes a minute." },
  ],
};

export const AUDIENCE_LABEL = {
  users: "All users",
  remakers: "All ReMakers",
  everyone: "Everyone",
};
export const ANNOUNCE_TYPES = {
  offer: "Offer",
  update: "Update",
  maintenance: "Maintenance",
  reminder: "Reminder",
};

/* the same, against the real clock: for things the server timestamped */
export function realAgo(iso) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/* "5 min ago", "3 h ago", "2 days ago" */
export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "Scheduled";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
