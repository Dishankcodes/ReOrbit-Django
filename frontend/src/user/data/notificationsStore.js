/* =========================================================
   User › Notifications.
   The inbox lives on the server (GET /api/notifications/me/): orders,
   donations, listings, reviews, wallet and support all create their
   notification there. This store loads it, keeps the unread count for
   the bell and the sidebar, and sends mark-read / mark-all-read / dismiss.

   Three things have no server row, so they are added on the browser from
   live data: unread conversations, rewards and announcements from ReOrbit.
   Their read / dismissed state is kept in localStorage.
   Types follow the switches in Settings › Notifications.
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { notificationsApi } from "../../api/notifications";
import { useRewards } from "./rewardsStore";
import { useSettings } from "./settingsStore";
import { useMyAnnouncements } from "../../shared/announcements";
import { lastMessage, useUnreadConversations } from "./messagesStore";

const KEY = "reorbit_user_notif_read";
const GONE = "reorbit_user_notif_gone";
const DAY = 86400000;
const WINDOW_DAYS = 14;
const PAGE = 50;
const POLL_MS = 60000;

/* ---------- the two small local sets (browser-only notifications) ---------- */
const loadSet = (key) => {
  try {
    const v = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const saveSet = (key, v) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(v.slice(-500)));
  } catch {
    /* ignore */
  }
};

/* ---------- state ---------- */
let state = {
  server: [],
  serverUnread: 0,
  page: 0,
  pages: 1,
  loaded: false,
  loading: false,
  error: "",
  readIds: loadSet(KEY),
  goneIds: loadSet(GONE),
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
      set({
        server: d.results,
        serverUnread: d.unread_count,
        page: d.page,
        pages: d.total_pages,
        loaded: true,
        loading: false,
        error: "",
      }),
    )
    .catch((e) =>
      set({
        loaded: true,
        loading: false,
        error: e.message || "Could not load notifications.",
      }),
    )
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export async function loadMoreNotifications() {
  if (state.page >= state.pages) return;
  try {
    const d = await notificationsApi.list(
      `?page_size=${PAGE}&page=${state.page + 1}`,
    );
    const have = new Set(state.server.map((n) => n.id));
    set({
      server: [...state.server, ...d.results.filter((n) => !have.has(n.id))],
      serverUnread: d.unread_count,
      page: d.page,
      pages: d.total_pages,
    });
  } catch (e) {
    set({ error: e.message || "Could not load more." });
  }
}

const isLocal = (id) => /^(message|ann|pts)-/.test(id);

/* Read, optimistically; the server's number replaces ours when it answers. */
export async function markRead(id) {
  if (isLocal(id)) {
    if (!state.readIds.includes(id)) {
      const next = [...state.readIds, id];
      saveSet(KEY, next);
      set({ readIds: next });
    }
    return;
  }
  const row = state.server.find((n) => n.id === id);
  if (!row || row.is_read) return;
  set({
    server: state.server.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    serverUnread: Math.max(0, state.serverUnread - 1),
  });
  try {
    const d = await notificationsApi.markRead(id);
    set({ serverUnread: d.unread_count });
  } catch {
    loadNotifications({ force: true });
  }
}

export async function markAllRead(localIds = []) {
  const next = [...new Set([...state.readIds, ...localIds])];
  saveSet(KEY, next);
  set({
    readIds: next,
    server: state.server.map((n) => ({ ...n, is_read: true })),
    serverUnread: 0,
  });
  try {
    await notificationsApi.markAllRead();
  } catch {
    loadNotifications({ force: true });
  }
}

export async function dismiss(id) {
  if (isLocal(id)) {
    const next = [...state.goneIds, id];
    saveSet(GONE, next);
    set({ goneIds: next });
    return;
  }
  const row = state.server.find((n) => n.id === id);
  set({
    server: state.server.filter((n) => n.id !== id),
    serverUnread: row && !row.is_read ? Math.max(0, state.serverUnread - 1) : state.serverUnread,
  });
  try {
    const d = await notificationsApi.dismiss(id);
    set({ serverUnread: d.unread_count });
  } catch {
    loadNotifications({ force: true });
  }
}

export async function clearRead() {
  const localRead = state.readIds;
  const next = [...new Set([...state.goneIds, ...localRead])];
  saveSet(GONE, next);
  set({ goneIds: next, server: state.server.filter((n) => !n.is_read) });
  try {
    await notificationsApi.dismissRead();
  } catch {
    loadNotifications({ force: true });
  }
}

/* one timer and one tab listener for the whole app, started by the first screen that needs notifications */
let started = false;
function start() {
  if (started) return;
  started = true;
  loadNotifications();
  window.setInterval(() => {
    if (document.visibilityState === "visible") loadNotifications({ force: true });
  }, POLL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") loadNotifications({ force: true });
  });
}

/* ---------- what each kind of notification is called, and where it goes by default ---------- */
export const NOTIFICATION_TYPES = {
  order: { label: "Orders", pref: "orderUpdates", to: "/user-orders" },
  donation: { label: "Donations", pref: "donationUpdates", to: "/user-donations" },
  sell: { label: "Selling", pref: "orderUpdates", to: "/user-sell" },
  earning: { label: "Wallet", pref: null, to: "/user-wallet" },
  support: { label: "Support", pref: null, to: "/user-help/tickets" },
  message: { label: "Messages", pref: null, to: "/user-messages" },
  reward: { label: "Rewards", pref: "rewards", to: "/user-orbit-points/history" },
  announcement: { label: "From ReOrbit", pref: null, to: "/user-notifications" },
};

const MODULE_TYPE = {
  orders: "order",
  donations: "donation",
  listings: "sell",
  pickups: "sell",
  warehouse: "sell",
  reviews: "sell",
  earnings: "earning",
  complaints: "support",
  support: "support",
  rewards: "reward",
};

const fromServer = (n) => {
  const type = MODULE_TYPE[n.module] || "announcement";
  return {
    id: n.id,
    type,
    title: n.title,
    message: n.body,
    at: n.created_at,
    to: n.target_url || NOTIFICATION_TYPES[type].to,
    severity: n.severity,
    read: n.is_read,
  };
};

export function useNotifications() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { ledger } = useRewards();
  const settings = useSettings();
  const announcements = useMyAnnouncements("users");
  const unreadConversations = useUnreadConversations();

  useEffect(() => {
    start();
  }, []);

  return useMemo(() => {
    const since = Date.now() - WINDOW_DAYS * DAY;
    const local = [];

    unreadConversations.forEach((conversation) => {
      const last = lastMessage(conversation);
      local.push({
        id: `message-${conversation.id}-${last.id || last.at}`,
        type: "message",
        title: `Message from ${conversation.name}`,
        message:
          last.text ||
          (last.image || last.has_image ? "Sent a photo" : "Open your conversation."),
        at: last.at,
        to: `/user-messages/${conversation.id}`,
      });
    });
    announcements.forEach((a) => {
      local.push({
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
        local.push({
          id: `pts-${e.id}`,
          type: "reward",
          title: `+${e.points} Orbit Points`,
          message: e.title,
          at: e.at,
          to: "/user-orbit-points/history",
        });
      });

    const prefs = settings.prefs.notifications;
    const allowed = (n) => {
      const pref = NOTIFICATION_TYPES[n.type].pref;
      return pref ? prefs[pref] : true;
    };
    const serverRows = s.server.map(fromServer);
    /* the server counts everything unread; take off what the user's switches hide */
    const hiddenUnread = serverRows.filter((n) => !n.read && !allowed(n)).length;
    const mine = [
      ...serverRows,
      ...local
        .filter((n) => new Date(n.at).getTime() >= since)
        .filter((n) => !s.goneIds.includes(n.id))
        .map((n) => ({ ...n, read: s.readIds.includes(n.id) })),
    ]
      .filter(allowed)
      .sort((a, b) => new Date(b.at) - new Date(a.at));

    return {
      items: mine,
      unread:
        Math.max(0, s.serverUnread - hiddenUnread) +
        mine.filter((n) => !n.read && isLocal(n.id)).length,
      loading: s.loading && !s.loaded,
      error: s.error,
      hasMore: s.page < s.pages,
    };
  }, [s, ledger, settings, announcements, unreadConversations]);
}
