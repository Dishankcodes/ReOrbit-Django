import { useEffect, useMemo, useSyncExternalStore } from "react";
import { messagingApi } from "../api/messaging";
import {
  getAccountType,
  isSignedIn,
  SESSION_ENDED_EVENT,
} from "../api/session";
import { isActive, onActive } from "./activity";

/* The chips filter by who is on the other end of the chat, from the viewer's side.
   The keys match the backend's `kind` filter and the counts it returns. */
export const USER_KINDS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "user", label: "Users" },
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

export const ADMIN_KINDS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "customer", label: "Customers" },
  { key: "remaker", label: "ReMakers" },
];

/* Name shown under each chat in the sidebar and in the chat header */
export const ROLE_LABELS = {
  user: "User",
  customer: "Customer",
  remaker: "ReMaker",
  reorbit: "ReOrbit Support",
  support: "Support",
};

export const QUICK_REPLIES = {
  user: [
    "Is this still available?",
    "Can you share one more photo of the condition?",
    "Is the price negotiable?",
    "Can you deliver to my pincode?",
  ],
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

/* How often to check for new messages.
   - Messages screen open: every 4 seconds, slowing to every 15 seconds after a quiet minute
     (no new messages); a new message, sending one, or coming back to the tab makes it fast again.
   - Anywhere else (only the unread badge in the sidebar): every 30 seconds.
   - Tab hidden: no checks at all; one check the moment you come back. */
const LIVE_MS = 4000;
const LIVE_IDLE_MS = 15000;
const QUIET_POLLS_BEFORE_SLOWING = 15; // 15 x 4s = a quiet minute
const BADGE_MS = 30000;
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
  detailErrors: new Map(),
  prefetching: new Set(),
  warmed: false,
  quietPolls: 0,
  version: 0,
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
/* React only re-renders when the snapshot VALUE changes. The state object is
   mutated in place, so its identity never changes; a number that goes up on
   every emit is what tells React something new is there. */
const snapshot = (scope) => stateFor(scope).version;
const emit = (state) => {
  state.version += 1;
  state.listeners.forEach((listener) => listener());
};
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
  all.forEach((message) => {
    const known = unique.get(String(message.id));
    unique.set(String(message.id), known?.image && !message.image ? { ...message, image: known.image } : message);
  });
  return [...unique.values()].sort((a, b) => {
    const byDate = new Date(a.at).getTime() - new Date(b.at).getTime();
    return byDate || messageId(a) - messageId(b);
  });
}

const isPending = (message) => String(message?.id || "").startsWith("pending-");

/* Newest message a row knows about. A message still being sent counts as newest. */
function lastKey(row) {
  const id = row?.last_message?.id;
  if (isPending({ id })) return Infinity;
  const value = Number(id);
  return Number.isFinite(value) ? value : 0;
}

/* Last message the server has confirmed (never an unsent one). */
function lastConfirmedId(conversation) {
  const list = conversation?.messages || [];
  for (let index = list.length - 1; index >= 0; index -= 1) {
    if (!isPending(list[index])) return messageId(list[index]);
  }
  return 0;
}

/* A poll answer can be older than what this tab already knows (a message sent
   while that request was in flight). Never let it roll the sidebar back. */
function keepNewer(local, incoming) {
  if (local && lastKey(local) > lastKey(incoming)) {
    return { ...incoming, last_message: local.last_message, updated_at: local.updated_at };
  }
  return incoming;
}

function attachCachedDetail(state, row) {
  const cached = state.details.get(row.id);
  if (!cached) return row;
  return keepNewer(cached, {
    ...cached,
    ...row,
    messages: cached.messages || [],
    messages_loaded: cached.messages_loaded,
    has_more_messages: cached.has_more_messages,
    older_cursor: cached.older_cursor,
  });
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

function mergeConversation(scope, conversation, mode = "replace", { ensureRow = false, trust = false } = {}) {
  const state = stateFor(scope);
  const previous = state.details.get(conversation.id) ||
    state.rows.find((row) => row.id === conversation.id) || {};
  const merged = {
    ...previous,
    ...conversation,
    messages_loaded: Boolean(previous.messages_loaded || conversation.messages_loaded),
    has_more_messages: mode === "append"
      ? Boolean(previous.has_more_messages || conversation.has_more_messages)
      : conversation.has_more_messages,
    messages: mergeMessages(previous.messages || [], conversation.messages || [], mode),
  };
  /* `trust` is for our own send result, which is the truth even though an
     unsent copy of the message is still in the row. */
  const detail = trust ? merged : keepNewer(previous, merged);
  state.details.set(detail.id, detail);
  const index = state.rows.findIndex((row) => row.id === detail.id);
  if (index >= 0) {
    const next = [...state.rows];
    next[index] = { ...next[index], ...detail };
    state.rows = sortRows(next);
  } else if (ensureRow || state.activeId === detail.id) {
    /* A chat you just started or wrote in belongs in the sidebar straight away. */
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
      if (version !== state.requestVersion) return state.rows;
      const incoming = page.conversations || [];
      if (poll && state.serverTime) {
        const changed = incoming.length > 0 || (page.removed || []).length > 0;
        state.quietPolls = changed ? 0 : state.quietPolls + 1;
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
      if (!state.warmed && !poll && !append && !nextView.query && nextView.filter === "all") {
        /* Load the top chats in the background so opening one is instant. */
        state.warmed = true;
        window.setTimeout(() => {
          state.rows.slice(0, 4).forEach((row) => prefetchConversation(row.id, scope));
        }, 200);
      }
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

async function loadDetail(scope, id, { before = null, after = null, silent = false } = {}) {
  const state = stateFor(scope);
  if (!id || !isSignedIn(scope)) return null;
  const requestKey = `${id}:${before || ""}:${after || ""}${silent ? ":quiet" : ""}`;
  if (state.detailLoading.has(requestKey)) return null;
  state.detailLoading = new Set(state.detailLoading).add(requestKey);
  if (!silent) {
    state.error = "";
    emit(state);
  }
  try {
    const query = before ? { before } : after ? { after } : {};
    const conversation = await messagingApi.get(id, query);
    const mode = before ? "prepend" : after ? "append" : "replace";
    state.detailErrors.delete(id);
    return mergeConversation(scope, { ...conversation, messages_loaded: true }, mode);
  } catch (error) {
    if (!silent) {
      state.detailErrors.set(id, error);
      state.error = error.message || "This conversation could not be loaded.";
      emit(state);
    }
    throw error;
  } finally {
    const pending = new Set(state.detailLoading);
    pending.delete(requestKey);
    state.detailLoading = pending;
    emit(state);
  }
}

/* Start loading a chat before it is opened (hover, focus, first screenful). */
export function prefetchConversation(id, scope = currentScope()) {
  const state = stateFor(scope);
  if (!id || !isSignedIn(scope)) return;
  if (state.details.get(id)?.messages_loaded || state.prefetching.has(id)) return;
  state.prefetching.add(id);
  loadDetail(scope, id, { silent: true })
    .catch(() => {})
    .finally(() => state.prefetching.delete(id));
}

async function refresh(scope) {
  const state = stateFor(scope);
  if (!isActive() || !isSignedIn(scope)) return; // hidden or untouched tab: no calls
  if (!state.loaded) {
    await loadList(scope, state.view).catch(() => {});
    return;
  }
  await loadList(scope, state.view, { poll: true }).catch(() => {});
  const activeId = state.activeId;
  if (!activeId) return;
  const conversation = state.details.get(activeId) || state.rows.find((row) => row.id === activeId);
  if (!conversation?.messages_loaded) return;
  const currentId = lastConfirmedId(conversation);
  const wasUnread = Number(conversation?.unread) > 0;
  try {
    const updated = await loadDetail(scope, activeId, { after: currentId || null, silent: true });
    if (updated?.messages?.length && wasUnread && isVisible()) {
      await markConversationRead(activeId, scope).catch(() => {});
    }
  } catch {
    // Keep the cached conversation and retry during the next visible poll.
  }
}

function nextDelay(scope, entry) {
  if (entry.live > 0) {
    return stateFor(scope).quietPolls >= QUIET_POLLS_BEFORE_SLOWING ? LIVE_IDLE_MS : LIVE_MS;
  }
  return BADGE_MS;
}

function schedule(scope, entry) {
  if (entry.timer) window.clearTimeout(entry.timer);
  entry.timer = window.setTimeout(async () => {
    entry.timer = null;
    await refresh(scope).catch(() => {});
    if (entry.refs > 0) schedule(scope, entry);
  }, nextDelay(scope, entry));
}

/* `live` = the Messages screen (needs to feel instant); otherwise only the sidebar badge. */
function usePolling(scope, enabled = true, live = false) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    const state = stateFor(scope);
    if (!state.loaded) loadList(scope, state.view).catch(() => {});
    let entry = pollers.get(scope);
    if (!entry) {
      entry = { refs: 0, live: 0, timer: null };
      pollers.set(scope, entry);
    }
    entry.refs += 1;
    if (live) {
      entry.live += 1;
      state.quietPolls = 0;
    }
    schedule(scope, entry); // (re)start at the right speed for what is on screen now
    return () => {
      entry.refs -= 1;
      if (live) entry.live = Math.max(0, entry.live - 1);
      if (entry.refs <= 0) {
        if (entry.timer) window.clearTimeout(entry.timer);
        entry.timer = null;
        entry.refs = 0;
        entry.live = 0;
      } else {
        schedule(scope, entry);
      }
    };
  }, [scope, enabled, live]);
}

export function useConversations(query = "", filter = "all") {
  const scope = currentScope();
  useSyncExternalStore(
    (listener) => subscribe(scope, listener),
    () => snapshot(scope),
    () => snapshot(scope),
  );
  const state = stateFor(scope);
  usePolling(scope, true, true);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadList(scope, { query, filter }).catch(() => {});
    }, query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [scope, query, filter]);
  return useMemo(() => state.rows, [state.rows]);
}

export function useConversation(id) {
  return useConversationState(id).conversation;
}

/* The open chat plus what is happening to it: "loading", "ready", "missing" or "error".
   "missing" is only reported after the server really said so, never while loading. */
export function useConversationState(id) {
  const scope = currentScope();
  useSyncExternalStore(
    (listener) => subscribe(scope, listener),
    () => snapshot(scope),
    () => snapshot(scope),
  );
  const state = stateFor(scope);
  usePolling(scope, true, true);
  useEffect(() => {
    state.activeId = id || null;
    if (id) {
      state.detailErrors.delete(id);
      if (!state.details.get(id)?.messages_loaded) loadDetail(scope, id).catch(() => {});
    }
    emit(state);
    return () => {
      if (state.activeId === id) state.activeId = null;
    };
  }, [scope, id]);
  const conversation = id
    ? state.details.get(id) || state.rows.find((row) => row.id === id) || null
    : null;
  const failure = id ? state.detailErrors.get(id) : null;
  let status = "loading";
  if (conversation?.messages_loaded) status = "ready";
  else if (failure) status = failure.status === 404 ? "missing" : "error";
  return {
    conversation,
    status,
    error: failure?.message || "",
    retry: () => loadDetail(scope, id).catch(() => {}),
  };
}

export function useMessageStatus(id = null) {
  const scope = currentScope();
  useSyncExternalStore(
    (listener) => subscribe(scope, listener),
    () => snapshot(scope),
    () => snapshot(scope),
  );
  const state = stateFor(scope);
  const isLoadingDetail = [...state.detailLoading].some((key) => key.startsWith(`${id}:`));
  return {
    loading: state.loading || isLoadingDetail,
    listLoading: !state.loaded && state.loading,
    loaded: state.loaded,
    error: state.error,
    hasMore: state.hasMore,
    loadingOlder: [...state.detailLoading].some((key) => key.startsWith(`${id}:`)),
    loadingMore: state.loadingMore,
  };
}

export function useConversationCounts() {
  const scope = currentScope();
  useSyncExternalStore(
    (listener) => subscribe(scope, listener),
    () => snapshot(scope),
    () => snapshot(scope),
  );
  const state = stateFor(scope);
  usePolling(scope, true, true);
  return state.counts;
}

export function useTotalUnread(enabled = true) {
  const scope = currentScope();
  useSyncExternalStore(
    (listener) => subscribe(scope, listener),
    () => snapshot(scope),
    () => snapshot(scope),
  );
  const state = stateFor(scope);
  usePolling(scope, enabled);
  return enabled ? state.unreadCount || state.rows.reduce((total, row) => total + Number(row.unread || 0), 0) : 0;
}

export function useUnreadConversations(enabled = true) {
  const scope = currentScope();
  useSyncExternalStore(
    (listener) => subscribe(scope, listener),
    () => snapshot(scope),
    () => snapshot(scope),
  );
  const state = stateFor(scope);
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
  state.quietPolls = 0; // a conversation is happening: check for the reply at full speed
  const previous = state.details.get(id) || state.rows.find((row) => row.id === id) || {
    id, messages: [], unread: 0,
  };

  // Show the message immediately while the server request is in flight.
  const optimisticId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const optimistic = {
    id: optimisticId,
    from: "me",
    sender_type: scope,
    text: text.trim(),
    image,
    at: new Date().toISOString(),
    pending: true,
  };
  mergeConversation(scope, {
    ...previous,
    id,
    unread: 0,
    messages: [optimistic],
    last_message: {
      id: optimisticId,
      text: optimistic.text,
      image,
      at: optimistic.at,
      from: "me",
    },
    updated_at: optimistic.at,
  }, "append", { ensureRow: true });

  try {
    const message = await messagingApi.send(id, { text: text.trim(), image });
    const latest = state.details.get(id) || state.rows.find((row) => row.id === id) || previous;
    const confirmedHistory = (latest.messages || [])
      .filter((item) => String(item.id) !== String(optimisticId));
    const merged = mergeConversation(scope, {
      ...latest,
      id,
      unread: 0,
      messages: [...confirmedHistory, message],
      last_message: {
        id: message.id,
        text: message.text,
        image: message.image,
        at: message.at,
        from: "me",
      },
      updated_at: message.at || new Date().toISOString(),
    }, "replace", { ensureRow: true, trust: true });
    return merged.messages.find((item) => String(item.id) === String(message.id)) || message;
  } catch (error) {
    const latest = state.details.get(id) || state.rows.find((row) => row.id === id) || previous;
    const remaining = (latest.messages || [])
      .filter((item) => String(item.id) !== String(optimisticId));
    const last = remaining[remaining.length - 1];
    mergeConversation(scope, {
      ...latest,
      id,
      messages: remaining,
      last_message: last
        ? { id: last.id, text: last.text, image: last.image, has_image: last.has_image, at: last.at, from: last.from }
        : previous.last_message || null,
    }, "replace", { trust: true });
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
  const toSupport = ["reorbit", "admin", "support"].includes(role);
  const targetType = toSupport ? "admin" : role === "seller" || role === "buyer" || role === "customer" ? "user" : role;
  const targetId = toSupport ? "support" : raw.replace(/^(user|remaker|admin)-/, "");
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
  mergeConversation(currentScope(), { ...conversation, messages_loaded: true }, "replace", { ensureRow: true });
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
    state.detailErrors.clear();
    state.prefetching.clear();
    state.warmed = false;
    state.loaded = false;
    state.unreadCount = 0;
    state.error = "";
    emit(state);
  });
}

if (typeof window !== "undefined") {
  window.addEventListener(SESSION_ENDED_EVENT, clearMessages);
  /* back on the tab (or back online): check once now, at full speed again */
  const catchUp = () => {
    if (!isVisible()) return;
    pollers.forEach((entry, scope) => {
      stateFor(scope).quietPolls = 0;
      refresh(scope).catch(() => {});
      if (entry.refs > 0) schedule(scope, entry);
    });
  };
  document.addEventListener("visibilitychange", catchUp);
  window.addEventListener("online", catchUp);
  onActive(catchUp);
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
