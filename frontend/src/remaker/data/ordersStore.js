/* =========================================================
   REMAKER BUYING ORDERS - UI STORE (no backend yet)
   Follows the Orders + Transactions tables:
     order_status   Pending | Confirmed | Cancelled | Completed | Returned
     payment_method UPI | CARD | NET_BANKING | WALLET | COD
     payment_status Pending | Success | Failed | Refunded
   Reports follow the Reports table (type, reason, description,
   status Pending | Reviewed | Resolved | Rejected).

   Tracking stages are a UI detail on top of order_status. Orders
   live in localStorage so a placed order survives a refresh. Swap
   the functions below for API calls later.
   ========================================================= */

import { useSyncExternalStore } from "react";

import { deliveryCharge, getListingById } from "./remakerMarketplaceData";

const KEY = "reorbit_remaker_orders_v1";

/* The ReMaker's saved address (same placeholder as the profile page) */
export const DEFAULT_ADDRESS = {
  name: "Nivya (Messy Mirror)",
  line: "14, Craft Lane, Near Old Market",
  city: "Ahmedabad",
  state: "Gujarat",
  phone: "98765 43210",
};

/* ---------- tracking flows ---------- */

export const DELIVERY_FLOW = [
  { key: "placed", label: "Order placed", note: "We sent your order to the seller." },
  { key: "confirmed", label: "Seller confirmed", note: "The seller is getting it ready." },
  { key: "picked_up", label: "Picked up by ReOrbit", note: "Our team collected it from the seller." },
  { key: "in_transit", label: "In transit", note: "On its way to your city." },
  { key: "out_for_delivery", label: "Out for delivery", note: "It will reach you today." },
  { key: "delivered", label: "Delivered", note: "Handed over at your address." },
];

export const PICKUP_FLOW = [
  { key: "placed", label: "Order placed", note: "We sent your order to the seller." },
  { key: "confirmed", label: "Seller confirmed", note: "The seller is getting it ready." },
  { key: "ready", label: "Ready for pickup", note: "Collect it from the seller with your pickup code." },
  { key: "collected", label: "Collected", note: "You collected it from the seller." },
];

export function flowOf(order) {
  return order.fulfilment === "pickup" ? PICKUP_FLOW : DELIVERY_FLOW;
}

export function stageIndex(order) {
  return Math.max(0, flowOf(order).findIndex((step) => step.key === order.stage));
}

function statusFromStage(order, index) {
  if (index <= 0) return "Pending";
  if (index >= flowOf(order).length - 1) return "Completed";
  return "Confirmed";
}

/* ---------- seed ---------- */

function snapshot(listingId) {
  const listing = getListingById(listingId);

  return {
    listingId,
    title: listing.title,
    image: listing.gallery[0],
    category: listing.category,
    condition: listing.condition,
    sellerId: listing.sellerId,
    sellerName: listing.seller,
    sellerType: listing.source,
    sellerCity: listing.city,
    unitPrice: listing.price,
  };
}

function build(base) {
  const item = snapshot(base.listingId);
  const quantity = base.quantity || 1;
  const deliveryFee = base.fulfilment === "delivery" ? deliveryCharge(item.unitPrice) : 0;

  return {
    ...item,
    quantity,
    deliveryFee,
    total: item.unitPrice * quantity + deliveryFee,
    pincode: base.fulfilment === "delivery" ? "380015" : "",
    reports: [],
    ...base,
  };
}

/* Seed dates are relative to "now" so the demo always looks current */
const NOW = Date.now();
const ago = (hours) => new Date(NOW - hours * 3600000).toISOString();
const dayOffset = (days) => new Date(NOW + days * 86400000).toISOString().slice(0, 10);

const SEED = [
  build({
    id: "RO-48213",
    createdAt: ago(52),
    listingId: "vintage-reading-chair",
    fulfilment: "delivery",
    status: "Confirmed",
    stage: "out_for_delivery",
    payment: { method: "UPI", status: "Success", txnId: "TXN7741920331" },
    trackingId: "ROL-3380152",
    eta: dayOffset(0),
    times: {
      placed: ago(52),
      confirmed: ago(50),
      picked_up: ago(28),
      in_transit: ago(18),
      out_for_delivery: ago(3),
    },
  }),
  build({
    id: "RO-47990",
    createdAt: ago(20),
    listingId: "ceramic-table-lamp",
    fulfilment: "pickup",
    status: "Confirmed",
    stage: "ready",
    payment: { method: "CARD", status: "Success", txnId: "TXN7739001184" },
    pickupCode: "4821",
    eta: dayOffset(2),
    times: {
      placed: ago(20),
      confirmed: ago(18),
      ready: ago(4),
    },
  }),
  build({
    id: "RO-47852",
    createdAt: ago(2),
    listingId: "refurbished-desk-lamp",
    fulfilment: "delivery",
    status: "Pending",
    stage: "placed",
    payment: { method: "COD", status: "Pending", txnId: "" },
    trackingId: "",
    eta: dayOffset(5),
    times: { placed: ago(2) },
  }),
  build({
    id: "RO-48107",
    createdAt: ago(240),
    listingId: "recovered-textile-bag",
    quantity: 2,
    fulfilment: "delivery",
    status: "Completed",
    stage: "delivered",
    payment: { method: "UPI", status: "Success", txnId: "TXN7702281930" },
    trackingId: "ROL-3379044",
    eta: dayOffset(-7),
    times: {
      placed: ago(240),
      confirmed: ago(239),
      picked_up: ago(215),
      in_transit: ago(205),
      out_for_delivery: ago(172),
      delivered: ago(167),
    },
  }),
  build({
    id: "RO-47701",
    createdAt: ago(432),
    listingId: "solid-wood-side-table",
    fulfilment: "delivery",
    status: "Cancelled",
    stage: "confirmed",
    payment: { method: "NET_BANKING", status: "Refunded", txnId: "TXN7684410027" },
    cancelledAt: ago(425),
    cancelReason: "Ordered by mistake",
    eta: "",
    times: { placed: ago(432), confirmed: ago(430) },
  }),
  build({
    id: "RO-47544",
    createdAt: ago(864),
    listingId: "classic-novel-collection",
    fulfilment: "delivery",
    status: "Returned",
    stage: "delivered",
    payment: { method: "WALLET", status: "Refunded", txnId: "TXN7655309912" },
    trackingId: "ROL-3375218",
    eta: dayOffset(-35),
    returnedAt: ago(700),
    times: {
      placed: ago(864),
      confirmed: ago(862),
      picked_up: ago(838),
      in_transit: ago(814),
      out_for_delivery: ago(768),
      delivered: ago(764),
    },
    reports: [
      {
        id: "RP-30211",
        topic: "item",
        type: "Item",
        reason: "Not as described",
        description:
          "Two of the twelve books are missing their last pages, which was not mentioned in the listing.",
        photos: [],
        status: "Resolved",
        createdAt: ago(740),
        resolution: "We refunded the order to your wallet and marked it as returned.",
      },
    ],
  }),
];

/* ---------- store ---------- */

function load() {
  try {
    const raw = localStorage.getItem(KEY);

    if (raw) {
      const value = JSON.parse(raw);
      if (Array.isArray(value)) return value;
    }
  } catch {
    /* fall back to the seed */
  }

  return SEED.map((order) => ({ ...order }));
}

let orders = load();
const listeners = new Set();

function commit(next) {
  orders = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(orders));
  } catch {
    /* storage full or blocked: the change still lives for this session */
  }

  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => orders;

/* Newest first */
export function useOrders() {
  const list = useSyncExternalStore(subscribe, getSnapshot);

  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function useOrder(id) {
  const list = useSyncExternalStore(subscribe, getSnapshot);

  return list.find((order) => order.id === id) || null;
}

function patchOrder(id, change) {
  commit(
    orders.map((order) => {
      if (order.id !== id) return order;
      return typeof change === "function" ? change(order) : { ...order, ...change };
    }),
  );
}

/* ---------- actions ---------- */

/* Called when the buy flow places an order */
export function createOrder({ listing, quantity, delivery, charge, pincode, paymentMethod }) {
  const now = new Date();
  const id = `RO-${String(Math.floor(10000 + Math.random() * 89999))}`;
  const fulfilment = delivery === "platform" ? "delivery" : "pickup";
  const fee = fulfilment === "delivery" ? charge : 0;
  const eta = new Date(now.getTime() + (fulfilment === "delivery" ? 5 : 3) * 86400000);

  const order = {
    id,
    createdAt: now.toISOString(),
    listingId: listing.id,
    title: listing.title,
    image: listing.gallery[0],
    category: listing.category,
    condition: listing.condition,
    sellerId: listing.sellerId,
    sellerName: listing.seller,
    sellerType: listing.source,
    sellerCity: listing.city,
    unitPrice: listing.price,
    quantity,
    deliveryFee: fee,
    total: listing.price * quantity + fee,
    fulfilment,
    pincode: fulfilment === "delivery" ? pincode : "",
    status: "Pending",
    stage: "placed",
    payment: {
      method: paymentMethod,
      status: paymentMethod === "COD" ? "Pending" : "Success",
      txnId: paymentMethod === "COD" ? "" : `TXN${Date.now().toString().slice(-10)}`,
    },
    trackingId: "",
    pickupCode: "",
    eta: eta.toISOString().slice(0, 10),
    times: { placed: now.toISOString() },
    reports: [],
  };

  commit([...orders, order]);

  return order;
}

export function canCancel(order) {
  return order.status === "Pending" || (order.status === "Confirmed" && stageIndex(order) <= 1);
}

export function cancelOrder(id, reason) {
  patchOrder(id, (order) => ({
    ...order,
    status: "Cancelled",
    cancelledAt: new Date().toISOString(),
    cancelReason: reason,
    payment: {
      ...order.payment,
      status: order.payment.method === "COD" ? order.payment.status : "Refunded",
    },
  }));
}

export function canReport(order) {
  return order.status !== "Cancelled";
}

export function addReport(id, data) {
  const report = {
    id: `RP-${String(Math.floor(10000 + Math.random() * 89999))}`,
    status: "Pending",
    createdAt: new Date().toISOString(),
    photos: [],
    ...data,
  };

  patchOrder(id, (order) => ({ ...order, reports: [...order.reports, report] }));

  return report;
}

/* Demo helper: move an order one step forward (used with ?demo=1) */
export function advanceOrder(id) {
  patchOrder(id, (order) => {
    if (order.status === "Cancelled" || order.status === "Returned") return order;

    const flow = flowOf(order);
    const index = stageIndex(order);

    if (index >= flow.length - 1) return order;

    const next = flow[index + 1];
    const nextOrder = {
      ...order,
      stage: next.key,
      times: { ...order.times, [next.key]: new Date().toISOString() },
    };

    nextOrder.status = statusFromStage(nextOrder, index + 1);

    if (next.key === "picked_up" && !nextOrder.trackingId) {
      nextOrder.trackingId = `ROL-${Math.floor(3000000 + Math.random() * 999999)}`;
    }

    if (next.key === "ready" && !nextOrder.pickupCode) {
      nextOrder.pickupCode = String(Math.floor(1000 + Math.random() * 8999));
    }

    if (nextOrder.status === "Completed" && nextOrder.payment.status === "Pending") {
      nextOrder.payment = { ...nextOrder.payment, status: "Success", txnId: `TXN${Date.now().toString().slice(-10)}` };
    }

    return nextOrder;
  });
}

export function resetOrders() {
  commit(SEED.map((order) => ({ ...order })));
}

/* ---------- display helpers ---------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "pm" : "am";

  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${hours % 12 || 12}:${minutes} ${suffix}`;
}

export const PAYMENT_LABEL = {
  UPI: "UPI",
  CARD: "Card",
  NET_BANKING: "Net banking",
  WALLET: "Wallet",
  COD: "Cash on delivery",
};

/* Label, tone and message shown for an order everywhere */
export function describeStatus(order) {
  const flow = flowOf(order);
  const step = flow[stageIndex(order)];

  switch (order.status) {
    case "Pending":
      return {
        label: "Awaiting confirmation",
        tone: "pending",
        message: "The seller has 24 hours to confirm your order. You can cancel until then.",
      };
    case "Confirmed":
      return {
        label: step.label,
        tone: "active",
        message:
          order.fulfilment === "pickup"
            ? step.key === "ready"
              ? "Your order is ready. Collect it from the seller with your pickup code."
              : "The seller is getting your order ready for pickup."
            : step.key === "out_for_delivery"
              ? "Your order is out for delivery and should reach you today."
              : step.note,
      };
    case "Completed":
      return {
        label: order.fulfilment === "pickup" ? "Collected" : "Delivered",
        tone: "done",
        message:
          order.fulfilment === "pickup"
            ? `You collected this order on ${formatDate(order.times.collected)}.`
            : `Delivered on ${formatDate(order.times.delivered)}.`,
      };
    case "Cancelled":
      return {
        label: "Cancelled",
        tone: "cancelled",
        message:
          order.payment.status === "Refunded"
            ? "This order was cancelled and your payment has been refunded."
            : "This order was cancelled. You were not charged.",
      };
    case "Returned":
      return {
        label: "Returned",
        tone: "returned",
        message: "This order was returned and refunded.",
      };
    default:
      return { label: order.status, tone: "active", message: "" };
  }
}

/* Step list for the track page: done / current / upcoming, plus end states */
export function buildTimeline(order) {
  const flow = flowOf(order);
  const index = stageIndex(order);

  if (order.status === "Cancelled") {
    const reached = flow.slice(0, index + 1).map((step) => ({
      ...step,
      time: order.times[step.key],
      state: "done",
    }));

    return [
      ...reached,
      {
        key: "cancelled",
        label: "Order cancelled",
        note: order.cancelReason ? `Reason: ${order.cancelReason}` : "Cancelled by you.",
        time: order.cancelledAt,
        state: "cancelled",
      },
    ];
  }

  const steps = flow.map((step, i) => ({
    ...step,
    time: order.times[step.key],
    state: i < index || (i === index && order.status === "Completed") || (i === index && order.status === "Returned")
      ? "done"
      : i === index
        ? "current"
        : "upcoming",
  }));

  if (order.status === "Returned") {
    return [
      ...steps,
      {
        key: "returned",
        label: "Returned and refunded",
        note: "The seller received the item back and your refund was issued.",
        time: order.returnedAt,
        state: "returned",
      },
    ];
  }

  return steps;
}

export const REPORT_TOPICS = [
  {
    key: "item",
    label: "The item",
    note: "Not as described, damaged or wrong",
    reasons: ["Not as described", "Damaged or broken", "Wrong item received", "Parts are missing"],
  },
  {
    key: "seller",
    label: "The seller",
    note: "Behaviour or communication",
    reasons: ["Seller is not responding", "Rude or unsafe behaviour", "Asked me to pay outside ReOrbit"],
  },
  {
    key: "delivery",
    label: "Delivery or pickup",
    note: "Late, missing or a handover problem",
    reasons: ["Not delivered", "Delayed", "Delivery partner issue", "Could not collect at pickup"],
  },
  {
    key: "payment",
    label: "Payment",
    note: "Charges and refunds",
    reasons: ["Charged twice", "Refund not received", "Wrong amount charged"],
  },
  {
    key: "other",
    label: "Something else",
    note: "Anything not listed here",
    reasons: ["Something else"],
  },
];

/* Reports.report_type for a topic */
export function reportTypeFor(topic, order) {
  if (topic === "item") return order.sellerType === "remaker" ? "Product" : "Item";
  if (topic === "seller") return order.sellerType === "remaker" ? "ReMaker" : "User";

  return "Other";
}
