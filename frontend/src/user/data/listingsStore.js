/* =========================================================
   User › Selling (UI only, in-memory).
   A user lists pre-loved items. Published listings go live straight away:
   Draft -> Live -> Reserved -> Sold (or Withdrawn by the seller). The team
   can still switch one off, with a reason, from Admin > Products.
   Sellers keep the full price: no commission and no pickup fee.
   Live listings are added to the marketplace, and sales come
   in as orders the seller has to pack and ship.
   Listings are real (/api/listings/me/). Sales are still demo data until the
   orders domain is wired.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { useEffect } from "react";
import * as api from "../../api/listings";

const DAY = 86400000;
const ago = (d, h = 0) =>
  new Date(Date.now() - d * DAY - h * 3600000).toISOString();

export const SELLER = {
  id: "user-aarav-patel",
  name: "Aarav Patel",
  city: "Ahmedabad",
  pincode: "380015",
  image: "/images/users/aarav-patel.jpg",
  rating: 4.9,
};

export const SELL_CATEGORIES = [
  "Furniture",
  "Electronics",
  "Home Decor",
  "Clothing",
  "Books",
]; /* fallback; the form reads Admin > Content */
export const SELL_CONDITIONS = [
  { id: "Excellent", help: "Like new. No visible wear." },
  { id: "Very Good", help: "Light signs of use, fully working." },
  { id: "Good", help: "Clearly used but sound and usable." },
  { id: "Fair", help: "Well used, with visible wear. Price it fairly." },
];
export const PICKUP_OPTIONS = [
  {
    id: "self",
    label: "I'll hand it over to the courier",
    help: "You pack it and the buyer's courier collects from your door. No extra fee.",
  },
  {
    id: "platform",
    label: "Managed by ReOrbit",
    help: "We collect, check and deliver it for you. It's free for you, and the buyer pays for delivery.",
  },
];

export const LISTING_STATUS = {
  Draft: { label: "Draft", tone: "grey", blurb: "Not published yet." },
  Live: {
    label: "Live",
    tone: "green",
    blurb: "Visible to buyers on the marketplace.",
  },
  Reserved: {
    label: "Reserved",
    tone: "blue",
    blurb: "A buyer has ordered it. Pack and ship it.",
  },
  Sold: { label: "Sold", tone: "violet", blurb: "Delivered to the buyer." },
  Withdrawn: {
    label: "Withdrawn",
    tone: "grey",
    blurb: "You took it off the marketplace.",
  },
  Donated: {
    label: "Donated",
    tone: "violet",
    blurb: "Given away through ReOrbit donations.",
  },
  Warehouse: {
    label: "In warehouse",
    tone: "blue",
    blurb: "Held at the ReOrbit warehouse.",
  },
};

export const SALE_STEPS = ["Confirmed", "Packed", "Shipped", "Delivered"];

const ev = (id, label, detail, at, tone = "neutral") => ({
  id,
  label,
  detail,
  at,
  tone,
});

const seedSales = () => [
  {
    id: "SL-5104",
    listingId: "LST-3005",
    title: "Stack of design books (12)",
    image:
      "https://images.pexels.com/photos/16009657/pexels-photo-16009657.jpeg?auto=compress&cs=tinysrgb&w=1000",
    buyer: { name: "Pooja Nair", city: "Pune" },
    qty: 1,
    price: 900,
    placedAt: ago(1),
    status: "Confirmed",
    payout: { status: "Pending", at: null },
    courier: null,
    events: [
      ev(
        "e1",
        "Order placed",
        "Pooja Nair ordered your books",
        ago(1),
        "neutral",
      ),
      ev(
        "e2",
        "Payment secured",
        "Held by ReOrbit until delivery",
        ago(1),
        "good",
      ),
    ],
  },
  {
    id: "SL-5102",
    listingId: "LST-3004",
    title: "Cane stool set (2)",
    image:
      "https://images.pexels.com/photos/696407/pexels-photo-696407.jpeg?auto=compress&cs=tinysrgb&w=1000",
    buyer: { name: "Harsh Mehta", city: "Surat" },
    qty: 1,
    price: 2400,
    placedAt: ago(20),
    status: "Delivered",
    payout: { status: "Paid", at: ago(12) },
    courier: { name: "Delhivery", awb: "DLV51029" },
    events: [
      ev(
        "e1",
        "Order placed",
        "Harsh Mehta ordered your stools",
        ago(20),
        "neutral",
      ),
      ev("e2", "Packed", "You packed the order", ago(19), "info"),
      ev("e3", "Shipped", "Delhivery · DLV51029", ago(18), "info"),
      ev("e4", "Delivered", "Handed over to the buyer", ago(14), "good"),
      ev("e5", "Payout sent", "Credited to your account", ago(12), "good"),
    ],
  },
];

/* ---------- mapping the API <-> the shapes the screens use ---------- */

const STATUS_IN = { Listed: "Live" };
const PICKUP_IN = { Seller_Handover: "self", Platform_Pickup: "platform" };
const PICKUP_OUT = { self: "Seller_Handover", platform: "Platform_Pickup" };

function fromApi(a) {
  const status = STATUS_IN[a.item_status] || a.item_status;
  const events = [
    ev(
      "created",
      status === "Draft" ? "Draft saved" : "Listing created",
      a.item_status === "Draft"
        ? "Not published yet"
        : "Your listing was saved",
      a.created_at,
      "neutral",
    ),
  ];
  if (!["Draft"].includes(a.item_status)) {
    const text = {
      Live: ["Listing published", "Visible on the marketplace", "good"],
      Withdrawn: ["Withdrawn", "You removed it from the marketplace", "bad"],
      Reserved: ["Reserved", "A buyer has ordered it", "info"],
      Sold: ["Sold", "Delivered to the buyer", "good"],
    }[status];
    if (text) events.push(ev("state", text[0], text[1], a.updated_at, text[2]));
  }
  const disabled = a.moderation_status === "Disabled";
  if (disabled)
    events.push(
      ev(
        "mod",
        "Turned off by ReOrbit",
        a.moderation_note || "No reason was given.",
        a.moderated_at || a.updated_at,
        "bad",
      ),
    );
  return {
    id: a.id,
    title: a.title,
    category: a.category?.name || "",
    description: a.description || "",
    condition: a.condition || "",
    price: a.listing_price == null ? 0 : Number(a.listing_price),
    quantity: a.quantity,
    images: (a.images || []).map((i) => i.url),
    imageRows: a.images || [],
    city: a.city,
    pincode: a.pincode,
    pickup: PICKUP_IN[a.pickup_preference] || "self",
    status,
    createdAt: a.created_at,
    views: 0,
    likes: 0,
    marketId: status === "Live" && !disabled ? a.id : null,
    adminDisabled: disabled
      ? {
          reason: a.moderation_note || "No reason was given.",
          at: a.moderated_at,
        }
      : null,
    flagged:
      a.moderation_status === "Flagged"
        ? { reason: a.moderation_note || "No reason was given." }
        : null,
    suggestedPrice:
      a.suggestion_status === "Pending" ? Number(a.suggested_price) : null,
    suggestedMessage:
      a.suggestion_status === "Pending" ? a.suggested_note || "" : "",
    events,
  };
}

/* ---------- store ---------- */

let listings = [];
let sales = seedSales();
let limit = { cap: 5, used: 0 };
let categories = [];
let loaded = false;
let loadError = "";
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const emit = () => listeners.forEach((l) => l());
let snap = { listings, sales, loaded, loadError, categories };
const getSnapshot = () => snap;
const commit = () => {
  snap = { listings, sales, loaded, loadError, categories };
  emit();
};

const apply = (data) => {
  if (data.limit) limit = data.limit;
  if (data.listing) {
    const row = fromApi(data.listing);
    listings = listings.some((l) => l.id === row.id)
      ? listings.map((l) => (l.id === row.id ? row : l))
      : [row, ...listings];
    commit();
    return row;
  }
  commit();
  return null;
};

let inFlight = null;
export function loadListings({ force = false } = {}) {
  if (inFlight && !force) return inFlight;
  inFlight = api
    .fetchMyListings()
    .then((data) => {
      listings = data.listings.map(fromApi);
      limit = data.limit;
      loaded = true;
      loadError = "";
    })
    .catch((e) => {
      loadError = e.message || "Could not load your listings.";
    })
    .finally(() => {
      inFlight = null;
      commit();
    });
  return inFlight;
}

/* sell-form categories, from the server (Admin > Content manages them) */
let categoriesLoaded = false;
export function useSellCategories() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (categoriesLoaded) return;
    categoriesLoaded = true;
    api
      .fetchCategories()
      .then((c) => {
        categories = c;
        commit();
      })
      .catch(() => {
        categoriesLoaded = false;
      });
  }, []);
  return s.categories;
}

/* How many listings this member has published today, and the daily cap from Admin > Settings. */
export function listingLimitStatus() {
  return { cap: limit.cap, used: limit.used, reached: limit.used >= limit.cap };
}

const bodyOf = (form) => ({
  title: form.title,
  category: categories.find((c) => c.name === form.category)?.id,
  description: form.description,
  condition: form.condition,
  quantity: Number(form.quantity) || 1,
  listing_price:
    form.price === "" || form.price == null ? null : Number(form.price),
  pickup_preference: PICKUP_OUT[form.pickup],
  city: form.city,
  pincode: form.pincode,
});

/* Make the server's photos match the form: remove, upload new, then set the order.
   form.images: [{ id, url, file?, serverId? }] in the order the seller chose. */
async function syncImages(listingId, formImages, current) {
  const keep = new Set(
    formImages.filter((i) => i.serverId).map((i) => i.serverId),
  );
  for (const row of current)
    if (!keep.has(row.id)) await api.deleteListingImage(listingId, row.id);
  const fresh = formImages.filter((i) => i.file);
  let rows = (current || []).filter((r) => keep.has(r.id));
  if (fresh.length) {
    const res = await api.uploadListingImages(
      listingId,
      fresh.map((i) => i.file),
    );
    rows = res.listing.images;
    apply(
      res,
    ); /* keep the store's photo list in step so a retry sees what is already uploaded */
    const added = rows.slice(rows.length - fresh.length);
    fresh.forEach((f, n) => {
      f.serverId = added[n].id;
    });
  }
  const order = formImages.map((i) => i.serverId).filter(Boolean);
  if (order.length > 1 && order.some((id, n) => rows[n]?.id !== id))
    await api.reorderListingImages(listingId, order);
}

/* Saves the form. submit=false keeps/creates a draft; submit=true also publishes.
   Throws an Error with .errors / .code from the server when something is wrong. */
export async function saveListing(
  form,
  { submit = true, id = null, onCreated } = {},
) {
  let data;
  const before = id ? listings.find((l) => l.id === id) : null;
  if (id) {
    data = await api.updateListing(id, bodyOf(form));
  } else {
    data = await api.createListing(bodyOf(form));
    id = data.listing.id;
    apply(data);
    /* The draft now exists on the server. Tell the caller its id straight away so a retry
       continues this draft instead of creating a second one. */
    if (onCreated) onCreated(id);
  }
  await syncImages(
    id,
    form.images,
    before?.imageRows || data.listing.images || [],
  );
  if (
    submit &&
    !["Listed", "Reserved", "Sold"].includes(data.listing.item_status)
  ) {
    data = await api.publishListing(id);
  } else {
    data = await api.updateListing(id, {});
  }
  return apply(data);
}

export async function withdrawListing(id) {
  return apply(await api.withdrawListing(id));
}
export async function relistListing(id) {
  return apply(await api.publishListing(id));
}
/* Take (accept = true) or decline the price ReOrbit suggested. */
export async function answerPriceSuggestion(id, accept) {
  return apply(await api.answerPriceSuggestion(id, accept));
}
export async function deleteListing(id) {
  await api.deleteListing(id);
  listings = listings.filter((l) => l.id !== id);
  commit();
}

/* seller moves a sale along: Confirmed -> Packed -> Shipped -> Delivered (demo until orders are wired) */
export function advanceSale(id) {
  const sale = sales.find((s) => s.id === id);
  if (!sale) return;
  const idx = SALE_STEPS.indexOf(sale.status);
  if (idx < 0 || idx >= SALE_STEPS.length - 1) return;
  const next = SALE_STEPS[idx + 1];
  const detail = {
    Packed: "You packed the order",
    Shipped: "Delhivery · DLV" + id.replace(/\D/g, "") + "7",
    Delivered: "Handed over to the buyer",
  }[next];
  sales = sales.map((s) =>
    s.id === id
      ? {
          ...s,
          status: next,
          courier:
            next === "Shipped"
              ? { name: "Delhivery", awb: `DLV${id.replace(/\D/g, "")}7` }
              : s.courier,
          payout:
            next === "Delivered"
              ? { status: "Processing", at: new Date().toISOString() }
              : s.payout,
          events: [
            ...s.events,
            {
              id: `e${s.events.length + 1}-${Date.now()}`,
              label: next,
              detail,
              at: new Date().toISOString(),
              tone: next === "Delivered" ? "good" : "info",
            },
          ],
        }
      : s,
  );
  commit();
}

/* ---------- hooks + derived ---------- */

export const netOf = (sale) => {
  /* Sellers keep the full price. The buyer pays the platform fee and delivery on top. */
  const gross = sale.price * sale.qty;
  return { gross, commission: 0, pickupFee: 0, net: gross };
};

export function useListings() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (!loaded) loadListings();
  }, []);
  return s.listings;
}
/* true until the first load finishes; error text if it failed */
export function useListingsStatus() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    loaded: s.loaded,
    error: s.loadError,
    retry: () => loadListings({ force: true }),
  };
}
export function useListing(id) {
  const list = useListings();
  return useMemo(() => list.find((l) => l.id === id) || null, [list, id]);
}
export function useSales() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(
    () =>
      s.sales.map((x) => ({
        ...x,
        ...netOf(x),
        listing: s.listings.find((l) => l.id === x.listingId) || null,
      })),
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
    drafts: listings.filter((l) => l.status === "Draft").length,
    sold: listings.filter((l) => l.status === "Sold").length,
    toShip: sales.filter((s) => ["Confirmed", "Packed"].includes(s.status))
      .length,
    earned: delivered
      .filter((s) => s.payout.status === "Paid")
      .reduce((n, s) => n + s.net, 0),
    pending: [
      ...delivered.filter((s) => s.payout.status !== "Paid"),
      ...inFlight,
    ].reduce((n, s) => n + s.net, 0),
    views: listings.reduce((n, l) => n + (l.views || 0), 0),
  };
}
