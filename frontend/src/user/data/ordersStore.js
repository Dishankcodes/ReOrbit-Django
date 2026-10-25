/* =========================================================
   User › Buying orders data layer (UI only, in-memory).
   Orders point at real marketplace items so the seller /
   ReMaker links open the right profile. Backend later:
   replace with Orders + Transactions API calls.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import {
  addSellerReview,
  getItemById,
  getSellerFromItem,
} from "../../data/marketplaceData";

const DAY = 86400000;
const HOUR = 3600000;

const ago = (days, hours = 0) =>
  new Date(Date.now() - days * DAY - hours * HOUR).toISOString();
const ahead = (days) => new Date(Date.now() + days * DAY).toISOString();

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
  UPI: "UPI",
  CARD: "Card",
  NET_BANKING: "Net banking",
  WALLET: "Wallet",
  COD: "Cash on delivery",
};

export const ADDRESS = {
  name: "Aarav Patel",
  line: "B-402, Shreeji Heights, Satellite Road",
  city: "Ahmedabad",
  state: "Gujarat",
  pincode: "380015",
  phone: "+91 98765 43210",
};

export const CANCEL_REASONS = [
  "Ordered by mistake",
  "Found a better option",
  "Delivery is taking too long",
  "Want to change address or details",
  "Other",
];

/* helper: build the tracking events up to the current stage */
function events(base, stage, courier) {
  const offsets = [0, 0.15, 0.6, 1.1, 2.2, 2.6]; // days after placing
  const detail = [
    "Payment received. Order created.",
    "The seller confirmed availability.",
    "Packed with care for safe transit.",
    courier ? `Picked up by ${courier.name}.` : "Picked up by the courier.",
    "Out for delivery. Keep your phone handy.",
    "Delivered to the address on the order.",
  ];
  return STAGES.slice(0, stage + 1).map((item, index) => ({
    id: item.key,
    label: item.label,
    detail: detail[index],
    at: new Date(new Date(base).getTime() + offsets[index] * DAY).toISOString(),
  }));
}

const COURIER = { name: "Delhivery", awb: "DLV", phone: "+91 98111 22334" };

function make(id, itemId, qty, days, stage, extra = {}) {
  const item = getItemById(itemId);
  const placedAt = ago(days);
  const shipping = item.price > 5000 ? 0 : 50;
  const order = {
    id,
    itemId,
    qty,
    price: item.price,
    shipping,
    discount: extra.discount || 0,
    placedAt,
    stage,
    cancelled: false,
    payment: extra.payment || "UPI",
    courier:
      stage >= 3 ? { ...COURIER, awb: `DLV${id.replace(/\D/g, "")}9` } : null,
    eta: stage >= 5 ? null : ahead(extra.etaDays ?? 3),
    review: extra.review || null,
    ...extra.over,
  };
  order.events = extra.events || events(placedAt, stage, order.courier);
  return order;
}

const seed = () => [
  make("RO-10531", "restored-teak-cabinet", 1, 1, 1, {
    etaDays: 5,
    payment: "CARD",
  }),
  make("RO-10499", "recovered-textile-bag", 1, 3, 2, { etaDays: 4 }),
  make("RO-10377", "solid-wood-side-table", 1, 4, 4, {
    etaDays: 0,
    payment: "UPI",
  }),
  make("RO-10291", "vintage-reading-chair", 1, 6, 3, {
    etaDays: 2,
    payment: "COD",
  }),
  make("RO-10482", "teak-drawer-chest", 1, 22, 5, {
    review: {
      rating: 5,
      text: "Beautiful piece, exactly as described and packed very well.",
    },
  }),
  make("RO-10388", "reclaimed-wood-shelf", 2, 35, 5, { discount: 150 }),
  make("RO-10302", "classic-novel-collection", 1, 48, 5, { payment: "WALLET" }),
  (() => {
    const o = make("RO-10244", "refurbished-desk-lamp", 1, 60, 1, {
      payment: "NET_BANKING",
    });
    o.cancelled = true;
    o.cancelReason = "Found a better option";
    o.events = [
      ...o.events,
      {
        id: "cancel",
        label: "Order cancelled",
        detail:
          "Cancelled by you. Refund started to the original payment method.",
        at: ago(59, 4),
      },
    ];
    o.eta = null;
    o.refund = { amount: 1000, status: "Refunded", at: ago(57) };
    return o;
  })(),
];

/* ---------- store ---------- */

let orders = seed();
orders.forEach((o) => o.review && publish(o, { ...o.review, at: ago(20) }));
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => orders;
const commit = (next) => {
  orders = next;
  listeners.forEach((l) => l());
};

export function cancelOrder(id, reason) {
  commit(
    orders.map((o) =>
      o.id === id
        ? {
            ...o,
            cancelled: true,
            cancelReason: reason,
            eta: null,
            events: [
              ...o.events,
              {
                id: "cancel",
                label: "Order cancelled",
                detail: `${reason}. Refund started to the original payment method.`,
                at: new Date().toISOString(),
              },
            ],
            refund: {
              amount: o.price * o.qty + o.shipping - o.discount,
              status: "Processing",
              at: new Date().toISOString(),
            },
          }
        : o,
    ),
  );
}

/* the review also shows on the seller / ReMaker profile */
function publish(order, review) {
  const item = getItemById(order.itemId);
  addSellerReview(item.sellerId, {
    id: `order-${order.id}`,
    name: "Aarav",
    rating: review.rating,
    text: review.text || "Rated this order without a written review.",
    date: String(review.at || new Date().toISOString()).slice(0, 10),
  });
}

export function reviewOrder(id, review) {
  const target = orders.find((o) => o.id === id);
  if (target) publish(target, review);
  commit(orders.map((o) => (o.id === id ? { ...o, review } : o)));
}

/* ---------- derived ---------- */

export const canCancel = (o) => !o.cancelled && o.stage <= 2;
export const orderTotal = (o) => o.price * o.qty + o.shipping - o.discount;
export const isActive = (o) => !o.cancelled && o.stage < 5;

/* ReMaker sellers have their own profile route */
export const sellerPath = (item) =>
  item.sellerType === "remaker"
    ? `/user-marketplace/remaker/${item.sellerId}`
    : `/user-marketplace/seller/${item.sellerId}`;

function decorate(order) {
  const item = getItemById(order.itemId);
  const seller = getSellerFromItem(item);
  return {
    ...order,
    item,
    seller,
    sellerIsRemaker: item.sellerType === "remaker",
    sellerPath: sellerPath(item),
    status: statusOf(order),
    total: orderTotal(order),
  };
}

export function useOrders() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(
    () =>
      list
        .map(decorate)
        .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt)),
    [list],
  );
}

export function useOrder(id) {
  const list = useOrders();
  return useMemo(() => list.find((o) => o.id === id) || null, [list, id]);
}
