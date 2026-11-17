/* =========================================================
   Real members for the admin "Manage users" and "Manage ReMakers"
   pages. Read from the server (GET /api/users/admin/ and
   /api/remakers/admin/). Opening one profile also loads
   GET /api/adminops/admin/accounts/<id>/, which fills every tab
   (listings / products, orders, donations, wishlist, reviews, reports,
   activity and totals) with real data.
   ========================================================= */

import { useEffect, useState, useSyncExternalStore } from "react";
import { apiRequest } from "../../api/api";
import { mediaUrl } from "../../api/profile";
import { fetchAdminWorks } from "../../api/portfolio";
import { moderateListing, suggestListingPrice } from "../../api/listings";
import { deactivateRemakerProduct, reactivateRemakerProduct } from "../../api/adminProducts";

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
  const joined = { type: "account", text: "Created a ReOrbit account", at: row.created_at };
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
    followers: row.followers_count ?? 0,
    rating: p.rating_count ? Number(p.rating_average) : 0,
    rating_count: p.rating_count || 0,
    products_count: row.products_count ?? 0,
    sales_count: row.sales_count ?? 0,
    /* "New" is only for the first 30 days; after that a ReMaker with no reviews shows "No reviews" */
    is_new: Date.now() - new Date(row.created_at).getTime() < 30 * 86400000,
    profile: {
      ...baseProfile(p),
      total_uploads: row.products_count ?? p.total_uploads ?? 0,
      total_sales: row.sales_count ?? p.total_sales ?? 0,
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
    activity: [{ type: "account", text: "Created a ReOrbit account", at: row.created_at }],
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
  if (typeof window !== "undefined") window.addEventListener("reorbit:session-ended", reset);

  const useSnapshot = () => {
    const snap = useSyncExternalStore(subscribe, () => state, () => state);
    useEffect(() => {
      load();
    }, []);
    return snap;
  };

  /* Saves the new status on the server (POST /adminops/admin/accounts/<id>/status/), then shows it.
     Resolves to { done: [ids], failed: [{ id, message }] }. */
  async function changeStatus(ids, newStatus, reason = "") {
    const list = Array.isArray(ids) ? ids : [ids];
    const results = await Promise.allSettled(
      list.map((id) =>
        apiRequest(`/adminops/admin/accounts/${id}/status/`, {
          method: "POST",
          body: { status: newStatus, reason },
        }),
      ),
    );
    const done = list.filter((_, i) => results[i].status === "fulfilled");
    const failed = list
      .map((id, i) => ({ id, r: results[i] }))
      .filter((x) => x.r.status === "rejected")
      .map((x) => ({ id: x.id, message: x.r.reason?.message || "Could not change this account." }));
    const picked = new Set(done);
    const at = new Date().toISOString();
    if (done.length) set({
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
    return { done, failed };
  }

  return { useSnapshot, changeStatus, reload: () => load(true) };
}

const users = createStore({ path: "/users/admin/", map: mapUser, idKey: "user_id" });
const remakers = createStore({ path: "/remakers/admin/", map: mapRemaker, idKey: "remaker_id" });

/* lists */
export const useUsers = () => users.useSnapshot().rows;
export const useRemakers = () => remakers.useSnapshot().rows;

/* ---------- one profile's tabs: GET /api/adminops/admin/accounts/<id>/ ---------- */
const details = new Map(); // id -> { data, loading, error }
const detailListeners = new Set();
const emitDetails = () => detailListeners.forEach((l) => l());
const subscribeDetails = (l) => {
  detailListeners.add(l);
  return () => detailListeners.delete(l);
};

export function refreshAccount(id) {
  if (!id) return Promise.resolve();
  details.set(id, { ...(details.get(id) || {}), loading: true });
  emitDetails();
  return apiRequest(`/adminops/admin/accounts/${encodeURIComponent(id)}/`)
    .then((r) => details.set(id, { data: r.data, loading: false, error: "" }))
    .catch((e) =>
      details.set(id, { data: details.get(id)?.data || null, loading: false, error: e.message || "Could not load this profile." }),
    )
    .finally(emitDetails);
}

function useAccountDetail(id) {
  const entry = useSyncExternalStore(subscribeDetails, () => details.get(id), () => details.get(id));
  useEffect(() => {
    if (id && !details.get(id)) refreshAccount(id);
  }, [id]);
  return entry || { data: null, loading: true, error: "" };
}

/* the profile's tabs come from the detail; the account row from the list */
const withDetail = (record, data) => {
  if (!record || !data) return record;
  const merged = { ...record, ...data, totals: data.totals || record.totals };
  if (data.activity?.length) merged.activity = data.activity;
  if (typeof data.followers === "number") merged.followers = data.followers;
  return merged;
};

/* one record: { record, loading, error, reload } */
export function useUser(id) {
  const s = users.useSnapshot();
  const detail = useAccountDetail(id);
  const record = s.rows.find((r) => r.user_id === id) || null;
  return {
    record: withDetail(record, detail.data),
    loading: s.loading || !s.loaded,
    detailLoading: detail.loading,
    error: s.error || detail.error,
    reload: () => {
      users.reload();
      refreshAccount(id);
    },
  };
}
export function useRemaker(id) {
  const s = remakers.useSnapshot();
  const detail = useAccountDetail(id);
  const record = s.rows.find((r) => r.remaker_id === id) || null;
  return {
    record: withDetail(record, detail.data),
    loading: s.loading || !s.loaded,
    detailLoading: detail.loading,
    error: s.error || detail.error,
    reload: () => {
      remakers.reload();
      refreshAccount(id);
    },
  };
}

/* ---------- moderation from a profile (real endpoints), then refresh that profile ---------- */
export async function disableListing(accountId, itemId, reason) {
  await moderateListing(itemId, "Disabled", reason);
  await refreshAccount(accountId);
}
export async function enableListing(accountId, itemId) {
  await moderateListing(itemId, "Normal", "");
  await refreshAccount(accountId);
}
export async function suggestPrice(accountId, itemId, price, note) {
  await suggestListingPrice(itemId, price, note);
  await refreshAccount(accountId);
}
export async function disableProduct(accountId, productId, reason) {
  await deactivateRemakerProduct(productId, reason);
  await refreshAccount(accountId);
}
export async function enableProduct(accountId, productId) {
  await reactivateRemakerProduct(productId);
  await refreshAccount(accountId);
}

/* One ReMaker's portfolio, read from /api/portfolio/admin/<id>/ when the profile opens.
   -> { works: null | [...], loading, error } (works use the portfolio_id / before_image / after_image names) */
export function useRemakerPortfolio(remakerId) {
  const [state, setState] = useState({ works: null, loading: true, error: "" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ works: null, loading: true, error: "" });
    fetchAdminWorks(remakerId)
      .then((works) => active && setState({ works, loading: false, error: "" }))
      .catch((e) =>
        active &&
        setState({ works: null, loading: false, error: e.message || "Could not load the portfolio." }),
      );
    return () => {
      active = false;
    };
  }, [remakerId, attempt]);

  return { ...state, reload: () => setAttempt((n) => n + 1) };
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
