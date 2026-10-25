/* =========================================================
   REMAKER SETTINGS - UI STORE (no backend yet)
   Account, studio, notification, payout and privacy preferences,
   plus blocked people and signed-in devices.

   Passwords are never stored here: the password form is UI only and
   only checks the new password's rules. Saved in localStorage so
   preferences survive a refresh. Swap for API calls later.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";

const KEY = "reorbit_remaker_settings_v1";
const NOW = Date.now();
const ago = (hours) => new Date(NOW - hours * 3600000).toISOString();

function stored() {
  try {
    return JSON.parse(localStorage.getItem("reorbit_remaker") || "null") || {};
  } catch {
    return {};
  }
}

export const NOTIFICATION_ROWS = [
  { key: "orders", label: "New orders and sales updates", note: "When a customer orders, cancels or an order is delivered" },
  { key: "purchases", label: "Your purchases", note: "Tracking and updates on things you bought" },
  { key: "reviews", label: "Reviews", note: "New reviews and replies waiting for you" },
  { key: "followers", label: "Followers", note: "When someone follows you" },
  { key: "payouts", label: "Payouts and earnings", note: "Money that cleared and payouts that were paid" },
  { key: "products", label: "Products", note: "Low stock, approvals and wishlist saves" },
  { key: "system", label: "ReOrbit news and security", note: "New features, sign-in alerts and policy changes" },
];

export const LANGUAGES = [
  { key: "en", label: "English" },
  { key: "hi", label: "Hindi" },
  { key: "gu", label: "Gujarati" },
];

export const TIMEZONES = [
  { key: "Asia/Kolkata", label: "India Standard Time (GMT+5:30)" },
  { key: "Asia/Dubai", label: "Gulf Standard Time (GMT+4)" },
  { key: "Europe/London", label: "London (GMT)" },
];

function defaults() {
  const profile = stored();

  return {
    account: {
      fullName: profile.full_name || profile.fullName || "Nivya S",
      studioName: profile.username || "Messy Mirror",
      email: profile.email || "hello@messymirror.in",
      phone: "98765 43210",
      authProvider: profile.auth_provider || "email",
      language: "en",
      timezone: "Asia/Kolkata",
      twoStep: false,
    },
    studio: {
      profilePublic: true,
      showLocation: true,
      vacation: false,
      vacationUntil: "",
      vacationMessage: "I am away and will ship your order when I am back. Thank you for waiting!",
      offerPickup: true,
      offerDelivery: true,
      handlingDays: 2,
      returnWindow: "7",
      packagingNote: "Every piece is wrapped in recycled paper and cardboard.",
    },
    notifications: {
      channels: {
        orders: { app: true, email: true, sms: true },
        purchases: { app: true, email: true, sms: false },
        reviews: { app: true, email: true, sms: false },
        followers: { app: true, email: false, sms: false },
        payouts: { app: true, email: true, sms: false },
        products: { app: true, email: false, sms: false },
        system: { app: true, email: true, sms: false },
      },
      digest: "instant",
      quietOn: false,
      quietFrom: "22:00",
      quietTo: "07:00",
    },
    payouts: {
      auto: false,
      schedule: "weekly",
    },
    privacy: {
      showFollowers: true,
      showSoldCount: true,
      searchable: true,
      messages: "everyone",
    },
    blocked: [
      { id: "b-1", name: "Harsh Vora", city: "Rajkot", reason: "Abusive review", blockedAt: ago(690) },
      { id: "b-2", name: "Rakesh Nandi", city: "Kolkata", reason: "Spam messages", blockedAt: ago(2200) },
    ],
    sessions: [
      { id: "s-1", device: "Chrome on Windows", place: "Ahmedabad, India", lastActive: ago(0), current: true },
      { id: "s-2", device: "ReOrbit app on Android", place: "Ahmedabad, India", lastActive: ago(5), current: false },
      { id: "s-3", device: "Safari on iPad", place: "Surat, India", lastActive: ago(210), current: false },
    ],
  };
}

/* ---------- store ---------- */

function load() {
  try {
    const raw = localStorage.getItem(KEY);

    if (raw) {
      const value = JSON.parse(raw);
      if (value && value.account) return { ...defaults(), ...value };
    }
  } catch {
    /* fall back to defaults */
  }

  return defaults();
}

let state = load();
const listeners = new Set();

function commit(next) {
  state = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: the change still lives for this session */
  }

  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

export function useSettings() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useNotificationPrefs() {
  const current = useSyncExternalStore(subscribe, getSnapshot);

  return useMemo(() => current.notifications, [current.notifications]);
}

/* ---------- actions ---------- */

export function saveSection(section, value) {
  commit({ ...state, [section]: value });
}

export function unblock(id) {
  const removed = state.blocked.find((item) => item.id === id) || null;

  if (removed) commit({ ...state, blocked: state.blocked.filter((item) => item.id !== id) });

  return removed;
}

export function restoreBlocked(item) {
  if (!item || state.blocked.some((entry) => entry.id === item.id)) return;

  commit({ ...state, blocked: [...state.blocked, item] });
}

export function endSession(id) {
  const removed = state.sessions.find((item) => item.id === id) || null;

  if (removed && !removed.current) commit({ ...state, sessions: state.sessions.filter((item) => item.id !== id) });

  return removed;
}

export function endOtherSessions() {
  commit({ ...state, sessions: state.sessions.filter((item) => item.current) });
}

export function resetSettings() {
  commit(defaults());
}

/* ---------- helpers ---------- */

export function passwordChecks(password) {
  return [
    { key: "len", label: "At least 8 characters", ok: password.length >= 8 },
    { key: "letter", label: "A letter", ok: /[A-Za-z]/.test(password) },
    { key: "number", label: "A number", ok: /\d/.test(password) },
    { key: "mixed", label: "Upper and lower case", ok: /[a-z]/.test(password) && /[A-Z]/.test(password) },
  ];
}

export function lastActiveLabel(iso) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

  if (minutes < 2) return "Active now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export function blockedLabel(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
