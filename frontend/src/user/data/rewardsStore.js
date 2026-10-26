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
import { estimatePoints, useDonations } from "./donationsStore";
import { useListings } from "./listingsStore";
import { useFollowing } from "./followStore";
import { useWishlist } from "./wishlistStore";

const DAY = 86400000;
const dayISO = (offset) => new Date(new Date().setHours(0, 0, 0, 0) + offset * DAY).toISOString();

export const LEVELS = [
  { key: "seedling", name: "Seedling", min: 0, perk: "Welcome to ReOrbit" },
  { key: "sprout", name: "Sprout", min: 500, perk: "Early access to new ReMaker drops" },
  { key: "orbiter", name: "Orbiter", min: 1500, perk: "Unlocks the ₹250 Sustainability Voucher" },
  { key: "guardian", name: "Guardian", min: 3000, perk: "Priority support" },
  { key: "champion", name: "Champion", min: 5000, perk: "Featured on the community wall" },
];
export const levelIndex = (lifetime) => LEVELS.reduce((n, l, i) => (lifetime >= l.min ? i : n), 0);

export const WAYS_TO_EARN = [
  { id: "purchase", group: "Buying", title: "Marketplace purchase", text: "10 points for every ₹100 on a delivered order.", points: "10 / ₹100", path: "/user-marketplace", cta: "Browse marketplace" },
  { id: "firstOrder", group: "Buying", title: "First order bonus", text: "A welcome bonus on your first delivered order.", points: "+50", path: "/user-marketplace", cta: "Start shopping" },
  { id: "donation", group: "Donating", title: "Donation completed", text: "100 points per donation, plus 20 for every item, once your certificate is issued.", points: "100 + 20 / item", path: "/user-donations/new", cta: "Donate an item" },
  { id: "listing", group: "Community", title: "Item verified and listed", text: "When an item you sell passes verification.", points: "+30", path: "/user-sell/new", cta: "Sell an item" },
  { id: "review", group: "Community", title: "Write a review", text: "For each review you post after delivery.", points: "+20", path: "/user-orders", cta: "Review an order" },
  { id: "follow", group: "Community", title: "Follow a ReMaker", text: "A small reward for following, up to 10 ReMakers.", points: "+5", path: "/user-remakers", cta: "Find ReMakers" },
];

/* ---------- vouchers ---------- */
export const VOUCHERS = [
  { id: "VCH-1001", code: "ORBIT100", title: "₹100 Marketplace Voucher", description: "Save ₹100 on a sustainable purchase.", kind: "points", type: "fixed", value: 100, minOrder: 499, maxDiscount: 100, cost: 500, left: 336, validTo: dayISO(120), level: 0, paused: false },
  { id: "VCH-1002", code: "FREEDEL", title: "Free Delivery", description: "Takes ₹99 off one eligible order.", kind: "points", type: "fixed", value: 99, minOrder: 299, maxDiscount: 99, cost: 750, left: 213, validTo: dayISO(90), level: 0, paused: false },
  { id: "VCH-1003", code: "GREEN250", title: "₹250 Sustainability Voucher", description: "A bigger reward for a bigger basket.", kind: "points", type: "fixed", value: 250, minOrder: 999, maxDiscount: 250, cost: 1200, left: 159, validTo: dayISO(200), level: 2, paused: false },
  { id: "VCH-1009", code: "DECOR150", title: "₹150 Home Decor Voucher", description: "For home decor and lighting.", kind: "points", type: "fixed", value: 150, minOrder: 699, maxDiscount: 150, cost: 900, left: 128, validTo: dayISO(150), level: 0, paused: true },
  { id: "VCH-1010", code: "PICKUPPASS", title: "Priority Pickup Pass", description: "Jump the queue for one donation pickup.", kind: "points", type: "fixed", value: 0, minOrder: 0, maxDiscount: 0, cost: 400, left: 0, validTo: dayISO(60), level: 0, paused: false },
  { id: "VCH-1004", code: "WELCOME10", title: "Welcome 10% off", description: "10% off, for new users only.", kind: "code", type: "percent", value: 10, minOrder: 299, maxDiscount: 150, cost: 0, audience: "new", validTo: dayISO(160) },
  { id: "VCH-1006", code: "THANKS50", title: "Donor Thank-you ₹50", description: "A thank-you for completing a donation.", kind: "code", type: "fixed", value: 50, minOrder: 199, maxDiscount: 50, cost: 0, audience: "donors", validTo: dayISO(5) },
  { id: "VCH-1007", code: "REMAKER20", title: "ReMaker Spotlight 20%", description: "20% off products from ReMakers.", kind: "code", type: "percent", value: 20, minOrder: 999, maxDiscount: 500, cost: 0, audience: "all", validTo: dayISO(40), remakerOnly: true },
  { id: "VCH-1012", code: "BOOKS5", title: "Books ₹50 off", description: "₹50 off a bundle of books.", kind: "code", type: "fixed", value: 50, minOrder: 349, maxDiscount: 50, cost: 0, audience: "all", validTo: dayISO(6) },
];
export const getVoucher = (id) => VOUCHERS.find((v) => v.id === id) || null;

/* ---------- redeemed state ---------- */
const KEY = "reorbit_user_redeemed";
const seedRedeemed = () => [
  { rid: "RDM-1", voucherId: "VCH-1001", code: "ORBIT100-A7K2", title: "₹100 Marketplace Voucher", cost: 500, at: dayISO(-36), used: true },
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
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => redeemed;
const commit = (next) => {
  redeemed = next;
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
};
const suffix = () => Math.random().toString(36).slice(2, 6).toUpperCase();

/* Spend points on a voucher. `balance` and `level` come from the caller. */
export function redeemVoucher(voucherId, { balance, level }) {
  const v = getVoucher(voucherId);
  if (!v || v.kind !== "points") return { ok: false, error: "This reward isn't available." };
  if (v.paused) return { ok: false, error: "This reward is paused right now." };
  if (v.left <= 0) return { ok: false, error: "This reward is fully claimed." };
  if (level < v.level) return { ok: false, error: `Reach ${LEVELS[v.level].name} level to unlock this.` };
  if (balance < v.cost) return { ok: false, error: `You need ${v.cost - balance} more points.` };
  const entry = { rid: `RDM-${Date.now().toString(36).toUpperCase()}`, voucherId: v.id, code: `${v.code}-${suffix()}`, title: v.title, cost: v.cost, at: new Date().toISOString(), used: false };
  commit([entry, ...redeemed]);
  return { ok: true, entry };
}

export const markVoucherUsed = (code) => commit(redeemed.map((r) => (r.code.toUpperCase() === code.toUpperCase() ? { ...r, used: true } : r)));

/* ---------- coupons at checkout ---------- */
export function checkCoupon(raw, { subtotal, ctx }) {
  const code = String(raw || "").trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a coupon code." };

  const owned = redeemed.find((r) => r.code.toUpperCase() === code);
  const voucher = owned ? getVoucher(owned.voucherId) : VOUCHERS.find((v) => v.kind === "code" && v.code === code);
  if (!voucher) return { ok: false, error: "That code isn't valid." };
  if (owned?.used) return { ok: false, error: "You've already used this voucher." };
  if (new Date(voucher.validTo) < new Date()) return { ok: false, error: "This coupon has expired." };
  if (subtotal < voucher.minOrder) return { ok: false, error: `Add items worth ₹${voucher.minOrder.toLocaleString("en-IN")} or more to use this.` };
  if (voucher.audience === "new" && ctx.hasOrders) return { ok: false, error: "This coupon is for first-time buyers only." };
  if (voucher.audience === "donors" && !ctx.hasDonation) return { ok: false, error: "Complete a donation to unlock this coupon." };
  if (voucher.remakerOnly && !ctx.hasRemaker) return { ok: false, error: "Add a ReMaker product to use this coupon." };

  let amount = voucher.type === "percent" ? Math.round((subtotal * voucher.value) / 100) : voucher.value;
  amount = Math.min(amount, voucher.maxDiscount, subtotal);
  if (amount <= 0) return { ok: false, error: "This voucher doesn't apply to an order." };
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

  return useMemo(() => {
    const earn = [];
    const delivered = orders
      .filter((o) => o.status === "Delivered")
      .sort((a, b) => new Date(a.events[a.events.length - 1].at) - new Date(b.events[b.events.length - 1].at));

    delivered.forEach((o, i) => {
      const at = o.events[o.events.length - 1].at;
      const pts = Math.floor(o.total / 100) * 10;
      if (pts > 0) earn.push({ id: `buy-${o.id}`, kind: "purchase", title: "Order delivered", detail: `${o.item.title} · ${o.id}`, points: pts, at, to: `/user-orders/${o.id}` });
      if (i === 0) earn.push({ id: "first-order", kind: "purchase", title: "First order bonus", detail: "Your first delivered order", points: 50, at, to: `/user-orders/${o.id}` });
    });
    orders.filter((o) => o.review).forEach((o) => earn.push({ id: `rev-${o.id}`, kind: "review", title: "Review posted", detail: o.item.title, points: 20, at: o.review.at || o.events[o.events.length - 1].at, to: `/user-orders/${o.id}` }));
    donations.filter((d) => d.status === "Completed").forEach((d) => earn.push({ id: `don-${d.id}`, kind: "donation", title: "Donation completed", detail: `${d.title} · ${d.quantity} ${d.quantity === 1 ? "item" : "items"}`, points: estimatePoints(d.quantity), at: d.events[d.events.length - 1].at, to: `/user-donations/${d.id}` }));
    listings.filter((l) => ["Live", "Reserved", "Sold"].includes(l.status)).forEach((l) => {
      const e = l.events.find((x) => x.label === "Verified and live");
      earn.push({ id: `lst-${l.id}`, kind: "listing", title: "Item verified and listed", detail: l.title, points: 30, at: e ? e.at : l.createdAt, to: `/user-sell/${l.id}` });
    });
    following.slice(0, 10).forEach((id, i) => earn.push({ id: `fol-${id}`, kind: "follow", title: "Followed a ReMaker", detail: id.replace(/-/g, " "), points: 5, at: dayISO(-(i + 1) * 3), to: `/user-marketplace/remaker/${id}` }));

    const spend = used.map((r) => ({ id: r.rid, kind: "spend", title: "Reward redeemed", detail: r.title, points: -r.cost, at: r.at, to: "/user-orbit-points/vouchers" }));
    const ledger = [...earn, ...spend].sort((a, b) => new Date(b.at) - new Date(a.at));

    const lifetime = earn.reduce((n, e) => n + e.points, 0);
    const balance = lifetime + spend.reduce((n, e) => n + e.points, 0);
    const li = levelIndex(lifetime);
    const next = LEVELS[li + 1] || null;
    const progress = next ? Math.round(((lifetime - LEVELS[li].min) / (next.min - LEVELS[li].min)) * 100) : 100;

    const ctx = {
      hasOrders: orders.some((o) => !o.cancelled),
      hasDonation: donations.some((d) => d.status === "Completed"),
    };

    /* ---- badges ---- */
    const deliveredCount = delivered.length;
    const completedDonations = donations.filter((d) => d.status === "Completed");
    const donatedItems = donations.filter((d) => ["Picked_Up", "Received", "Completed"].includes(d.status)).reduce((n, d) => n + d.quantity, 0);
    const boughtItems = delivered.reduce((n, o) => n + o.qty, 0);
    const reviewCount = orders.filter((o) => o.review).length;
    const liveCount = listings.filter((l) => ["Live", "Reserved", "Sold"].includes(l.status)).length;
    const soldCount = listings.filter((l) => l.status === "Sold").length;
    const lastAt = (arr) => (arr.length ? arr[arr.length - 1] : null);
    const nth = (arr, n) => (arr.length >= n ? arr[n - 1] : null);
    const deliveredAt = delivered.map((o) => o.events[o.events.length - 1].at);

    const mk = (id, icon, title, text, value, target, at, hint) => ({ id, icon, title, text, value: Math.min(value, target), target, earned: value >= target, earnedAt: value >= target ? at : null, hint });
    const badges = [
      mk("first-orbit", "leaf", "First Orbit", "Complete your first sustainable purchase.", deliveredCount, 1, nth(deliveredAt, 1), { label: "Browse marketplace", to: "/user-marketplace" }),
      mk("circular-shopper", "shopping-bag", "Circular Shopper", "Get 5 marketplace orders delivered.", deliveredCount, 5, nth(deliveredAt, 5), { label: "Browse marketplace", to: "/user-marketplace" }),
      mk("collector", "heart", "Thoughtful Collector", "Save 10 products to your wishlist.", wishlist.count, 10, dayISO(-2), { label: "Open marketplace", to: "/user-marketplace" }),
      mk("community-giver", "gift", "Community Giver", "Complete 3 donations.", completedDonations.length, 3, lastAt(completedDonations.map((d) => d.events[d.events.length - 1].at)), { label: "Donate an item", to: "/user-donations/new" }),
      mk("second-life", "recycle", "Second Life", "Help rescue 25 items from waste, by buying or donating.", donatedItems + boughtItems, 25, dayISO(-1), { label: "Donate an item", to: "/user-donations/new" }),
      mk("makers-friend", "users", "Maker's Friend", "Follow 3 ReMakers.", following.length, 3, dayISO(-1), { label: "Find ReMakers", to: "/user-remakers" }),
      mk("reviewer", "star", "Helpful Reviewer", "Post 3 order reviews.", reviewCount, 3, dayISO(-1), { label: "Review an order", to: "/user-orders" }),
      mk("seller-starter", "tag", "Seller Starter", "Get your first item verified and listed.", liveCount, 1, dayISO(-1), { label: "Sell an item", to: "/user-sell/new" }),
      mk("trusted-seller", "badge", "Trusted Seller", "Sell 3 items to happy buyers.", soldCount, 3, dayISO(-1), { label: "Sell an item", to: "/user-sell/new" }),
      mk("impact-champion", "trophy", "Impact Champion", "Reach 5,000 lifetime Orbit Points.", lifetime, 5000, dayISO(-1), { label: "Ways to earn", to: "/user-orbit-points/earn" }),
    ];

    return {
      ledger, balance, lifetime, level: LEVELS[li], levelIndex: li, next, progress,
      toNext: next ? next.min - lifetime : 0,
      redeemed: used, ctx, badges,
      earnedBadges: badges.filter((b) => b.earned).length,
      counts: { orders: orders.length, delivered: deliveredCount, donated: donatedItems, following: following.length, wishlist: wishlist.count },
    };
  }, [used, orders, donations, listings, following, wishlist]);
}
