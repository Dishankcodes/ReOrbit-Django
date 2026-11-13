/* =========================================================
   User › Orbit Points, rewards, vouchers and badges.
   Everything comes from /api/rewards/me/*: the points ledger, level,
   rules, the rewards store and the member's vouchers. Nothing is
   worked out or kept in the browser, so it cannot be edited or lost.
   Spending points calls the server, which checks the balance, level,
   limits and stock in one transaction.
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { rewardsApi } from "../../api/rewards";
import { getAccount } from "../../api/session";
import { useFollowing } from "./followStore";

export const LEVELS = [
  { key: "seedling", name: "Seedling", min: 0, perk: "Welcome to ReOrbit" },
  {
    key: "sprout",
    name: "Sprout",
    min: 500,
    perk: "Early access to new ReMaker drops",
  },
  {
    key: "orbiter",
    name: "Orbiter",
    min: 1500,
    perk: "Unlocks the ₹250 Sustainability Voucher",
  },
  { key: "guardian", name: "Guardian", min: 3000, perk: "Priority support" },
  {
    key: "champion",
    name: "Champion",
    min: 5000,
    perk: "Featured on the community wall",
  },
];
export const levelIndex = (lifetime) =>
  LEVELS.reduce((n, l, i) => (lifetime >= l.min ? i : n), 0);


/* ---------- server state (one set per signed-in member) ---------- */
const idle = {
  owner: "",
  loaded: false,
  loading: false,
  error: "",
  summary: null,
  ledger: [],
  rules: [],
  offers: [],
  vouchers: [],
};
let state = idle;
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;
const setState = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const me = () => getAccount("user")?.public_id || "";

export async function loadRewards(force = false) {
  const owner = me();
  if (!owner) return;
  if (state.owner !== owner) state = { ...idle, owner };
  if (state.loading || (state.loaded && !force)) return;
  setState({ loading: true, error: "" });
  try {
    const [summary, ledger, rules, offers, vouchers] = await Promise.all([
      rewardsApi.summary(),
      rewardsApi.ledger(),
      rewardsApi.rules(),
      rewardsApi.offers(),
      rewardsApi.vouchers(),
    ]);
    if (state.owner !== owner) return;
    setState({
      summary,
      ledger: ledger.results || [],
      rules,
      offers,
      vouchers: vouchers.vouchers || [],
      loaded: true,
      loading: false,
    });
  } catch (e) {
    setState({
      loading: false,
      error: e.message || "Could not load your rewards.",
    });
  }
}

/* Where an entry in the ledger leads. */
const entryLink = (ref = {}) => {
  if (ref.type === "order") return `/user-orders/${ref.id}`;
  if (ref.type === "donation") return `/user-donations/${ref.id}`;
  if (ref.type === "listing") return `/user-sell/${ref.id}`;
  if (ref.type === "voucher") return "/user-orbit-points/vouchers";
  return null;
};
const KIND_GROUP = { firstOrder: "purchase" }; // shown with the other purchases
const adaptEntry = (e) => ({
  id: e.id,
  kind: KIND_GROUP[e.kind] || e.kind,
  title: e.title,
  detail: e.detail,
  points: e.points,
  at: e.at,
  to: entryLink(e.ref) || "/user-orbit-points/history",
});

/* A voucher the member bought with points. */
const adaptHeld = (v) => ({
  rid: v.id,
  voucherId: v.id,
  code: v.code,
  title: v.title,
  cost: v.points_spent,
  at: v.created_at,
  used: v.status === "Used",
  status: v.status,
  expiresAt: v.expires_at,
});

/* ---------- earning rules ---------- */
const EARN_LINKS = {
  purchase: ["/user-marketplace", "Browse marketplace"],
  firstOrder: ["/user-marketplace", "Start shopping"],
  donationBase: ["/user-donations/new", "Donate an item"],
  donationItem: ["/user-donations/new", "Donate an item"],
  listing: ["/user-sell/new", "Sell an item"],
  review: ["/user-orders", "Review an order"],
  follow: ["/user-remakers", "Find ReMakers"],
  referral: ["/user-profile", "Invite a friend"],
};
const ZERO = { points: 0, active: false };
export function ruleMap(rules) {
  const map = {};
  Object.keys(EARN_LINKS).forEach((k) => {
    map[k] = ZERO;
  });
  rules.forEach((r) => {
    /* a rule the platform cannot hand out yet earns nothing, whatever its switch says */
    map[r.id] = {
      points: Number(r.points) || 0,
      active: !!r.active && r.live !== false,
      rule: r,
    };
  });
  return map;
}
export function buildWaysToEarn(rules) {
  return Object.entries(EARN_LINKS)
    .filter(([key]) => rules[key]?.active && rules[key].rule)
    .map(([key, [path, cta]]) => {
      const r = rules[key].rule;
      return {
        id: key,
        group: r.group,
        title: r.title,
        text: r.description,
        points: `+${r.points}${/per/.test(r.unit) ? ` ${r.unit.replace(/^per\s+/, "/ ")}` : ""}`,
        path,
        cta,
      };
    });
}
export function useRewardRules() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    loadRewards();
  }, []);
  return useMemo(() => ruleMap(s.rules), [s.rules]);
}
/* What a donation earns, as set in Admin > Rewards (the estimate shown before the item arrives). */
export function donationRates() {
  const get = (id, fallback) => {
    const r = state.rules.find((x) => x.id === id);
    return r && r.active ? Number(r.points) || 0 : r ? 0 : fallback;
  };
  return { base: get("donationBase", 0), perItem: get("donationItem", 0) };
}
export function useDonationRates() {
  useRewardRules(); // loads the rules and re-renders when they arrive
  return donationRates();
}
export function useWaysToEarn() {
  const rules = useRewardRules();
  return useMemo(() => buildWaysToEarn(rules), [rules]);
}

/* ---------- rewards store and coupon codes ---------- */
const LEVEL_NAMES = LEVELS.map((l) => l.key);
export const adaptOffer = (o) => ({
  id: o.id,
  code: o.code,
  title: o.title,
  description: o.description,
  kind: o.kind,
  type: o.discount_type,
  value: o.value,
  minOrder: o.min_order,
  maxDiscount: o.max_discount,
  cost: o.points_cost,
  left: o.left,
  validTo: `${o.valid_to}T23:59:59`,
  perUser: o.per_user,
  audience: o.audience,
  level: Math.max(0, Math.min(o.min_level, LEVEL_NAMES.length - 1)),
  remakerOnly: o.remaker_only,
  paused: o.paused,
  status: o.status,
  claimedByMe: o.claimed_by_me,
  canRedeem: o.can_redeem,
  reason: o.reason,
});
const visible = (m) => ["Active", "Paused", "Used_Up"].includes(m.status);
export function useVoucherList() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    loadRewards();
  }, []);
  return useMemo(() => s.offers.map(adaptOffer).filter(visible), [s.offers]);
}

/* Spend points on a reward. The server decides; the screen only shows its answer. */
export async function redeemVoucher(offerId) {
  try {
    const r = await rewardsApi.redeem(offerId);
    await loadRewards(true);
    return { ok: true, entry: adaptHeld(r.voucher) };
  } catch (e) {
    await loadRewards(true).catch(() => {});
    return { ok: false, error: e.message || "Could not redeem this reward." };
  }
}

/* ---------- ledger, level and badges ---------- */
export function useRewards() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { ids: following } = useFollowing();
  useEffect(() => {
    loadRewards();
  }, []);

  return useMemo(() => {
    const sum = s.summary;
    const st = sum?.stats || {};
    const lifetime = sum?.lifetime || 0;
    const balance = sum?.balance || 0;
    const li = sum?.level_index || 0;
    const next = LEVELS[li + 1] || null;
    const ledger = s.ledger.map(adaptEntry);
    const redeemed = s.vouchers
      .filter((v) => v.source?.type === "points")
      .map(adaptHeld);

    const mk = (id, icon, title, text, value, target, hint) => ({
      id,
      icon,
      title,
      text,
      value: Math.min(value, target),
      target,
      earned: value >= target,
      earnedAt: null,
      hint,
    });
    const badges = [
      mk("first-orbit", "leaf", "First Orbit", "Complete your first sustainable purchase.", st.delivered_orders || 0, 1, { label: "Browse marketplace", to: "/user-marketplace" }),
      mk("circular-shopper", "shopping-bag", "Circular Shopper", "Get 5 marketplace orders delivered.", st.delivered_orders || 0, 5, { label: "Browse marketplace", to: "/user-marketplace" }),
      mk("collector", "heart", "Thoughtful Collector", "Save 10 products to your wishlist.", st.wishlist || 0, 10, { label: "Open marketplace", to: "/user-marketplace" }),
      mk("community-giver", "gift", "Community Giver", "Complete 3 donations.", st.donations_completed || 0, 3, { label: "Donate an item", to: "/user-donations/new" }),
      mk("second-life", "recycle", "Second Life", "Help rescue 25 items from waste, by buying or donating.", (st.donated_items || 0) + (st.bought_items || 0), 25, { label: "Donate an item", to: "/user-donations/new" }),
      mk("makers-friend", "users", "Maker's Friend", "Follow 3 ReMakers.", following.length, 3, { label: "Find ReMakers", to: "/user-remakers" }),
      mk("reviewer", "star", "Helpful Reviewer", "Post 3 order reviews.", st.reviews || 0, 3, { label: "Review an order", to: "/user-orders" }),
      mk("seller-starter", "tag", "Seller Starter", "List your first item for sale.", st.listed || 0, 1, { label: "Sell an item", to: "/user-sell/new" }),
      mk("trusted-seller", "badge", "Trusted Seller", "Sell 3 items to happy buyers.", st.sold || 0, 3, { label: "Sell an item", to: "/user-sell/new" }),
      mk("impact-champion", "trophy", "Impact Champion", "Reach 5,000 lifetime Orbit Points.", lifetime, 5000, { label: "Ways to earn", to: "/user-orbit-points/earn" }),
    ];

    return {
      loaded: s.loaded,
      loading: s.loading,
      error: s.error,
      ledger,
      balance,
      lifetime,
      level: LEVELS[li],
      levelIndex: li,
      next,
      progress: sum?.progress ?? 0,
      toNext: sum?.to_next ?? 0,
      redeemed,
      vouchersReady: sum?.vouchers_ready || 0,
      badges,
      earnedBadges: badges.filter((b) => b.earned).length,
      counts: {
        orders: st.delivered_orders || 0,
        delivered: st.delivered_orders || 0,
        donated: st.donated_items || 0,
        following: following.length,
        wishlist: st.wishlist || 0,
      },
    };
  }, [s, following]);
}
