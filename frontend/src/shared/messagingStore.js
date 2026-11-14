import { useEffect, useMemo, useSyncExternalStore } from "react";
import { messagingApi } from "../api/messaging";
import {
  getAccountType,
  isSignedIn,
  SESSION_ENDED_EVENT,
} from "../api/session";

export const USER_KINDS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "seller", label: "Sellers" },
  { key: "buyer", label: "Buyers" },
  { key: "remaker", label: "ReMakers" },
  { key: "reorbit", label: "ReOrbit" },
];

export const REMAKER_KINDS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "customer", label: "Customers" },
  { key: "remaker", label: "ReMakers" },
  { key: "reorbit", label: "ReOrbit" },
];

export const QUICK_REPLIES = {
  seller: [
    "Is this still available?",
    "Can you share one more photo of the condition?",
    "Is the price negotiable?",
    "Can you deliver to my pincode?",
  ],
  buyer: [
    "Thank you! I will pack it today.",
    "Yes, it is still available.",
    "Happy to share more photos.",
    "I can hold it for you until tomorrow.",
  ],
  remaker: [
    "Love your work! Can you make something similar?",
    "What materials did you use?",
    "How long would a custom piece take?",
  ],
  customer: [
    "Thank you for your order! I will pack it today.",
    "Your order is ready for pickup whenever you are free.",
    "Happy to share more photos.",
  ],
  reorbit: [
    "Thanks, that helps.",
    "Could you update me on this?",
    "I have added the details you asked for.",
  ],
  support: [
    "Thanks, I will update this today.",
    "Could you share the pickup window?",
  ],
};

// Keep all three inboxes responsive without requiring a WebSocket service.
const POLL_MS = 3000;
const PAGE_SIZE = 50;
const createState = () => ({
  rows: [],
  unreadRows: [],
  details: new Map(),
  listeners: new Set(),
  loading: false,
  loadingMore: false,
  detailLoading: new Set(),
  error: "",
  view: { query: "", filter: "all" },
  loaded: false,
  listRequest: null,
  listRequestKey: "",
  requestVersion: 0,
  nextOffset: null,
  hasMore: false,
  counts: {},
  unreadCount: 0,
  serverTime: null,
  activeId: null,
});

const states = new Map();
const pollers = new Map();
const stateFor = (scope) => {
  if (!states.has(scope)) states.set(scope, createState());
  return states.get(scope);
};
const subscribe = (scope, listener) => {
  const state = stateFor(scope);
  state.listeners.add(listener);
  return () => state.listeners.delete(listener);
};
const snapshot = (scope) => stateFor(scope);
const emit = (state) => state.listeners.forEach((listener) => listener());
const currentScope = () => getAccountType() || "user";
const isVisible = () =>
  typeof document === "undefined" || document.visibilityState === "visible";

function messageId(message) {
  const value = Number(message?.id);
  return Number.isFinite(value) ? value : 0;
}

function mergeMessages(existing = [], incoming = [], mode = "replace") {
  const all = mode === "prepend" ? [...incoming, ...existing] :
    mode === "append" ? [...existing, ...incoming] : [...incoming];
  const unique = new Map();
  all.forEach((message) => unique.set(String(message.id), message));
  return [...unique.values()].sort((a, b) => {
    const byDate = new Date(a.at).getTime() - new Date(b.at).getTime();
    return byDate || messageId(a) - messageId(b);
  });
}

function attachCachedDetail(state, row) {
  const cached = state.details.get(row.id);
  return cached ? {
    ...cached,
    ...row,
    messages: cached.messages || [],
    has_more_messages: cached.has_more_messages,
    older_cursor: cached.older_cursor,
  } : row;
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const atA = a.last_message?.at || a.updated_at || a.updatedAt || 0;
    const atB = b.last_message?.at || b.updated_at || b.updatedAt || 0;
    return new Date(atB).getTime() - new Date(atA).getTime();
  });
}

function setRows(state, rows) {
  state.rows = sortRows(rows.map((row) => attachCachedDetail(state, row)));
}

function mergeConversation(scope, conversation, mode = "replace") {
  const state = stateFor(scope);
  const previous = state.details.get(conversation.id) ||
    state.rows.find((row) => row.id === conversation.id) || {};
  const detail = {
    ...previous,
    ...conversation,
    has_more_messages: mode === "append"
      ? Boolean(previous.has_more_messages || conversation.has_more_messages)
      : conversation.has_more_messages,
    messages: mergeMessages(previous.messages || [], conversation.messages || [], mode),
  };
  state.details.set(detail.id, detail);
  const index = state.rows.findIndex((row) => row.id === detail.id);
  if (index >= 0) {
    const next = [...state.rows];
    next[index] = { ...next[index], ...detail };
    state.rows = sortRows(next);
  } else if (state.activeId === detail.id) {
    state.rows = sortRows([detail, ...state.rows]);
  }
  emit(state);
  return detail;
}

function requestParams(view, offset = 0) {
  return {
    q: view.query.trim(),
    kind: view.filter === "unread" || view.filter === "all" ? "" : view.filter,
    filter: view.filter === "unread" ? "unread" : "",
    offset,
    limit: PAGE_SIZE,
  };
}

async function loadList(scope, view, { append = false, poll = false } = {}) {
  const state = stateFor(scope);
  const nextView = view || state.view;
  if (!isSignedIn(scope)) return [];
  const offset = append ? state.nextOffset : 0;
  if (append && offset === null) return state.rows;
  const requestKey = `${nextView.query}\u0000${nextView.filter}\u0000${offset}\u0000${poll}`;
  if (state.listRequest && state.listRequestKey === requestKey) return state.listRequest;
  const version = ++state.requestVersion;
  if (!poll) {
    state.view = nextView;
    state.loading = !append;
    state.loadingMore = append;
    state.error = "";
    emit(state);
  }

  const params = requestParams(nextView, offset || 0);
  if (poll && state.serverTime) {
    params.since = state.serverTime;
    params.limit = 100;
  }
  const run = messagingApi.list(params)
    .then((page) => {
      if (version !== state.requestVersion && !poll) return state.rows;
      const incoming = page.conversations || [];
      if (poll && state.serverTime) {
        const removed = new Set((page.removed || []).map(String));
        const kept = state.rows.filter((row) => !removed.has(String(row.id)));
        const byId = new Map(kept.map((row) => [row.id, row]));
        incoming.forEach((row) => byId.set(row.id, attachCachedDetail(state, row)));
        setRows(state, [...byId.values()]);
      } else if (append) {
        const byId = new Map(state.rows.map((row) => [row.id, row]));
        incoming.forEach((row) => byId.set(row.id, attachCachedDetail(state, row)));
        setRows(state, [...byId.values()]);
      } else {
        setRows(state, incoming);
      }
      state.counts = page.counts || state.counts;
      state.unreadRows = Array.isArray(page.unread_conversations)
        ? page.unread_conversations
        : state.unreadRows;
      state.unreadCount = Number(page.unread_count ?? state.unreadCount ?? 0);
      if (!poll) {
        state.nextOffset = page.next_offset ?? null;
        state.hasMore = Boolean(page.has_more);
      }
      state.serverTime = page.server_time || state.serverTime;
      state.loaded = true;
      state.error = "";
      return state.rows;
    })
    .catch((error) => {
      state.error = error.message || "Messages could not be loaded.";
      emit(state);
      throw error;
    })
    .finally(() => {
      if (version === state.requestVersion) {
        state.loading = false;
        state.loadingMore = false;
        state.listRequest = null;
        state.listRequestKey = "";
        emit(state);
      }
    });
  state.listRequest = run;
  state.listRequestKey = requestKey;
  return run;
}

async function loadDetail(scope, id, { before = null, after = null } = {}) {
  const state = stateFor(scope);
  if (!id || !isSignedIn(scope)) return null;
  const requestKey = `${id}:${before || ""}:${after || ""}`;
  if (state.detailLoading.has(requestKey)) return null;
  state.detailLoading = new Set(state.detailLoading).add(requestKey);
  state.error = "";
  emit(state);
  try {
    const query = before ? { before } : after ? { after } : {};
    const conversation = await messagingApi.get(id, query);
    const mode = before ? "prepend" : after ? "append" : "replace";
    return mergeConversation(scope, conversation, mode);
  } catch (error) {
    state.error = error.message || "This conversation could not be loaded.";
    emit(state);
    throw error;
  } finally {
    const pending = new Set(state.detailLoading);
    pending.delete(requestKey);
    state.detailLoading = pending;
    emit(state);
  }
}

async function refresh(scope) {
  const state = stateFor(scope);
  if (!isVisible() || !isSignedIn(scope)) return;
  if (!state.loaded) {
    await loadList(scope, state.view).catch(() => {});
    return;
  }
  await loadList(scope, state.view, { poll: true }).catch(() => {});
  const activeId = state.activeId;
  if (!activeId) return;
  const conversation = state.details.get(activeId) || state.rows.find((row) => row.id === activeId);
  const last = conversation?.messages?.[conversation.messages.length - 1];
  const currentId = messageId(last);
  const wasUnread = Number(conversation?.unread) > 0;
  try {
    const updated = await loadDetail(scope, activeId, { after: currentId || null });
    if (updated?.messages?.length && wasUnread && isVisible()) {
      await markConversationRead(activeId, scope).catch(() => {});
    }
  } catch {
    // Keep the cached conversation and retry during the next visible poll.
  }
}

function usePolling(scope, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const state = stateFor(scope);
    if (!state.loaded) loadList(scope, state.view).catch(() => {});
    let entry = pollers.get(scope);
    if (!entry) {
      entry = { refs: 0, timer: null };
      pollers.set(scope, entry);
    }
    entry.refs += 1;
    if (!entry.timer && typeof window !== "undefined") {
      entry.timer = window.setInterval(() => refresh(scope), POLL_MS);
    }
    return () => {
      entry.refs -= 1;
      if (entry.refs <= 0 && entry.timer) {
        window.clearInterval(entry.timer);
        entry.timer = null;
        entry.refs = 0;
      }
    };
  }, [scope, enabled]);
}

export function useConversations(query = "", filter = "all") {
  const scope = currentScope();
  const state = useSyncExternalStore(
    (listener) => subscribe(scope, listener),
    () => snapshot(scope),
    () => snapshot(scope),
  );
  usePolling(scope);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadList(scope, { query, filter }).catch(() => {});
    }, query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [scope, query, filter]);
  return useMemo(() => state.rows, [state.rows]);
}

export function useConversation(id) {
  const scope = currentScope();
  const state = useSyncExternalStore(
    (listener) => subscribe(scope, listener),
    () => snapshot(scope),
    () => snapshot(scope),
  );
  usePolling(scope);
  useEffect(() => {
    state.activeId = id || null;
    if (id) {
      const entry = state.details.get(id) || state.rows.find((row) => row.id === id);
      if (!entry?.messages?.length) loadDetail(scope, id).catch(() => {});
    }
    emit(state);
    return () => {
      if (state.activeId === id) state.activeId = null;
    };
  }, [scope, id]);
  return state.details.get(id) || state.rows.find((row) => row.id === id) || null;
}

export function useMessageStatus(id = null) {
  const scope = currentScope();
  const state = useSyncExternalStore(
    (listener) => subscribe(scope, listener),
    () => snapshot(scope),
    () => snapshot(scope),
  );
  const isLoadingDetail = [...state.detailLoading].some((key) => key.startsWith(`${id}:`));
  return {
    loading: state.loading || isLoadingDetail,
    error: state.error,
    hasMore: state.hasMore,
    loadingOlder: [...state.detailLoading].some((key) => key.startsWith(`${id}:`)),
    loadingMore: state.loadingMore,
  };
}

export function useConversationCounts() {
  const scope = currentScope();
  const state = useSyncExternalStore(
    (listener) => subscribe(scope, listener),
    () => snapshot(scope),
    () => snapshot(scope),
  );
  usePolling(scope);
  return state.counts;
}

export function useTotalUnread(enabled = true) {
  const scope = currentScope();
  const state = useSyncExternalStore(
    (listener) => subscribe(scope, listener),
    () => snapshot(scope),
    () => snapshot(scope),
  );
  usePolling(scope, enabled);
  return enabled ? state.unreadCount || state.rows.reduce((total, row) => total + Number(row.unread || 0), 0) : 0;
}

export function useUnreadConversations(enabled = true) {
  const scope = currentScope();
  const state = useSyncExternalStore(
    (listener) => subscribe(scope, listener),
    () => snapshot(scope),
    () => snapshot(scope),
  );
  usePolling(scope, enabled);
  return enabled ? state.unreadRows : [];
}

export const lastMessage = (conversation) =>
  conversation?.last_message ||
  conversation?.messages?.[conversation.messages.length - 1] || {
    text: "",
    at: conversation?.updated_at || conversation?.updatedAt || new Date().toISOString(),
  };

export async function loadMoreConversations() {
  const scope = currentScope();
  const state = stateFor(scope);
  return loadList(scope, state.view, { append: true });
}

export async function loadOlderMessages(id) {
  const scope = currentScope();
  const state = stateFor(scope);
  const conversation = state.details.get(id) || state.rows.find((row) => row.id === id);
  const cursor = conversation?.messages?.[0]?.id;
  if (!cursor || !conversation?.has_more_messages) return conversation;
  return loadDetail(scope, id, { before: cursor });
}

export async function sendMessage(id, { text = "", image = "" } = {}) {
  const scope = currentScope();
  const state = stateFor(scope);
  const previous = state.details.get(id) || state.rows.find((row) => row.id === id) || {
    id, messages: [], unread: 0,
  };
  // Render immediately; replace the temporary row with the server-confirmed
  // message once the POST completes. A failed POST removes only this draft.
  const optimisticId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const optimistic = {
    id: optimisticId, from: "me", sender_type: scope,
    text: text.trim(), image, at: new Date().toISOString(), pending: true,
  };
  mergeConversation(scope, {
    ...previous, id, unread: 0, messages: [optimistic],
    last_message: { ...optimistic, from: "me" },
  }, "append");
  try {
    const message = await messagingApi.send(id, { text: text.trim(), image });
    const latest = state.details.get(id) || state.rows.find((row) => row.id === id) || previous;
    mergeConversation(scope, {
      ...latest,
      messages: [
        ...(latest.messages || []).filter((item) => item.id !== optimisticId),
        message,
      ],
      last_message: {
        id: message.id, text: message.text, image: message.image,
        at: message.at, from: "me",
      },
    }, "replace");
    return message;
  } catch (error) {
    const latest = state.details.get(id) || state.rows.find((row) => row.id === id) || previous;
    mergeConversation(scope, {
      ...latest,
      messages: (latest.messages || []).filter((item) => item.id !== optimisticId),
    }, "replace");
    throw error;
  }
}

function updateUnread(scope, id, value) {
  const state = stateFor(scope);
  const previous = state.rows.find((row) => row.id === id)?.unread ??
    state.details.get(id)?.unread ?? 0;
  const change = (row) => row.id === id ? { ...row, unread: value } : row;
  state.rows = state.rows.map(change);
  const detail = state.details.get(id);
  if (detail) state.details.set(id, { ...detail, unread: value });
  if (value > 0) {
    const row = state.rows.find((item) => item.id === id) || detail;
    if (row) {
      const unreadIndex = state.unreadRows.findIndex((item) => item.id === id);
      state.unreadRows = unreadIndex >= 0
        ? state.unreadRows.map((item) => item.id === id ? { ...item, unread: value } : item)
        : sortRows([row, ...state.unreadRows]);
    }
  } else {
    state.unreadRows = state.unreadRows.filter((item) => item.id !== id);
  }
  state.unreadCount = Math.max(0, state.unreadCount - Number(previous || 0) + Number(value || 0));
  state.counts = {
    ...state.counts,
    unread: Math.max(0, Number(state.counts.unread || 0) - (previous ? 1 : 0) + (value ? 1 : 0)),
  };
  emit(state);
}

export async function markConversationRead(id, scope = currentScope()) {
  const response = await messagingApi.read(id);
  updateUnread(scope, id, Number(response?.data?.conversation?.unread || 0));
}

export async function markConversationUnread(id, scope = currentScope()) {
  const response = await messagingApi.unread(id);
  updateUnread(scope, id, Number(response?.data?.conversation?.unread || 0));
}

export async function deleteConversation(id) {
  const scope = currentScope();
  await messagingApi.archive(id);
  const state = stateFor(scope);
  state.rows = state.rows.filter((row) => row.id !== id);
  state.details.delete(id);
  emit(state);
}

export async function startConversation({ key, kind, name, subtitle, image = "", context = null }) {
  const [role, raw = ""] = String(key || "").split(":");
  const targetType = role === "seller" ? "user" : role;
  const targetId = raw.replace(/^(user|remaker|admin)-/, "");
  if (!["user", "remaker", "admin"].includes(targetType) || !targetId) {
    throw new Error("Choose a valid recipient.");
  }
  const conversation = await messagingApi.start({
    target_type: targetType,
    target_id: targetId,
    kind: kind || targetType,
    subject: name || "",
    context: context || {},
    display: { name, subtitle, image },
  });
  mergeConversation(currentScope(), conversation);
  return conversation.id;
}

export async function resetMessages() {
  const scope = currentScope();
  const state = stateFor(scope);
  state.loaded = false;
  state.serverTime = null;
  return loadList(scope, state.view);
}

export async function refreshMessages() {
  return refresh(currentScope());
}

function clearMessages() {
  states.forEach((state) => {
    state.rows = [];
    state.unreadRows = [];
    state.details.clear();
    state.loaded = false;
    state.unreadCount = 0;
    state.error = "";
    emit(state);
  });
}

if (typeof window !== "undefined") {
  window.addEventListener(SESSION_ENDED_EVENT, clearMessages);
}

export function clockLabel(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric", minute: "2-digit", hour12: true,
  }).toLowerCase();
}

const startToday = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

export function listTime(iso) {
  const date = new Date(iso);
  if (date.getTime() >= startToday()) return clockLabel(iso);
  if (date.getTime() >= startToday() - 86400000) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function dayLabel(iso) {
  const date = new Date(iso);
  if (date.getTime() >= startToday()) return "Today";
  if (date.getTime() >= startToday() - 86400000) return "Yesterday";
  return date.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });
}
