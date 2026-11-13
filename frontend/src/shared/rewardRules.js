/* =========================================================
   Shared › Rewards rules and vouchers (member view).
   The rules and the rewards store are served by /api/rewards/me/*
   and edited in Admin › Rewards; this file only re-exports the
   member hooks so older imports keep working.
   ========================================================= */
export { useRewardRules, useVoucherList } from "../user/data/rewardsStore";

/* Points a rule gives (0 when the team switched it off or it is not live). */
export const pointsOf = (rules, key) =>
  rules[key]?.active ? rules[key].points : 0;
