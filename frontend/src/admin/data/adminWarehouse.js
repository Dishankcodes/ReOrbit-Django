/* =========================================================
   DUMMY DATA — Admin › Warehouse
   UI only. No backend. Follows the Warehouse_Inventory notes:
   warehouse_status = Received / Stored / Assigned / Refurbishment / Released
   plus a sale state (Not listed / Listed / Sold / Donated), because
   ReOrbit buys stock from Users and ReMakers, keeps it here and
   sells it on the marketplace.
   ========================================================= */

import { INITIAL_USERS } from "./adminUsers";
import { INITIAL_REMAKERS } from "./adminRemakers";
import { DEMO_TODAY } from "../utils/format";

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
const random = createRandom(5150);
const pick = (list) => list[Math.floor(random() * list.length)];
const between = (min, max) => min + Math.floor(random() * (max - min + 1));

export const UNSOLD_DAYS = 7; // the rule: unsold for this many days -> alert

const hoursAgo = (h) => new Date(DEMO_TODAY.getTime() - h * 3600000).toISOString();
const daysAgo = (d, extraHours = 0) => hoursAgo(d * 24 + extraHours);

/* ---------- warehouse layout (zones) ---------- */
export const ZONES = [
  { key: "A", name: "Furniture hall", capacity: 60 },
  { key: "B", name: "Home & kitchen", capacity: 48 },
  { key: "C", name: "Textiles & clothing", capacity: 56 },
  { key: "D", name: "Electronics & books", capacity: 36 },
  { key: "E", name: "Sports & misc", capacity: 24 },
];

export const CATEGORY_ZONE = {
  Furniture: "A", "Home Decor": "B", Kitchen: "B", Clothing: "C", Fashion: "C",
  Electronics: "D", Books: "D", Sports: "E",
};

/* The dock (DOCK) and the QC / refurbishment bay (QC) sit outside the racks. */
export const WAREHOUSE_ADDRESS = "Plot 14, Orbit Industrial Park, Sarkhej, Ahmedabad 382210";

/* ---------- what we stock ---------- */
const CATALOG = [
  { title: "Vintage Teak Drawer Chest", category: "Furniture", image: "/images/products/teak-drawer-chest.jpg", price: 6500 },
  { title: "Ceramic Table Lamp", category: "Home Decor", image: "/images/products/ceramic-lamp.jpg", price: 1200 },
  { title: "Wooden Study Chair", category: "Furniture", image: "/images/products/vintage-chair.jpg", price: 2400 },
  { title: "Solid Wood Dining Table", category: "Furniture", image: "/images/products/wooden-table.jpg", price: 9800 },
  { title: "Denim Jackets Bundle (4)", category: "Clothing", image: "/images/products/default-item.jpg", price: 1800 },
  { title: "Old Laptop (working)", category: "Electronics", image: "/images/products/default-item.jpg", price: 7500 },
  { title: "Glass Jars Set (12)", category: "Kitchen", image: "/images/products/default-item.jpg", price: 650 },
  { title: "Steel Bookshelf", category: "Furniture", image: "/images/products/default-item.jpg", price: 3200 },
  { title: "Brass Cooking Pots", category: "Kitchen", image: "/images/products/default-item.jpg", price: 2100 },
  { title: "Children's Books Bundle", category: "Books", image: "/images/products/default-item.jpg", price: 500 },
  { title: "Cotton Sarees (6)", category: "Clothing", image: "/images/products/default-item.jpg", price: 2800 },
  { title: "Carved Window Frames", category: "Home Decor", image: "/images/products/default-item.jpg", price: 3600 },
  { title: "Kids Bicycle", category: "Sports", image: "/images/products/default-item.jpg", price: 1900 },
  { title: "Rattan Side Table", category: "Furniture", image: "/images/products/default-item.jpg", price: 2700 },
  { title: "Reclaimed Wood Lamp", category: "Home Decor", image: "/images/products/ceramic-lamp.jpg", price: 1249 },
  { title: "Upcycled Denim Tote", category: "Fashion", image: "/images/products/default-item.jpg", price: 749 },
  { title: "Refurbished Study Chair", category: "Furniture", image: "/images/products/vintage-chair.jpg", price: 3199 },
  { title: "Rustic Coffee Table", category: "Furniture", image: "/images/products/wooden-table.jpg", price: 5400 },
  { title: "Badminton Racket Set", category: "Sports", image: "/images/products/default-item.jpg", price: 900 },
  { title: "Vintage Radio", category: "Electronics", image: "/images/products/default-item.jpg", price: 2200 },
];

const CONDITIONS = ["Like new", "Good", "Good", "Fair", "Needs refurbishing"];
const CAT_CODE = { Furniture: "FUR", "Home Decor": "DEC", Kitchen: "KIT", Clothing: "CLO", Fashion: "FAS", Electronics: "ELE", Books: "BOK", Sports: "SPT" };

/* ReMaker who refurbishes each kind of stock */
const REFURB_BY_CATEGORY = { Furniture: "Tara Bose", "Home Decor": "Arjun Mehta", Kitchen: "Gaurav Menon", Clothing: "Priya Shah", Fashion: "Divya Nambiar", Electronics: "Arjun Mehta", Books: "Priya Shah", Sports: "Karan Bhatia" };
const remakerByName = (name) => INITIAL_REMAKERS.find((r) => r.full_name === name);
export function refurbFor(category, assignedAt, progress = "Assigned") {
  const rm = remakerByName(REFURB_BY_CATEGORY[category] || "Priya Shah");
  return { name: rm.full_name, path: `/admin-remakers/${rm.remaker_id}`, assigned_at: assignedAt, due: new Date(new Date(assignedAt).getTime() + 10 * 86400000).toISOString(), progress };
}

const activeUsers = INITIAL_USERS.filter((u) => u.status === "Active");
const activeRemakers = INITIAL_REMAKERS.filter((r) => r.status === "Active");

function sourceParty(kind) {
  if (kind === "ReMaker") {
    const rm = pick(activeRemakers);
    return { type: "ReMaker", id: rm.remaker_id, name: rm.full_name, sub: `“${rm.username}”`, image: rm.profile.profile_image, city: rm.profile.city, path: `/admin-remakers/${rm.remaker_id}` };
  }
  const u = pick(activeUsers);
  return { type: "User", id: u.user_id, name: u.full_name, sub: u.email, image: u.profile.profile_image, city: u.profile.city, path: `/admin-users/${u.user_id}` };
}

export function makeLocation(category, seedNumber) {
  const zone = CATEGORY_ZONE[category] || "E";
  const rack = String((seedNumber % 8) + 1).padStart(2, "0");
  const level = (seedNumber % 4) + 1;
  return { zone, rack, level, bin: `${zone}-${rack}-${level}` };
}

/* ---------- groups of stock to create ---------- */
const GROUPS = [
  { n: 5, status: "Received", sale: "Not listed", recv: [0, 2] },
  { n: 3, status: "Stored", sale: "Not listed", recv: [2, 6] },
  { n: 10, status: "Stored", sale: "Listed", listed: [0, 6] },
  { n: 8, status: "Stored", sale: "Listed", listed: [7, 13] },
  { n: 6, status: "Stored", sale: "Listed", listed: [14, 29] },
  { n: 4, status: "Stored", sale: "Listed", listed: [30, 52] },
  { n: 4, status: "Assigned", sale: "Sold", listed: [3, 12] },
  { n: 5, status: "Refurbishment", sale: "Not listed", recv: [6, 20] },
  { n: 5, status: "Released", sale: "Sold", listed: [10, 40] },
];

function build() {
  const rows = [];
  let counter = 0;

  GROUPS.forEach((group) => {
    for (let i = 0; i < group.n; i += 1) {
      const spec = CATALOG[(counter * 7 + i * 3) % CATALOG.length];
      const seq = 1001 + counter;
      const id = `WH-${seq}`;
      const kind = group.status === "Refurbishment" ? "User" : random() < 0.28 ? "ReMaker" : "User";
      const qty = spec.title.includes("(") ? 1 : pick([1, 1, 1, 2, 3]);
      const listPrice = Math.round((spec.price * qty * (0.92 + random() * 0.2)) / 10) * 10;
      const costPrice = Math.round((listPrice * (0.5 + random() * 0.18)) / 10) * 10;

      let listedAge = null;
      let receivedAge;
      if (group.listed) {
        listedAge = between(group.listed[0], group.listed[1]);
        receivedAge = listedAge + between(1, 4);
      } else {
        receivedAge = between(group.recv[0], group.recv[1]);
      }

      const receivedAt = daysAgo(receivedAge, between(0, 6));
      const storedAt = group.status === "Received" ? null : new Date(new Date(receivedAt).getTime() + between(3, 20) * 3600000).toISOString();
      const listedAt = listedAge === null ? null : daysAgo(listedAge, between(0, 5));

      const item = {
        inventory_id: id,
        sku: `RO-${CAT_CODE[spec.category]}-${String(seq).padStart(4, "0")}`,
        item_id: `ITM-${between(1001, 1024)}${between(1, 5)}`,
        title: spec.title,
        category: spec.category,
        image: spec.image,
        condition: group.status === "Refurbishment" ? "Needs refurbishing" : pick(CONDITIONS.slice(0, 4)),
        quantity: qty,
        source: sourceParty(kind),
        purchase_ref: `PO-26${String(between(9, 10)).padStart(2, "0")}-${String(between(10, 99))}`,
        cost_price: costPrice,
        list_price: listPrice,
        original_price: listPrice,
        received_at: receivedAt,
        stored_at: storedAt,
        listed_at: listedAt,
        warehouse_status: group.status,
        sale_status: group.sale,
        location: null,
        refurb: null,
        views: between(4, 40) + (listedAge || 0) * between(2, 6),
        wishlisted: between(0, 6),
        promoted: false,
        price_cuts: 0,
        snoozed_until: null,
        events: [],
      };

      if (group.status === "Received") item.location = { zone: "DOCK", rack: "01", level: 1, bin: "DOCK-01" };
      else if (group.status === "Refurbishment") {
        const bay = between(1, 4);
        item.location = { zone: "QC", rack: `0${bay}`, level: 1, bin: `QC-0${bay}` };
        const assignedAt = new Date(new Date(storedAt).getTime() + 24 * 3600000).toISOString();
        item.refurb = refurbFor(spec.category, assignedAt, pick(["Assigned", "In_Progress", "In_Progress"]));
      } else if (group.status === "Released") item.location = null;
      else item.location = makeLocation(spec.category, seq);

      if (group.sale === "Sold" && group.status === "Released") {
        item.released_at = daysAgo(between(1, 8));
        if (i === 4) item.sale_status = "Donated";
      }
      if (group.status === "Assigned") item.order_id = `ORD-${between(7000, 7999)}`;

      /* a couple of listed items already had a price cut or promo */
      if (group.sale === "Listed" && group.listed[0] >= 14 && i % 3 === 1) {
        item.price_cuts = 1;
        item.list_price = Math.round((listPrice * 0.9) / 10) * 10;
      }
      if (group.sale === "Listed" && group.listed[0] === 7 && i === 2) {
        item.snoozed_until = new Date(DEMO_TODAY.getTime() + 2 * 86400000).toISOString();
      }

      /* timeline */
      item.events.push({ id: "e-recv", label: "Received at warehouse", detail: `Bought from ${item.source.name} · ${item.purchase_ref}`, at: receivedAt, tone: "good" });
      if (storedAt) item.events.push({ id: "e-stored", label: "Stored on shelf", detail: item.location ? `Location ${item.location.bin}` : "Put away", at: storedAt, tone: "neutral" });
      if (item.refurb) item.events.push({ id: "e-refurb", label: "Sent to refurbishment", detail: `Assigned to ${item.refurb.name}`, at: item.refurb.assigned_at, tone: "neutral" });
      if (listedAt) item.events.push({ id: "e-listed", label: "Listed on marketplace", detail: `Price ₹${item.original_price.toLocaleString("en-IN")}`, at: listedAt, tone: "good" });
      if (group.status === "Released") item.events.push({ id: "e-out", label: item.sale_status === "Donated" ? "Donated" : "Dispatched to buyer", detail: "Left the warehouse", at: item.released_at, tone: "neutral" });
      item.events.sort((a, b) => new Date(a.at) - new Date(b.at));

      rows.push(item);
      counter += 1;
    }
  });

  return rows;
}

export const INITIAL_WAREHOUSE = build();
