/* =========================================================
   REMAKER SELLING SIDE - UI STORE (no backend yet)
   Covers sales orders, customers, earnings and payouts.

   Follows the Orders / Transactions tables from the schema:
     order_status   Pending | Confirmed | Cancelled | Completed | Returned
     buyer_         User | ReMaker
   Earnings rules used in this UI:
     - ReOrbit keeps FEE_RATE of the item price. The buyer pays
       delivery separately, so it never touches your earnings.
     - Money becomes withdrawable CLEARING_DAYS after delivery.
     - Cancelled and returned orders earn nothing.

   Everything lives in localStorage so actions survive a refresh.
   Swap the exports below for API calls later.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";

import { REMAKER_PRODUCTS } from "./remakerProducts";

const KEY = "reorbit_remaker_sales_v1";

export const FEE_RATE = 0.08;
export const CLEARING_DAYS = 3;
export const MIN_PAYOUT = 500;

/* Where the ReMaker ships from (same placeholder as the profile page) */
export const SHIP_FROM = {
  name: "Nivya (Messy Mirror)",
  line: "14, Craft Lane, Near Old Market",
  city: "Ahmedabad",
  state: "Gujarat",
  pincode: "380015",
  phone: "98765 43210",
};

/* ---------- customers (buyers) ---------- */

const IMG_USERS = "/images/users/";
const IMG_MAKERS = "/images/remakers/";

export const CUSTOMERS = {
  "c-meera": {
    id: "c-meera",
    name: "Meera Iyer",
    type: "User",
    email: "meera.iyer@example.com",
    phone: "98450 11234",
    address: "22, 5th Cross, Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560038",
    image: IMG_USERS + "meera-iyer.jpg",
    joined: "Jan 2025",
  },
  "c-rohan": {
    id: "c-rohan",
    name: "Rohan Shah",
    type: "User",
    email: "rohan.shah@example.com",
    phone: "97300 44821",
    address: "Flat 4B, Rose Residency, Kothrud",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411007",
    image: IMG_USERS + "rohan-shah.jpg",
    joined: "Mar 2025",
  },
  "c-anaya": {
    id: "c-anaya",
    name: "Anaya Singh",
    type: "User",
    email: "anaya.singh@example.com",
    phone: "94140 77520",
    address: "9, Gandhi Path West, Vaishali Nagar",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302017",
    image: IMG_USERS + "anaya-singh.jpg",
    joined: "Jun 2025",
  },
  "c-kabir": {
    id: "c-kabir",
    name: "Kabir Verma",
    type: "User",
    email: "kabir.verma@example.com",
    phone: "98110 20931",
    address: "B-17, Greater Kailash II",
    city: "Delhi",
    state: "Delhi",
    pincode: "110016",
    image: IMG_USERS + "kabir-verma.jpg",
    joined: "Aug 2025",
  },
  "c-aarav": {
    id: "c-aarav",
    name: "Aarav Patel",
    type: "User",
    email: "aarav.patel@example.com",
    phone: "99090 51188",
    address: "31, Shivranjani Society, Satellite",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380015",
    image: IMG_USERS + "aarav-patel.jpg",
    joined: "Nov 2024",
  },
  "c-nisha": {
    id: "c-nisha",
    name: "Nisha Rao",
    type: "User",
    email: "nisha.rao@example.com",
    phone: "98200 33017",
    address: "Sea View Apartments, Bandra West",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400050",
    image: IMG_USERS + "nisha-rao.jpg",
    joined: "Feb 2025",
  },
  "c-tara": {
    id: "c-tara",
    name: "Tara Bose",
    type: "ReMaker",
    email: "tara@tarabose.in",
    phone: "98300 61204",
    address: "Studio 3, Ballygunge Place",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700029",
    image: IMG_MAKERS + "tara-bose.jpg",
    joined: "Sep 2024",
  },
  "c-dev": {
    id: "c-dev",
    name: "Dev Malhotra",
    type: "User",
    email: "dev.malhotra@example.com",
    phone: "98980 42266",
    address: "House 12, Adajan Road",
    city: "Surat",
    state: "Gujarat",
    pincode: "395007",
    image: "",
    joined: "Apr 2025",
  },
  "c-isha": {
    id: "c-isha",
    name: "Isha Kapoor",
    type: "User",
    email: "isha.kapoor@example.com",
    phone: "80880 19345",
    address: "47, Jayanagar 4th Block",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560034",
    image: "",
    joined: "Jul 2025",
  },
};

export function getCustomer(id) {
  return CUSTOMERS[id] || null;
}

/* ---------- fulfilment flows (seller view) ---------- */

export const DELIVERY_STEPS = [
  { key: "placed", label: "Order received", note: "A customer placed this order." },
  { key: "confirmed", label: "You accepted", note: "Pack the item carefully." },
  { key: "packed", label: "Packed", note: "ReOrbit will collect it from your address." },
  { key: "handed_over", label: "Handed to ReOrbit", note: "The delivery partner has the parcel." },
  { key: "in_transit", label: "In transit", note: "On its way to the customer." },
  { key: "delivered", label: "Delivered", note: "The customer has received it." },
];

export const PICKUP_STEPS = [
  { key: "placed", label: "Order received", note: "A customer placed this order." },
  { key: "confirmed", label: "You accepted", note: "Get it ready for collection." },
  { key: "ready", label: "Ready for pickup", note: "The customer will collect it from you." },
  { key: "collected", label: "Collected", note: "The customer collected the item." },
];

export const stepsOf = (order) => (order.fulfilment === "pickup" ? PICKUP_STEPS : DELIVERY_STEPS);

export function stepIndex(order) {
  return Math.max(0, stepsOf(order).findIndex((step) => step.key === order.stage));
}

function statusFromStep(order, index) {
  if (index <= 0) return "Pending";
  if (index >= stepsOf(order).length - 1) return "Completed";
  return "Confirmed";
}

/* ---------- money ---------- */

export const grossOf = (order) => order.unitPrice * order.quantity;
export const feeOf = (order) => Math.round(grossOf(order) * FEE_RATE);
export const netOf = (order) => grossOf(order) - feeOf(order);

/* ---------- seed ---------- */

const NOW = Date.now();
const ago = (hours) => new Date(NOW - hours * 3600000).toISOString();

function product(id) {
  return REMAKER_PRODUCTS.find((item) => item.id === id);
}

function sale(base) {
  const item = product(base.productId);

  return {
    title: item.title,
    image: item.images[0],
    category: item.category,
    unitPrice: item.price,
    quantity: 1,
    reports: [],
    ...base,
  };
}

const SEED_ORDERS = [
  sale({
    id: "SO-31084",
    createdAt: ago(1),
    productId: "rp-1001",
    customerId: "c-meera",
    fulfilment: "delivery",
    status: "Pending",
    stage: "placed",
    payment: { method: "UPI", status: "Success" },
    times: { placed: ago(1) },
  }),
  sale({
    id: "SO-31079",
    createdAt: ago(9),
    productId: "rp-1002",
    quantity: 2,
    customerId: "c-rohan",
    fulfilment: "delivery",
    status: "Confirmed",
    stage: "confirmed",
    payment: { method: "CARD", status: "Success" },
    times: { placed: ago(9), confirmed: ago(7) },
  }),
  sale({
    id: "SO-31071",
    createdAt: ago(22),
    productId: "rp-1003",
    customerId: "c-anaya",
    fulfilment: "pickup",
    status: "Confirmed",
    stage: "ready",
    payment: { method: "UPI", status: "Success" },
    times: { placed: ago(22), confirmed: ago(20), ready: ago(3) },
  }),
  sale({
    id: "SO-31040",
    createdAt: ago(60),
    productId: "rp-1002",
    customerId: "c-kabir",
    fulfilment: "delivery",
    status: "Confirmed",
    stage: "in_transit",
    payment: { method: "COD", status: "Pending" },
    times: {
      placed: ago(60),
      confirmed: ago(58),
      packed: ago(50),
      handed_over: ago(40),
      in_transit: ago(30),
    },
  }),
  sale({
    id: "SO-31011",
    createdAt: ago(150),
    productId: "rp-1002",
    customerId: "c-meera",
    fulfilment: "delivery",
    status: "Completed",
    stage: "delivered",
    payment: { method: "UPI", status: "Success" },
    times: {
      placed: ago(150),
      confirmed: ago(148),
      packed: ago(130),
      handed_over: ago(110),
      in_transit: ago(90),
      delivered: ago(40),
    },
  }),
  sale({
    id: "SO-30991",
    createdAt: ago(300),
    productId: "rp-1003",
    quantity: 3,
    customerId: "c-aarav",
    fulfilment: "delivery",
    status: "Completed",
    stage: "delivered",
    payment: { method: "UPI", status: "Success" },
    times: {
      placed: ago(300),
      confirmed: ago(298),
      packed: ago(280),
      handed_over: ago(260),
      in_transit: ago(230),
      delivered: ago(150),
    },
  }),
  sale({
    id: "SO-30950",
    createdAt: ago(600),
    productId: "rp-1001",
    customerId: "c-nisha",
    fulfilment: "delivery",
    status: "Completed",
    stage: "delivered",
    payment: { method: "NET_BANKING", status: "Success" },
    payoutId: "PO-2203",
    times: {
      placed: ago(600),
      confirmed: ago(598),
      packed: ago(580),
      handed_over: ago(570),
      in_transit: ago(560),
      delivered: ago(540),
    },
  }),
  sale({
    id: "SO-30933",
    createdAt: ago(700),
    productId: "rp-1004",
    customerId: "c-tara",
    fulfilment: "pickup",
    status: "Completed",
    stage: "collected",
    payment: { method: "UPI", status: "Success" },
    payoutId: "PO-2203",
    times: { placed: ago(700), confirmed: ago(698), ready: ago(670), collected: ago(650) },
  }),
  sale({
    id: "SO-30901",
    createdAt: ago(290),
    productId: "rp-1002",
    customerId: "c-isha",
    fulfilment: "delivery",
    status: "Cancelled",
    stage: "confirmed",
    payment: { method: "CARD", status: "Refunded" },
    cancelledAt: ago(285),
    cancelledBy: "customer",
    cancelReason: "Changed their mind",
    times: { placed: ago(290), confirmed: ago(288) },
  }),
  sale({
    id: "SO-30877",
    createdAt: ago(400),
    productId: "rp-1003",
    customerId: "c-dev",
    fulfilment: "delivery",
    status: "Returned",
    stage: "delivered",
    payment: { method: "UPI", status: "Refunded" },
    returnedAt: ago(330),
    times: {
      placed: ago(400),
      confirmed: ago(398),
      packed: ago(380),
      handed_over: ago(370),
      in_transit: ago(360),
      delivered: ago(345),
    },
  }),
  sale({
    id: "SO-30820",
    createdAt: ago(1080),
    productId: "rp-1002",
    customerId: "c-aarav",
    fulfilment: "delivery",
    status: "Completed",
    stage: "delivered",
    payment: { method: "UPI", status: "Success" },
    payoutId: "PO-2187",
    times: {
      placed: ago(1080),
      confirmed: ago(1078),
      packed: ago(1060),
      handed_over: ago(1050),
      in_transit: ago(1040),
      delivered: ago(1020),
    },
  }),
  sale({
    id: "SO-30712",
    createdAt: ago(1800),
    productId: "rp-1001",
    customerId: "c-rohan",
    fulfilment: "delivery",
    status: "Completed",
    stage: "delivered",
    payment: { method: "CARD", status: "Success" },
    payoutId: "PO-2142",
    times: {
      placed: ago(1800),
      confirmed: ago(1798),
      packed: ago(1780),
      handed_over: ago(1770),
      in_transit: ago(1760),
      delivered: ago(1740),
    },
  }),
  sale({
    id: "SO-30655",
    createdAt: ago(2640),
    productId: "rp-1004",
    customerId: "c-kabir",
    fulfilment: "delivery",
    status: "Completed",
    stage: "delivered",
    payment: { method: "UPI", status: "Success" },
    payoutId: "PO-2098",
    times: {
      placed: ago(2640),
      confirmed: ago(2638),
      packed: ago(2620),
      handed_over: ago(2610),
      in_transit: ago(2600),
      delivered: ago(2580),
    },
  }),
  sale({
    id: "SO-30540",
    createdAt: ago(3360),
    productId: "rp-1002",
    quantity: 2,
    customerId: "c-meera",
    fulfilment: "delivery",
    status: "Completed",
    stage: "delivered",
    payment: { method: "UPI", status: "Success" },
    payoutId: "PO-2051",
    times: {
      placed: ago(3360),
      confirmed: ago(3358),
      packed: ago(3340),
      handed_over: ago(3330),
      in_transit: ago(3320),
      delivered: ago(3300),
    },
  }),
];

const SEED_BANK = {
  holder: "Nivya S",
  bank: "State Bank of India",
  last4: "6209",
  ifsc: "SBIN0004821",
};

const sumNet = (ids) =>
  SEED_ORDERS.filter((order) => ids.includes(order.id)).reduce((total, order) => total + netOf(order), 0);

const SEED_PAYOUTS = [
  { id: "PO-2203", createdAt: ago(480), orderIds: ["SO-30950", "SO-30933"], status: "Paid", reference: "UTR 4410928837" },
  { id: "PO-2187", createdAt: ago(940), orderIds: ["SO-30820"], status: "Paid", reference: "UTR 4390276615" },
  { id: "PO-2142", createdAt: ago(1620), orderIds: ["SO-30712"], status: "Paid", reference: "UTR 4361150092" },
  { id: "PO-2098", createdAt: ago(2480), orderIds: ["SO-30655"], status: "Paid", reference: "UTR 4322984471" },
  { id: "PO-2051", createdAt: ago(3200), orderIds: ["SO-30540"], status: "Paid", reference: "UTR 4288113506" },
].map((payout) => ({ ...payout, amount: sumNet(payout.orderIds), bankLast4: SEED_BANK.last4 }));

function seedState() {
  return {
    orders: SEED_ORDERS.map((order) => ({ ...order })),
    payouts: SEED_PAYOUTS.map((payout) => ({ ...payout })),
    bank: { ...SEED_BANK },
  };
}

/* ---------- store ---------- */

function load() {
  try {
    const raw = localStorage.getItem(KEY);

    if (raw) {
      const value = JSON.parse(raw);
      if (value && Array.isArray(value.orders)) return value;
    }
  } catch {
    /* fall back to the seed */
  }

  return seedState();
}

let state = load();
const listeners = new Set();

function commit(next) {
  state = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: change still lives for this session */
  }

  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

export function useSales() {
  const current = useSyncExternalStore(subscribe, getSnapshot);

  return useMemo(
    () => [...current.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [current.orders],
  );
}

export function useSale(id) {
  const current = useSyncExternalStore(subscribe, getSnapshot);

  return current.orders.find((order) => order.id === id) || null;
}

export function usePayouts() {
  const current = useSyncExternalStore(subscribe, getSnapshot);

  return useMemo(
    () => [...current.payouts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [current.payouts],
  );
}

export function useBank() {
  return useSyncExternalStore(subscribe, getSnapshot).bank;
}

function patchOrder(id, change) {
  commit({
    ...state,
    orders: state.orders.map((order) => {
      if (order.id !== id) return order;
      return typeof change === "function" ? change(order) : { ...order, ...change };
    }),
  });
}

/* ---------- customers derived from orders ---------- */

export function summarizeCustomers(orders) {
  const map = new Map();

  orders.forEach((order) => {
    const customer = getCustomer(order.customerId);
    if (!customer) return;

    const entry = map.get(customer.id) || {
      customer,
      orders: [],
      spent: 0,
      lastOrderAt: "",
    };

    entry.orders.push(order);

    if (order.status === "Completed") entry.spent += grossOf(order);
    if (order.createdAt > entry.lastOrderAt) entry.lastOrderAt = order.createdAt;

    map.set(customer.id, entry);
  });

  return [...map.values()].sort((a, b) => b.spent - a.spent || b.lastOrderAt.localeCompare(a.lastOrderAt));
}

export function useCustomers() {
  const orders = useSales();

  return useMemo(() => summarizeCustomers(orders), [orders]);
}

/* ---------- order actions ---------- */

export function acceptSale(id) {
  patchOrder(id, (order) => ({
    ...order,
    status: "Confirmed",
    stage: "confirmed",
    times: { ...order.times, confirmed: new Date().toISOString() },
  }));
}

export function canCancelSale(order) {
  return order.status === "Pending" || (order.status === "Confirmed" && stepIndex(order) <= 1);
}

/* Used for both declining a new order and cancelling an accepted one */
export function cancelSale(id, reason) {
  patchOrder(id, (order) => ({
    ...order,
    status: "Cancelled",
    cancelledAt: new Date().toISOString(),
    cancelledBy: "you",
    cancelReason: reason,
    payment: { ...order.payment, status: order.payment.method === "COD" ? order.payment.status : "Refunded" },
  }));
}

/* Next action the ReMaker can take, or null when it is out of their hands */
export function nextAction(order) {
  if (order.status === "Pending") return { key: "accept", label: "Accept order" };

  if (order.status !== "Confirmed") return null;

  if (order.fulfilment === "pickup") {
    if (order.stage === "confirmed") return { key: "ready", label: "Mark ready for pickup" };
    if (order.stage === "ready") return { key: "collected", label: "Mark as collected" };
    return null;
  }

  if (order.stage === "confirmed") return { key: "packed", label: "Mark as packed" };
  if (order.stage === "packed") return { key: "handed_over", label: "Mark handed to ReOrbit" };

  return null;
}

/* Move to a specific step (used by the action buttons above) */
export function moveSale(id, key) {
  patchOrder(id, (order) => {
    const index = stepsOf(order).findIndex((step) => step.key === key);
    if (index < 0) return order;

    const next = {
      ...order,
      stage: key,
      times: { ...order.times, [key]: new Date().toISOString() },
    };

    next.status = statusFromStep(next, index);

    if (next.status === "Completed" && next.payment.status === "Pending") {
      next.payment = { ...next.payment, status: "Success" };
    }

    return next;
  });
}

/* Demo helper for the steps ReOrbit controls (used with ?demo=1) */
export function advanceSale(id) {
  patchOrder(id, (order) => {
    if (order.status === "Cancelled" || order.status === "Returned") return order;

    const steps = stepsOf(order);
    const index = stepIndex(order);
    if (index >= steps.length - 1) return order;

    const next = {
      ...order,
      stage: steps[index + 1].key,
      times: { ...order.times, [steps[index + 1].key]: new Date().toISOString() },
    };

    next.status = statusFromStep(next, index + 1);
    if (next.status === "Completed" && next.payment.status === "Pending") {
      next.payment = { ...next.payment, status: "Success" };
    }

    return next;
  });
}

/* ---------- earnings ---------- */

function completedAt(order) {
  return order.times.delivered || order.times.collected || order.createdAt;
}

export function clearsOn(order) {
  return new Date(new Date(completedAt(order)).getTime() + CLEARING_DAYS * 86400000).toISOString();
}

/* The earning state of a single order */
export function earningStatus(order, payouts = state.payouts) {
  if (order.status === "Cancelled") return "Cancelled";
  if (order.status === "Returned") return "Reversed";
  if (order.status !== "Completed") return "In progress";

  if (order.payoutId) {
    const payout = payouts.find((item) => item.id === order.payoutId);
    return payout && payout.status === "Processing" ? "In payout" : "Paid out";
  }

  return Date.now() >= new Date(clearsOn(order)).getTime() ? "Available" : "Clearing";
}

export function summarizeEarnings(orders, payouts) {
  const summary = {
    available: 0,
    clearing: 0,
    inPayout: 0,
    paidOut: 0,
    lifetime: 0,
    inProgress: 0,
    availableOrders: [],
  };

  orders.forEach((order) => {
    const status = earningStatus(order, payouts);
    const net = netOf(order);

    if (status === "Available") {
      summary.available += net;
      summary.availableOrders.push(order);
    }
    if (status === "Clearing") summary.clearing += net;
    if (status === "In payout") summary.inPayout += net;
    if (status === "Paid out") summary.paidOut += net;
    if (status === "In progress") summary.inProgress += net;
    if (["Available", "Clearing", "In payout", "Paid out"].includes(status)) summary.lifetime += net;
  });

  return summary;
}

export function useEarnings() {
  const orders = useSales();
  const payouts = usePayouts();

  return useMemo(() => summarizeEarnings(orders, payouts), [orders, payouts]);
}

/* Net earnings per month for the last `count` months */
export function monthlyEarnings(orders, count = 6) {
  const now = new Date();
  const months = [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleString("en-IN", { month: "short" }),
      year: date.getFullYear(),
      value: 0,
      orders: 0,
    });
  }

  orders.forEach((order) => {
    if (order.status !== "Completed") return;

    const date = new Date(completedAt(order));
    const slot = months.find((month) => month.key === `${date.getFullYear()}-${date.getMonth()}`);

    if (slot) {
      slot.value += netOf(order);
      slot.orders += 1;
    }
  });

  return months;
}

export function topProducts(orders, limit = 4) {
  const map = new Map();

  orders.forEach((order) => {
    if (order.status !== "Completed") return;

    const entry = map.get(order.productId) || {
      productId: order.productId,
      title: order.title,
      image: order.image,
      units: 0,
      revenue: 0,
    };

    entry.units += order.quantity;
    entry.revenue += netOf(order);
    map.set(order.productId, entry);
  });

  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

/* Withdraw everything that is available */
export function requestPayout() {
  const earnings = summarizeEarnings(state.orders, state.payouts);

  if (earnings.available < MIN_PAYOUT) return null;

  const id = `PO-${Math.floor(2300 + Math.random() * 600)}`;
  const orderIds = earnings.availableOrders.map((order) => order.id);

  const payout = {
    id,
    createdAt: new Date().toISOString(),
    orderIds,
    amount: earnings.available,
    status: "Processing",
    reference: "Reference assigned once paid",
    bankLast4: state.bank.last4,
  };

  commit({
    ...state,
    payouts: [...state.payouts, payout],
    orders: state.orders.map((order) => (orderIds.includes(order.id) ? { ...order, payoutId: id } : order)),
  });

  return payout;
}

/* Only the last four digits of the account number are ever stored */
export function updateBank({ holder, bank, accountNumber, ifsc }) {
  commit({
    ...state,
    bank: {
      holder: holder.trim(),
      bank: bank.trim(),
      last4: accountNumber.replace(/\D/g, "").slice(-4),
      ifsc: ifsc.trim().toUpperCase(),
    },
  });
}

export function resetSales() {
  commit(seedState());
}

/* ---------- display helpers ---------- */

export function describeSale(order) {
  const steps = stepsOf(order);
  const step = steps[stepIndex(order)];
  const customer = getCustomer(order.customerId);
  const first = customer ? customer.name.split(" ")[0] : "The customer";

  switch (order.status) {
    case "Pending": {
      const hoursLeft = Math.max(
        0,
        Math.ceil((new Date(order.createdAt).getTime() + 24 * 3600000 - Date.now()) / 3600000),
      );

      return {
        label: "New order",
        tone: "pending",
        needsAction: true,
        message:
          hoursLeft > 0
            ? `Accept within ${hoursLeft} ${hoursLeft === 1 ? "hour" : "hours"} or it will be cancelled automatically.`
            : "This order is about to be cancelled. Accept it now to keep it.",
      };
    }
    case "Confirmed": {
      if (order.fulfilment === "pickup") {
        return order.stage === "ready"
          ? { label: "Waiting for customer", tone: "active", needsAction: false, message: `${first} will collect this from you. Mark it collected after the handover.` }
          : { label: "Get it ready", tone: "pending", needsAction: true, message: "Prepare the item and mark it ready so the customer can collect it." };
      }

      if (order.stage === "confirmed") {
        return { label: "Pack the order", tone: "pending", needsAction: true, message: "Pack it safely, then mark it as packed so ReOrbit can collect it." };
      }

      if (order.stage === "packed") {
        return { label: "Ready for ReOrbit", tone: "active", needsAction: true, message: "Hand the parcel to the ReOrbit rider, then mark it handed over." };
      }

      return { label: step.label, tone: "active", needsAction: false, message: step.note };
    }
    case "Completed":
      return {
        label: order.fulfilment === "pickup" ? "Collected" : "Delivered",
        tone: "done",
        needsAction: false,
        message: "This order is complete. Your earnings clear a few days after delivery.",
      };
    case "Cancelled":
      return {
        label: "Cancelled",
        tone: "cancelled",
        needsAction: false,
        message:
          order.cancelledBy === "customer"
            ? "The customer cancelled this order. Nothing to do."
            : "You cancelled this order and the customer was refunded.",
      };
    case "Returned":
      return {
        label: "Returned",
        tone: "returned",
        needsAction: false,
        message: "The customer returned this order. The sale was reversed.",
      };
    default:
      return { label: order.status, tone: "active", needsAction: false, message: "" };
  }
}

export function buildSaleTimeline(order) {
  const steps = stepsOf(order);
  const index = stepIndex(order);

  if (order.status === "Cancelled") {
    return [
      ...steps.slice(0, index + 1).map((step) => ({ ...step, time: order.times[step.key], state: "done" })),
      {
        key: "cancelled",
        label: order.cancelledBy === "customer" ? "Cancelled by customer" : "Cancelled by you",
        note: order.cancelReason ? `Reason: ${order.cancelReason}` : "",
        time: order.cancelledAt,
        state: "cancelled",
      },
    ];
  }

  const list = steps.map((step, i) => ({
    ...step,
    time: order.times[step.key],
    state:
      i < index || (i === index && (order.status === "Completed" || order.status === "Returned"))
        ? "done"
        : i === index
          ? "current"
          : "upcoming",
  }));

  if (order.status === "Returned") {
    list.push({
      key: "returned",
      label: "Returned by customer",
      note: "The item came back and the sale was reversed.",
      time: order.returnedAt,
      state: "returned",
    });
  }

  return list;
}

export const CANCEL_REASONS = [
  "Item is no longer available",
  "Damaged while preparing it",
  "Cannot ship to this location",
  "Listing or price was wrong",
  "Other",
];

export const EARNING_TONE = {
  "In progress": "muted",
  Clearing: "pending",
  Available: "done",
  "In payout": "active",
  "Paid out": "done",
  Reversed: "returned",
  Cancelled: "cancelled",
};

export function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
