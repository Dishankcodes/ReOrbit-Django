/* =========================================================
   User › Orbit Points, rewards, vouchers and badges (UI only).
   Nothing here is typed in by hand: the points ledger is worked
   out from the user's real activity (orders, donations, listings,
   reviews, follows), using the same rules as the admin Rewards page.
   Spending points on a voucher adds it to "My vouchers", and the
   code can be used at checkout.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { useOrders } from "./ordersStore";
import { useDonations } from "./donationsStore";
import { useListings } from "./listingsStore";
import { useFollowing } from "./followStore";
import { useWishlist } from "./wishlistStore";
import {
  getRewardRules,
  getVouchers,
  pointsOf,
  useRewardRules,
} from "../../shared/rewardRules";

const DAY = 86400000;
const dayISO = (offset) =>
  new Date(new Date().setHours(0, 0, 0, 0) + offset * DAY).toISOString();

/* API order lists may omit tracking events until an individual order is opened. */
const eventsOf = (record) =>
  Array.isArray(record?.events) ? record.events : [];
const lastEventOf = (record) => eventsOf(record).at(-1) || null;
const activityAt = (record, fallback = null) =>
  lastEventOf(record)?.at || fallback || null;

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

/* Where each rule sends the member. The wording and the points come from the rules. */
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
export function useWaysToEarn() {
  const rules = useRewardRules();
  return useMemo(() => buildWaysToEarn(rules), [rules]);
}

/* ---------- vouchers (from Admin > Rewards) ---------- */
export const getVoucher = (id) =>
  getVouchers().find((v) => v.id === id) || null;

/* ---------- redeemed state ---------- */
const KEY = "reorbit_user_redeemed";
const seedRedeemed = () => [
  {
    rid: "RDM-1",
    voucherId: "VCH-1001",
    code: "ORBIT100-A7K2",
    title: "₹100 Marketplace Voucher",
    cost: 500,
    at: dayISO(-36),
    used: true,
  },
];
function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return seedRedeemed();
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : seedRedeemed();
  } catch {
    return seedRedeemed();
  }
}
let redeemed = load();
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => redeemed;
const commit = (next) => {
  redeemed = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
};
const suffix = () => Math.random().toString(36).slice(2, 6).toUpperCase();

/* Spend points on a voucher. `balance` and `level` come from the caller. */
export function redeemVoucher(voucherId, { balance, level }) {
  const v = getVoucher(voucherId);
  if (!v || v.kind !== "points")
    return { ok: false, error: "This reward isn't available." };
  if (v.paused) return { ok: false, error: "This reward is paused right now." };
  if (v.left <= 0) return { ok: false, error: "This reward is fully claimed." };
  if (level < v.level)
    return {
      ok: false,
      error: `Reach ${LEVELS[v.level].name} level to unlock this.`,
    };
  if (balance < v.cost)
    return { ok: false, error: `You need ${v.cost - balance} more points.` };
  const entry = {
    rid: `RDM-${Date.now().toString(36).toUpperCase()}`,
    voucherId: v.id,
    code: `${v.code}-${suffix()}`,
    title: v.title,
    cost: v.cost,
    at: new Date().toISOString(),
    used: false,
  };
  commit([entry, ...redeemed]);
  return { ok: true, entry };
}

export const markVoucherUsed = (code) =>
  commit(
    redeemed.map((r) =>
      r.code.toUpperCase() === code.toUpperCase() ? { ...r, used: true } : r,
    ),
  );

/* ---------- coupons at checkout ---------- */
export function checkCoupon(raw, { subtotal, ctx }) {
  const code = String(raw || "")
    .trim()
    .toUpperCase();
  if (!code) return { ok: false, error: "Enter a coupon code." };

  const owned = redeemed.find((r) => r.code.toUpperCase() === code);
  const voucher = owned
    ? getVoucher(owned.voucherId)
    : getVouchers().find(
        (v) => v.kind === "code" && v.code === code && v.status === "Active",
      );
  if (!voucher) return { ok: false, error: "That code isn't valid." };
  if (owned?.used)
    return { ok: false, error: "You've already used this voucher." };
  if (new Date(voucher.validTo) < new Date())
    return { ok: false, error: "This coupon has expired." };
  if (subtotal < voucher.minOrder)
    return {
      ok: false,
      error: `Add items worth ₹${voucher.minOrder.toLocaleString("en-IN")} or more to use this.`,
    };
  if (voucher.audience === "new" && ctx.hasOrders)
    return { ok: false, error: "This coupon is for first-time buyers only." };
  if (voucher.audience === "donors" && !ctx.hasDonation)
    return { ok: false, error: "Complete a donation to unlock this coupon." };
  if (voucher.remakerOnly && !ctx.hasRemaker)
    return { ok: false, error: "Add a ReMaker product to use this coupon." };

  let amount =
    voucher.type === "percent"
      ? Math.round((subtotal * voucher.value) / 100)
      : voucher.value;
  amount = Math.min(amount, voucher.maxDiscount, subtotal);
  if (amount <= 0)
    return { ok: false, error: "This voucher doesn't apply to an order." };
  return { ok: true, code, title: voucher.title, amount };
}

/* ---------- derived ledger, level, badges ---------- */

export function useRewards() {
  const used = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const orders = useOrders();
  const donations = useDonations();
  const listings = useListings();
  const { ids: following } = useFollowing();
  const wishlist = useWishlist();
  const rules = useRewardRules();

  return useMemo(() => {
    const earn = [];
    const delivered = orders
      .filter((o) => o.status === "Delivered")
      .sort(
        (a, b) =>
          new Date(activityAt(a, a.deliveredAt || a.placedAt) || 0) -
          new Date(activityAt(b, b.deliveredAt || b.placedAt) || 0),
      );

    delivered.forEach((o, i) => {
      const at = activityAt(o, o.deliveredAt || o.placedAt);
      const pts =
        Math.floor((o.price * o.qty) / 100) * pointsOf(rules, "purchase");
      if (pts > 0)
        earn.push({
          id: `buy-${o.id}`,
          kind: "purchase",
          title: "Order delivered",
          detail: `${o.item.title} · ${o.id}`,
          points: pts,
          at,
          to: `/user-orders/${o.id}`,
        });
      if (i === 0 && pointsOf(rules, "firstOrder") > 0)
        earn.push({
          id: "first-order",
          kind: "purchase",
          title: "First order bonus",
          detail: "Your first delivered order",
          points: pointsOf(rules, "firstOrder"),
          at,
          to: `/user-orders/${o.id}`,
        });
    });
    if (pointsOf(rules, "review") > 0)
      orders
        .filter((o) => o.review)
        .forEach((o) =>
          earn.push({
            id: `rev-${o.id}`,
            kind: "review",
            title: "Review posted",
            detail: o.item.title,
            points: pointsOf(rules, "review"),
            at: o.review.at || activityAt(o, o.deliveredAt || o.placedAt),
            to: `/user-orders/${o.id}`,
          }),
        );
    donations
      .filter(
        (d) =>
          ["Received", "Completed"].includes(d.status) &&
          (d.reward?.points || 0) > 0,
      )
      .forEach((d) =>
        earn.push({
          id: `don-${d.id}`,
          kind: "donation",
          title: "Donation received",
          detail: `${d.title} · ${d.quantity} ${d.quantity === 1 ? "item" : "items"}`,
          points: d.reward.points,
          at:
            eventsOf(d).find((e) => e.label === "Received at the warehouse")
              ?.at || activityAt(d, d.receivedAt || d.createdAt),
          to: `/user-donations/${d.id}`,
        }),
      );
    listings
      .filter(
        (l) =>
          ["Live", "Reserved", "Sold"].includes(l.status) &&
          pointsOf(rules, "listing") > 0,
      )
      .forEach((l) => {
        const e = l.events.find((x) => x.label === "Listing published");
        earn.push({
          id: `lst-${l.id}`,
          kind: "listing",
          title: "Item listed",
          detail: l.title,
          points: pointsOf(rules, "listing"),
          at: e ? e.at : l.createdAt,
          to: `/user-sell/${l.id}`,
        });
      });
    if (pointsOf(rules, "follow") > 0)
      following.slice(0, 10).forEach((id, i) =>
        earn.push({
          id: `fol-${id}`,
          kind: "follow",
          title: "Followed a ReMaker",
          detail: id.replace(/-/g, " "),
          points: pointsOf(rules, "follow"),
          at: dayISO(-(i + 1) * 3),
          to: `/user-marketplace/remaker/${id}`,
        }),
      );

    const spend = used.map((r) => ({
      id: r.rid,
      kind: "spend",
      title: "Reward redeemed",
      detail: r.title,
      points: -r.cost,
      at: r.at,
      to: "/user-orbit-points/vouchers",
    }));
    const ledger = [...earn, ...spend].sort(
      (a, b) => new Date(b.at) - new Date(a.at),
    );

    const lifetime = earn.reduce((n, e) => n + e.points, 0);
    const balance = lifetime + spend.reduce((n, e) => n + e.points, 0);
    const li = levelIndex(lifetime);
    const next = LEVELS[li + 1] || null;
    const progress = next
      ? Math.round(
          ((lifetime - LEVELS[li].min) / (next.min - LEVELS[li].min)) * 100,
        )
      : 100;

    const ctx = {
      hasOrders: orders.some((o) => !o.cancelled),
      hasDonation: donations.some((d) => d.status === "Completed"),
    };

    /* ---- badges ---- */
    const deliveredCount = delivered.length;
    const completedDonations = donations.filter(
      (d) => d.status === "Completed",
    );
    const donatedItems = donations
      .filter((d) => ["Picked_Up", "Received", "Completed"].includes(d.status))
      .reduce((n, d) => n + d.quantity, 0);
    const boughtItems = delivered.reduce((n, o) => n + o.qty, 0);
    const reviewCount = orders.filter((o) => o.review).length;
    const liveCount = listings.filter((l) =>
      ["Live", "Reserved", "Sold"].includes(l.status),
    ).length;
    const soldCount = listings.filter((l) => l.status === "Sold").length;
    const lastAt = (arr) => (arr.length ? arr[arr.length - 1] : null);
    const nth = (arr, n) => (arr.length >= n ? arr[n - 1] : null);
    const deliveredAt = delivered.map((o) =>
      activityAt(o, o.deliveredAt || o.placedAt),
    );

    const mk = (id, icon, title, text, value, target, at, hint) => ({
      id,
      icon,
      title,
      text,
      value: Math.min(value, target),
      target,
      earned: value >= target,
      earnedAt: value >= target ? at : null,
      hint,
    });
    const badges = [
      mk(
        "first-orbit",
        "leaf",
        "First Orbit",
        "Complete your first sustainable purchase.",
        deliveredCount,
        1,
        nth(deliveredAt, 1),
        { label: "Browse marketplace", to: "/user-marketplace" },
      ),
      mk(
        "circular-shopper",
        "shopping-bag",
        "Circular Shopper",
        "Get 5 marketplace orders delivered.",
        deliveredCount,
        5,
        nth(deliveredAt, 5),
        { label: "Browse marketplace", to: "/user-marketplace" },
      ),
      mk(
        "collector",
        "heart",
        "Thoughtful Collector",
        "Save 10 products to your wishlist.",
        wishlist.count,
        10,
        dayISO(-2),
        { label: "Open marketplace", to: "/user-marketplace" },
      ),
      mk(
        "community-giver",
        "gift",
        "Community Giver",
        "Complete 3 donations.",
        completedDonations.length,
        3,
        lastAt(
          completedDonations.map((d) =>
            activityAt(d, d.completedAt || d.createdAt),
          ),
        ),
        { label: "Donate an item", to: "/user-donations/new" },
      ),
      mk(
        "second-life",
        "recycle",
        "Second Life",
        "Help rescue 25 items from waste, by buying or donating.",
        donatedItems + boughtItems,
        25,
        dayISO(-1),
        { label: "Donate an item", to: "/user-donations/new" },
      ),
      mk(
        "makers-friend",
        "users",
        "Maker's Friend",
        "Follow 3 ReMakers.",
        following.length,
        3,
        dayISO(-1),
        { label: "Find ReMakers", to: "/user-remakers" },
      ),
      mk(
        "reviewer",
        "star",
        "Helpful Reviewer",
        "Post 3 order reviews.",
        reviewCount,
        3,
        dayISO(-1),
        { label: "Review an order", to: "/user-orders" },
      ),
      mk(
        "seller-starter",
        "tag",
        "Seller Starter",
        "List your first item for sale.",
        liveCount,
        1,
        dayISO(-1),
        { label: "Sell an item", to: "/user-sell/new" },
      ),
      mk(
        "trusted-seller",
        "badge",
        "Trusted Seller",
        "Sell 3 items to happy buyers.",
        soldCount,
        3,
        dayISO(-1),
        { label: "Sell an item", to: "/user-sell/new" },
      ),
      mk(
        "impact-champion",
        "trophy",
        "Impact Champion",
        "Reach 5,000 lifetime Orbit Points.",
        lifetime,
        5000,
        dayISO(-1),
        { label: "Ways to earn", to: "/user-orbit-points/earn" },
      ),
    ];

    return {
      ledger,
      balance,
      lifetime,
      level: LEVELS[li],
      levelIndex: li,
      next,
      progress,
      toNext: next ? next.min - lifetime : 0,
      redeemed: used,
      ctx,
      badges,
      earnedBadges: badges.filter((b) => b.earned).length,
      counts: {
        orders: orders.length,
        delivered: deliveredCount,
        donated: donatedItems,
        following: following.length,
        wishlist: wishlist.count,
      },
    };
  }, [used, orders, donations, listings, following, wishlist, rules]);
}
