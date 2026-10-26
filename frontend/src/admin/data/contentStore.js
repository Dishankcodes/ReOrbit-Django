/* =========================================================
   Admin › Content data layer (UI only, in-memory, resets on refresh).

   Four kinds of content the team looks after:
     1. Categories  – the list members pick from when they list an item.
                      Counts are LIVE (products, donations, stock, sell listings),
                      and a category that is in use cannot be renamed or deleted,
                      because those records only remember the name.
     2. Banners     – promos on the Home page and shop. Their state (Live,
                      Scheduled, Ended, Draft) follows the dates, so nobody has
                      to remember to switch one off.
     3. FAQs        – questions and answers, grouped by topic.
     4. Policies    – Terms, Privacy, Returns… Every publish makes a new
                      version that can be read and restored later.
                      Bodies can contain {tokens} such as {platform_fee},
                      which are filled from Settings when shown.

   Backend later: Categories, Banners, Faqs and Policy_Versions tables.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { useProducts } from "./productsStore";
import { useDonations } from "./donationsStore";
import { useStock } from "./warehouseStore";
import { useSellListings } from "./sellStore";
import { DEMO_TODAY } from "../utils/format";

const iso = (v) => new Date(v).toISOString();
const DAY = 86400000;
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
export const TODAY_KEY = dayKey(DEMO_TODAY);

/* ---------------------------------------------------------
   Seed data
   --------------------------------------------------------- */
export const CATEGORY_ICON_KEYS = ["Armchair", "Home", "CookingPot", "Shirt", "Smartphone", "BookOpen", "Dumbbell", "Lamp", "Gem", "Baby", "Bike", "Music", "Camera", "Watch", "Flower2", "Hammer", "Gamepad2", "Backpack", "Package"];

const cat = (n, name, icon, blurb, extra = {}) => ({ id: `CAT-${n}`, name, icon, blurb, active: true, locked: false, createdAt: iso("2025-01-10T09:00:00"), ...extra });

export const BANNER_PLACEMENTS = [
  { key: "Home hero", blurb: "The big slider at the top of the Home page.", max: 4, ratio: "16 : 6" },
  { key: "Home strip", blurb: "A slim promo bar under the hero.", max: 2, ratio: "16 : 2" },
  { key: "Shop top", blurb: "Above the product grid in the marketplace.", max: 2, ratio: "16 : 4" },
];
export const BANNER_AUDIENCES = ["Everyone", "Signed-in members", "Visitors only", "ReMakers"];
export const BANNER_IMAGES = [
  { src: "/images/products/vintage-chair.jpg", label: "Vintage chair" },
  { src: "/images/products/wooden-table.jpg", label: "Wooden table" },
  { src: "/images/products/teak-drawer-chest.jpg", label: "Teak chest" },
  { src: "/images/products/ceramic-lamp.jpg", label: "Ceramic lamp" },
  { src: "/images/portfolio/tara-chair.jpg", label: "Restored chair" },
  { src: "/images/portfolio/tara-console.jpg", label: "Console table" },
  { src: "/images/portfolio/arjun-lamp.jpg", label: "Upcycled lamp" },
  { src: "/images/portfolio/arjun-shelf.jpg", label: "Reclaimed shelf" },
  { src: "/images/portfolio/priya-bag.jpg", label: "Fabric bag" },
  { src: "/images/portfolio/priya-jacket.jpg", label: "Reworked jacket" },
];

const bn = (n, o) => ({ id: `BN-${n}`, subtitle: "", cta: "Shop now", link: "/", audience: "Everyone", end: "", active: true, views: 0, clicks: 0, createdAt: iso("2026-09-01T09:00:00"), ...o });

export const FAQ_TOPICS = ["Buying", "Selling", "Donating", "ReMakers", "Payments & refunds", "Account"];
const fq = (n, topic, q, a, o = {}) => ({ id: `FQ-${n}`, topic, q, a, published: true, helpful: 0, notHelpful: 0, ...o });

const POLICY_TOKENS = [
  { token: "{platform_fee}", label: "Platform fee", hint: "The fee in Settings, such as 3%" },
  { token: "{free_delivery_from}", label: "Free delivery from", hint: "Subtotal for free delivery on platform products" },
  { token: "{cod_limit}", label: "Cash on delivery limit", hint: "Largest order that can use cash on delivery" },
  { token: "{unsold_days}", label: "Unsold alert days", hint: "Days before an unsold item is flagged" },
];
export { POLICY_TOKENS };

const ver = (v, at, by, note, body) => ({ v, at: iso(at), by, note, body });

const TERMS = `## 1. Using ReOrbit
ReOrbit is a marketplace for second-life goods. You must be 18 or older, or use the service with a parent or guardian, and give true information when you sign up.

## 2. Listing and buying
Describe items honestly and show their real condition. Items are checked by our team before they go live, and we may reject or remove a listing that breaks these terms.

## 3. Fees
Orders placed by members carry a platform fee of {platform_fee}, shown at checkout before you pay. Platform products over {free_delivery_from} ship free.

## 4. Accounts
You are responsible for what happens on your account. We may warn, suspend or block accounts for scams, abuse or repeated policy breaches.

## 5. Changes
We may update these terms. When we do, the version and date at the top change, and important changes are announced in the app.`;

const PRIVACY = `## What we collect
Your name, email, phone number, address for pickups and delivery, the items you list or buy, and basic usage data that helps us fix problems.

## How we use it
To run your account, arrange pickups and deliveries, process payments, prevent fraud and send updates about your orders and donations.

## Who sees it
Your public profile shows your name, city and listings. Your address and phone number are shared only with the pickup team or courier handling your order.

## Your choices
You can edit your details, download your data or ask us to delete your account from Settings. Some records, such as paid orders, are kept as the law requires.`;

const REFUNDS = `## Returns
If an item arrives different from its description, tell us within 7 days of delivery and we will arrange a return.

## Refunds
Once the return is received and checked, the money goes back to the original payment method. Cash on delivery orders are refunded to your Orbit wallet or bank account.

## Not eligible
Items damaged after delivery, items that were described honestly, and orders cancelled after they were shipped.

## Platform fee
The platform fee of {platform_fee} is refunded together with the item when the problem was ours or the seller's.`;

const SHIPPING = `## Delivery
Orders are packed within 2 working days and delivered in 3 to 7 working days, depending on where you live.

## Delivery fee
Delivery on platform products is free from {free_delivery_from}. Below that, the fee is shown at checkout.

## Cash on delivery
Available for orders up to {cod_limit}. Keep the exact amount ready when the courier arrives.

## Tracking
You will get an update when your order is confirmed, shipped and delivered, and you can follow it from My orders.`;

const DONATION = `## What we accept
Furniture, home decor, kitchenware, clothing, books, electronics that work and sports goods, in a usable condition.

## What we cannot take
Broken or unsafe electrical items, mattresses, damaged upholstery and anything dangerous or illegal.

## Free pickup
Once we accept your donation, a pickup team collects it from your door at no cost. Please keep the item ready in your chosen slot.

## Your reward
You earn Orbit Points for every completed donation and receive a donation certificate. Items we cannot sell are passed on to partner NGOs.`;

const COMMUNITY = `## Be honest
Show real photos, describe flaws and never ask for payment outside ReOrbit.

## Be respectful
Abuse, threats and harassment lead to a warning, and repeated problems to suspension.

## Respect creators
Do not copy another ReMaker's work or sell counterfeit items.

## Report problems
Use the report button on any listing, review or profile. Every report is read by a person on our team.`;

/* ---------------------------------------------------------
   State
   --------------------------------------------------------- */
let state = {
  seq: { cat: 11, bn: 8, fq: 15 },
  categories: [
    cat(1, "Furniture", "Armchair", "Chairs, tables, shelves, wardrobes and beds."),
    cat(2, "Home Decor", "Home", "Lamps, mirrors, frames, planters and wall pieces."),
    cat(3, "Kitchen", "CookingPot", "Cookware, crockery, storage and small appliances."),
    cat(4, "Fashion", "Gem", "Bags, jewellery, accessories and reworked pieces."),
    cat(5, "Clothing", "Shirt", "Pre-loved clothes in good condition."),
    cat(6, "Electronics", "Smartphone", "Working phones, audio, gadgets and appliances."),
    cat(7, "Books", "BookOpen", "Novels, textbooks, comics and magazines."),
    cat(8, "Sports", "Dumbbell", "Fitness gear, bikes and outdoor equipment."),
    cat(9, "Lighting", "Lamp", "Lamps, shades, fixtures and fairy lights."),
    cat(10, "Other", "Package", "Anything that does not fit elsewhere. Always available.", { locked: true }),
  ],
  banners: [
    bn(1, { title: "Diwali Green Sale", subtitle: "15% off upcycled products. Use code DIWALI15.", cta: "Shop the sale", link: "/shop", placement: "Home hero", image: "/images/portfolio/arjun-lamp.jpg", start: "2026-10-15", end: "2026-11-05", views: 12840, clicks: 612, createdAt: iso("2026-10-10T10:00:00") }),
    bn(2, { title: "Give a chair, earn Orbit Points", subtitle: "Free pickup from your door. Donate in two minutes.", cta: "Donate now", link: "/donate", placement: "Home hero", image: "/images/portfolio/tara-chair.jpg", start: "2026-09-01", end: "", views: 31200, clicks: 1540, createdAt: iso("2026-08-28T10:00:00") }),
    bn(3, { title: "Meet our ReMakers", subtitle: "Restored, reworked and rebuilt by makers near you.", cta: "Meet them", link: "/remakers", placement: "Home hero", image: "/images/portfolio/priya-jacket.jpg", start: "2026-11-10", end: "2026-11-30", createdAt: iso("2026-10-18T10:00:00") }),
    bn(4, { title: "Free pickup across Ahmedabad", subtitle: "", cta: "Learn more", link: "/how-it-works", placement: "Home strip", image: "/images/products/wooden-table.jpg", start: "2026-09-01", end: "", views: 22910, clicks: 388, createdAt: iso("2026-08-28T10:30:00") }),
    bn(5, { title: "Furniture under ₹5,000", subtitle: "Pre-loved and checked by our team.", cta: "Browse", link: "/shop?category=Furniture", placement: "Shop top", image: "/images/products/vintage-chair.jpg", start: "2026-10-01", end: "", views: 9475, clicks: 702, createdAt: iso("2026-09-29T10:00:00") }),
    bn(6, { title: "Monsoon clean-out week", subtitle: "Declutter and earn double Orbit Points.", cta: "Donate", link: "/donate", placement: "Home hero", image: "/images/portfolio/arjun-shelf.jpg", start: "2026-08-01", end: "2026-08-20", views: 18400, clicks: 940, createdAt: iso("2026-07-28T10:00:00") }),
    bn(7, { title: "New year upcycle drive", subtitle: "Draft: copy still being written.", cta: "Join in", link: "/", placement: "Home strip", image: "/images/products/ceramic-lamp.jpg", start: "", end: "", active: false, createdAt: iso("2026-10-19T10:00:00") }),
  ],
  faqs: [
    fq(1, "Buying", "How do I know an item is in good condition?", "Every item is checked by our team before it goes live. The listing shows its condition and real photos, and you can message the seller before you buy.", { helpful: 84, notHelpful: 6 }),
    fq(2, "Buying", "Can I return something I bought?", "Yes. If the item is different from its description, tell us within 7 days of delivery and we will arrange a return and refund.", { helpful: 61, notHelpful: 4 }),
    fq(3, "Buying", "Is cash on delivery available?", "Yes, for orders up to {cod_limit}. Keep the exact amount ready when the courier arrives.", { helpful: 40, notHelpful: 3 }),
    fq(4, "Selling", "How do I list an item?", "Open Sell an item, add photos, a title, the condition and your price. Our team reviews it, usually within a day, and then it goes live.", { helpful: 72, notHelpful: 5 }),
    fq(5, "Selling", "Why was my listing rejected?", "The most common reasons are unclear photos, a misleading description or an item we cannot accept. The rejection message tells you what to fix, and you can submit it again.", { helpful: 33, notHelpful: 9 }),
    fq(6, "Selling", "What does ReOrbit charge?", "A platform fee of {platform_fee} is added to the buyer's order at checkout. Listing is free.", { helpful: 29, notHelpful: 2 }),
    fq(7, "Donating", "Is pickup really free?", "Yes. Once we accept your donation, a pickup team collects it from your door at no cost. You choose a date and a time slot.", { helpful: 118, notHelpful: 3 }),
    fq(8, "Donating", "What happens to my donation?", "Items in good shape are cleaned and sold. Items a ReMaker can restore are refurbished first. What we cannot sell goes to partner NGOs.", { helpful: 56, notHelpful: 2 }),
    fq(9, "Donating", "How do I earn Orbit Points?", "You earn points for every completed donation, for purchases and for reviews. Points can be used on vouchers at checkout.", { helpful: 47, notHelpful: 4 }),
    fq(10, "ReMakers", "How do I become a ReMaker?", "Create an account, choose ReMaker and add your portfolio. Our team verifies it, and once you are approved you can list your creations.", { helpful: 38, notHelpful: 5 }),
    fq(11, "ReMakers", "Can I take on refurbishment work?", "Yes. Verified ReMakers can be assigned items from the ReOrbit warehouse and are paid when the finished piece sells.", { helpful: 21, notHelpful: 3 }),
    fq(12, "Payments & refunds", "How long do refunds take?", "Once a return is checked, the money reaches your original payment method in 5 to 7 working days.", { helpful: 52, notHelpful: 8 }),
    fq(13, "Account", "How do I reset my password?", "On the login page choose Forgot password, enter your email and follow the link we send you.", { helpful: 44, notHelpful: 1 }),
    fq(14, "Account", "How do I delete my account?", "Go to Settings, then Account, and choose Delete account. Paid orders are kept as the law requires.", { helpful: 12, notHelpful: 2, published: false }),
  ],
  policies: [
    { key: "terms", title: "Terms of use", icon: "Scale", summary: "The rules for using ReOrbit.", version: "2.1", status: "Published", updatedAt: iso("2026-09-12T10:00:00"), updatedBy: "Nikhil Rao", draft: null,
      body: TERMS, versions: [ver("2.1", "2026-09-12T10:00:00", "Nikhil Rao", "Added the platform fee section", TERMS), ver("2.0", "2026-03-02T10:00:00", "Nikhil Rao", "Rewritten in plain language", TERMS.replace(/Orders placed by members[\s\S]*?\n\n## 4/, "Fees are shown at checkout.\n\n## 4")), ver("1.0", "2025-01-10T10:00:00", "Nikhil Rao", "First version", "## Using ReOrbit\nBy using ReOrbit you agree to these terms.")] },
    { key: "privacy", title: "Privacy policy", icon: "Lock", summary: "What we collect and why.", version: "1.4", status: "Published", updatedAt: iso("2026-07-05T10:00:00"), updatedBy: "Nikhil Rao", draft: null,
      body: PRIVACY, versions: [ver("1.4", "2026-07-05T10:00:00", "Nikhil Rao", "Clarified who sees addresses", PRIVACY), ver("1.0", "2025-01-10T10:00:00", "Nikhil Rao", "First version", "## What we collect\nYour name, email and the items you list.")] },
    { key: "refunds", title: "Returns and refunds", icon: "RotateCcw", summary: "When and how we give money back.", version: "1.2", status: "Published", updatedAt: iso("2026-08-20T10:00:00"), updatedBy: "Sneha Kulkarni", draft: { body: REFUNDS.replace("within 7 days", "within 10 days"), note: "Extend the return window to 10 days for Diwali", at: iso("2026-10-18T15:00:00"), by: "Sneha Kulkarni" },
      body: REFUNDS, versions: [ver("1.2", "2026-08-20T10:00:00", "Sneha Kulkarni", "Added platform fee refund", REFUNDS), ver("1.0", "2025-01-10T10:00:00", "Nikhil Rao", "First version", "## Returns\nTell us if an item is not as described.")] },
    { key: "shipping", title: "Shipping and delivery", icon: "Truck", summary: "How orders reach you.", version: "1.1", status: "Published", updatedAt: iso("2026-06-10T10:00:00"), updatedBy: "Nikhil Rao", draft: null,
      body: SHIPPING, versions: [ver("1.1", "2026-06-10T10:00:00", "Nikhil Rao", "Added cash on delivery", SHIPPING), ver("1.0", "2025-01-10T10:00:00", "Nikhil Rao", "First version", "## Delivery\nOrders are delivered in 3 to 7 working days.")] },
    { key: "donation", title: "Donation guidelines", icon: "Gift", summary: "What we accept and how pickups work.", version: "1.0", status: "Published", updatedAt: iso("2025-01-10T10:00:00"), updatedBy: "Nikhil Rao", draft: null,
      body: DONATION, versions: [ver("1.0", "2025-01-10T10:00:00", "Nikhil Rao", "First version", DONATION)] },
    { key: "community", title: "Community guidelines", icon: "UsersRound", summary: "How we expect everyone to behave.", version: "1.0", status: "Draft", updatedAt: iso("2026-10-14T10:00:00"), updatedBy: "Nikhil Rao", draft: null,
      body: COMMUNITY, versions: [], neverPublished: true },
  ],
  log: [],
};

const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => state;
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
const useRaw = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
const stamp = () => new Date().toISOString();
const logAdd = (by, text) => set({ log: [{ id: `L${Date.now()}${Math.random().toString(36).slice(2, 5)}`, by: by || "Admin", text, at: stamp() }, ...state.log].slice(0, 30) });

export const useContentLog = () => useRaw().log;

/* ---------------------------------------------------------
   Categories
   --------------------------------------------------------- */
export function useCategoryUsage() {
  const products = useProducts();
  const donations = useDonations();
  const stock = useStock();
  const listings = useSellListings();
  return useMemo(() => {
    const m = {};
    const bump = (name, key) => { if (!name) return; m[name] = m[name] || { live: 0, products: 0, donations: 0, stock: 0, listings: 0 }; m[name][key] += 1; };
    products.forEach((p) => { bump(p.category, "products"); if (p.state === "live") bump(p.category, "live"); });
    donations.forEach((d) => bump(d.category, "donations"));
    stock.forEach((s) => bump(s.category, "stock"));
    listings.forEach((l) => bump(l.category, "listings"));
    return m;
  }, [products, donations, stock, listings]);
}

export function useCategories() {
  const { categories } = useRaw();
  const usage = useCategoryUsage();
  return useMemo(() => categories.map((c, i) => {
    const u = usage[c.name] || { live: 0, products: 0, donations: 0, stock: 0, listings: 0 };
    const total = u.products + u.donations + u.stock + u.listings;
    return { ...c, position: i, usage: u, total, inUse: total > 0 };
  }), [categories, usage]);
}

/* Names members and admins can pick from (inactive ones are hidden). */
export function useActiveCategoryNames() {
  const { categories } = useRaw();
  return useMemo(() => categories.filter((c) => c.active).map((c) => c.name), [categories]);
}

export const categoryNameTaken = (name, exceptId) => state.categories.some((c) => c.id !== exceptId && c.name.trim().toLowerCase() === name.trim().toLowerCase());

export function createCategory(values, by) {
  const id = `CAT-${state.seq.cat}`;
  const other = state.categories.find((c) => c.locked);
  const next = { id, name: values.name.trim(), icon: values.icon, blurb: (values.blurb || "").trim(), active: true, locked: false, createdAt: stamp() };
  const list = state.categories.filter((c) => !c.locked);
  set({ seq: { ...state.seq, cat: state.seq.cat + 1 }, categories: [...list, next, ...(other ? [other] : [])] });
  logAdd(by, `Added the category “${next.name}”`);
  return id;
}
export function updateCategory(id, values, by) {
  const cur = state.categories.find((c) => c.id === id);
  if (!cur) return;
  set({ categories: state.categories.map((c) => (c.id !== id ? c : { ...c, name: values.name !== undefined ? values.name.trim() : c.name, icon: values.icon ?? c.icon, blurb: (values.blurb ?? c.blurb).trim() })) });
  logAdd(by, `Updated the category “${values.name?.trim() || cur.name}”`);
}
export function setCategoryActive(id, active, by) {
  const cur = state.categories.find((c) => c.id === id);
  set({ categories: state.categories.map((c) => (c.id === id ? { ...c, active } : c)) });
  if (cur) logAdd(by, `${active ? "Showed" : "Hid"} the category “${cur.name}”`);
}
export function moveCategory(id, dir) {
  const list = [...state.categories];
  const i = list.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length || list[j].locked || list[i].locked) return;
  [list[i], list[j]] = [list[j], list[i]];
  set({ categories: list });
}
export function removeCategory(id, by) {
  const cur = state.categories.find((c) => c.id === id);
  set({ categories: state.categories.filter((c) => c.id !== id) });
  if (cur) logAdd(by, `Deleted the category “${cur.name}”`);
}

/* ---------------------------------------------------------
   Banners
   --------------------------------------------------------- */
export function bannerStatus(b) {
  if (!b.active) return { key: "Draft", label: "Draft" };
  if (b.start && b.start > TODAY_KEY) return { key: "Scheduled", label: "Scheduled" };
  if (b.end && b.end < TODAY_KEY) return { key: "Ended", label: "Ended" };
  return { key: "Live", label: "Live" };
}
export function useBanners() {
  const { banners } = useRaw();
  return useMemo(() => banners.map((b) => {
    const st = bannerStatus(b);
    const ctr = b.views ? (b.clicks / b.views) * 100 : 0;
    const startsIn = b.start ? Math.round((new Date(b.start) - new Date(TODAY_KEY)) / DAY) : 0;
    const endsIn = b.end ? Math.round((new Date(b.end) - new Date(TODAY_KEY)) / DAY) : null;
    return { ...b, status: st.key, ctr, startsIn, endsIn };
  }), [banners]);
}
/* values: { title, subtitle, cta, link, placement, audience, image, start, end } */
export function saveBanner(id, values, by) {
  const clean = { title: values.title.trim(), subtitle: values.subtitle.trim(), cta: values.cta.trim(), link: values.link.trim(), placement: values.placement, audience: values.audience, image: values.image, start: values.start || "", end: values.end || "" };
  if (id) {
    set({ banners: state.banners.map((b) => (b.id === id ? { ...b, ...clean } : b)) });
    logAdd(by, `Updated the banner “${clean.title}”`);
    return id;
  }
  const nid = `BN-${state.seq.bn}`;
  set({ seq: { ...state.seq, bn: state.seq.bn + 1 }, banners: [...state.banners, { id: nid, ...clean, active: false, views: 0, clicks: 0, createdAt: stamp() }] });
  logAdd(by, `Created the banner “${clean.title}” as a draft`);
  return nid;
}
export function setBannerActive(id, active, by) {
  const cur = state.banners.find((b) => b.id === id);
  set({ banners: state.banners.map((b) => (b.id === id ? { ...b, active } : b)) });
  if (cur) logAdd(by, `${active ? "Published" : "Unpublished"} the banner “${cur.title}”`);
}
export function duplicateBanner(id, by) {
  const cur = state.banners.find((b) => b.id === id);
  if (!cur) return null;
  const nid = `BN-${state.seq.bn}`;
  set({ seq: { ...state.seq, bn: state.seq.bn + 1 }, banners: [...state.banners, { ...cur, id: nid, title: `${cur.title} (copy)`, active: false, views: 0, clicks: 0, createdAt: stamp() }] });
  logAdd(by, `Duplicated the banner “${cur.title}”`);
  return nid;
}
export function removeBanner(id, by) {
  const cur = state.banners.find((b) => b.id === id);
  set({ banners: state.banners.filter((b) => b.id !== id) });
  if (cur) logAdd(by, `Deleted the banner “${cur.title}”`);
}
export function moveBanner(id, dir) {
  const list = [...state.banners];
  const cur = list.find((b) => b.id === id);
  if (!cur) return;
  const sameIdx = list.map((b, i) => (b.placement === cur.placement ? i : -1)).filter((i) => i >= 0);
  const pos = sameIdx.indexOf(list.indexOf(cur));
  const target = sameIdx[pos + dir];
  if (target === undefined) return;
  const a = list.indexOf(cur);
  [list[a], list[target]] = [list[target], list[a]];
  set({ banners: list });
}

/* ---------------------------------------------------------
   FAQs
   --------------------------------------------------------- */
export const useFaqs = () => { const { faqs } = useRaw(); return useMemo(() => faqs.map((f, i) => ({ ...f, position: i })), [faqs]); };
/* values: { topic, q, a } */
export function saveFaq(id, values, by) {
  const clean = { topic: values.topic, q: values.q.trim(), a: values.a.trim() };
  if (id) {
    set({ faqs: state.faqs.map((f) => (f.id === id ? { ...f, ...clean } : f)) });
    logAdd(by, `Edited the FAQ “${clean.q}”`);
    return id;
  }
  const nid = `FQ-${state.seq.fq}`;
  set({ seq: { ...state.seq, fq: state.seq.fq + 1 }, faqs: [...state.faqs, { id: nid, ...clean, published: values.published !== false, helpful: 0, notHelpful: 0 }] });
  logAdd(by, `Added the FAQ “${clean.q}”`);
  return nid;
}
export function setFaqPublished(id, published, by) {
  const cur = state.faqs.find((f) => f.id === id);
  set({ faqs: state.faqs.map((f) => (f.id === id ? { ...f, published } : f)) });
  if (cur) logAdd(by, `${published ? "Published" : "Unpublished"} the FAQ “${cur.q}”`);
}
export function removeFaq(id, by) {
  const cur = state.faqs.find((f) => f.id === id);
  set({ faqs: state.faqs.filter((f) => f.id !== id) });
  if (cur) logAdd(by, `Deleted the FAQ “${cur.q}”`);
}
export function moveFaq(id, dir) {
  const list = [...state.faqs];
  const cur = list.find((f) => f.id === id);
  if (!cur) return;
  const sameIdx = list.map((f, i) => (f.topic === cur.topic ? i : -1)).filter((i) => i >= 0);
  const pos = sameIdx.indexOf(list.indexOf(cur));
  const target = sameIdx[pos + dir];
  if (target === undefined) return;
  const a = list.indexOf(cur);
  [list[a], list[target]] = [list[target], list[a]];
  set({ faqs: list });
}

/* ---------------------------------------------------------
   Policies
   --------------------------------------------------------- */
export const usePolicies = () => { const { policies } = useRaw(); return policies; };

const bump = (v, major) => { const [a, b] = String(v).split(".").map(Number); return major ? `${a + 1}.0` : `${a}.${b + 1}`; };

export function saveDraft(key, body, note, by) {
  set({ policies: state.policies.map((p) => (p.key === key ? { ...p, draft: { body, note: note || "", at: stamp(), by: by || "Admin" } } : p)) });
  logAdd(by, `Saved a draft of ${state.policies.find((p) => p.key === key)?.title}`);
}
export function discardDraft(key, by) {
  set({ policies: state.policies.map((p) => (p.key === key ? { ...p, draft: null } : p)) });
  logAdd(by, `Discarded the draft of ${state.policies.find((p) => p.key === key)?.title}`);
}
/* Publishing makes the body live and keeps the old one in the version list. */
export function publishPolicy(key, body, note, major, by) {
  const p = state.policies.find((x) => x.key === key);
  if (!p) return null;
  const first = p.neverPublished || !p.versions.length;
  const v = first ? "1.0" : bump(p.version, major);
  const at = stamp();
  set({
    policies: state.policies.map((x) => (x.key !== key ? x : {
      ...x, body, version: v, status: "Published", updatedAt: at, updatedBy: by || "Admin", draft: null, neverPublished: false,
      versions: [{ v, at, by: by || "Admin", note: note || "", body }, ...x.versions],
    })),
  });
  logAdd(by, `Published ${p.title} version ${v}`);
  return v;
}
/* Putting back an old version publishes it as a NEW version, so nothing is lost. */
export function restoreVersion(key, v, by) {
  const p = state.policies.find((x) => x.key === key);
  const old = p?.versions.find((x) => x.v === v);
  if (!old) return null;
  return publishPolicy(key, old.body, `Restored version ${v}`, false, by);
}

/* Fills {tokens} with the live values from Settings. */
export function fillTokens(text, commerce, warehouse) {
  const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
  return String(text || "")
    .replace(/\{platform_fee\}/g, `${commerce?.platformFeePct ?? 3}%`)
    .replace(/\{free_delivery_from\}/g, inr(commerce?.freeDeliveryFrom ?? 1500))
    .replace(/\{cod_limit\}/g, inr(commerce?.codLimit ?? 20000))
    .replace(/\{unsold_days\}/g, String(warehouse?.unsoldDays ?? 7));
}

/* The few lines of markup we allow: “## Heading”, “- bullet”, blank-line paragraphs. */
export function parseBody(text) {
  const blocks = [];
  String(text || "").split(/\n{2,}/).forEach((chunk) => {
    const lines = chunk.split("\n");
    let para = [];
    const flush = () => { if (para.length) { blocks.push({ type: "p", text: para.join(" ") }); para = []; } };
    let list = null;
    lines.forEach((ln) => {
      if (/^##\s+/.test(ln)) { flush(); list = null; blocks.push({ type: "h", text: ln.replace(/^##\s+/, "") }); }
      else if (/^-\s+/.test(ln)) { flush(); if (!list) { list = { type: "ul", items: [] }; blocks.push(list); } list.items.push(ln.replace(/^-\s+/, "")); }
      else if (ln.trim()) { list = null; para.push(ln.trim()); }
    });
    flush();
  });
  return blocks;
}
