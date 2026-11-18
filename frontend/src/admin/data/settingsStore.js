/* Platform settings.
   commerce, warehouse and platform are saved on the server
   (/api/platform/admin/settings/) and loaded from it, so they survive a refresh and reach
   the User and ReMaker apps. The server uses them to price orders and enforce limits.
   profile, notifications and security are this admin's own and stay in this browser.
   The admin screens read them from here:
   - deliveryFee()      in shopStore / adminSell
   - UNSOLD alert rule  in warehouseStore + Warehouse pages */
import { useEffect, useSyncExternalStore } from "react";

import { fetchAdminSettings, saveAdminSettings } from "../../api/platform";
import { setRules } from "../../shared/platformRules";

function storedAdmin() {
  try {
    return JSON.parse(localStorage.getItem("reorbit_admin") || "null") || {};
  } catch {
    return {};
  }
}
const a = storedAdmin();

let state = {
  /* the signed-in admin as the server returned them at sign-in (nothing invented) */
  profile: {
    name: a.full_name || a.fullName || a.name || "",
    email: a.email || "",
    phone: a.phone || "",
  },
  commerce: {
    platformFeePct: 3, // charged on member-to-member orders
    productDelivery: 79, // platform products under the free-delivery limit
    freeDeliveryFrom: 1500, // products: free delivery at/above this subtotal
    itemDelivery: 149, // member items handled by the platform
    sellDelivery: 149, // admin's own listings, under the free limit
    sellFreeFrom: 5000,
    codEnabled: true,
    codLimit: 20000,
    maxListingsPerDay: 5, // new listings one member can publish per day
  },
  warehouse: {
    unsoldDays: 7, // listed this long without a sale -> alert
    slowDays: 14,
    deadDays: 30,
    autoPriceCut: false,
    priceCutPct: 15,
  },
  platform: {
    maintenance: false,
    supportEmail: "support@reorbit.in",
    minDonationItems: 1,
    sessionMinutes: 60,
  },
  /* only what this browser saw happen; there are no device sessions or 2-step codes to manage
     (admins sign in with email + password, and every password change is emailed to them) */
  security: {
    passwordChangedAt: null,
  },
  log: [],
  loaded: false,
  loading: false,
  loadError: "",
};
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snap = () => state;
const emit = () => listeners.forEach((l) => l());

const REMOTE = ["commerce", "warehouse", "platform"];

/* Take what the server holds and show it everywhere (this tab's public rules too). */
function adopt(data) {
  state = {
    ...state,
    commerce: data.commerce,
    warehouse: data.warehouse,
    platform: data.platform,
    log: (data.log || []).map((e) => ({ what: e.what, at: e.at })),
    loaded: true,
    loading: false,
    loadError: "",
  };
  if (data.rules) setRules(data.rules);
  emit();
}

let inFlight = null;
export function loadSettings({ force = false } = {}) {
  if (inFlight && !force) return inFlight;
  state = { ...state, loading: true, loadError: "" };
  emit();
  inFlight = fetchAdminSettings()
    .then(adopt)
    .catch((e) => {
      state = {
        ...state,
        loading: false,
        loadError: e.message || "We couldn't load the settings.",
      };
      emit();
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

function ensureLoaded() {
  if (!state.loaded && !state.loading && !state.loadError) loadSettings();
}

export const getSettings = () => {
  ensureLoaded();
  return state;
};
export function useSettings() {
  const current = useSyncExternalStore(subscribe, snap, snap);
  useEffect(() => {
    ensureLoaded();
  }, [current.loaded, current.loading, current.loadError]);
  return current;
}

const stamp = (what) => ({ what, at: new Date().toISOString() });
/* section: "profile" | "commerce" | "warehouse" | "notifications" | "platform"
   Returns a promise. The three server-backed sections resolve once the server has saved
   (and reject with an Error that has .errors if it refuses); profile saves at once. */
export async function saveSection(section, value, label) {
  if (REMOTE.includes(section)) {
    const data = await saveAdminSettings({ [section]: value });
    adopt(data);
    return data;
  }
  state = {
    ...state,
    [section]: value,
    log: [stamp(label || `${section} updated`), ...state.log].slice(0, 20),
  };
  if (section === "profile") {
    try {
      const cur = storedAdmin();
      localStorage.setItem(
        "reorbit_admin",
        JSON.stringify({
          ...cur,
          full_name: value.name,
          email: value.email,
          phone: value.phone,
        }),
      );
    } catch {
      /* ignore */
    }
  }
  emit();
  return null;
}
export function setSecurity(patch, label) {
  state = {
    ...state,
    security: { ...state.security, ...patch },
    log: label ? [stamp(label), ...state.log].slice(0, 20) : state.log,
  };
  emit();
}
export function resetSection(section, defaults) {
  return saveSection(section, defaults, `${section} reset to defaults`);
}

/* defaults, used by the "Reset" buttons */
export const DEFAULTS = {
  commerce: { ...state.commerce },
  warehouse: { ...state.warehouse },
};
