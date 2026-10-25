/* =========================================================
   DUMMY DATA — Admin › Orders
   UI only. No backend. Shapes follow the database notes:
   Orders (one table for the whole platform) + Transactions (1:1).

   Every order remembers BOTH sides:
     seller_type / seller  and  buyer_type / buyer
   (User, ReMaker or Admin), plus either an item (item_id) or a
   ReMaker product (product_id).

   Flows covered:
     ReMaker -> User     (a finished product is bought)
     User    -> User     (a marketplace item is bought)
     User    -> Admin    (platform buys / collects an item)
     Admin   -> ReMaker  (warehouse item sold to a ReMaker)
     User    -> ReMaker  (a ReMaker buys raw material from a user)

   People and listings come from the Users and ReMakers dummy data,
   so names and links always match the other admin pages.
   ========================================================= */

import { INITIAL_USERS } from "./adminUsers";
import { INITIAL_REMAKERS } from "./adminRemakers";

/* "Today" for the dummy data (matches utils/format DEMO_TODAY) */
export const ORDERS_NOW = new Date("2026-10-20T13:00:00");

function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (random, list) => list[Math.floor(random() * list.length)];
const between = (random, min, max) => min + Math.floor(random() * (max - min + 1));
const addMs = (date, ms) => new Date(new Date(date).getTime() + ms);
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const capNow = (date) => (date > ORDERS_NOW ? new Date(ORDERS_NOW.getTime() - 20 * 60 * 1000) : date);

const PAYMENT_METHODS = ["UPI", "UPI", "UPI", "CARD", "CARD", "NET_BANKING", "WALLET", "COD"];
const CANCEL_REASONS = [
  "Buyer changed their mind before dispatch.",
  "Seller could not fulfil the order in time.",
  "Item was no longer available.",
  "Payment was not completed within the allowed time.",
  "Delivery address was not serviceable.",
];
const RETURN_REASONS = [
  "Item did not match the listing photos.",
  "Item arrived with damage that was not listed.",
  "Size and finish were different from what was described.",
];

export const ADMIN_PARTY = {
  type: "Admin",
  id: "ADM-001",
  name: "ReOrbit Platform",
  sub: "Administration",
  image: null,
  email: "support@reorbit.in",
  city: "Ahmedabad",
  status: "Active",
  path: null,
};

export const WAREHOUSE_ADDRESS = {
  name: "ReOrbit Warehouse",
  address: "Plot 14, Orbit Industrial Park, Sarkhej",
  city: "Ahmedabad",
  state: "Gujarat",
  pincode: "382210",
  phone: "+91 79000 12345",
};

export const userParty = (user) => ({
  type: "User",
  id: user.user_id,
  name: user.full_name,
  sub: user.email,
  image: user.profile.profile_image,
  email: user.email,
  city: user.profile.city,
  status: user.status,
  path: `/admin-users/${user.user_id}`,
});

export const remakerParty = (rm) => ({
  type: "ReMaker",
  id: rm.remaker_id,
  name: rm.full_name,
  sub: `“${rm.username}”`,
  image: rm.profile.profile_image,
  email: rm.email,
  city: rm.profile.city,
  status: rm.status,
  path: `/admin-remakers/${rm.remaker_id}`,
});

export const addressOf = (person, party) =>
  party.type === "Admin"
    ? WAREHOUSE_ADDRESS
    : {
        name: person.full_name,
        address: person.profile.address,
        city: person.profile.city,
        state: person.profile.state,
        pincode: person.profile.pincode,
        phone: person.profile.phone,
      };

/* ---------- pools ---------- */

const verifiedItems = INITIAL_USERS.flatMap((user) =>
  user.items.filter((item) => item.verification_status === "Verified").map((item) => ({ ...item, owner: user })),
);
const sellableProducts = INITIAL_REMAKERS.flatMap((rm) =>
  rm.products.filter((p) => p.status !== "Draft").map((p) => ({ ...p, owner: rm })),
);
const activeUsers = INITIAL_USERS.filter((u) => u.status === "Active");
const activeRemakers = INITIAL_REMAKERS.filter((r) => r.status === "Active");

/* ---------- status + payment rules ---------- */

function pickStatus(random, ageDays) {
  const roll = random() * 100;
  if (ageDays <= 4) return roll < 40 ? "Pending" : roll < 80 ? "Confirmed" : roll < 90 ? "Completed" : "Cancelled";
  if (ageDays <= 20) {
    return roll < 25 ? "Confirmed" : roll < 80 ? "Completed" : roll < 90 ? "Cancelled" : roll < 95 ? "Returned" : "Pending";
  }
  return roll < 78 ? "Completed" : roll < 90 ? "Cancelled" : "Returned";
}

function pickPayment(random, status, method) {
  switch (status) {
    case "Pending":
      return method === "COD" ? "Pending" : random() < 0.7 ? "Pending" : "Failed";
    case "Confirmed":
      return method === "COD" ? "Pending" : "Success";
    case "Completed":
      return "Success";
    case "Cancelled": {
      const r = random();
      return r < 0.45 ? "Refunded" : r < 0.7 ? "Success" : "Failed";
    }
    case "Returned":
      return random() < 0.7 ? "Refunded" : "Success";
    default:
      return "Pending";
  }
}

/* ---------- build ---------- */

function buildOrders() {
  const random = createRandom(424242);
  const orders = [];
  const COUNT = 76;

  for (let i = 0; i < COUNT; i += 1) {
    const roll = random();
    let seller;
    let buyer;
    let sellerPerson;
    let buyerPerson;
    let listing;

    if (roll < 0.45) {
      /* ReMaker -> User */
      const product = pick(random, sellableProducts);
      sellerPerson = product.owner;
      seller = remakerParty(sellerPerson);
      buyerPerson = pick(random, activeUsers);
      buyer = userParty(buyerPerson);
      listing = {
        kind: "product",
        id: product.product_id,
        title: product.title,
        category: product.category,
        image: product.image,
        unit_price: product.price,
        quantity: between(random, 1, 100) > 85 ? 2 : 1,
        path: `/admin-products/${product.product_id}`,
      };
    } else {
      const item = pick(random, verifiedItems);
      sellerPerson = item.owner;
      seller = userParty(sellerPerson);
      listing = {
        kind: "item",
        id: item.item_id,
        title: item.title,
        category: item.category,
        image: item.image,
        unit_price: item.estimated_price,
        quantity: 1,
        path: `/admin-products/${item.item_id}`,
        pickup: item.pickup_preference,
      };

      if (roll < 0.65) {
        /* User -> User */
        const pool = activeUsers.filter((u) => u.user_id !== sellerPerson.user_id);
        buyerPerson = pick(random, pool);
        buyer = userParty(buyerPerson);
      } else if (roll < 0.77) {
        /* User -> Admin (platform) */
        buyerPerson = null;
        buyer = ADMIN_PARTY;
        listing.pickup = "Managed by platform";
      } else if (roll < 0.9) {
        /* Admin -> ReMaker (warehouse item sold to a ReMaker) */
        sellerPerson = null;
        seller = ADMIN_PARTY;
        buyerPerson = pick(random, activeRemakers);
        buyer = remakerParty(buyerPerson);
        listing.pickup = "Managed by platform";
      } else {
        /* User -> ReMaker */
        buyerPerson = pick(random, activeRemakers);
        buyer = remakerParty(buyerPerson);
      }
    }

    /* dates: skewed towards recent */
    const ageDays = Math.floor(Math.pow(random(), 1.7) * 330);
    const placed = capNow(
      new Date(ORDERS_NOW.getTime() - ageDays * DAY - between(random, 0, 20) * HOUR - between(random, 5, 55) * 60000),
    );
    const realAge = Math.floor((ORDERS_NOW - placed) / DAY);

    const status = pickStatus(random, realAge);
    const method = pick(random, PAYMENT_METHODS);
    const payment = pickPayment(random, status, method);

    /* money */
    const subtotal = listing.unit_price * listing.quantity;
    const platformFee = Math.round(subtotal * 0.03);
    let delivery = 0;
    if (buyer.type !== "Admin") {
      if (listing.kind === "item") delivery = listing.pickup === "Managed by platform" ? 149 : 0;
      else delivery = subtotal >= 1500 ? 0 : 79;
    }
    const amount = subtotal + platformFee + delivery;

    /* ---------- timeline written at creation ---------- */
    const events = [];
    const push = (id, label, detail, at, tone, extra = {}) => events.push({ id, label, detail, at: at.toISOString(), tone, ...extra });

    push("placed", "Order placed", `${buyer.name} ordered “${listing.title}”`, placed, "neutral");

    const confirmedAt = capNow(addMs(placed, between(random, 1, 20) * HOUR));
    const reached = (list) => list.includes(status);
    let completedAt = null;
    let returnedAt = null;
    let cancelledAt = null;
    let cancelReason = "";
    let returnReason = "";

    if (reached(["Confirmed", "Completed", "Returned"])) {
      push("confirmed", "Order confirmed", `Confirmed for ${seller.name}`, confirmedAt, "info");
    }
    if (reached(["Completed", "Returned"])) {
      completedAt = capNow(addMs(confirmedAt, between(random, 2, 7) * DAY));
      push("completed", "Delivered & completed", listing.kind === "item" ? "Item handed over to the buyer" : "Product delivered to the buyer", completedAt, "good");
    }
    if (status === "Returned") {
      returnedAt = capNow(addMs(completedAt, between(random, 3, 9) * DAY));
      returnReason = pick(random, RETURN_REASONS);
      push("returned", "Order returned", returnReason, returnedAt, "bad");
    }
    if (status === "Cancelled") {
      cancelledAt = capNow(addMs(placed, between(random, 1, 30) * HOUR));
      cancelReason = pick(random, CANCEL_REASONS);
      push("cancelled", "Order cancelled", cancelReason, cancelledAt, "bad");
    }

    /* payment */
    const txnId = `TXN-${640000 + i * 37 + between(random, 1, 30)}`;
    const reference = method === "COD" ? null : `${method === "NET_BANKING" ? "NB" : method.slice(0, 3)}${between(random, 100000000, 999999999)}`;
    let transactionDate = null;

    if (payment === "Success" || payment === "Refunded") {
      transactionDate =
        method === "COD" && completedAt ? completedAt : capNow(addMs(placed, between(random, 1, 9) * 60000));
      push(
        "payment",
        method === "COD" ? "Cash collected" : "Payment received",
        method === "COD" ? "Collected on delivery" : `${method.replace("_", " ")} · ${reference}`,
        transactionDate,
        "good",
      );
    } else if (payment === "Failed") {
      transactionDate = capNow(addMs(placed, between(random, 1, 9) * 60000));
      push("payment", "Payment failed", `${method.replace("_", " ")} · ${reference || "no reference"}`, transactionDate, "bad");
    } else if (status === "Pending") {
      push("payment", "Awaiting payment", method === "COD" ? "To be collected on delivery" : `${method.replace("_", " ")} not received yet`, placed, "wait", { pending: true });
    }

    if (payment === "Refunded") {
      const anchor = returnedAt || cancelledAt || placed;
      push("refund", "Refund issued", `₹${amount.toLocaleString("en-IN")} returned to the buyer`, capNow(addMs(anchor, between(random, 1, 3) * DAY)), "info");
    }

    events.sort((a, b) => new Date(b.at) - new Date(a.at));

    orders.push({
      order_id: `ORD-${30001 + i}`,
      order_date: placed.toISOString(),
      order_status: status,
      cancel_reason: cancelReason,
      return_reason: returnReason,
      seller,
      buyer,
      flow: `${seller.type}>${buyer.type}`,
      listing,
      subtotal,
      platform_fee: platformFee,
      delivery_fee: delivery,
      amount,
      transaction: {
        transaction_id: txnId,
        payment_method: method,
        payment_status: payment,
        transaction_date: transactionDate ? transactionDate.toISOString() : null,
        reference,
      },
      delivery: addressOf(buyerPerson, buyer),
      pickup_from: sellerPerson ? addressOf(sellerPerson, seller) : WAREHOUSE_ADDRESS,
      events,
    });
  }

  return orders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
}

export const INITIAL_ORDERS = buildOrders();

export const FLOW_LABELS = {
  "ReMaker>User": "ReMaker → User",
  "User>User": "User → User",
  "User>Admin": "User → Platform",
  "Admin>ReMaker": "Platform → ReMaker",
  "User>ReMaker": "User → ReMaker",
  "ReMaker>Admin": "ReMaker → Platform",
  "Admin>User": "Platform → User",
};
