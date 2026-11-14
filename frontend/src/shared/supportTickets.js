import { useEffect, useMemo, useSyncExternalStore } from "react";
import { supportApi } from "../api/social";
import { getAccountType, isSignedIn, SESSION_ENDED_EVENT } from "../api/session";

const PAGE_SIZE = 50;
const POLL_MS = 15000;

const createState = () => ({
  tickets: [],
  details: new Map(),
  listeners: new Set(),
  loading: false,
  loadingMore: false,
  detailLoading: new Set(),
  error: "",
  loaded: false,
  hasMore: false,
  nextOffset: null,
  total: 0,
  counts: {},
  filters: {},
  request: null,
  requestKey: "",
  version: 0,
});

const states = new Map();
const pollers = new Map();
const stateKey = (scope, filters = {}) => `${scope}|${JSON.stringify(filters || {})}`;
const stateFor = (scope, filters = {}) => {
  const key = stateKey(scope, filters);
  if (!states.has(key)) states.set(key, createState());
  return states.get(key);
};
const subscribe = (scope, listener, filters = {}) => {
  const state = stateFor(scope, filters);
  state.listeners.add(listener);
  return () => state.listeners.delete(listener);
};
const snapshot = (scope, filters = {}) => stateFor(scope, filters);
const emit = (state) => state.listeners.forEach((listener) => listener());
const signedInFor = (scope) => isSignedIn(scope);

function normalizeMessage(message, scope) {
  const sender = message.senderType || message.from;
  if (scope === "user") {
    return {
      ...message,
      from: sender === "user" ? "user" : "team",
      name: sender === "user" ? "You" : message.senderName || "ReOrbit Support",
    };
  }
  if (scope === "remaker") {
    return {
      ...message,
      from: sender === "remaker" ? "me" : "support",
      name: sender === "remaker" ? "You" : message.senderName || "ReOrbit Support",
    };
  }
  return {
    ...message,
    from: sender === "admin" || sender === "team" ? "team" : "member",
    name: message.senderName || (sender === "admin" || sender === "team" ? "ReOrbit Support" : "Member"),
  };
}

function normalizeTicket(ticket, scope) {
  const requesterType = ticket.requester?.type || (scope === "admin" ? "user" : scope);
  return {
    ...ticket,
    id: String(ticket.id),
    orderId: ticket.orderId || "",
    relatedOrder: ticket.orderId || "",
    source: requesterType === "remaker" ? "ReMaker" : "User",
    photos: [], // The existing base64 photo upload is deferred; ticket text/status/replies are persisted.
    messages: Array.isArray(ticket.messages)
      ? ticket.messages.map((message) => normalizeMessage(message, scope))
      : [],
    messagesLoaded: ticket.messagesLoaded ?? Array.isArray(ticket.messages),
  };
}

function sortTickets(tickets) {
  return [...tickets].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function mergeTicket(scope, rawTicket, { keepMessages = true } = {}) {
  const prefix = `${scope}|`;
  const targets = [...states.entries()]
    .filter(([key]) => key.startsWith(prefix))
    .map(([, state]) => state);
  if (!targets.includes(stateFor(scope))) targets.push(stateFor(scope));
  let result = null;
  targets.forEach((state) => {
    const ticket = normalizeTicket(rawTicket, scope);
    const prior = state.details.get(ticket.id) || state.tickets.find((item) => item.id === ticket.id);
    if (keepMessages && prior?.messagesLoaded && !ticket.messagesLoaded) {
      ticket.messages = prior.messages;
      ticket.messagesLoaded = true;
    }
    if (ticket.messagesLoaded) state.details.set(ticket.id, ticket);
    const index = state.tickets.findIndex((item) => item.id === ticket.id);
    const stateKeyForView = [...states.entries()].find(([, candidate]) => candidate === state)?.[0] || prefix;
    const filters = JSON.parse(stateKeyForView.slice(prefix.length) || "{}");
    const hasListFilters = Boolean(
      filters.query || (filters.status && filters.status !== "All") ||
      (filters.priority && filters.priority !== "all") ||
      (filters.source && filters.source !== "all"),
    );
    const statusMatches = !filters.status || filters.status === "All" ||
      (filters.status === "Waiting" ? ticket.status === "Waiting for you" :
        filters.status === "Resolved" ? ["Resolved", "Closed"].includes(ticket.status) :
          ticket.status === filters.status);
    const queryMatches = !filters.query || index >= 0 ||
      `${ticket.id} ${ticket.subject} ${ticket.category} ${ticket.orderId} ${ticket.requester?.name || ""}`
        .toLowerCase().includes(String(filters.query).toLowerCase());
    const matches = statusMatches && queryMatches &&
      (!filters.priority || filters.priority === "all" || ticket.priority === filters.priority) &&
      (!filters.source || filters.source === "all" || ticket.source === filters.source);
    if (!matches && index >= 0) {
      state.tickets = state.tickets.filter((item) => item.id !== ticket.id);
    } else if (matches && index >= 0) {
      const rows = [...state.tickets];
      rows[index] = { ...rows[index], ...ticket };
      state.tickets = sortTickets(rows);
    } else if (matches && !hasListFilters) {
      state.tickets = sortTickets([ticket, ...state.tickets]);
    }
    emit(state);
    result = ticket;
  });
  return result;
}

async function refreshLoadedLists(scope) {
  const prefix = `${scope}|`;
  const requests = [...states.entries()]
    .filter(([key, state]) => key.startsWith(prefix) && state.loaded)
    .map(([key]) => loadTickets(scope, JSON.parse(key.slice(prefix.length) || "{}"), { silent: true }));
  await Promise.allSettled(requests);
}

function listParams(scope, filters, offset) {
  if (scope !== "admin") return {};
  return {
    q: filters.query || "",
    status: filters.status && filters.status !== "All" ? filters.status : "",
    priority: filters.priority && filters.priority !== "all" ? filters.priority : "",
    requester: filters.source && filters.source !== "all"
      ? filters.source === "ReMaker" ? "remaker" : "user"
      : "",
    limit: PAGE_SIZE,
    offset,
  };
}

async function loadTickets(scope, filters = {}, { append = false, silent = false } = {}) {
  const state = stateFor(scope, filters);
  if (!signedInFor(scope)) return [];
  const currentFilters = filters || state.filters;
  const offset = append ? state.nextOffset : 0;
  if (append && offset === null) return state.tickets;
  const key = `${scope}|${JSON.stringify(currentFilters)}|${offset}`;
  if (state.request && state.requestKey === key) return state.request;

  const version = ++state.version;
  state.filters = currentFilters;
  if (!silent) {
    state.loading = !append;
    state.loadingMore = append;
    state.error = "";
    emit(state);
  }
  const request = (scope === "admin"
    ? supportApi.adminList(listParams(scope, currentFilters, offset || 0))
    : supportApi.list()
  ).then((response) => {
    if (version !== state.version) return state.tickets;
    const page = scope === "admin" ? response : { tickets: response, total: response.length };
    const incoming = (page.tickets || []).map((ticket) => normalizeTicket(ticket, scope));
    const byId = new Map((append ? state.tickets : []).map((ticket) => [ticket.id, ticket]));
    incoming.forEach((ticket) => {
      const cached = state.details.get(ticket.id);
      byId.set(ticket.id, cached ? { ...ticket, messages: cached.messages, messagesLoaded: true } : ticket);
    });
    state.tickets = sortTickets([...byId.values()]);
    state.total = Number(page.total ?? state.tickets.length);
    state.counts = page.counts || state.counts;
    state.nextOffset = page.next_offset ?? null;
    state.hasMore = Boolean(page.has_more);
    state.loaded = true;
    state.error = "";
    emit(state);
    return state.tickets;
  }).catch((error) => {
    if (!silent) state.error = error.message || "Support tickets could not be loaded.";
    emit(state);
    throw error;
  }).finally(() => {
    if (version === state.version) {
      state.loading = false;
      state.loadingMore = false;
      state.request = null;
      state.requestKey = "";
      emit(state);
    }
  });
  state.request = request;
  state.requestKey = key;
  return request;
}

async function loadTicket(scope, id, { force = false } = {}) {
  const state = stateFor(scope);
  if (!id || !signedInFor(scope) || (!force && state.details.has(id))) return state.details.get(id) || null;
  if (state.detailLoading.has(id)) return null;
  state.detailLoading = new Set(state.detailLoading).add(id);
  state.error = "";
  emit(state);
  try {
    const ticket = scope === "admin" ? await supportApi.adminGet(id) : await supportApi.get(id);
    return mergeTicket(scope, ticket);
  } catch (error) {
    state.error = error.message || "This support ticket could not be loaded.";
    emit(state);
    throw error;
  } finally {
    const loading = new Set(state.detailLoading);
    loading.delete(id);
    state.detailLoading = loading;
    emit(state);
  }
}

function usePolling(scope, filters, enabled = true) {
  const filterKey = JSON.stringify(filters || {});
  useEffect(() => {
    if (!enabled) return undefined;
    const state = stateFor(scope, filters);
    if (!state.loaded && scope !== "admin") loadTickets(scope, filters).catch(() => {});
    const key = `${scope}:${filterKey}`;
    let entry = pollers.get(key);
    if (!entry) {
      entry = { refs: 0, timer: null, filters };
      pollers.set(key, entry);
    }
    entry.refs += 1;
    entry.filters = filters;
    if (!entry.timer) {
      entry.timer = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          loadTickets(scope, entry.filters, { silent: true }).catch(() => {});
        }
      }, POLL_MS);
    }
    const visible = () => document.visibilityState === "visible" &&
      loadTickets(scope, entry.filters, { silent: true }).catch(() => {});
    document.addEventListener("visibilitychange", visible);
    return () => {
      entry.refs -= 1;
      if (entry.refs <= 0 && entry.timer) {
        window.clearInterval(entry.timer);
        entry.timer = null;
        pollers.delete(key);
      }
      document.removeEventListener("visibilitychange", visible);
    };
  }, [scope, filterKey, enabled]);
}

export function useSupportTickets(scope = "user", filters = {}, enabled = true) {
  const state = useSyncExternalStore(
    (listener) => subscribe(scope, listener, filters),
    () => snapshot(scope, filters),
    () => snapshot(scope, filters),
  );
  usePolling(scope, filters, enabled);
  const filterKey = JSON.stringify(filters || {});
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = window.setTimeout(() => {
      loadTickets(scope, filters).catch(() => {});
    }, filters?.query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [scope, filterKey, enabled]);
  return useMemo(() => state.tickets, [state.tickets]);
}

export function useSupportTicketDetail(scope, id) {
  const state = useSyncExternalStore(
    (listener) => subscribe(scope, listener),
    () => snapshot(scope),
    () => snapshot(scope),
  );
  useEffect(() => {
    if (id && !state.details.has(id)) loadTicket(scope, id).catch(() => {});
    if (!id) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadTicket(scope, id, { force: true }).catch(() => {});
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [scope, id]);
  return state.details.get(id) || state.tickets.find((ticket) => ticket.id === id) || null;
}

export function useSupportTicket(scope, id) {
  const tickets = useSupportTickets(scope);
  const detail = useSupportTicketDetail(scope, id);
  return detail || tickets.find((ticket) => ticket.id === id) || null;
}

export function useSupportStatus(scope, id = null, filters = {}) {
  const state = useSyncExternalStore(
    (listener) => subscribe(scope, listener, filters),
    () => snapshot(scope, filters),
    () => snapshot(scope, filters),
  );
  return {
    loading: state.loading || Boolean(id && state.detailLoading.has(id)),
    error: state.error,
    hasMore: state.hasMore,
    loadingMore: state.loadingMore,
    total: state.total,
    counts: state.counts,
  };
}

export async function createSupportTicket(scope, payload) {
  const body = {
    subject: payload.subject,
    category: payload.category,
    message: payload.message || payload.description,
    orderId: payload.orderId || payload.relatedOrder || "",
    priority: payload.priority || "Normal",
  };
  const ticket = await supportApi.create(body);
  const normalized = mergeTicket(scope, ticket);
  const state = stateFor(scope);
  state.total += 1;
  await refreshLoadedLists(scope);
  return normalized;
}

export async function replyToSupportTicket(scope, id, message, status = "") {
  const trimmed = String(message || "").trim();
  if (!trimmed || trimmed.length > 4000) throw new Error("Enter a reply of up to 4,000 characters.");
  const body = { message: trimmed };
  const ticket = scope === "admin"
    ? await supportApi.adminAction(id, { action: "reply", message: trimmed, status })
    : await supportApi.reply(id, body);
  const normalized = mergeTicket(scope, ticket);
  await refreshLoadedLists(scope);
  return normalized;
}

const ADMIN_STATUS_ACTION = {
  Open: "reopen",
  "In progress": "in_progress",
  "Waiting for you": "waiting",
  Resolved: "resolve",
  Closed: "close",
};

export async function setSupportTicketStatus(scope, id, status) {
  let ticket;
  if (scope === "admin") {
    const action = ADMIN_STATUS_ACTION[status];
    if (!action) throw new Error("Unsupported ticket status.");
    ticket = await supportApi.adminAction(id, { action });
  } else if (scope === "user") {
    if (status !== "Resolved") throw new Error("Unsupported ticket status.");
    ticket = await supportApi.reply(id, { action: "close" });
  } else {
    if (status === "Closed") {
      ticket = await supportApi.reply(id, { action: "close", status: "Closed" });
    } else if (status === "Resolved") {
      ticket = await supportApi.reply(id, { action: "close" });
    } else if (status === "Open") {
      ticket = await supportApi.reply(id, { action: "reopen" });
    } else {
      throw new Error("Unsupported ticket status.");
    }
  }
  const normalized = mergeTicket(scope, ticket);
  await refreshLoadedLists(scope);
  return normalized;
}

export async function loadMoreSupportTickets(scope = "admin", filters = null) {
  const state = stateFor(scope, filters || {});
  return loadTickets(scope, filters || state.filters, { append: true });
}

export async function refreshSupportTickets(scope = "user") {
  const state = stateFor(scope);
  return loadTickets(scope, state.filters);
}

export function resetSupportTickets(scope = "user") {
  states.forEach((state, key) => {
    if (!key.startsWith(`${scope}|`)) return;
    state.tickets = [];
    state.details.clear();
    state.loaded = false;
    state.error = "";
    emit(state);
  });
}

function clear() {
  states.forEach((state) => {
    state.tickets = [];
    state.details.clear();
    state.loaded = false;
    state.error = "";
    emit(state);
  });
}

if (typeof window !== "undefined") window.addEventListener(SESSION_ENDED_EVENT, clear);
