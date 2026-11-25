/* Super Admin pause switches (Admin › System), as this tab sees them.

   - One small check when the app opens (GET /core/status/, no sign-in needed).
   - Any API answer 503 {code: "PAUSED"} also updates it straight away.
   - While this tab's side is paused, apiRequest() doesn't call the server at all (see api/api.js),
     so a paused side costs nothing. The PauseGate screen offers "Check again"; it also re-checks by
     itself every few minutes, but only while someone is actually looking at the tab. */
import { useSyncExternalStore } from "react";

import { getAccount, portalOf } from "../api/session";
import { isActive, onActive } from "./activity";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
const RECHECK_MS = 3 * 60 * 1000;

let state = { paused: { user: false, remaker: false, admin: false }, messages: {}, checked: false, checking: false };
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/* paths that must keep working whatever is paused (same list as the server's ALWAYS_OPEN) */
const ALWAYS_OPEN = ["/core/status/", "/auth/token/refresh/", "/auth/logout/", "/admins/auth/"];

const sideNow = () => (typeof window === "undefined" ? "user" : portalOf(window.location.pathname));

function isSuperAdmin() {
  const a = getAccount("admin");
  return a?.permission_level === "Super_Admin";
}

/* Is the side this tab is on paused for the person using it? */
export function pausedHere(pathname) {
  const side = pathname ? portalOf(pathname) : sideNow();
  if (!state.paused[side]) return false;
  if (side === "admin" && isSuperAdmin()) return false;
  return true;
}

/* apiRequest asks this before every call. */
export function blocksRequest(endpoint) {
  if (ALWAYS_OPEN.some((p) => String(endpoint).startsWith(p))) return false;
  return pausedHere();
}

export function applyPaused(paused, messages) {
  if (!paused) return;
  const next = { user: !!paused.user, remaker: !!paused.remaker, admin: !!paused.admin };
  const same = Object.keys(next).every((k) => next[k] === state.paused[k]);
  state = { ...state, paused: next, messages: messages || state.messages, checked: true };
  if (!same) emit();
}

export async function checkPause() {
  if (state.checking) return;
  state = { ...state, checking: true };
  emit();
  try {
    const res = await fetch(`${API_BASE_URL}/core/status/`, { headers: { Accept: "application/json" } });
    const body = await res.json().catch(() => ({}));
    if (body?.data?.paused) applyPaused(body.data.paused, body.data.messages);
  } catch {
    /* offline: keep what we had */
  } finally {
    state = { ...state, checking: false, checked: true };
    emit();
  }
}

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  checkPause();
  /* only a paused tab keeps asking (and only while someone is looking at it) */
  window.setInterval(() => {
    if (isActive() && pausedHere()) checkPause();
  }, RECHECK_MS);
  onActive(() => pausedHere() && checkPause());
}

export function usePause() {
  start();
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function pauseMessage(side) {
  return (
    state.messages?.[side] ||
    (side === "admin"
      ? "The admin panel is paused by a Super Admin. Please check back later."
      : side === "remaker"
        ? "The ReMaker studio is paused for a short while. Please come back a little later."
        : "ReOrbit is paused for a short while. Please come back a little later.")
  );
}
