/* =========================================================
   Real members for the admin "Manage users" and "Manage ReMakers"
   pages. Read from the server (GET /api/users/admin/ and
   /api/remakers/admin/) and shaped like the older dummy records,
   so the pages and their tabs keep working. Parts that have no
   backend yet (orders, items, donations, reviews ...) are empty.

   Suspend / block / reactivate only change this in-memory copy for now;
   they reset on refresh until the status endpoints are built.
   ========================================================= */

import { useEffect, useSyncExternalStore } from "react";
import { apiRequest } from "../../api/api";
import { mediaUrl } from "../../api/profile";

const splitList = (text, sep) =>
  String(text || "")
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);

const history = (row, id) =>
  row.status !== "Active" && row.status_changed_at
    ? [
        {
          id: `${id}-h1`,
          action: row.status,
          reason: row.status_reason || "No reason recorded.",
          by: "Admin",
          at: row.status_changed_at,
        },
      ]
    : [];

function baseProfile(p = {}) {
  return {
    ...p,
    profile_image: mediaUrl(p.profile_image) || null,
    phone: p.phone || "",
    address: p.address || "",
    city: p.city || "",
    state: p.state || "",
    pincode: p.pincode || "",
    total_uploads: p.total_uploads ?? 0,
    total_sales: p.total_sales ?? 0,
    total_purchases: p.total_purchases ?? 0,
    environmental_impact: Number(p.environmental_impact ?? 0),
  };
}

export function mapUser(row) {
  const joined = {
    type: "account",
    text: "Created a ReOrbit account",
    at: row.created_at,
  };
  return {
    user_id: row.public_id,
    full_name: row.full_name,
    email: row.email,
    auth_provider: row.auth_provider,
    google_id: null,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_active: row.last_login_at || row.created_at,
    email_verified_at: row.email_verified_at,
    profile: baseProfile(row.profile),
    totals: { spent: 0, earned: 0 },
    items: [],
    orders: [],
    donations: [],
    wishlist: [],
    reviews: [],
    reports: [],
    statusHistory: history(row, row.public_id),
    activity: [joined],
  };
}

export function mapRemaker(row) {
  const p = row.profile || {};
  return {
    remaker_id: row.public_id,
    username: row.username,
    full_name: row.full_name,
    email: row.email,
    auth_provider: row.auth_provider,
    google_id: null,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_active: row.last_login_at || row.created_at,
    email_verified_at: row.email_verified_at,
    followers: 0,
    rating: p.rating_count ? Number(p.rating_average) : 0,
    profile: {
      ...baseProfile(p),
      cover_image: mediaUrl(p.cover_image) || null,
      studio_name: p.studio_name || "",
      speciality: p.speciality || "",
      bio: p.bio || "",
      skills: splitList(p.skills, ","),
      experience: p.experience || "",
      certification: splitList(p.certification, "\n"),
      social_links: p.social_links || {},
    },
    totals: { earned: 0, spent: 0 },
    portfolio: [],
    products: [],
    orders: [],
    refurbishments: [],
    reviews: [],
    reports: [],
    statusHistory: history(row, row.public_id),
    activity: [
      {
        type: "account",
        text: "Created a ReOrbit account",
        at: row.created_at,
      },
    ],
  };
}

function createStore({ path, map, idKey }) {
  let state = { rows: [], loading: false, loaded: false, error: "" };
  const listeners = new Set();
  const set = (next) => {
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  };
  const subscribe = (l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };

  async function load(force = false) {
    if (state.loading || (state.loaded && !force)) return;
    set({ loading: true, error: "" });
    try {
      let page = 1;
      let totalPages = 1;
      const rows = [];
      do {
        const res = await apiRequest(`${path}?page=${page}&page_size=100`);
        rows.push(...res.data.results.map(map));
        totalPages = res.data.total_pages;
        page += 1;
      } while (page <= totalPages);
      set({ rows, loaded: true, loading: false });
    } catch (e) {
      set({ loading: false, error: e.message || "Could not load the list." });
    }
  }

  const reset = () => {
    state = { rows: [], loading: false, loaded: false, error: "" };
    listeners.forEach((l) => l());
  };
  if (typeof window !== "undefined")
    window.addEventListener("reorbit:session-ended", reset);

  const useSnapshot = () => {
    const snap = useSyncExternalStore(
      subscribe,
      () => state,
      () => state,
    );
    useEffect(() => {
      load();
    }, []);
    return snap;
  };

  function changeStatus(ids, newStatus, reason = "") {
    const picked = new Set(Array.isArray(ids) ? ids : [ids]);
    const at = new Date().toISOString();
    set({
      rows: state.rows.map((row) =>
        !picked.has(row[idKey]) || row.status === newStatus
          ? row
          : {
              ...row,
              status: newStatus,
              updated_at: at,
              statusHistory: [
                {
                  id: `${row[idKey]}-${Date.now()}`,
                  action: newStatus,
                  reason: reason || "No reason provided.",
                  by: "Admin · You",
                  at,
                },
                ...row.statusHistory,
              ],
            },
      ),
    });
  }

  return { useSnapshot, changeStatus, reload: () => load(true) };
}

const users = createStore({
  path: "/users/admin/",
  map: mapUser,
  idKey: "user_id",
});
const remakers = createStore({
  path: "/remakers/admin/",
  map: mapRemaker,
  idKey: "remaker_id",
});

/* lists */
export const useUsers = () => users.useSnapshot().rows;
export const useRemakers = () => remakers.useSnapshot().rows;

/* one record: { record, loading, error, reload } */
export function useUser(id) {
  const s = users.useSnapshot();
  return {
    record: s.rows.find((r) => r.user_id === id) || null,
    loading: s.loading || !s.loaded,
    error: s.error,
    reload: users.reload,
  };
}
export function useRemaker(id) {
  const s = remakers.useSnapshot();
  return {
    record: s.rows.find((r) => r.remaker_id === id) || null,
    loading: s.loading || !s.loaded,
    error: s.error,
    reload: remakers.reload,
  };
}

/* { loading, error, reload } for the list pages */
export function useUsersStatus() {
  const { loading, error } = users.useSnapshot();
  return { loading, error, reload: users.reload };
}
export function useRemakersStatus() {
  const { loading, error } = remakers.useSnapshot();
  return { loading, error, reload: remakers.reload };
}

export const changeUserStatus = users.changeStatus;
export const changeRemakerStatus = remakers.changeStatus;
