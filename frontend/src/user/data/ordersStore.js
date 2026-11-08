/* =========================================================
   User › Buying orders. Real orders from the server, shaped
   like the old demo orders so every order screen keeps working.
   One server order = one seller's parcel; it can hold several
   products (order.lines).
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { addSellerReview, getItemById } from "../../data/marketplaceData";
import { buyerOrdersApi } from "../../api/orders";

export const STAGES = [
  {
    key: "placed",
    label: "Order placed",
    short: "Placed",
    text: "We received your order and payment.",
  },
  {
    key: "confirmed",
    label: "Seller confirmed",
    short: "Confirmed",
    text: "The seller accepted your order.",
  },
  {
    key: "packed",
    label: "Packed",
    short: "Packed",
    text: "Your item is packed and ready to ship.",
  },
  {
    key: "shipped",
    label: "Shipped",
    short: "Shipped",
    text: "Handed to the delivery partner.",
  },
  {
    key: "out",
    label: "Out for delivery",
    short: "Out for delivery",
    text: "Your parcel is with the courier near you.",
  },
  {
    key: "delivered",
    label: "Delivered",
    short: "Delivered",
    text: "Delivered and handed over.",
  },
];

/* the tab / badge status for a stage */
export function statusOf(order) {
  if (order.cancelled) return "Cancelled";
  if (order.stage >= 5) return "Delivered";
  if (order.stage >= 3) return "Shipped";
  if (order.stage === 2) return "Processing";
  return "Confirmed";
}

export const STATUS_TONE = {
  Confirmed: "blue",
  Processing: "amber",
  Shipped: "violet",
  Delivered: "green",
  Cancelled: "red",
};

export const PAYMENT_LABEL = {
  RAZORPAY: "Online (Razorpay)",
  UPI: "UPI",
  CARD: "Card",
  NET_BANKING: "Net banking",
  WALLET: "Wallet",
  COD: "Cash on delivery",
};

export const CANCEL_REASONS = [
  "Ordered by mistake",
  "Found a better option",
  "Delivery is taking too long",
  "Want to change address or details",
  "Other",
];


/* ---------- server order -> screen order ---------- */
const STAGE_OF = { Pending_Payment: 0, Confirmed: 1, Packed: 2, Shipped: 3, Delivered: 5, Cancelled: 0 };

function adapt(o, reviews) {
  const lines = o.items || [];
  const first = lines[0] || {};
  const qty = lines.reduce((n, l) => n + l.qty, 0) || 1;
  const more = lines.length - 1;
  const cancelled = o.status === "Cancelled";
  const events = (o.events || []).map((e, i) => ({
    id: /cancel/i.test(e.label) ? "cancel" : `${e.label}-${i}`,
    label: e.label,
    detail: e.detail || "",
    at: e.at,
  }));
  return {
    id: o.id,
    apiStatus: o.status,
    itemId: first.id,
    lines,
    qty,
    price: Math.round(o.subtotal / qty),
    subtotal: o.subtotal,
    shipping: o.delivery_fee,
    platformFee: o.platform_fee,
    discount: 0,
    total: o.total,
    placedAt: o.created_at,
    stage: STAGE_OF[o.status] ?? 0,
    cancelled,
    cancelReason: o.cancel_reason || "",
    payment: o.payment.method,
    paymentStatus: o.payment.status,
    paymentId: o.payment.id,
    awaitingPayment: o.status === "Pending_Payment",
    canCancel: !!o.can_cancel,
    courier: o.courier ? { name: o.courier.name, awb: o.courier.tracking_no, phone: "" } : null,
    eta: null,
    deliveredAt: o.delivered_at || null,
    review: reviews[o.id] || null,
    reference: o.payment.id,
    note: o.note || "",
    events,
    eventsLoaded: !!o.events,
    refund:
      o.payment.status === "Refunded"
        ? { amount: o.total, status: "Refunded", at: o.cancelled_at }
        : o.payment.status === "Refund_Failed"
          ? { amount: o.total, status: "Processing", at: o.cancelled_at }
          : null,
    address: {
      name: o.address?.name, line: [o.address?.line1, o.address?.line2].filter(Boolean).join(", "),
      city: o.address?.city, state: o.address?.state, pincode: o.address?.pincode, phone: o.address?.phone,
    },
    seller: o.seller,
    item: {
      id: first.id, title: more > 0 ? `${first.title} + ${more} more` : first.title || "Order",
      image: first.cover || "", category: "", summary: "", condition: "", label: "",
    },
  };
}

/* ---------- store ---------- */
let raw = [];            /* server orders, newest first */
let reviews = {};
let status = { loaded: false, loading: false, error: "", at: 0 };
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const emit = () => listeners.forEach((l) => l());
let version = 0;
const getVersion = () => version;
const bump = () => { version += 1; emit(); };

const FRESH_MS = 30000;

export async function loadOrders(force = false) {
  if (status.loading) return;
  if (!force && status.loaded && Date.now() - status.at < FRESH_MS) return;
  status = { ...status, loading: true, error: "" };
  bump();
  try {
    let page = await buyerOrdersApi.list("?page_size=100");
    let rows = page.results;
    for (let p = 2; p <= Math.min(page.total_pages, 5); p += 1) {
      rows = rows.concat((await buyerOrdersApi.list(`?page_size=100&page=${p}`)).results);
    }
    /* keep the tracking events we already fetched for an order */
    const had = new Map(raw.map((o) => [o.id, o]));
    raw = rows.map((o) => (had.get(o.id)?.events && !o.events ? { ...o, events: had.get(o.id).events } : o));
    status = { loaded: true, loading: false, error: "", at: Date.now() };
  } catch (e) {
    status = { ...status, loading: false, error: e.message || "Could not load your orders." };
  }
  bump();
}

export function addPlacedOrders(apiOrders) {
  const ids = new Set(apiOrders.map((o) => o.id));
  raw = [...apiOrders, ...raw.filter((o) => !ids.has(o.id))];
  bump();
}

function replaceOrder(o) {
  raw = raw.some((x) => x.id === o.id) ? raw.map((x) => (x.id === o.id ? o : x)) : [o, ...raw];
  bump();
}

export async function refreshOrder(id) {
  replaceOrder(await buyerOrdersApi.get(id));
}

export async function cancelOrder(id, reason) {
  replaceOrder(await buyerOrdersApi.cancel(id, reason));
}

export const clearOrders = () => { raw = []; reviews = {}; status = { loaded: false, loading: false, error: "", at: 0 }; bump(); };

/* the review also shows on the seller / ReMaker profile (demo profiles only) */
export function reviewOrder(id, review) {
  reviews = { ...reviews, [id]: review };
  const o = raw.find((x) => x.id === id);
  const item = o && getItemById(o.items?.[0]?.id);
  if (item?.sellerId) {
    addSellerReview(item.sellerId, {
      id: `order-${id}`, name: "Aarav", rating: review.rating,
      text: review.text || "Rated this order without a written review.",
      date: String(review.at || new Date().toISOString()).slice(0, 10),
    });
  }
  bump();
}

/* ---------- derived ---------- */
export const canCancel = (o) => !!o.canCancel;
export const orderTotal = (o) => o.total;
export const isActive = (o) => !o.cancelled && o.stage < 5;

/* ReMaker sellers have their own profile route */
export const sellerPath = (item) =>
  item.sellerType === "remaker"
    ? `/user-marketplace/remaker/${item.sellerId}`
    : `/user-marketplace/seller/${item.sellerId}`;

function decorate(o) {
  const order = adapt(o, reviews);
  const seller = o.seller?.type === "platform" ? { name: "ReOrbit" } : { name: o.seller?.name || "Seller", username: o.seller?.username };
  return {
    ...order,
    seller,
    sellerIsRemaker: o.seller?.type === "remaker",
    sellerPath: o.seller?.type === "remaker" && o.seller.id ? `/user-marketplace/remaker/${o.seller.id}` : null,
    status: statusOf(order),
  };
}

/* Orders list. Loads once, then at most every 30 s while screens are open. */
export function useOrders() {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  useEffect(() => { loadOrders(); }, []);
  return useMemo(() => raw.map(decorate), [version]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useOrdersStatus() {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return status;
}

/* One order, with its tracking history fetched on demand. */
export function useOrder(id) {
  const list = useOrders();
  const found = useMemo(() => list.find((o) => o.id === id) || null, [list, id]);
  const needsEvents = !found || !found.eventsLoaded;
  useEffect(() => {
    if (id && needsEvents) refreshOrder(id).catch(() => {});
  }, [id, needsEvents]);
  return found;
}
