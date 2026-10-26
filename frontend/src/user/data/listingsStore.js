/* =========================================================
   User › Selling (UI only, in-memory).
   A user lists pre-loved items. Each listing goes
   Draft -> Under review -> Live -> Reserved -> Sold
   (or Rejected by the team / Withdrawn by the seller).
   Live listings are added to the marketplace, and sales come
   in as orders the seller has to pack and ship.
   Backend later: Items, Item_Images, Orders (seller side).
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { ITEMS } from "../../data/marketplaceData";

const DAY = 86400000;
const ago = (d, h = 0) => new Date(Date.now() - d * DAY - h * 3600000).toISOString();

export const SELLER = {
  id: "user-aarav-patel",
  name: "Aarav Patel",
  city: "Ahmedabad",
  pincode: "380015",
  image: "/images/users/aarav-patel.jpg",
  rating: 4.9,
};

export const COMMISSION_PCT = 8;
export const PLATFORM_PICKUP_FEE = 99;

export const SELL_CATEGORIES = ["Furniture", "Electronics", "Home & Living", "Clothing", "Books", "Decor"];
export const SELL_CONDITIONS = [
  { id: "Excellent", help: "Like new. No visible wear." },
  { id: "Very Good", help: "Light signs of use, fully working." },
  { id: "Good", help: "Clearly used but sound and usable." },
];
export const PICKUP_OPTIONS = [
  { id: "self", label: "I'll hand it over to the courier", help: "You pack it and the buyer's courier collects from your door. No extra fee." },
  { id: "platform", label: "Managed by ReOrbit", help: `We collect, check and deliver it for you. A ₹${PLATFORM_PICKUP_FEE} service fee is taken from your payout.` },
];

export const LISTING_STATUS = {
  Draft: { label: "Draft", tone: "grey", blurb: "Not submitted yet." },
  Pending: { label: "Under review", tone: "amber", blurb: "Our team is verifying your item." },
  Live: { label: "Live", tone: "green", blurb: "Visible to buyers on the marketplace." },
  Reserved: { label: "Reserved", tone: "blue", blurb: "A buyer has ordered it. Pack and ship it." },
  Sold: { label: "Sold", tone: "violet", blurb: "Delivered to the buyer." },
  Rejected: { label: "Rejected", tone: "red", blurb: "It didn't pass verification." },
  Withdrawn: { label: "Withdrawn", tone: "grey", blurb: "You took it off the marketplace." },
};

export const SALE_STEPS = ["Confirmed", "Packed", "Shipped", "Delivered"];

const ev = (id, label, detail, at, tone = "neutral") => ({ id, label, detail, at, tone });

/* ---------- seed ---------- */

const baseListing = (over) => ({
  quantity: 1,
  city: SELLER.city,
  pincode: SELLER.pincode,
  pickup: "self",
  views: 0,
  likes: 0,
  rejectReason: "",
  marketId: null,
  ...over,
});

const seedListings = () => [
  baseListing({
    id: "LST-3001", marketId: "ceramic-table-lamp", title: "Handmade ceramic table lamp", category: "Home & Living",
    description: "A handmade ceramic table lamp with a warm glaze, bought for my studio and barely used.",
    condition: "Excellent", price: 1650, images: ["/images/products/ceramic-lamp.jpg"], status: "Live",
    createdAt: ago(40), views: 212, likes: 38,
    events: [
      ev("e1", "Listing submitted", "Sent for verification", ago(40), "neutral"),
      ev("e2", "Verified and live", "Now visible on the marketplace", ago(39), "good"),
    ],
  }),
  baseListing({
    id: "LST-3002", title: "Walnut bookshelf, 4 shelves", category: "Furniture",
    description: "Solid walnut bookshelf with four adjustable shelves. A few light scratches on the side panel.",
    condition: "Very Good", price: 3800, images: ["/images/products/wooden-table.jpg"], status: "Pending",
    createdAt: ago(1, 4), pickup: "platform",
    events: [ev("e1", "Listing submitted", "Sent for verification", ago(1, 4), "neutral")],
  }),
  baseListing({
    id: "LST-3003", title: "Brass floor lamp", category: "Home & Living",
    description: "Vintage brass floor lamp, needs a new bulb holder.",
    condition: "Good", price: 2200, images: ["/images/products/default-item.jpg"], status: "Rejected",
    createdAt: ago(9), rejectReason: "The photo is too dark to judge the condition and the description mentions a fault. Please add clear photos and say what needs fixing.",
    events: [
      ev("e1", "Listing submitted", "Sent for verification", ago(9), "neutral"),
      ev("e2", "Not approved", "Photos unclear and a fault is mentioned.", ago(8), "bad"),
    ],
  }),
  baseListing({
    id: "LST-3004", title: "Cane stool set (2)", category: "Furniture",
    description: "Two matching cane stools in great shape. Used lightly in a reading corner.",
    condition: "Very Good", price: 2400, quantity: 1, images: ["/images/products/vintage-chair.jpg"], status: "Sold",
    createdAt: ago(30), views: 164, likes: 21,
    events: [
      ev("e1", "Listing submitted", "Sent for verification", ago(30), "neutral"),
      ev("e2", "Verified and live", "Now visible on the marketplace", ago(29), "good"),
      ev("e3", "Sold", "Order SL-5102 delivered", ago(14), "good"),
    ],
  }),
  baseListing({
    id: "LST-3005", marketId: "design-books-stack", title: "Stack of design books (12)", category: "Books",
    description: "Twelve design and architecture books, clean pages, no highlighting.",
    condition: "Very Good", price: 900, images: ["https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80"], status: "Reserved",
    createdAt: ago(12), views: 96, likes: 14,
    events: [
      ev("e1", "Listing submitted", "Sent for verification", ago(12), "neutral"),
      ev("e2", "Verified and live", "Now visible on the marketplace", ago(11), "good"),
      ev("e3", "Order received", "Order SL-5104 is waiting to be packed", ago(1), "info"),
    ],
  }),
  baseListing({
    id: "LST-3006", title: "Vintage brass wall mirror", category: "Decor",
    description: "Round brass-framed mirror, 60 cm wide.",
    condition: "Good", price: 1400, images: [], status: "Draft", createdAt: ago(2),
    events: [ev("e1", "Draft saved", "Not submitted yet", ago(2), "neutral")],
  }),
];

const seedSales = () => [
  {
    id: "SL-5104", listingId: "LST-3005", title: "Stack of design books (12)", image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
    buyer: { name: "Pooja Nair", city: "Pune" }, qty: 1, price: 900, placedAt: ago(1), status: "Confirmed",
    payout: { status: "Pending", at: null }, courier: null,
    events: [ev("e1", "Order placed", "Pooja Nair ordered your books", ago(1), "neutral"), ev("e2", "Payment secured", "Held by ReOrbit until delivery", ago(1), "good")],
  },
  {
    id: "SL-5102", listingId: "LST-3004", title: "Cane stool set (2)", image: "/images/products/vintage-chair.jpg",
    buyer: { name: "Harsh Mehta", city: "Surat" }, qty: 1, price: 2400, placedAt: ago(20), status: "Delivered",
    payout: { status: "Paid", at: ago(12) }, courier: { name: "Delhivery", awb: "DLV51029" },
    events: [
      ev("e1", "Order placed", "Harsh Mehta ordered your stools", ago(20), "neutral"),
      ev("e2", "Packed", "You packed the order", ago(19), "info"),
      ev("e3", "Shipped", "Delhivery · DLV51029", ago(18), "info"),
      ev("e4", "Delivered", "Handed over to the buyer", ago(14), "good"),
      ev("e5", "Payout sent", "Credited to your account", ago(12), "good"),
    ],
  },
];

/* Live seed listings are shown on the marketplace too. */
function publish(listing) {
  if (listing.marketId && ITEMS.some((i) => i.id === listing.marketId)) return;
  const id = listing.marketId || `${listing.id.toLowerCase()}-${listing.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`;
  listing.marketId = id;
  ITEMS.unshift({
    id,
    title: listing.title,
    category: listing.category,
    price: listing.price,
    image: listing.images[0] || "/images/products/default-item.jpg",
    summary: listing.description.slice(0, 110),
    description: listing.description,
    city: listing.city,
    pincode: listing.pincode,
    co2SavedKg: Math.max(4, Math.round(listing.price / 60)),
    sellerRating: SELLER.rating,
    condition: listing.condition,
    seller: SELLER.name,
    sellerId: SELLER.id,
    sellerType: "user",
    sellerImage: SELLER.image,
    quantity: listing.quantity,
    views: 0,
    likes: 0,
    listedDate: new Date().toISOString().slice(0, 10),
  });
}
function unpublish(listing) {
  const i = ITEMS.findIndex((x) => x.id === listing.marketId);
  if (i >= 0 && listing.id !== "LST-3001") ITEMS.splice(i, 1);
}

/* ---------- store ---------- */

let listings = seedListings();
let sales = seedSales();
let seq = 3006;
let saleSeq = 5104;
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const emit = () => listeners.forEach((l) => l());
let snap = { listings, sales };
const getSnapshot = () => snap;
const commit = () => { snap = { listings, sales }; emit(); };

listings.filter((l) => l.status === "Live" || l.status === "Reserved").forEach(publish);

const patchListing = (id, fn) => {
  listings = listings.map((l) => (l.id === id ? fn(l) : l));
  commit();
};
const now = () => new Date().toISOString();
const evId = (l) => `e${l.events.length + 1}-${Date.now()}`;

/* The review is simulated: a new listing goes Live a few seconds later. */
const REVIEW_MS = 7000;
function scheduleApproval(id) {
  setTimeout(() => {
    const target = listings.find((l) => l.id === id);
    if (!target || target.status !== "Pending") return;
    patchListing(id, (l) => ({
      ...l,
      status: "Live",
      events: [...l.events, { id: evId(l), label: "Verified and live", detail: "Now visible on the marketplace", at: now(), tone: "good" }],
    }));
    publish(listings.find((l) => l.id === id));
    commit();
  }, REVIEW_MS);
}

export function saveListing(form, { submit = true, id = null } = {}) {
  const data = {
    title: form.title.trim(),
    category: form.category,
    description: form.description.trim(),
    condition: form.condition,
    price: Number(form.price),
    quantity: Number(form.quantity) || 1,
    images: form.images,
    city: form.city,
    pincode: form.pincode,
    pickup: form.pickup,
  };

  if (id) {
    patchListing(id, (l) => {
      const wasRejected = l.status === "Rejected" || l.status === "Draft" || l.status === "Withdrawn";
      const status = submit ? (l.status === "Live" || l.status === "Reserved" ? l.status : "Pending") : l.status;
      return {
        ...l,
        ...data,
        status,
        rejectReason: submit && wasRejected ? "" : l.rejectReason,
        events: [
          ...l.events,
          { id: evId(l), label: submit && wasRejected ? "Resubmitted for review" : "Listing updated", detail: submit && wasRejected ? "Sent for verification" : "Your changes were saved", at: now(), tone: "neutral" },
        ],
      };
    });
    const updated = listings.find((l) => l.id === id);
    if (updated.status === "Pending") scheduleApproval(id);
    if (updated.marketId) {
      const m = ITEMS.find((i) => i.id === updated.marketId);
      if (m) Object.assign(m, { title: data.title, category: data.category, price: data.price, description: data.description, summary: data.description.slice(0, 110), condition: data.condition, image: data.images[0] || m.image, quantity: data.quantity });
    }
    return updated;
  }

  seq += 1;
  const listing = {
    id: `LST-${seq}`,
    ...data,
    status: submit ? "Pending" : "Draft",
    createdAt: now(),
    views: 0,
    likes: 0,
    rejectReason: "",
    marketId: null,
    events: [{ id: "e1", label: submit ? "Listing submitted" : "Draft saved", detail: submit ? "Sent for verification" : "Not submitted yet", at: now(), tone: "neutral" }],
  };
  listings = [listing, ...listings];
  commit();
  if (submit) scheduleApproval(listing.id);
  return listing;
}

export function withdrawListing(id) {
  const l = listings.find((x) => x.id === id);
  if (!l) return;
  unpublish(l);
  patchListing(id, (x) => ({
    ...x,
    status: "Withdrawn",
    events: [...x.events, { id: evId(x), label: "Withdrawn", detail: "You removed it from the marketplace", at: now(), tone: "bad" }],
  }));
}

export function relistListing(id) {
  patchListing(id, (x) => ({
    ...x,
    status: "Pending",
    events: [...x.events, { id: evId(x), label: "Relisted", detail: "Sent for verification", at: now(), tone: "neutral" }],
  }));
  scheduleApproval(id);
}

export function deleteListing(id) {
  listings = listings.filter((l) => l.id !== id);
  commit();
}

/* seller moves a sale along: Confirmed -> Packed -> Shipped -> Delivered */
export function advanceSale(id) {
  const sale = sales.find((s) => s.id === id);
  if (!sale) return;
  const idx = SALE_STEPS.indexOf(sale.status);
  if (idx < 0 || idx >= SALE_STEPS.length - 1) return;
  const next = SALE_STEPS[idx + 1];
  const detail = { Packed: "You packed the order", Shipped: "Delhivery · DLV" + id.replace(/\D/g, "") + "7", Delivered: "Handed over to the buyer" }[next];

  sales = sales.map((s) =>
    s.id === id
      ? {
          ...s,
          status: next,
          courier: next === "Shipped" ? { name: "Delhivery", awb: `DLV${id.replace(/\D/g, "")}7` } : s.courier,
          payout: next === "Delivered" ? { status: "Processing", at: now() } : s.payout,
          events: [...s.events, { id: `e${s.events.length + 1}-${Date.now()}`, label: next, detail, at: now(), tone: next === "Delivered" ? "good" : "info" }],
        }
      : s,
  );
  if (next === "Delivered") {
    patchListing(sale.listingId, (l) => ({
      ...l,
      status: "Sold",
      events: [...l.events, { id: evId(l), label: "Sold", detail: `Order ${id} delivered`, at: now(), tone: "good" }],
    }));
  } else commit();
}

/* ---------- hooks + derived ---------- */

export const netOf = (sale) => {
  const gross = sale.price * sale.qty;
  const commission = Math.round((gross * COMMISSION_PCT) / 100);
  const l = listings.find((x) => x.id === sale.listingId);
  const pickupFee = l?.pickup === "platform" ? PLATFORM_PICKUP_FEE : 0;
  return { gross, commission, pickupFee, net: gross - commission - pickupFee };
};

export function useListings() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return s.listings;
}
export function useListing(id) {
  const list = useListings();
  return useMemo(() => list.find((l) => l.id === id) || null, [list, id]);
}
export function useSales() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(
    () => s.sales.map((x) => ({ ...x, ...netOf(x), listing: s.listings.find((l) => l.id === x.listingId) || null })),
    [s],
  );
}
export function useSale(id) {
  const sales = useSales();
  return useMemo(() => sales.find((s) => s.id === id) || null, [sales, id]);
}

export function summarizeSelling(listings, sales) {
  const delivered = sales.filter((s) => s.status === "Delivered");
  const inFlight = sales.filter((s) => s.status !== "Delivered");
  return {
    live: listings.filter((l) => l.status === "Live").length,
    review: listings.filter((l) => l.status === "Pending").length,
    drafts: listings.filter((l) => l.status === "Draft").length,
    sold: listings.filter((l) => l.status === "Sold").length,
    toShip: sales.filter((s) => ["Confirmed", "Packed"].includes(s.status)).length,
    earned: delivered.filter((s) => s.payout.status === "Paid").reduce((n, s) => n + s.net, 0),
    pending: [...delivered.filter((s) => s.payout.status !== "Paid"), ...inFlight].reduce((n, s) => n + s.net, 0),
    views: listings.reduce((n, l) => n + (l.views || 0), 0),
  };
}

