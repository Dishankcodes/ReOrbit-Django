/* =========================================================
   DUMMY DATA — Admin › Sell products
   UI only. The admin (platform) sells its own products:
   warehouse stock, refurbished pieces or anything else.

   - SEED_LISTINGS : the admin's storefront listings.
   - SEED_SALES    : orders placed by users / ReMakers for them.
     They use the SAME order shape as Admin › Orders, so every
     sale also shows up there (seller = ReOrbit Platform).
   ========================================================= */

import { getSettings } from "./settingsStore";
import { INITIAL_USERS } from "./adminUsers";
import { INITIAL_REMAKERS } from "./adminRemakers";
import { ADMIN_PARTY, WAREHOUSE_ADDRESS, ORDERS_NOW, userParty, remakerParty, addressOf } from "./adminOrders";

const IMG = {
  chest: "/images/products/teak-drawer-chest.jpg",
  lamp: "/images/products/ceramic-lamp.jpg",
  chair: "/images/products/vintage-chair.jpg",
  table: "/images/products/wooden-table.jpg",
  other: "/images/products/default-item.jpg",
};
const DAY = 86400000;
const HOUR = 3600000;
const ago = (days, hours = 0) => new Date(ORDERS_NOW.getTime() - days * DAY - hours * HOUR).toISOString();

export const SELL_CATEGORIES = ["Furniture", "Home Decor", "Kitchen", "Fashion", "Clothing", "Electronics", "Books", "Sports", "Lighting", "Other"];
export const SELL_CONDITIONS = ["Like new", "Good", "Fair", "Refurbished", "Brand new"];
export const SELL_SOURCES = {
  warehouse: { label: "Warehouse stock", hint: "Pre-owned stock held in the ReOrbit warehouse." },
  refurbished: { label: "Refurbished", hint: "Restored by a ReMaker and quality checked." },
  other: { label: "Other / new", hint: "Anything else the platform wants to sell." },
};

export const SEED_LISTINGS = [
  {
    id: "ADL-1001", title: "Restored Teak Drawer Chest", category: "Furniture", source: "refurbished", inventory_id: null, condition: "Refurbished",
    description: "A 1970s teak chest of drawers, fully restored by one of our ReMakers. Joints re-glued, drawers re-fitted and finished with natural oil. Solid, smooth and ready for another 50 years.",
    price: 7499, mrp: 9800, quantity: 12, images: [IMG.chest, IMG.table, IMG.chair, IMG.other], status: "Active", created_at: ago(34),
    specs: { material: "Solid teak", dimensions: "90 × 45 × 100 cm", weight: "32", warranty: "6 months" }, delivery: "free", returnable: true, views: 1284, wishlisted: 41,
  },
  {
    id: "ADL-1002", title: "Ceramic Table Lamp with Linen Shade", category: "Lighting", source: "warehouse", inventory_id: null, condition: "Like new",
    description: "Hand-glazed ceramic base with a fresh linen shade. Wiring tested and replaced with a new safe cable. Warm and soft light for a bedside or reading corner.",
    price: 1699, mrp: 2400, quantity: 16, images: [IMG.lamp, IMG.chair, IMG.table], status: "Active", created_at: ago(21),
    specs: { material: "Ceramic, linen", dimensions: "28 × 28 × 52 cm", weight: "2.4", warranty: "3 months" }, delivery: "flat", returnable: true, views: 861, wishlisted: 27,
  },
  {
    id: "ADL-1003", title: "Vintage Wooden Study Chair", category: "Furniture", source: "warehouse", inventory_id: null, condition: "Good",
    description: "Sturdy school-style chair in solid wood with a smooth seat. Cleaned, tightened and polished at our warehouse. Minor marks that add character.",
    price: 2199, mrp: 3100, quantity: 9, images: [IMG.chair, IMG.chest, IMG.table, IMG.lamp], status: "Active", created_at: ago(15),
    specs: { material: "Mango wood", dimensions: "42 × 44 × 86 cm", weight: "6.5", warranty: "None" }, delivery: "flat", returnable: false, views: 540, wishlisted: 18,
  },
  {
    id: "ADL-1004", title: "Reclaimed Wood Dining Table (6 seat)", category: "Furniture", source: "refurbished", inventory_id: null, condition: "Refurbished",
    description: "Six-seater table rebuilt from reclaimed sal wood. Hand-sanded, sealed with a food-safe finish and mounted on a new iron frame.",
    price: 18900, mrp: 24500, quantity: 7, images: [IMG.table, IMG.chest, IMG.chair, IMG.lamp], status: "Active", created_at: ago(9),
    specs: { material: "Reclaimed sal wood, iron", dimensions: "180 × 90 × 76 cm", weight: "58", warranty: "1 year" }, delivery: "free", returnable: true, views: 402, wishlisted: 22,
  },
  {
    id: "ADL-1005", title: "Brass Cooking Pot Set (3 pcs)", category: "Kitchen", source: "other", inventory_id: null, condition: "Brand new",
    description: "A set of three tin-lined brass pots with lids, sourced from a small artisan cooperative. Heavy base and even heating.",
    price: 3299, mrp: 3999, quantity: 10, images: [IMG.other, IMG.lamp, IMG.chair], status: "Paused", created_at: ago(27),
    specs: { material: "Brass, tin lining", dimensions: "Largest 24 cm", weight: "4.1", warranty: "1 year" }, delivery: "flat", returnable: true, views: 233, wishlisted: 9,
  },
  {
    id: "ADL-1006", title: "Carved Window Frame Wall Mirror", category: "Home Decor", source: "warehouse", inventory_id: null, condition: "Fair",
    description: "An old carved window frame turned into a wall mirror. Weathered paint kept on purpose. Hangs with two hooks (included).",
    price: 2599, mrp: 3200, quantity: 1, images: [IMG.other, IMG.chest, IMG.table], status: "Draft", created_at: ago(2),
    specs: { material: "Teak, glass", dimensions: "70 × 90 cm", weight: "7", warranty: "None" }, delivery: "flat", returnable: false, views: 0, wishlisted: 0,
  },
];

/* ---------- deterministic sales for the seeded listings ---------- */
function createRandom(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const activeUsers = INITIAL_USERS.filter((u) => u.status === "Active");
const activeRemakers = INITIAL_REMAKERS.filter((r) => r.status === "Active");
const METHODS = ["UPI", "UPI", "CARD", "CARD", "NET_BANKING", "WALLET", "COD"];
const COURIERS = ["Delhivery", "Blue Dart", "Ecom Express", "India Post Speed"];

export function deliveryFeeFor(listing, subtotal) {
  if (listing.delivery === "free") return 0;
  const c = getSettings().commerce;
  return subtotal >= c.sellFreeFrom ? 0 : c.sellDelivery;
}

/* Builds one sales order in the Admin › Orders shape. */
export function buildSaleOrder({ seq, listing, qty, buyerPerson, buyerKind, placed, status, method, payment, shipment, cancelReason, returnReason }) {
  const buyer = buyerKind === "ReMaker" ? remakerParty(buyerPerson) : userParty(buyerPerson);
  const subtotal = listing.price * qty;
  const delivery = deliveryFeeFor(listing, subtotal);
  const fee = 0; // the platform does not charge itself a fee
  const amount = subtotal + delivery + fee;
  const at = (ms) => new Date(new Date(placed).getTime() + ms).toISOString();
  const isCod = method === "COD";
  const events = [{ id: "placed", label: "Order placed", detail: `${buyer.name} ordered “${listing.title}”`, at: at(0), tone: "neutral" }];
  const paid = payment === "Success" || payment === "Refunded";
  if (paid) events.push({ id: "payment", label: isCod ? "Cash collected" : "Payment received", detail: isCod ? "Collected on delivery" : `${method.replace("_", " ")} · paid`, at: at(10 * 60000), tone: "good" });
  else if (payment === "Failed") events.push({ id: "payment", label: "Payment failed", detail: method.replace("_", " "), at: at(8 * 60000), tone: "bad" });
  else events.push({ id: "payment", label: isCod ? "Pay on delivery" : "Awaiting payment", detail: isCod ? "To be collected on delivery" : `${method.replace("_", " ")} not received yet`, at: at(60000), tone: "wait", pending: true });
  if (["Confirmed", "Completed", "Returned"].includes(status)) events.push({ id: "confirmed", label: "Order confirmed", detail: "Accepted by Admin · You", at: at(3 * HOUR), tone: "info" });
  if (shipment) events.push({ id: "shipped", label: "Shipped", detail: `${shipment.courier} · ${shipment.tracking}`, at: shipment.shipped_at, tone: "info" });
  if (["Completed", "Returned"].includes(status)) events.push({ id: "completed", label: "Delivered & completed", detail: "Handed over to the buyer", at: at(5 * DAY), tone: "good" });
  if (status === "Returned") events.push({ id: "returned", label: "Order returned", detail: returnReason, at: at(8 * DAY), tone: "bad" });
  if (status === "Cancelled") events.push({ id: "cancelled", label: "Order cancelled", detail: cancelReason, at: at(5 * HOUR), tone: "bad" });
  if (payment === "Refunded") events.push({ id: "refund", label: "Refund issued", detail: `₹${amount.toLocaleString("en-IN")} returned to the buyer`, at: at(9 * DAY), tone: "info" });
  events.sort((a, b) => new Date(b.at) - new Date(a.at));

  return {
    order_id: `ORD-${seq}`,
    order_date: new Date(placed).toISOString(),
    order_status: status,
    cancel_reason: cancelReason || "",
    return_reason: returnReason || "",
    seller: ADMIN_PARTY,
    buyer,
    flow: `Admin>${buyer.type}`,
    listing: { kind: "product", id: listing.id, title: listing.title, category: listing.category, image: listing.images[0], unit_price: listing.price, quantity: qty, path: `/admin-sell/listing/${listing.id}` },
    subtotal, platform_fee: fee, delivery_fee: delivery, amount,
    transaction: {
      transaction_id: `TXN-8${String(seq).slice(-5)}`,
      payment_method: method, payment_status: payment,
      transaction_date: paid ? at(10 * 60000) : null,
      reference: isCod ? null : `${method === "NET_BANKING" ? "NB" : method.slice(0, 3)}${String(seq * 7919).slice(0, 9)}`,
    },
    delivery: addressOf(buyerPerson, buyer),
    pickup_from: WAREHOUSE_ADDRESS,
    events,
    shipment: shipment || null,
    sold_by_admin: true,
  };
}

function seedSales() {
  const random = createRandom(777);
  const out = [];
  let seq = 50001;
  const plan = {
    "ADL-1001": ["Completed", "Completed", "Confirmed", "Pending"],
    "ADL-1002": ["Completed", "Completed", "Completed", "Returned", "Confirmed"],
    "ADL-1003": ["Completed", "Cancelled", "Pending"],
    "ADL-1004": ["Completed", "Confirmed"],
    "ADL-1005": ["Completed", "Completed", "Cancelled"],
  };
  SEED_LISTINGS.forEach((listing) => {
    (plan[listing.id] || []).forEach((status, i) => {
      const toRemaker = random() < 0.25;
      const pool = toRemaker ? activeRemakers : activeUsers;
      const buyerPerson = pool[Math.floor(random() * pool.length)];
      const age = status === "Pending" ? 0 : status === "Confirmed" ? 1 + (i % 2) : 6 + Math.floor(random() * 22);
      const placed = ago(age, Math.floor(random() * 10) + 1);
      const method = METHODS[Math.floor(random() * METHODS.length)];
      const isCod = method === "COD";
      let payment;
      if (status === "Pending") payment = isCod ? "Pending" : random() < 0.6 ? "Pending" : "Failed";
      else if (status === "Confirmed") payment = isCod ? "Pending" : "Success";
      else if (status === "Completed") payment = "Success";
      else if (status === "Returned") payment = "Refunded";
      else payment = random() < 0.5 ? "Refunded" : "Failed";
      const shipped = status === "Completed" || status === "Returned" || (status === "Confirmed" && age >= 2);
      const shipment = shipped ? { courier: COURIERS[Math.floor(random() * COURIERS.length)], tracking: `RO${Math.floor(random() * 9e9 + 1e9)}`, shipped_at: new Date(new Date(placed).getTime() + 8 * HOUR).toISOString() } : null;
      out.push(buildSaleOrder({
        seq: seq++, listing, qty: 1 + (random() < 0.2 ? 1 : 0), buyerPerson, buyerKind: toRemaker ? "ReMaker" : "User",
        placed, status, method, payment, shipment,
        cancelReason: status === "Cancelled" ? "Buyer changed their mind before dispatch." : "",
        returnReason: status === "Returned" ? "Lampshade arrived with a small tear." : "",
      }));
    });
  });
  return out;
}
export const SEED_SALES = seedSales();
export { activeUsers as SELL_BUYER_USERS, activeRemakers as SELL_BUYER_REMAKERS };
