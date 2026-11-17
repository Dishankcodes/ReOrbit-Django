/* =========================================================
   ReMaker › Notifications.
   The inbox lives on the server (GET /api/notifications/me/): sales, purchases,
   reviews, followers, payouts, products, support and ReOrbit announcements all
   create their notification there. The header bell and the Notifications page both
   read this one store, so reading something in one place updates the other.

   Unread conversations are added on the browser from the live messaging data
   (chat has its own table). Nothing here is sample data.
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { notificationsApi } from "../../api/notifications";
import {
  lastMessage,
  markConversationRead,
  markConversationUnread,
  useUnreadConversations,
} from "./messagesStore";

export const CATEGORIES = [
  { key: "messages", label: "Messages", note: "Unread conversations" },
  { key: "orders", label: "Sales", note: "Orders from customers" },
  { key: "purchases", label: "Purchases", note: "Things you bought" },
  { key: "reviews", label: "Reviews", note: "Customer feedback" },
  { key: "followers", label: "Followers", note: "People who follow you" },
  { key: "payouts", label: "Payouts", note: "Money and withdrawals" },
  { key: "products", label: "Products", note: "Stock and listings" },
  { key: "system", label: "ReOrbit", note: "News, support and security" },
];

const PAGE = 50;
const POLL_MS = 60000;
const UNDO_MS = 6000; // a deleted notification can be brought back for a few seconds
const UNREAD_KEY = "reorbit_remaker_notif_unread";

/* Which tab a server notification belongs in. Orders are split by where the link goes:
   /remaker-sales is something a customer bought from you, /remaker-orders something you bought. */
function categoryOf(n) {
  const to = n.target_url || "";
  switch (n.module) {
    case "orders":
      return to.startsWith("/remaker-orders") ? "purchases" : "orders";
    case "reviews":
      return "reviews";
    case "social":
      return "followers";
    case "earnings":
    case "wallet":
    case "payouts":
      return "payouts";
    case "products":
    case "listings":
    case "portfolio":
      return "products";
    default:
      return "system"; // announcements, support, complaints, account
  }
}

const LINK_LABEL = {
  orders: "View order",
  purchases: "View order",
  reviews: "Read review",
  followers: "See followers",
  payouts: "View payouts",
  products: "View product",
  system: "Open",
};

function fromServer(n, unreadIds) {
  const category = categoryOf(n);
  const to = n.target_url && n.target_url.startsWith("/") && !n.target_url.startsWith("/admin") ? n.target_url : "";
  return {
    id: n.id,
    category,
    title: n.title,
    text: n.body,
    createdAt: n.created_at,
    read: n.is_read && !unreadIds.includes(n.id),
    link: to ? { to, label: LINK_LABEL[category] } : null,
    image: "",
    severity: n.severity,
  };
}

/* ---------- "mark as unread" is kept on this device (the server only records reads) ---------- */
const loadUnread = () => {
  try {
    const v = JSON.parse(window.localStorage.getItem(UNREAD_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const saveUnread = (v) => {
  try {
    window.localStorage.setItem(UNREAD_KEY, JSON.stringify(v.slice(-300)));
  } catch {
    /* ignore */
  }
};

/* ---------- state ---------- */
let state = {
  server: [],
  page: 0,
  pages: 1,
  loaded: false,
  loading: false,
  error: "",
  unreadIds: loadUnread(),
  hidden: [], // deleted here, waiting out the undo window before the server is told
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

/* ---------- server calls ---------- */
let inFlight = null;
export function loadNotifications({ force = false } = {}) {
  if (inFlight && !force) return inFlight;
  set({ loading: !state.loaded });
  inFlight = notificationsApi
    .list(`?page_size=${PAGE}`)
    .then((d) =>
      set({ server: d.results, page: d.page, pages: d.total_pages, loaded: true, loading: false, error: "" }),
    )
    .catch((e) => set({ loaded: true, loading: false, error: e.message || "Could not load notifications." }))
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export async function loadMoreNotifications() {
  if (state.page >= state.pages) return;
  try {
    const d = await notificationsApi.list(`?page_size=${PAGE}&page=${state.page + 1}`);
    const have = new Set(state.server.map((n) => n.id));
    set({
      server: [...state.server, ...d.results.filter((n) => !have.has(n.id))],
      page: d.page,
      pages: d.total_pages,
    });
  } catch (e) {
    set({ error: e.message || "Could not load more." });
  }
}

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  loadNotifications();
  window.setInterval(() => {
    if (document.visibilityState === "visible") loadNotifications({ force: true });
  }, POLL_MS);
  window.addEventListener("reorbit:session-ended", () => {
    set({ server: [], loaded: false, page: 0, pages: 1 });
  });
}

/* ---------- hooks ---------- */
let liveMessageIds = [];

export function useNotifications() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const unreadConversations = useUnreadConversations();
  liveMessageIds = unreadConversations.map((conversation) => conversation.id);

  useEffect(() => {
    start();
  }, []);

  return useMemo(() => {
    const hidden = new Set(s.hidden);
    const serverItems = s.server.filter((n) => !hidden.has(n.id)).map((n) => fromServer(n, s.unreadIds));
    const messageItems = unreadConversations
      .filter((conversation) => !hidden.has(`message:${conversation.id}`))
      .map((conversation) => {
        const last = lastMessage(conversation);
        return {
          id: `message:${conversation.id}`,
          category: "messages",
          title: `Message from ${conversation.name}`,
          text: last.text || (last.image || last.has_image ? "Sent a photo" : "Open your conversation."),
          createdAt: last.at,
          read: false,
          link: { to: `/remaker-messages/${conversation.id}`, label: "Reply" },
          image: conversation.image || "",
        };
      });
    return [...serverItems, ...messageItems].sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt)),
    );
  }, [s.server, s.hidden, s.unreadIds, unreadConversations]);
}

export function useUnreadCount() {
  const list = useNotifications();
  return useMemo(() => list.filter((item) => !item.read).length, [list]);
}

export function useNotificationsStatus() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { loaded: s.loaded, loading: s.loading, error: s.error, hasMore: s.page < s.pages };
}

/* ---------- actions ---------- */
const asList = (ids) => (Array.isArray(ids) ? ids : [ids]).map(String);
const isMessage = (id) => String(id).startsWith("message:");

export function markRead(ids) {
  const values = asList(ids);
  values.filter(isMessage).forEach((id) => markConversationRead(id.slice("message:".length)).catch(() => {}));
  const serverIds = values.filter((id) => !isMessage(id));
  if (!serverIds.length) return;
  const unreadIds = state.unreadIds.filter((id) => !serverIds.includes(id));
  saveUnread(unreadIds);
  set({
    unreadIds,
    server: state.server.map((n) => (serverIds.includes(n.id) ? { ...n, is_read: true } : n)),
  });
  serverIds.forEach((id) => notificationsApi.markRead(id).catch(() => loadNotifications({ force: true })));
}

export function markUnread(ids) {
  const values = asList(ids);
  values.filter(isMessage).forEach((id) => markConversationUnread(id.slice("message:".length)).catch(() => {}));
  const serverIds = values.filter((id) => !isMessage(id));
  if (!serverIds.length) return;
  const unreadIds = [...new Set([...state.unreadIds, ...serverIds])];
  saveUnread(unreadIds);
  set({ unreadIds });
}

export function markAllRead(category = "all") {
  if (category === "all" || category === "messages") {
    liveMessageIds.forEach((id) => markConversationRead(id).catch(() => {}));
  }
  if (category === "messages") return;
  const ids = state.server
    .filter((n) => category === "all" || categoryOf(n) === category)
    .map((n) => n.id);
  const unreadIds = state.unreadIds.filter((id) => !ids.includes(id));
  saveUnread(unreadIds);
  set({ unreadIds, server: state.server.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)) });
  if (category === "all") {
    notificationsApi.markAllRead().catch(() => loadNotifications({ force: true }));
  } else {
    ids.forEach((id) => notificationsApi.markRead(id).catch(() => {}));
  }
}

/* Announcements now arrive as real server notifications, so the layout has nothing to push.
   Kept as a no-op so older layouts that still call it keep working. */
export function syncAnnouncements() {}

/* Hides at once and tells the server after the undo window. Returns what was removed
   so the UI can offer Undo (restoreNotifications). */
const pending = new Map();
export function removeNotifications(ids) {
  const values = asList(ids);
  const list = currentList().filter((item) => values.includes(String(item.id)));
  if (!list.length) return [];
  set({ hidden: [...new Set([...state.hidden, ...values])] });
  values.forEach((id) => {
    if (isMessage(id)) {
      markConversationRead(id.slice("message:".length)).catch(() => {});
      return;
    }
    clearTimeout(pending.get(id));
    pending.set(
      id,
      setTimeout(() => {
        pending.delete(id);
        notificationsApi
          .dismiss(id)
          .then(() => set({ server: state.server.filter((n) => n.id !== id), hidden: state.hidden.filter((h) => h !== id) }))
          .catch(() => set({ hidden: state.hidden.filter((h) => h !== id) }));
      }, UNDO_MS),
    );
  });
  return list;
}

export function restoreNotifications(list) {
  const ids = (list || []).map((item) => String(item.id));
  ids.forEach((id) => {
    clearTimeout(pending.get(id));
    pending.delete(id);
  });
  set({ hidden: state.hidden.filter((id) => !ids.includes(id)) });
}

/* Builds the current list outside React (used by removeNotifications for Undo). */
function currentList() {
  const hidden = new Set(state.hidden);
  return state.server.filter((n) => !hidden.has(n.id)).map((n) => fromServer(n, state.unreadIds))
    .concat(liveMessageIds.map((id) => ({ id: `message:${id}`, category: "messages" })));
}

export function resetNotifications() {
  loadNotifications({ force: true });
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
