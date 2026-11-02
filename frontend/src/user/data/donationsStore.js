/* =========================================================
   User › Donations data layer (UI only, in-memory).
   Mirrors the Donations + Pickup_Requests tables so it can be
   swapped for API calls later. Statuses match the admin side:
   Pending → Scheduled → Picked_Up → Received → Completed
   (or Rejected by admin / Cancelled by the donor).
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { addUserDonation, updateUserDonation, onUsersChange } from "../../admin/data/usersStore";
import { getDonationExtras, onDonationExtrasChange } from "../../admin/data/donationsStore";
import { getPickupTeams, leadOf } from "../../admin/data/pickupTeamsStore";
import { getMyUserAccount } from "../../shared/identity";
import { getRewardRules, pointsOf } from "../../shared/rewardRules";
import { useCategoryNames } from "../../shared/catalog";

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
  { id: "Furniture", label: "Furniture", hint: "Chairs, tables, shelves", weight: 9, image: "https://images.pexels.com/photos/177143/pexels-photo-177143.jpeg?auto=compress&cs=tinysrgb&w=1000" },
  { id: "Clothing", label: "Clothing", hint: "Clean, wearable clothes", weight: 0.8, image: "https://images.pexels.com/photos/7679725/pexels-photo-7679725.jpeg?auto=compress&cs=tinysrgb&w=1000" },
  { id: "Books", label: "Books", hint: "Novels, textbooks, kids' books", weight: 0.5, image: "https://images.pexels.com/photos/19208445/pexels-photo-19208445.jpeg?auto=compress&cs=tinysrgb&w=1000" },
  { id: "Electronics", label: "Electronics", hint: "Working devices & accessories", weight: 3, image: "https://images.pexels.com/photos/5825540/pexels-photo-5825540.jpeg?auto=compress&cs=tinysrgb&w=1000" },
  { id: "Home Decor", label: "Home Decor", hint: "Lamps, frames, vases", weight: 1.5, image: "https://images.pexels.com/photos/10945653/pexels-photo-10945653.jpeg?auto=compress&cs=tinysrgb&w=1000" },
  { id: "Kitchen", label: "Kitchen", hint: "Utensils, cookware, appliances", weight: 2.5, image: "https://images.pexels.com/photos/8134812/pexels-photo-8134812.jpeg?auto=compress&cs=tinysrgb&w=1000" },
  { id: "Fashion", label: "Fashion", hint: "Bags, shoes, accessories", weight: 0.7, image: "https://images.pexels.com/photos/5824819/pexels-photo-5824819.jpeg?auto=compress&cs=tinysrgb&w=1000" },
  { id: "Sports", label: "Sports & Toys", hint: "Gear, games, toys", weight: 1.5, image: "https://images.pexels.com/photos/5825540/pexels-photo-5825540.jpeg?auto=compress&cs=tinysrgb&w=1000" },
];

/* The categories the team lets people pick (Admin > Content). */
export function useDonationCategories() {
  const names = useCategoryNames();
  return useMemo(
    () =>
      names.map(
        (n) =>
          DONATION_CATEGORIES.find((c) => c.id === n) || {
            id: n, label: n, hint: "Clean, usable items", weight: 1.5, image: "https://images.pexels.com/photos/8134812/pexels-photo-8134812.jpeg?auto=compress&cs=tinysrgb&w=1000",
          },
      ),
    [names],
  );
}

export const CONDITIONS = [
  { id: "Good", label: "Good", help: "Works / looks great. Minor signs of use at most." },
  { id: "Medium", label: "Medium", help: "Fully usable but visibly used or lightly worn." },
  { id: "Worst", label: "Needs repair", help: "Usable only after repair. Reviewed with extra care." },
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

/* Points come from Admin > Rewards. CO2 per kg is a fixed estimate. */
export const REWARD_RULES = {
  co2PerKg: 1.9,
  get base() { return pointsOf(getRewardRules(), "donationBase"); },
  get perItem() { return pointsOf(getRewardRules(), "donationItem"); },
};

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
  Pending: { label: "Under review", tone: "amber", blurb: "We're reviewing your donation." },
  Scheduled: { label: "Pickup scheduled", tone: "blue", blurb: "Your free pickup is booked." },
  Picked_Up: { label: "Picked up", tone: "violet", blurb: "On its way to our warehouse." },
  Received: { label: "Received", tone: "teal", blurb: "Checked in at the warehouse." },
  Completed: { label: "Completed", tone: "green", blurb: "Delivered. Certificate issued." },
  Rejected: { label: "Not accepted", tone: "red", blurb: "We couldn't accept this item." },
  Cancelled: { label: "Cancelled", tone: "grey", blurb: "You cancelled this donation." },
};

export const TRACK_STEPS = [
  { key: "Pending", label: "Submitted", sub: "Under review" },
  { key: "Scheduled", label: "Pickup booked", sub: "Free pickup" },
  { key: "Picked_Up", label: "Picked up", sub: "From your door" },
  { key: "Received", label: "Received", sub: "At warehouse" },
  { key: "Completed", label: "Completed", sub: "Certificate issued" },
];

export const ACTIVE_STATUSES = ["Pending", "Scheduled", "Picked_Up", "Received"];
export const CLOSED_STATUSES = ["Rejected", "Cancelled"];
export const canCancel = (d) => ["Pending", "Scheduled"].includes(d.status);
export const canReschedule = (d) =>
  ["Pending", "Scheduled"].includes(d.status) && d.pickup.rescheduleCount < 2;

export const stepIndex = (status) =>
  Math.max(0, TRACK_STEPS.findIndex((step) => step.key === status));

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
  if (!/^\d{6}$/.test(text)) return { valid: false, serviceable: false, city: "" };
  const num = Number(text);
  const range = RANGES.find(([from, to]) => num >= from && num <= to);
  return { valid: true, serviceable: Boolean(range), city: range ? range[2] : "" };
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

const ev = (id, label, detail, when, tone = "neutral") => ({ id, label, detail, at: when, tone });

const seed = () => [
  {
    id: "DON-2048",
    title: "Study chair set",
    category: "Furniture",
    description: "Two sturdy wooden study chairs, cushions in good shape. Cleaned and ready to use.",
    condition: "Good",
    quantity: 2,
    weightKg: 16,
    images: ["https://images.pexels.com/photos/14792097/pexels-photo-14792097.jpeg?auto=compress&cs=tinysrgb&w=1000", "https://images.pexels.com/photos/2168227/pexels-photo-2168227.jpeg?auto=compress&cs=tinysrgb&w=1000"],
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
      ev("e1", "Donation submitted", "2 × Study chair set", at(-2, 18), "neutral"),
      ev("e2", "Accepted · pickup scheduled", `Free pickup · ${SLOTS[1]}`, at(-1, 11), "good"),
    ],
  },
  {
    id: "DON-2047",
    adminDonationId: "DN-U2047",
    title: "Winter jackets & sweaters",
    category: "Clothing",
    description: "Washed and folded jackets and sweaters, mixed sizes M to XL.",
    condition: "Good",
    quantity: 8,
    weightKg: 7,
    images: [
      "https://images.pexels.com/photos/16390583/pexels-photo-16390583.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/7679725/pexels-photo-7679725.jpeg?auto=compress&cs=tinysrgb&w=1000",
    ],
    status: "Pending",
    createdAt: at(-1, 20),
    pickup: basePickup({ date: at(3, 9), slot: SLOTS[0], note: "" }),
    ngo: null,
    certificateId: null,
    rejectReason: "",
    cancelReason: "",
    events: [ev("e1", "Donation submitted", "8 × Winter jackets & sweaters", at(-1, 20), "neutral")],
  },
  {
    id: "DON-2046",
    title: "Engineering textbooks",
    category: "Books",
    description: "Fourteen engineering textbooks, latest editions, no torn pages.",
    condition: "Medium",
    quantity: 14,
    weightKg: 11,
    images: [
      "https://images.pexels.com/photos/33283/pexels-photo-33283.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/19208445/pexels-photo-19208445.jpeg?auto=compress&cs=tinysrgb&w=1000",
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
      ev("e1", "Donation submitted", "14 × Engineering textbooks", at(-4, 9), "neutral"),
      ev("e2", "Accepted · pickup scheduled", `Free pickup · ${SLOTS[0]}`, at(-3, 12), "good"),
      ev("e3", "Picked up from you", "Pickup team B · Imran Qureshi", at(0, 10), "info"),
    ],
  },
  {
    id: "DON-2044",
    title: "Kitchen utensil set",
    category: "Kitchen",
    description: "Steel utensils, pressure cooker and a non-stick pan. All working fine.",
    condition: "Good",
    quantity: 1,
    weightKg: 4,
    images: ["https://images.pexels.com/photos/8134812/pexels-photo-8134812.jpeg?auto=compress&cs=tinysrgb&w=1000", "https://images.pexels.com/photos/8134812/pexels-photo-8134812.jpeg?auto=compress&cs=tinysrgb&w=1000"],
    status: "Received",
    createdAt: at(-8, 10),
    pickup: basePickup({ date: at(-4, 9), slot: SLOTS[2], partner: PARTNERS[2] }),
    ngo: null,
    certificateId: null,
    rejectReason: "",
    cancelReason: "",
    events: [
      ev("e1", "Donation submitted", "1 × Kitchen utensil set", at(-8, 10), "neutral"),
      ev("e2", "Accepted · pickup scheduled", `Free pickup · ${SLOTS[2]}`, at(-7, 12), "good"),
      ev("e3", "Picked up from you", "Pickup team C · Sunita Devi", at(-4, 16), "info"),
      ev("e4", "Received at warehouse", "Checked in and sorted", at(-3, 11), "info"),
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
    images: ["https://images.pexels.com/photos/14792097/pexels-photo-14792097.jpeg?auto=compress&cs=tinysrgb&w=1000", "https://images.pexels.com/photos/1148955/pexels-photo-1148955.jpeg?auto=compress&cs=tinysrgb&w=1000"],
    status: "Completed",
    createdAt: at(-26, 10),
    pickup: basePickup({ date: at(-23, 9), slot: SLOTS[1], partner: PARTNERS[0] }),
    ngo: NGOS[0],
    certificateId: "CERT-2041",
    rejectReason: "",
    cancelReason: "",
    events: [
      ev("e1", "Donation submitted", "1 × Cotton study chair", at(-26, 10), "neutral"),
      ev("e2", "Accepted · pickup scheduled", `Free pickup · ${SLOTS[1]}`, at(-25, 12), "good"),
      ev("e3", "Picked up from you", "Pickup team A · Ravi Kumar", at(-23, 13), "info"),
      ev("e4", "Received at warehouse", "Checked in and sorted", at(-22, 11), "info"),
      ev("e5", "Donation completed", "Given to Asha Kiran Trust · certificate issued", at(-19, 15), "good"),
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
      "https://images.pexels.com/photos/19208445/pexels-photo-19208445.jpeg?auto=compress&cs=tinysrgb&w=1000",
      "https://images.pexels.com/photos/16009657/pexels-photo-16009657.jpeg?auto=compress&cs=tinysrgb&w=1000",
    ],
    status: "Completed",
    createdAt: at(-48, 10),
    pickup: basePickup({ date: at(-45, 9), slot: SLOTS[0], partner: PARTNERS[1] }),
    ngo: NGOS[1],
    certificateId: "CERT-2039",
    rejectReason: "",
    cancelReason: "",
    events: [
      ev("e1", "Donation submitted", "22 × Kids' story books", at(-48, 10), "neutral"),
      ev("e2", "Accepted · pickup scheduled", `Free pickup · ${SLOTS[0]}`, at(-47, 12), "good"),
      ev("e3", "Picked up from you", "Pickup team B · Imran Qureshi", at(-45, 11), "info"),
      ev("e4", "Received at warehouse", "Checked in and sorted", at(-44, 11), "info"),
      ev("e5", "Donation completed", "Given to Nayi Disha Foundation · certificate issued", at(-41, 15), "good"),
    ],
  },
  {
    id: "DON-2036",
    title: "Old ceiling fan",
    category: "Electronics",
    description: "A ceiling fan that stopped working. Hoped it could be repaired.",
    condition: "Worst",
    quantity: 1,
    weightKg: 4,
    images: ["https://images.pexels.com/photos/8134812/pexels-photo-8134812.jpeg?auto=compress&cs=tinysrgb&w=1000"],
    status: "Rejected",
    createdAt: at(-33, 10),
    pickup: basePickup({ date: null, slot: SLOTS[1] }),
    ngo: null,
    certificateId: null,
    rejectReason: "Electronics must power on and work safely. This fan could not be accepted as it needs a motor replacement.",
    cancelReason: "",
    events: [
      ev("e1", "Donation submitted", "1 × Old ceiling fan", at(-33, 10), "neutral"),
      ev("e2", "Not accepted", "Electronics must power on and work safely.", at(-32, 14), "bad"),
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
    images: ["https://images.pexels.com/photos/1643280/pexels-photo-1643280.jpeg?auto=compress&cs=tinysrgb&w=1000"],
    status: "Cancelled",
    createdAt: at(-60, 10),
    pickup: basePickup({ date: null, slot: SLOTS[2] }),
    ngo: null,
    certificateId: null,
    rejectReason: "",
    cancelReason: "I want to give it to someone I know",
    events: [
      ev("e1", "Donation submitted", "3 × Decor lamps", at(-60, 10), "neutral"),
      ev("e2", "Cancelled by you", "I want to give it to someone I know", at(-59, 9), "bad"),
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
    adminDonationId: `DN-U${id.replace(/\D/g, "")}`,
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
  sendToAdmin(donation);
  return donation;
}

export function cancelDonation(id, reason) {
  const adminId = donations.find((d) => d.id === id)?.adminDonationId;
  const user = getMyUserAccount();
  if (adminId && user) updateUserDonation(user.user_id, adminId, { donation_status: "Cancelled", pickup_date: null, pickup_slot: null });
  update(id, (item) => ({
    ...item,
    status: "Cancelled",
    cancelReason: reason,
    events: [
      ...item.events,
      { id: eventId(item), label: "Cancelled by you", detail: reason, at: new Date().toISOString(), tone: "bad" },
    ],
  }));
}

export function reschedulePickup(id, { date, slot, reason }) {
  const adminId = donations.find((d) => d.id === id)?.adminDonationId;
  const user = getMyUserAccount();
  if (adminId && user) updateUserDonation(user.user_id, adminId, { pickup_date: new Date(`${date}T09:00:00`).toISOString(), pickup_slot: slot });
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
    () => [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
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
  return Math.round((meta ? meta.weight : 1) * Math.max(1, quantity || 1) * 10) / 10;
};

export function summarize(list) {
  const counted = list.filter((d) => ["Picked_Up", "Received", "Completed"].includes(d.status));
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
      .filter((d) => ["Pending", "Scheduled", "Picked_Up", "Received"].includes(d.status))
      .reduce((sum, d) => sum + estimatePoints(d.quantity), 0),
  };
}

/* ---------------------------------------------------------
   Link to the admin's Donations queue.
   A new donation joins the donor's donations there. When the team
   accepts, schedules, rejects or completes it (and picks a pickup
   team), the donor sees the same here.
   --------------------------------------------------------- */

function sendToAdmin(d) {
  const user = getMyUserAccount();
  if (!user || !d.adminDonationId) return;
  addUserDonation(user.user_id, {
    donation_id: d.adminDonationId,
    title: d.title,
    category: d.category,
    image: d.images[0] || "https://images.pexels.com/photos/5824819/pexels-photo-5824819.jpeg?auto=compress&cs=tinysrgb&w=1000",
    quantity: d.quantity,
    donation_date: d.createdAt,
    donation_status: "Pending",
    pickup_date: null,
    pickup_slot: null,
    certificate: false,
  });
}

const STATUS_EVENT = {
  Scheduled: ["Accepted · pickup scheduled", "good"],
  Picked_Up: ["Picked up from you", "info"],
  Received: ["Received at the warehouse", "info"],
  Completed: ["Donation completed", "good"],
  Rejected: ["Not accepted", "bad"],
  Pending: ["Back in review", "neutral"],
};

function syncFromAdmin() {
  const user = getMyUserAccount();
  if (!user) return;
  const extras = getDonationExtras();
  let changed = false;

  donations = donations.map((d) => {
    if (!d.adminDonationId || d.status === "Cancelled") return d;
    const a = user.donations.find((x) => x.donation_id === d.adminDonationId);
    if (!a) return d;
    const ex = extras[d.adminDonationId];
    let next = d;

    const team = ex?.partner ? getPickupTeams().find((t) => t.name === ex.partner) : null;
    const lead = team ? leadOf(team) : null;
    const partner = ex?.partner
      ? { name: lead?.name || ex.partner, team: ex.partner, phone: lead?.phone || d.pickup.partner?.phone || "" }
      : d.pickup.partner;
    const partnerChanged = (partner?.name || "") !== (d.pickup.partner?.name || "") || (partner?.team || "") !== (d.pickup.partner?.team || "");
    const dateChanged = (a.pickup_date || null) !== (d.pickup.date || null) || (a.pickup_slot || null) !== (d.pickup.slot || null);

    if (a.donation_status !== d.status && STATUS_EVENT[a.donation_status]) {
      const [label, tone] = STATUS_EVENT[a.donation_status];
      const detail =
        a.donation_status === "Rejected" ? a.reject_reason || "" :
        a.donation_status === "Scheduled" ? `Free pickup · ${a.pickup_slot || ""}` :
        a.donation_status === "Completed" && ex?.ngo ? `Given to ${ex.ngo}` : "";
      next = {
        ...next,
        status: a.donation_status,
        rejectReason: a.donation_status === "Rejected" ? a.reject_reason || "" : "",
        ngo: a.donation_status === "Completed" && ex?.ngo ? { name: ex.ngo, city: NGOS.find((n) => n.name === ex.ngo)?.city || "Ahmedabad" } : next.ngo,
        certificateId: a.donation_status === "Completed" ? `CERT-${d.id.replace(/\D/g, "")}` : next.certificateId,
        events: [...next.events, { id: eventId(next), label, detail, at: new Date().toISOString(), tone }],
      };
    }
    if (partnerChanged || dateChanged) {
      next = {
        ...next,
        pickup: { ...next.pickup, date: a.pickup_date || next.pickup.date, slot: a.pickup_slot || next.pickup.slot, partner },
      };
      if (dateChanged && a.donation_status === d.status && a.pickup_date) {
        next = { ...next, events: [...next.events, { id: eventId(next), label: "Pickup rescheduled by ReOrbit", detail: `${a.pickup_slot || ""}${partner?.team ? ` · ${partner.team}` : ""}`, at: new Date().toISOString(), tone: "wait" }] };
      }
    }
    if (next !== d) changed = true;
    return next;
  });
  if (changed) commit(donations);
}

/* Puts the demo donation that is still waiting in front of the team. */
function ensureSeedDonations() {
  donations.filter((d) => d.adminDonationId && d.status === "Pending").forEach(sendToAdmin);
}

ensureSeedDonations();
syncFromAdmin();
onUsersChange(syncFromAdmin);
onDonationExtrasChange(syncFromAdmin);
