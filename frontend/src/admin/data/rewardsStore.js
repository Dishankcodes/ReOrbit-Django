/* =========================================================
   Admin › Rewards data layer (/api/rewards/admin/*).
   Vouchers and coupons, earning rules, redemptions, member points
   and donation rewards all live on the server. Every change is a
   request; the lists below show what the server says, so nothing
   disappears or drifts when the page is reloaded.
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { adminRewardsApi } from "../../api/rewards";

export const LEVELS = [
  { key: "seedling", name: "Seedling", min: 0 },
  { key: "sprout", name: "Sprout", min: 500 },
  { key: "orbiter", name: "Orbiter", min: 1500 },
  { key: "guardian", name: "Guardian", min: 3000 },
  { key: "champion", name: "Champion", min: 5000 },
];
export const levelFor = (lifetime) =>
  [...LEVELS].reverse().find((l) => lifetime >= l.min);

/* "Who can use it", as the form shows it, and the fields the server stores. */
const AUDIENCE_RULES = {
  Everyone: { audience: "all", min_level: 0, remaker_only: false },
  "New users": { audience: "new", min_level: 0, remaker_only: false },
  Donors: { audience: "donors", min_level: 0, remaker_only: false },
  "Level Orbiter and above": { audience: "all", min_level: 2, remaker_only: false },
  ReMakers: { audience: "all", min_level: 0, remaker_only: true },
};
export const AUDIENCES = Object.keys(AUDIENCE_RULES);
const audienceLabel = (o) => {
  if (o.remaker_only) return "ReMakers";
  if (o.audience === "new") return "New users";
  if (o.audience === "donors") return "Donors";
  if (o.min_level >= 2) return "Level Orbiter and above";
  return "Everyone";
};

/* ---------- state ---------- */
const idle = {
  offers: { rows: [], loaded: false, loading: false, error: "" },
  rules: { rows: [], loaded: false, loading: false, error: "" },
  redemptions: { rows: [], loaded: false, loading: false, error: "" },
  users: { rows: [], loaded: false, loading: false, error: "" },
  donations: { rows: [], loaded: false, loading: false, error: "" },
};
let state = idle;
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;
const setSection = (name, patch) => {
  state = { ...state, [name]: { ...state[name], ...patch } };
  listeners.forEach((l) => l());
};
const useRewardsState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/* every page of a list (100 at a time) */
async function everyPage(fetchPage) {
  const rows = [];
  for (let page = 1; page <= 50; page += 1) {
    const r = await fetchPage({ page, page_size: 100 });
    rows.push(...(r.results || []));
    if (page >= (r.total_pages || 1)) break;
  }
  return rows;
}

const LOADERS = {
  offers: async () => (await adminRewardsApi.offers()).offers,
  rules: async () => (await adminRewardsApi.rules()).rules,
  redemptions: () => everyPage(adminRewardsApi.redemptions),
  users: () => everyPage(adminRewardsApi.users),
  donations: async () => (await adminRewardsApi.donationRewards()).results,
};
export async function loadRewardsSection(name, force = false) {
  const s = state[name];
  if (s.loading || (s.loaded && !force)) return;
  setSection(name, { loading: true, error: "" });
  try {
    setSection(name, { rows: await LOADERS[name](), loaded: true, loading: false });
  } catch (e) {
    /* e.g. an admin without the Rewards module: show an empty list, not a crash */
    setSection(name, { loading: false, loaded: true, error: e.message || "Could not load." });
  }
}
const useSection = (name) => {
  const all = useRewardsState();
  useEffect(() => {
    loadRewardsSection(name);
  }, [name]);
  return all[name];
};
export const reloadRewards = (...names) =>
  Promise.all(
    (names.length ? names : Object.keys(LOADERS)).map((n) => loadRewardsSection(n, true)),
  );

/* A request that failed becomes { ok:false, error, errors } so screens can show it. */
const attempt = async (fn) => {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e.message || "Something went wrong.", errors: e.errors || {} };
  }
};

/* ---------- vouchers and coupons ---------- */
export function voucherStatus(v) {
  return v.status;
}
const adaptOffer = (o) => ({
  ...o,
  audience: audienceLabel(o),
  daysLeft: o.days_left,
  expiringSoon: o.expiring_soon,
  usagePct: o.usage_pct,
});
export function useVouchers() {
  const s = useSection("offers");
  return useMemo(() => s.rows.map(adaptOffer), [s.rows]);
}
const offerBody = (data) => {
  const { audience, ...rest } = data;
  return { ...rest, ...(AUDIENCE_RULES[audience] || AUDIENCE_RULES.Everyone) };
};
/* create (no id) or edit (id) */
export async function saveVoucher(data) {
  const body = offerBody(data);
  const res = await attempt(() =>
    data.id ? adminRewardsApi.saveOffer(data.id, body) : adminRewardsApi.createOffer(body),
  );
  if (res.ok) await reloadRewards("offers");
  return res;
}
export async function patchVoucher(id, patch) {
  const res = await attempt(() => adminRewardsApi.saveOffer(id, patch));
  if (res.ok) await reloadRewards("offers");
  return res;
}
export async function removeVoucher(id) {
  const res = await attempt(() => adminRewardsApi.deleteOffer(id));
  if (res.ok) await reloadRewards("offers");
  return res;
}
/* Quick check against what is loaded; the server makes the final call. */
export const codeTaken = (code, exceptId) =>
  state.offers.rows.some((v) => v.code === code && v.id !== exceptId);

/* ---------- rules ---------- */
export const useRules = () => useSection("rules").rows;
const pendingRules = {}; // id -> { patch, timer, waiters }
const sendRule = async (id) => {
  const job = pendingRules[id];
  delete pendingRules[id];
  const res = await attempt(() => adminRewardsApi.saveRule(id, job.patch));
  if (res.ok) {
    setSection("rules", {
      rows: state.rules.rows.map((r) => (r.id === id ? res.data.rule : r)),
    });
  } else {
    await reloadRewards("rules"); // put back what the server really has
  }
  job.waiters.forEach((w) => w(res));
};
/* Shows the change at once and sends it; typing in a number box is sent once, after a pause. */
export function saveRule(id, patch) {
  setSection("rules", {
    rows: state.rules.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  });
  return new Promise((resolve) => {
    const job = pendingRules[id] || { patch: {}, timer: null, waiters: [] };
    clearTimeout(job.timer);
    job.patch = { ...job.patch, ...patch };
    job.waiters.push(resolve);
    pendingRules[id] = job;
    job.timer = setTimeout(() => sendRule(id), "active" in patch ? 0 : 600);
  });
}

/* ---------- donation rewards ---------- */
const adaptDonationReward = (r) => ({
  id: r.id,
  donation: { id: r.id, title: r.title, quantity: r.quantity, image: null, status: r.status_of_donation },
  donor: { ...r.donor, image: null, city: r.donor.email },
  points: r.points,
  voucher: r.voucher,
  status: r.status,
  revoke_reason: "",
  at: r.at,
});
export function useDonationRewards() {
  const s = useSection("donations");
  return useMemo(() => s.rows.map(adaptDonationReward), [s.rows]);
}
export async function revokeDonationReward(id, reason) {
  const res = await attempt(() => adminRewardsApi.revokeDonation(id, reason));
  await reloadRewards("donations", "users");
  return res;
}
export async function restoreDonationReward(id) {
  const res = await attempt(() => adminRewardsApi.restoreDonation(id));
  await reloadRewards("donations", "users");
  return res;
}

/* ---------- redemptions (vouchers bought with points) ---------- */
const REDEEM_STATUS = { Active: "Issued", Used: "Used", Expired: "Expired", Void: "Cancelled" };
export function useRedemptions() {
  const s = useSection("redemptions");
  return useMemo(
    () =>
      s.rows.map((r) => ({
        id: r.id,
        user_id: r.owner.id,
        user: { ...r.owner, full_name: r.owner.name },
        voucher_id: r.offer,
        voucher_code: r.code,
        title: r.title,
        points: r.points_spent,
        issued_code: r.code,
        at: r.created_at,
        status: REDEEM_STATUS[r.status] || r.status,
      })),
    [s.rows],
  );
}
export async function cancelRedemption(id, reason) {
  const res = await attempt(() => adminRewardsApi.cancelRedemption(id, reason));
  await reloadRewards("redemptions", "users", "offers");
  return res;
}

/* ---------- member balances ---------- */
export function useUserPoints() {
  const u = useSection("users");
  const d = useSection("donations");
  return useMemo(() => {
    const due = {};
    d.rows
      .filter((r) => r.status === "Pending")
      .forEach((r) => {
        due[r.donor.id] = (due[r.donor.id] || 0) + r.points;
      });
    return u.rows.map((r) => ({
      user: {
        user_id: r.id,
        full_name: r.name,
        email: r.email,
        status: r.status,
        path: r.path,
        profile: { profile_image: null },
      },
      purchases: r.purchases,
      reviews: r.reviews,
      listings: r.listings,
      donated: r.donated,
      pendingDonation: due[r.id] || 0,
      spent: r.spent,
      lifetime: r.lifetime,
      balance: r.balance,
      level: levelFor(r.lifetime),
    }));
  }, [u.rows, d.rows]);
}
export async function adjustPoints(user_id, amount, reason) {
  const res = await attempt(() => adminRewardsApi.adjust(user_id, { amount, reason }));
  if (res.ok) await reloadRewards("users");
  return res;
}
