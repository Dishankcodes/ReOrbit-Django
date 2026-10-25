/* =========================================================
   Admin › Rewards data layer (UI only, in-memory).
   - Vouchers, earning rules, redemptions, manual adjustments live here.
   - Donation points are DERIVED from the Donations store, so finishing
     a donation (or editing the donation rules) changes the ledger live.
   - User balances are derived from the Users store (orders, reviews,
     items) plus all of the above.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { INITIAL_VOUCHERS, INITIAL_RULES, LEVELS, levelFor } from "./rewardsData";
import { useUsers } from "./usersStore";
import { useDonations } from "./donationsStore";
import { DEMO_TODAY } from "../utils/format";

const DAY = 86400000;
const hash = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i += 1) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const todayStr = () => DEMO_TODAY.toISOString().slice(0, 10);

/* ---------- state ---------- */
let state = {
  vouchers: INITIAL_VOUCHERS,
  rules: INITIAL_RULES,
  revoked: {}, // donationId -> reason
  adjustments: [], // { id, user_id, amount, reason, at }
  redemptionOv: {}, // redemptionId -> { status }
  extraRedemptions: [],
};
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => state;
const getState = () => state;
export const getRewardsState = getState;
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
const useRewardsState = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/* ---------- vouchers ---------- */
export function voucherStatus(v) {
  if (v.draft) return "Draft";
  const t = todayStr();
  if (v.valid_to < t) return "Expired";
  if (v.used >= v.usage_limit) return "Used_Up";
  if (v.paused) return "Paused";
  if (v.valid_from > t) return "Scheduled";
  return "Active";
}
export function useVouchers() {
  const { vouchers } = useRewardsState();
  return useMemo(() => vouchers.map((v) => {
    const status = voucherStatus(v);
    const daysLeft = Math.ceil((new Date(`${v.valid_to}T23:59:59`).getTime() - DEMO_TODAY.getTime()) / DAY);
    return { ...v, status, daysLeft, expiringSoon: status === "Active" && daysLeft <= 7, usagePct: Math.min(100, Math.round((v.used / v.usage_limit) * 100)) };
  }), [vouchers]);
}
export function saveVoucher(data) {
  const { vouchers } = state;
  if (data.id) set({ vouchers: vouchers.map((v) => (v.id === data.id ? { ...v, ...data } : v)) });
  else {
    const n = Math.max(...vouchers.map((v) => Number(v.id.slice(4)))) + 1;
    set({ vouchers: [{ used: 0, paused: false, draft: false, ...data, id: `VCH-${n}` }, ...vouchers] });
  }
}
export const patchVoucher = (id, patch) => set({ vouchers: state.vouchers.map((v) => (v.id === id ? { ...v, ...patch } : v)) });
export const removeVoucher = (id) => set({ vouchers: state.vouchers.filter((v) => v.id !== id) });
export const codeTaken = (code, exceptId) => state.vouchers.some((v) => v.code === code && v.id !== exceptId);

/* ---------- rules ---------- */
export const useRules = () => useRewardsState().rules;
export const saveRule = (id, patch) => set({ rules: state.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

/* ---------- donation rewards (derived from Donations) ---------- */
export function useDonationRewards() {
  const donations = useDonations();
  const { rules, revoked } = useRewardsState();
  return useMemo(() => {
    const base = rules.find((r) => r.id === "donationBase");
    const per = rules.find((r) => r.id === "donationItem");
    return donations
      .filter((d) => ["Picked_Up", "Received", "Completed"].includes(d.status))
      .map((d) => {
        const points = (base.active ? base.points : 0) + (per.active ? per.points * d.quantity : 0);
        const rev = revoked[d.id];
        const status = rev ? "Revoked" : d.status === "Completed" ? "Credited" : "Pending";
        return { id: d.id, donation: d, donor: d.donor, points, status, revoke_reason: rev || "", at: d.events[d.events.length - 1]?.at || d.donation_date };
      })
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [donations, rules, revoked]);
}
export const revokeDonationReward = (id, reason) => set({ revoked: { ...state.revoked, [id]: reason } });
export const restoreDonationReward = (id) => { const r = { ...state.revoked }; delete r[id]; set({ revoked: r }); };

/* ---------- redemptions ---------- */
function seedRedemptions(users, vouchers) {
  const pointVouchers = vouchers.filter((v) => v.kind === "points");
  const out = [];
  users.forEach((u) => {
    if (u.status === "Deleted") return;
    const h = hash(u.user_id);
    const n = h % 3; // 0-2 redemptions
    for (let i = 0; i < n; i += 1) {
      const v = pointVouchers[(h + i * 7) % pointVouchers.length];
      const age = 3 + ((h >> (i + 2)) % 60);
      const st = age > 45 ? "Expired" : (h >> i) % 3 === 0 ? "Issued" : "Used";
      out.push({ id: `RD-${u.user_id.slice(4)}${i + 1}`, user_id: u.user_id, voucher_id: v.id, voucher_code: v.code, voucher_title: v.title, points: v.points_cost, issued_code: `${v.code.slice(0, 4)}-${(h % 9000) + 1000 + i}`, at: new Date(DEMO_TODAY.getTime() - age * DAY).toISOString(), status: st });
    }
  });
  return out;
}

export function useRedemptions() {
  const users = useUsers();
  const { vouchers, redemptionOv, extraRedemptions } = useRewardsState();
  return useMemo(() => {
    const byUser = Object.fromEntries(users.map((u) => [u.user_id, u]));
    return [...extraRedemptions, ...seedRedemptions(users, INITIAL_VOUCHERS)]
      .map((r) => ({ ...r, status: redemptionOv[r.id]?.status || r.status, user: byUser[r.user_id], title: vouchers.find((v) => v.id === r.voucher_id)?.title || r.voucher_title }))
      .filter((r) => r.user)
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [users, vouchers, redemptionOv, extraRedemptions]);
}
export const setRedemptionStatus = (id, status) => set({ redemptionOv: { ...state.redemptionOv, [id]: { status } } });

/* ---------- user balances ---------- */
export function useUserPoints() {
  const users = useUsers();
  const donationRewards = useDonationRewards();
  const redemptions = useRedemptions();
  const { adjustments } = useRewardsState();
  return useMemo(() => users.filter((u) => u.status !== "Deleted").map((u) => {
    const purchases = Math.round(((u.totals?.spent || 0) / 100) * 10);
    const reviews = (u.reviews?.length || 0) * 20;
    const listings = u.items.filter((i) => i.verification_status === "Verified").length * 30;
    const donated = donationRewards.filter((r) => r.donor.id === u.user_id && r.status === "Credited").reduce((n, r) => n + r.points, 0);
    const pendingDonation = donationRewards.filter((r) => r.donor.id === u.user_id && r.status === "Pending").reduce((n, r) => n + r.points, 0);
    const adj = adjustments.filter((a) => a.user_id === u.user_id);
    const bonus = adj.filter((a) => a.amount > 0).reduce((n, a) => n + a.amount, 0);
    const deducted = adj.filter((a) => a.amount < 0).reduce((n, a) => n + -a.amount, 0);
    const spent = redemptions.filter((r) => r.user_id === u.user_id && r.status !== "Cancelled").reduce((n, r) => n + r.points, 0);
    const lifetime = purchases + reviews + listings + donated + bonus;
    const balance = Math.max(0, lifetime - spent - deducted + 0);
    return { user: u, purchases, reviews, listings, donated, pendingDonation, bonus, deducted, spent, lifetime, balance, level: levelFor(lifetime) };
  }), [users, donationRewards, redemptions, adjustments]);
}

export function adjustPoints(user_id, amount, reason) {
  set({ adjustments: [{ id: `ADJ-${Date.now()}`, user_id, amount, reason, at: new Date().toISOString() }, ...state.adjustments] });
}
export const useAdjustments = () => useRewardsState().adjustments;
export { LEVELS };
