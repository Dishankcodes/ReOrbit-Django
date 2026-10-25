/* =========================================================
   User › Donations data layer (UI only, in-memory).
   Mirrors the Donations + Pickup_Requests tables so it can be
   swapped for API calls later. Statuses match the admin side:
   Pending → Scheduled → Picked_Up → Received → Completed
   (or Rejected by admin / Cancelled by the donor).
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";

const DAY = 86400000;

const at = (offsetDays, hour = 10) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Date(date.getTime() + offsetDays * DAY).toISOString();
};

/* ---------------------------------------------------------
   Static reference data
   --------------------------------------------------------- */

export const DONOR = {
  name: "Aarav Patel",
  phone: "+91 98765 43210",
  email: "aarav.patel@example.com",
};

export const SAVED_ADDRESSES = [
  {
    id: "addr-home",
    label: "Home",
    line: "B-402, Shreeji Heights, Satellite Road",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380015",
  },
  {
    id: "addr-work",
    label: "Work",
    line: "7th Floor, Titanium Business Park, Prahlad Nagar",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380051",
  },
];

export const DONATION_CATEGORIES = [
  {
    id: "Furniture",
    label: "Furniture",
    hint: "Chairs, tables, shelves",
    weight: 9,
    image: "/images/products/vintage-chair.jpg",
  },
  {
    id: "Clothing",
    label: "Clothing",
    hint: "Clean, wearable clothes",
    weight: 0.8,
    image:
      "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "Books",
    label: "Books",
    hint: "Novels, textbooks, kids' books",
    weight: 0.5,
    image:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "Electronics",
    label: "Electronics",
    hint: "Working devices & accessories",
    weight: 3,
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "Home Decor",
    label: "Home Decor",
    hint: "Lamps, frames, vases",
    weight: 1.5,
    image: "/images/products/ceramic-lamp.jpg",
  },
  {
    id: "Kitchen",
    label: "Kitchen",
    hint: "Utensils, cookware, appliances",
    weight: 2.5,
    image: "/images/products/default-item.jpg",
  },
  {
    id: "Fashion",
    label: "Fashion",
    hint: "Bags, shoes, accessories",
    weight: 0.7,
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "Sports",
    label: "Sports & Toys",
    hint: "Gear, games, toys",
    weight: 1.5,
    image: "/images/products/default-item.jpg",
  },
];

export const CONDITIONS = [
  {
    id: "Good",
    label: "Good",
    help: "Works / looks great. Minor signs of use at most.",
  },
  {
    id: "Medium",
    label: "Medium",
    help: "Fully usable but visibly used or lightly worn.",
  },
  {
    id: "Worst",
    label: "Needs repair",
    help: "Usable only after repair. Reviewed with extra care.",
  },
];

export const SLOTS = [
  "9:00 AM – 12:00 PM",
  "12:00 PM – 3:00 PM",
  "3:00 PM – 6:00 PM",
];

export const PARTNERS = [
  { name: "Ravi Kumar", team: "Pickup team A", phone: "+91 98240 11122" },
  { name: "Imran Qureshi", team: "Pickup team B", phone: "+91 98250 33445" },
  { name: "Sunita Devi", team: "Pickup team C", phone: "+91 98790 55667" },
];

export const NGOS = [
  { name: "Asha Kiran Trust", city: "Ahmedabad" },
  { name: "Nayi Disha Foundation", city: "Gandhinagar" },
  { name: "Jeevan Jyoti NGO", city: "Ahmedabad" },
];

export const REWARD_RULES = { base: 100, perItem: 20, co2PerKg: 1.9 };

export const CANCEL_REASONS = [
  "I no longer want to donate this",
  "I want to give it to someone I know",
  "Wrong details or photos",
  "The pickup time doesn't work for me",
  "Other",
];

export const WHAT_WE_ACCEPT = [
  "Clean, usable items in Good or Medium condition",
  "Working electronics with basic accessories",
  "Washed clothes, folded and bagged",
  "Furniture that is stable and complete",
];

export const WHAT_WE_SKIP = [
  "Broken, soiled or unsafe items",
  "Mattresses, pillows and used undergarments",
  "Expired food, medicines or chemicals",
  "Items that need large repairs to be usable",
];

/* ---------------------------------------------------------
   Status model
   --------------------------------------------------------- */

export const STATUS_META = {
  Pending: {
    label: "Under review",
    tone: "amber",
    blurb: "We're reviewing your donation.",
  },
  Scheduled: {
    label: "Pickup scheduled",
    tone: "blue",
    blurb: "Your free pickup is booked.",
  },
  Picked_Up: {
    label: "Picked up",
    tone: "violet",
    blurb: "On its way to our warehouse.",
  },
  Received: {
    label: "Received",
    tone: "teal",
    blurb: "Checked in at the warehouse.",
  },
  Completed: {
    label: "Completed",
    tone: "green",
    blurb: "Delivered. Certificate issued.",
  },
  Rejected: {
    label: "Not accepted",
    tone: "red",
    blurb: "We couldn't accept this item.",
  },
  Cancelled: {
    label: "Cancelled",
    tone: "grey",
    blurb: "You cancelled this donation.",
  },
};

export const TRACK_STEPS = [
  { key: "Pending", label: "Submitted", sub: "Under review" },
  { key: "Scheduled", label: "Pickup booked", sub: "Free pickup" },
  { key: "Picked_Up", label: "Picked up", sub: "From your door" },
  { key: "Received", label: "Received", sub: "At warehouse" },
  { key: "Completed", label: "Completed", sub: "Certificate issued" },
];

export const ACTIVE_STATUSES = [
  "Pending",
  "Scheduled",
  "Picked_Up",
  "Received",
];
export const CLOSED_STATUSES = ["Rejected", "Cancelled"];
export const canCancel = (d) => ["Pending", "Scheduled"].includes(d.status);
export const canReschedule = (d) =>
  ["Pending", "Scheduled"].includes(d.status) && d.pickup.rescheduleCount < 2;

export const stepIndex = (status) =>
  Math.max(
    0,
    TRACK_STEPS.findIndex((step) => step.key === status),
  );

/* ---------------------------------------------------------
   Pincode serviceability (Serviceable_Pincodes table)
   --------------------------------------------------------- */

const RANGES = [
  [380001, 380063, "Ahmedabad"],
  [382005, 382030, "Gandhinagar"],
  [382345, 382481, "Ahmedabad"],
];

export function checkPincode(value) {
  const text = String(value || "").trim();
  if (!/^\d{6}$/.test(text))
    return { valid: false, serviceable: false, city: "" };
  const num = Number(text);
  const range = RANGES.find(([from, to]) => num >= from && num <= to);
  return {
    valid: true,
    serviceable: Boolean(range),
    city: range ? range[2] : "",
  };
}

/* ---------------------------------------------------------
   Seed data
   --------------------------------------------------------- */

const HOME = SAVED_ADDRESSES[0];

const basePickup = (over = {}) => ({
  date: null,
  slot: null,
  address: HOME,
  contactName: DONOR.name,
  phone: DONOR.phone,
  note: "",
  partner: null,
  handoverCode: String(1000 + Math.floor(Math.random() * 9000)),
  rescheduleCount: 0,
  ...over,
});

const ev = (id, label, detail, when, tone = "neutral") => ({
  id,
  label,
  detail,
  at: when,
  tone,
});

const seed = () => [
  {
    id: "DON-2048",
    title: "Study chair set",
    category: "Furniture",
    description:
      "Two sturdy wooden study chairs, cushions in good shape. Cleaned and ready to use.",
    condition: "Good",
    quantity: 2,
    weightKg: 16,
    images: [
      "/images/products/vintage-chair.jpg",
      "/images/products/wooden-table.jpg",
    ],
    status: "Scheduled",
    createdAt: at(-2, 18),
    pickup: basePickup({
      date: at(1, 9),
      slot: SLOTS[1],
      partner: PARTNERS[0],
      note: "Ring the bell twice. Chairs are in the balcony.",
    }),
    ngo: null,
    certificateId: null,
    rejectReason: "",
    cancelReason: "",
    events: [
      ev(
        "e1",
        "Donation submitted",
        "2 × Study chair set",
        at(-2, 18),
        "neutral",
      ),
      ev(
        "e2",
        "Accepted · pickup scheduled",
        `Free pickup · ${SLOTS[1]}`,
        at(-1, 11),
        "good",
      ),
    ],
  },
  {
    id: "DON-2047",
    title: "Winter jackets & sweaters",
    category: "Clothing",
    description: "Washed and folded jackets and sweaters, mixed sizes M to XL.",
    condition: "Good",
    quantity: 8,
    weightKg: 7,
    images: [
      "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=900&q=80",
      "/images/products/default-item.jpg",
    ],
    status: "Pending",
    createdAt: at(-1, 20),
    pickup: basePickup({ date: at(3, 9), slot: SLOTS[0], note: "" }),
    ngo: null,
    certificateId: null,
    rejectReason: "",
    cancelReason: "",
    events: [
      ev(
        "e1",
        "Donation submitted",
        "8 × Winter jackets & sweaters",
        at(-1, 20),
        "neutral",
      ),
    ],
  },
  {
    id: "DON-2046",
    title: "Engineering textbooks",
    category: "Books",
    description:
      "Fourteen engineering textbooks, latest editions, no torn pages.",
    condition: "Medium",
    quantity: 14,
    weightKg: 11,
    images: [
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
      "/images/products/default-item.jpg",
    ],
    status: "Picked_Up",
    createdAt: at(-4, 9),
    pickup: basePickup({
      date: at(0, 9),
      slot: SLOTS[0],
      partner: PARTNERS[1],
    }),
    ngo: null,
    certificateId: null,
    rejectReason: "",
    cancelReason: "",
    events: [
      ev(
        "e1",
        "Donation submitted",
        "14 × Engineering textbooks",
        at(-4, 9),
        "neutral",
      ),
      ev(
        "e2",
        "Accepted · pickup scheduled",
        `Free pickup · ${SLOTS[0]}`,
        at(-3, 12),
        "good",
      ),
      ev(
        "e3",
        "Picked up from you",
        "Pickup team B · Imran Qureshi",
        at(0, 10),
        "info",
      ),
    ],
  },
  {
    id: "DON-2044",
    title: "Kitchen utensil set",
    category: "Kitchen",
    description:
      "Steel utensils, pressure cooker and a non-stick pan. All working fine.",
    condition: "Good",
    quantity: 1,
    weightKg: 4,
    images: [
      "/images/products/default-item.jpg",
      "/images/products/ceramic-lamp.jpg",
    ],
    status: "Received",
    createdAt: at(-8, 10),
    pickup: basePickup({
      date: at(-4, 9),
      slot: SLOTS[2],
      partner: PARTNERS[2],
    }),
    ngo: null,
    certificateId: null,
    rejectReason: "",
    cancelReason: "",
    events: [
      ev(
        "e1",
        "Donation submitted",
        "1 × Kitchen utensil set",
        at(-8, 10),
        "neutral",
      ),
      ev(
        "e2",
        "Accepted · pickup scheduled",
        `Free pickup · ${SLOTS[2]}`,
        at(-7, 12),
        "good",
      ),
      ev(
        "e3",
        "Picked up from you",
        "Pickup team C · Sunita Devi",
        at(-4, 16),
        "info",
      ),
      ev(
        "e4",
        "Received at warehouse",
        "Checked in and sorted",
        at(-3, 11),
        "info",
      ),
    ],
  },
  {
    id: "DON-2041",
    title: "Cotton study chair",
    category: "Furniture",
    description: "A comfortable cotton-cushioned study chair, barely used.",
    condition: "Good",
    quantity: 1,
    weightKg: 8,
    images: [
      "/images/products/vintage-chair.jpg",
      "/images/products/teak-drawer-chest.jpg",
    ],
    status: "Completed",
    createdAt: at(-26, 10),
    pickup: basePickup({
      date: at(-23, 9),
      slot: SLOTS[1],
      partner: PARTNERS[0],
    }),
    ngo: NGOS[0],
    certificateId: "CERT-2041",
    rejectReason: "",
    cancelReason: "",
    events: [
      ev(
        "e1",
        "Donation submitted",
        "1 × Cotton study chair",
        at(-26, 10),
        "neutral",
      ),
      ev(
        "e2",
        "Accepted · pickup scheduled",
        `Free pickup · ${SLOTS[1]}`,
        at(-25, 12),
        "good",
      ),
      ev(
        "e3",
        "Picked up from you",
        "Pickup team A · Ravi Kumar",
        at(-23, 13),
        "info",
      ),
      ev(
        "e4",
        "Received at warehouse",
        "Checked in and sorted",
        at(-22, 11),
        "info",
      ),
      ev(
        "e5",
        "Donation completed",
        "Given to Asha Kiran Trust · certificate issued",
        at(-19, 15),
        "good",
      ),
    ],
  },
  {
    id: "DON-2039",
    title: "Kids' story books",
    category: "Books",
    description: "Twenty-two illustrated story books for ages 4 to 9.",
    condition: "Good",
    quantity: 22,
    weightKg: 9,
    images: [
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
      "/images/products/default-item.jpg",
    ],
    status: "Completed",
    createdAt: at(-48, 10),
    pickup: basePickup({
      date: at(-45, 9),
      slot: SLOTS[0],
      partner: PARTNERS[1],
    }),
    ngo: NGOS[1],
    certificateId: "CERT-2039",
    rejectReason: "",
    cancelReason: "",
    events: [
      ev(
        "e1",
        "Donation submitted",
        "22 × Kids' story books",
        at(-48, 10),
        "neutral",
      ),
      ev(
        "e2",
        "Accepted · pickup scheduled",
        `Free pickup · ${SLOTS[0]}`,
        at(-47, 12),
        "good",
      ),
      ev(
        "e3",
        "Picked up from you",
        "Pickup team B · Imran Qureshi",
        at(-45, 11),
        "info",
      ),
      ev(
        "e4",
        "Received at warehouse",
        "Checked in and sorted",
        at(-44, 11),
        "info",
      ),
      ev(
        "e5",
        "Donation completed",
        "Given to Nayi Disha Foundation · certificate issued",
        at(-41, 15),
        "good",
      ),
    ],
  },
  {
    id: "DON-2036",
    title: "Old ceiling fan",
    category: "Electronics",
    description:
      "A ceiling fan that stopped working. Hoped it could be repaired.",
    condition: "Worst",
    quantity: 1,
    weightKg: 4,
    images: ["/images/products/default-item.jpg"],
    status: "Rejected",
    createdAt: at(-33, 10),
    pickup: basePickup({ date: null, slot: SLOTS[1] }),
    ngo: null,
    certificateId: null,
    rejectReason:
      "Electronics must power on and work safely. This fan could not be accepted as it needs a motor replacement.",
    cancelReason: "",
    events: [
      ev(
        "e1",
        "Donation submitted",
        "1 × Old ceiling fan",
        at(-33, 10),
        "neutral",
      ),
      ev(
        "e2",
        "Not accepted",
        "Electronics must power on and work safely.",
        at(-32, 14),
        "bad",
      ),
    ],
  },
  {
    id: "DON-2033",
    title: "Decor lamps",
    category: "Home Decor",
    description: "Three small table lamps with matching shades.",
    condition: "Medium",
    quantity: 3,
    weightKg: 4.5,
    images: ["/images/products/ceramic-lamp.jpg"],
    status: "Cancelled",
    createdAt: at(-60, 10),
    pickup: basePickup({ date: null, slot: SLOTS[2] }),
    ngo: null,
    certificateId: null,
    rejectReason: "",
    cancelReason: "I want to give it to someone I know",
    events: [
      ev("e1", "Donation submitted", "3 × Decor lamps", at(-60, 10), "neutral"),
      ev(
        "e2",
        "Cancelled by you",
        "I want to give it to someone I know",
        at(-59, 9),
        "bad",
      ),
    ],
  },
];

/* ---------------------------------------------------------
   Tiny store
   --------------------------------------------------------- */

let donations = seed();
let counter = 2049;
const listeners = new Set();

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => donations;
const commit = (next) => {
  donations = next;
  listeners.forEach((listener) => listener());
};

const update = (id, fn) =>
  commit(donations.map((item) => (item.id === id ? fn(item) : item)));

const eventId = (item) => `e${item.events.length + 1}-${Date.now()}`;

export function createDonation(form) {
  const id = `DON-${counter}`;
  counter += 1;
  const when = new Date().toISOString();

  const donation = {
    id,
    title: form.title.trim(),
    category: form.category,
    description: form.description.trim(),
    condition: form.condition,
    quantity: form.quantity,
    weightKg: form.weightKg,
    images: form.images,
    status: "Pending",
    createdAt: when,
    pickup: basePickup({
      date: new Date(`${form.date}T09:00:00`).toISOString(),
      slot: form.slot,
      address: form.address,
      contactName: form.contactName,
      phone: form.phone,
      note: form.note,
    }),
    ngo: null,
    certificateId: null,
    rejectReason: "",
    cancelReason: "",
    events: [
      {
        id: `e1-${Date.now()}`,
        label: "Donation submitted",
        detail: `${form.quantity} × ${form.title.trim()}`,
        at: when,
        tone: "neutral",
      },
    ],
  };

  commit([donation, ...donations]);
  return donation;
}

export function cancelDonation(id, reason) {
  update(id, (item) => ({
    ...item,
    status: "Cancelled",
    cancelReason: reason,
    events: [
      ...item.events,
      {
        id: eventId(item),
        label: "Cancelled by you",
        detail: reason,
        at: new Date().toISOString(),
        tone: "bad",
      },
    ],
  }));
}

export function reschedulePickup(id, { date, slot, reason }) {
  update(id, (item) => ({
    ...item,
    pickup: {
      ...item.pickup,
      date: new Date(`${date}T09:00:00`).toISOString(),
      slot,
      rescheduleCount: item.pickup.rescheduleCount + 1,
    },
    events: [
      ...item.events,
      {
        id: eventId(item),
        label: "Pickup rescheduled",
        detail: reason ? `${slot} · ${reason}` : slot,
        at: new Date().toISOString(),
        tone: "wait",
      },
    ],
  }));
}

export function updatePickupNote(id, note) {
  update(id, (item) => ({ ...item, pickup: { ...item.pickup, note } }));
}

/* ---------------------------------------------------------
   Hooks + derived numbers
   --------------------------------------------------------- */

export function useDonations() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(
    () =>
      [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [list],
  );
}

export function useDonation(id) {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(() => list.find((item) => item.id === id) || null, [list, id]);
}

export const estimatePoints = (quantity) =>
  REWARD_RULES.base + REWARD_RULES.perItem * Math.max(1, quantity || 1);

export const estimateWeight = (category, quantity) => {
  const meta = DONATION_CATEGORIES.find((item) => item.id === category);
  return (
    Math.round((meta ? meta.weight : 1) * Math.max(1, quantity || 1) * 10) / 10
  );
};

export function summarize(list) {
  const counted = list.filter((d) =>
    ["Picked_Up", "Received", "Completed"].includes(d.status),
  );
  const completed = list.filter((d) => d.status === "Completed");
  const weight = counted.reduce((sum, d) => sum + d.weightKg, 0);
  return {
    total: list.length,
    active: list.filter((d) => ACTIVE_STATUSES.includes(d.status)).length,
    completed: completed.length,
    items: counted.reduce((sum, d) => sum + d.quantity, 0),
    weight,
    co2: Math.round(weight * REWARD_RULES.co2PerKg * 10) / 10,
    points: completed.reduce((sum, d) => sum + estimatePoints(d.quantity), 0),
    pendingPoints: list
      .filter((d) =>
        ["Pending", "Scheduled", "Picked_Up", "Received"].includes(d.status),
      )
      .reduce((sum, d) => sum + estimatePoints(d.quantity), 0),
  };
}
