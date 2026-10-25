/* Platform settings (in-memory, resets on refresh).
   The commerce and warehouse values below are read by the live logic:
   - deliveryFee()      in shopStore / adminSell
   - UNSOLD alert rule  in warehouseStore + Warehouse pages
   so changing them here changes what the rest of the admin does. */
import { useSyncExternalStore } from "react";

function storedAdmin() {
  try { return JSON.parse(localStorage.getItem("reorbit_admin") || "null") || {}; } catch { return {}; }
}
const a = storedAdmin();

let state = {
  profile: {
    name: a.full_name || a.fullName || a.name || "Nikhil Rao",
    email: a.email || "admin@reorbit.in",
    phone: a.phone || "+91 79000 54321",
    role: "Super admin",
    bio: "",
  },
  commerce: {
    platformFeePct: 3,          // charged on member-to-member orders
    productDelivery: 79,        // platform products under the free-delivery limit
    freeDeliveryFrom: 1500,     // products: free delivery at/above this subtotal
    itemDelivery: 149,          // member items handled by the platform
    sellDelivery: 149,          // admin's own listings, under the free limit
    sellFreeFrom: 5000,
    codEnabled: true,
    codLimit: 20000,
  },
  warehouse: {
    unsoldDays: 7,              // listed this long without a sale -> alert
    slowDays: 14,
    deadDays: 30,
    autoPriceCut: false,
    priceCutPct: 15,
  },
  notifications: {
    channels: { email: true, push: true, digest: false },
    modules: { Warehouse: true, Donations: true, Pickups: true, Orders: true, Products: true, Rewards: true, Sales: true, Users: true },
    quietHours: false,
  },
  platform: {
    maintenance: false,
    supportEmail: "support@reorbit.in",
    minDonationItems: 1,
    sessionMinutes: 60,
  },
  security: { twoFactor: false, passwordChangedAt: null, sessions: [
    { id: "s1", device: "Chrome on Windows", place: "Ahmedabad, India", at: "This device", current: true },
    { id: "s2", device: "Safari on iPhone", place: "Ahmedabad, India", at: "2 days ago", current: false },
    { id: "s3", device: "Firefox on macOS", place: "Pune, India", at: "9 days ago", current: false },
  ] },
  log: [],
};
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const snap = () => state;
const emit = () => listeners.forEach((l) => l());

export const getSettings = () => state;
export const useSettings = () => useSyncExternalStore(subscribe, snap, snap);

const stamp = (what) => ({ what, at: new Date().toISOString() });
/* section: "profile" | "commerce" | "warehouse" | "notifications" | "platform" */
export function saveSection(section, value, label) {
  state = { ...state, [section]: value, log: [stamp(label || `${section} updated`), ...state.log].slice(0, 20) };
  if (section === "profile") {
    try {
      const cur = storedAdmin();
      localStorage.setItem("reorbit_admin", JSON.stringify({ ...cur, full_name: value.name, email: value.email, phone: value.phone }));
    } catch { /* ignore */ }
  }
  emit();
}
export function setSecurity(patch, label) {
  state = { ...state, security: { ...state.security, ...patch }, log: label ? [stamp(label), ...state.log].slice(0, 20) : state.log };
  emit();
}
export function revokeSession(id) {
  setSecurity({ sessions: state.security.sessions.filter((s) => s.id !== id) }, "Signed out a session");
}
export function resetSection(section, defaults) { saveSection(section, defaults, `${section} reset to defaults`); }

/* defaults, used by the "Reset" buttons */
export const DEFAULTS = {
  commerce: { ...state.commerce },
  warehouse: { ...state.warehouse },
};
