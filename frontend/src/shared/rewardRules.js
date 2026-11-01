/* =========================================================
   Shared › Rewards (earning rules and vouchers).
   Edited in Admin › Rewards. The User app reads the same rules, so
   changing "points per ₹100" or pausing a voucher changes what the
   member sees and earns.
   ========================================================= */

import { useMemo } from "react";
import { getRewardsState, voucherStatus, useRules, useVouchers } from "../admin/data/rewardsStore";

const LEVEL_KEYS = ["seedling", "sprout", "orbiter", "guardian", "champion"];

/* admin rule id → what the member app calls it */
const RULE_KEYS = {
  purchase: "purchase",
  firstOrder: "firstOrder",
  donationBase: "donationBase",
  donationItem: "donationItem",
  listing: "listing",
  review: "review",
  follow: "follow",
  referral: "referral",
};

const ZERO = { points: 0, active: false };

function ruleMap(rules) {
  const map = {};
  Object.values(RULE_KEYS).forEach((k) => { map[k] = ZERO; });
  rules.forEach((r) => { if (RULE_KEYS[r.id]) map[RULE_KEYS[r.id]] = { points: Number(r.points) || 0, active: !!r.active, rule: r }; });
  return map;
}
export const getRewardRules = () => ruleMap(getRewardsState().rules);
export function useRewardRules() {
  const rules = useRules();
  return useMemo(() => ruleMap(rules), [rules]);
}

/* Points a rule gives (0 when the team switched it off). */
export const pointsOf = (rules, key) => (rules[key]?.active ? rules[key].points : 0);

function audienceOf(text = "") {
  if (/new users/i.test(text)) return { audience: "new", level: 0 };
  if (/donors/i.test(text)) return { audience: "donors", level: 0 };
  const m = /^level (\w+)/i.exec(text);
  if (m) return { audience: "all", level: Math.max(0, LEVEL_KEYS.indexOf(m[1].toLowerCase())) };
  return { audience: "all", level: 0 };
}

export function mapVoucher(v) {
  const status = voucherStatus(v);
  const { audience, level } = audienceOf(v.audience);
  return {
    id: v.id,
    code: v.code,
    title: v.title,
    description: v.description,
    kind: v.kind,
    type: v.discount_type,
    value: Number(v.value) || 0,
    minOrder: Number(v.min_order) || 0,
    maxDiscount: Number(v.max_discount) || Number(v.value) || 0,
    cost: Number(v.points_cost) || 0,
    left: Math.max(0, (Number(v.usage_limit) || 0) - (Number(v.used) || 0)),
    validTo: `${v.valid_to}T23:59:59`,
    perUser: v.per_user,
    audience,
    level,
    remakerOnly: /remaker/i.test(`${v.title} ${v.description}`),
    paused: status === "Paused",
    status,
  };
}

/* Vouchers a member can see: not drafts, expired or not started yet. */
const visible = (m) => ["Active", "Paused", "Used_Up"].includes(m.status);
export const getVouchers = () => getRewardsState().vouchers.map(mapVoucher).filter(visible);
export function useVoucherList() {
  const all = useVouchers();
  return useMemo(() => all.map((v) => mapVoucher(v)).filter(visible), [all]);
}
