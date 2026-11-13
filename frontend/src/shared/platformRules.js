/* =========================================================
   Shared › Platform rules (live from the server).
   The money rules and limits the admin sets in Settings: platform fee, delivery,
   free-delivery limit, pay on delivery, listings per day, minimum donation size,
   support email, maintenance mode.

   Every app (User, ReMaker, Admin) reads them from here, so a change an admin
   saves shows up for everyone: on the next focus of the tab, within a few minutes,
   or immediately in the admin's own tab. The SERVER still prices every order
   itself; these values are only what the screens show and pre-check.
   ========================================================= */
import { useEffect, useSyncExternalStore } from "react";

import { fetchRules } from "../api/platform";

/* Used until the first answer arrives, or if the server can't be reached. */
export const DEFAULT_RULES = {
  platformFeePct: 3,
  itemDelivery: 149,
  productDelivery: 79,
  freeDeliveryFrom: 1500,
  sellDelivery: 149,
  sellFreeFrom: 5000,
  codEnabled: true,
  codLimit: 20000,
  maxListingsPerDay: 5,
  minDonationItems: 1,
  supportEmail: "support@reorbit.in",
  unsoldDays: 7,
  maintenance: false,
};

const REFRESH_MS = 5 * 60 * 1000;
const FOCUS_GAP_MS = 30 * 1000;

let state = { rules: DEFAULT_RULES, loaded: false, error: "" };
let lastFetch = 0;
let inFlight = null;
let started = false;
const listeners = new Set();

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = () => state;
const emit = () => listeners.forEach((listener) => listener());

function sameRules(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/* Accepts the server's answer (or the admin's just-saved values). */
export function setRules(next) {
  const rules = { ...DEFAULT_RULES, ...(next || {}) };

  if (state.loaded && sameRules(rules, state.rules)) return;

  state = { rules, loaded: true, error: "" };
  emit();
}

export function refreshRules({ force = false } = {}) {
  if (inFlight) return inFlight;
  if (!force && Date.now() - lastFetch < FOCUS_GAP_MS) return Promise.resolve();

  lastFetch = Date.now();
  inFlight = fetchRules()
    .then((rules) => setRules(rules))
    .catch((error) => {
      /* keep the last good values; try again on the next focus */
      state = { ...state, error: error.message || "Couldn't load the latest rules." };
      emit();
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  refreshRules({ force: true });

  window.addEventListener("focus", () => refreshRules());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshRules();
  });
  window.setInterval(() => refreshRules({ force: true }), REFRESH_MS);
}

/* Non-React callers (price helpers): the current values. */
export function getRules() {
  start();
  return state.rules;
}

/* React: re-renders when the rules change. */
export function useRules() {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);

  useEffect(start, []);

  return current.rules;
}

export function useRulesStatus() {
  const { loaded, error } = useSyncExternalStore(subscribe, snapshot, snapshot);

  useEffect(start, []);

  return { loaded, error, retry: () => refreshRules({ force: true }) };
}

start();
