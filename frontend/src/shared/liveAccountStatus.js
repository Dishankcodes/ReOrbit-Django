/* =========================================================
   Shared › the signed-in member's or ReMaker's real account status.
   Read from the server (/users/me/ or /remakers/me/): on load, every minute, when the tab comes
   back into view, and straight away when any request is refused with ACCOUNT_SUSPENDED /
   ACCOUNT_BLOCKED (an admin changed it while they were signed in).
   ========================================================= */

import { useEffect, useSyncExternalStore } from "react";
import { ACCOUNT_STATUS_EVENT, apiRequest } from "../api/api";

const PATH = { user: "/users/me/", remaker: "/remakers/me/" };
const EVERY_MS = 60 * 1000;

let state = { user: null, remaker: null }; // kind -> { status, reason, at }
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const loading = { user: false, remaker: false };

export async function loadAccountStatus(kind) {
  if (!PATH[kind] || loading[kind]) return;
  loading[kind] = true;
  try {
    const r = await apiRequest(PATH[kind]);
    const a = r?.data?.user || r?.data?.remaker || null;
    if (a) {
      state = {
        ...state,
        [kind]: {
          status: a.status || "Active",
          reason: a.status_reason || "",
          at: a.status_changed_at || a.updated_at || "",
          name: a.full_name || "",
        },
      };
      emit();
      /* reactivated (or never blocked): forget any old "you are blocked" notice */
      if ((a.status || "Active") === "Active") clearBlock();
    }
  } catch {
    /* offline or signed out: keep what we had */
  } finally {
    loading[kind] = false;
  }
}

export function useLiveAccountStatus(kind) {
  const snap = useSyncExternalStore(subscribe, () => state[kind], () => state[kind]);
  useEffect(() => {
    loadAccountStatus(kind);
    const tick = setInterval(() => loadAccountStatus(kind), EVERY_MS);
    const onVisible = () => document.visibilityState === "visible" && loadAccountStatus(kind);
    const onRefused = () => loadAccountStatus(kind);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(ACCOUNT_STATUS_EVENT, onRefused);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(ACCOUNT_STATUS_EVENT, onRefused);
    };
  }, [kind]);
  return snap;
}

/* Kept for the "you are blocked" page after sign-out. */
const BLOCK_KEY = "reorbit_blocked_notice";
export function rememberBlock(notice) {
  try {
    sessionStorage.setItem(BLOCK_KEY, JSON.stringify(notice));
  } catch {
    /* storage blocked */
  }
}
export function clearBlock() {
  try {
    sessionStorage.removeItem(BLOCK_KEY);
  } catch {
    /* storage blocked */
  }
}
export function readBlock() {
  try {
    return JSON.parse(sessionStorage.getItem(BLOCK_KEY) || "null");
  } catch {
    return null;
  }
}

export function resetAccountStatus() {
  state = { user: null, remaker: null };
  emit();
}
