/* =========================================================
   User › Account settings (UI only).
   Profile + preferences live in localStorage. The profile uses the
   same "reorbit_user" key as the sidebar and Profile page, so a
   change here shows up everywhere.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";

const USER_KEY = "reorbit_user";
const PREFS_KEY = "reorbit_user_prefs";

const DEFAULT_PROFILE = {
  full_name: "Aarav Patel",
  email: "aarav.patel@example.com",
  phone: "+91 98765 43210",
  city: "Ahmedabad",
  bio: "Giving good things a second life.",
};

const DEFAULT_PREFS = {
  notifications: { orderUpdates: true, donationUpdates: true, rewards: true, offers: false, newsletter: false, channelEmail: true, channelPush: true, channelSms: false },
  privacy: { publicProfile: true, showActivity: true, showFollowing: false },
  security: { twoFactor: false, loginAlerts: true },
};

const read = (key, fallback) => {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "null");
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
};

let state = {
  profile: { ...DEFAULT_PROFILE, ...read(USER_KEY, {}) },
  prefs: (() => {
    const saved = read(PREFS_KEY, {});
    return {
      notifications: { ...DEFAULT_PREFS.notifications, ...saved.notifications },
      privacy: { ...DEFAULT_PREFS.privacy, ...saved.privacy },
      security: { ...DEFAULT_PREFS.security, ...saved.security },
    };
  })(),
};

const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => state;
const commit = (next) => {
  state = next;
  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify({ ...read(USER_KEY, {}), ...next.profile }));
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(next.prefs));
  } catch { /* ignore */ }
  listeners.forEach((l) => l());
};

export const saveProfile = (profile) => commit({ ...state, profile: { ...state.profile, ...profile } });
export const setPref = (group, key, value) =>
  commit({ ...state, prefs: { ...state.prefs, [group]: { ...state.prefs[group], [key]: value } } });

export function deleteAccountData() {
  try {
    ["reorbit_user", "reorbit_user_prefs", "reorbit_user_cart", "reorbit_user_wishlist", "reorbit_user_following", "reorbit_user_redeemed"].forEach((k) => window.localStorage.removeItem(k));
  } catch { /* ignore */ }
}

export function useSettings() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(() => s, [s]);
}

export const SESSIONS = [
  { id: "s1", device: "Chrome on Windows", place: "Ahmedabad, India", current: true, when: "Active now" },
  { id: "s2", device: "ReOrbit app on Android", place: "Ahmedabad, India", current: false, when: "2 hours ago" },
  { id: "s3", device: "Safari on iPhone", place: "Gandhinagar, India", current: false, when: "6 days ago" },
];
