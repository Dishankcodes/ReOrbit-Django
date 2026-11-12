/* =========================================================
   User > Donations data layer, backed by /api/donations/me/.
   Pending -> Scheduled -> Picked_Up -> Received -> Completed
   (or Rejected by ReOrbit / Cancelled by the donor). The item is
   free to collect. When ReOrbit marks it received at the warehouse
   the donor earns a voucher (see useVouchers) and Orbit Points.
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { donationApi, voucherApi } from "../../api/donations";
import { getAccount } from "../../api/session";
import { useCategoryNames } from "../../shared/catalog";

/* ---------------------------------------------------------
   Static reference data
   --------------------------------------------------------- */

export const DONATION_CATEGORIES = [
  {
    id: "Furniture",
    label: "Furniture",
    hint: "Chairs, tables, shelves",
    weight: 9,
    image:
      "https://images.pexels.com/photos/177143/pexels-photo-177143.jpeg?auto=compress&cs=tinysrgb&w=1000",
  },
  {
    id: "Clothing",
    label: "Clothing",
    hint: "Clean, wearable clothes",
    weight: 0.8,
    image:
      "https://images.pexels.com/photos/7679725/pexels-photo-7679725.jpeg?auto=compress&cs=tinysrgb&w=1000",
  },
  {
    id: "Books",
    label: "Books",
    hint: "Novels, textbooks, kids' books",
    weight: 0.5,
    image:
      "https://images.pexels.com/photos/19208445/pexels-photo-19208445.jpeg?auto=compress&cs=tinysrgb&w=1000",
  },
  {
    id: "Electronics",
    label: "Electronics",
    hint: "Working devices & accessories",
    weight: 3,
    image:
      "https://images.pexels.com/photos/5825540/pexels-photo-5825540.jpeg?auto=compress&cs=tinysrgb&w=1000",
  },
  {
    id: "Home Decor",
    label: "Home Decor",
    hint: "Lamps, frames, vases",
    weight: 1.5,
    image:
      "https://images.pexels.com/photos/10945653/pexels-photo-10945653.jpeg?auto=compress&cs=tinysrgb&w=1000",
  },
  {
    id: "Kitchen",
    label: "Kitchen",
    hint: "Utensils, cookware, appliances",
    weight: 2.5,
    image:
      "https://images.pexels.com/photos/8134812/pexels-photo-8134812.jpeg?auto=compress&cs=tinysrgb&w=1000",
  },
  {
    id: "Fashion",
    label: "Fashion",
    hint: "Bags, shoes, accessories",
    weight: 0.7,
    image:
      "https://images.pexels.com/photos/5824819/pexels-photo-5824819.jpeg?auto=compress&cs=tinysrgb&w=1000",
  },
  {
    id: "Sports",
    label: "Sports & Toys",
    hint: "Gear, games, toys",
    weight: 1.5,
    image:
      "https://images.pexels.com/photos/5825540/pexels-photo-5825540.jpeg?auto=compress&cs=tinysrgb&w=1000",
  },
];

/* The categories the team lets people pick (Admin > Content). */
export function useDonationCategories() {
  const names = useCategoryNames();
  return useMemo(
    () =>
      names.map(
        (n) =>
          DONATION_CATEGORIES.find((c) => c.id === n) || {
            id: n,
            label: n,
            hint: "Clean, usable items",
            weight: 1.5,
            image:
              "https://images.pexels.com/photos/8134812/pexels-photo-8134812.jpeg?auto=compress&cs=tinysrgb&w=1000",
          },
      ),
    [names],
  );
}

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

/* Same numbers the server uses to pay the reward (apps/rewards/services.py), so the estimate
   the donor sees is what they get. CO2 per kg is a fixed estimate. */
export const REWARD_RULES = { co2PerKg: 1.9, base: 50, perItem: 10 };

/* Rough weight per item (kg) and voucher value, as worked out on the server. */
const SERVER_WEIGHT = {
  Furniture: 12,
  "Home Decor": 3,
  Fashion: 1.2,
  Clothing: 3.5,
  Kitchen: 4,
  Electronics: 5,
  Books: 4,
  Sports: 3,
};
const CONDITION_FACTOR = { Good: 1, Medium: 0.7, Worst: 0.4 };
export const estimateVoucher = (category, quantity, condition) => {
  const kg = (SERVER_WEIGHT[category] || 1.5) * Math.max(1, quantity || 1);
  const worth =
    Math.round((kg * 12 * (CONDITION_FACTOR[condition] ?? 0.7)) / 10) * 10;
  return Math.max(50, Math.min(500, worth));
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
   API data -> the shape the pages use
   --------------------------------------------------------- */

const atMorning = (day) => (day ? `${day}T09:00:00` : null); // local time, so the day never shifts

const adapt = (d) => ({
  id: d.id,
  title: d.title,
  category: d.category,
  description: d.description,
  condition: d.condition,
  quantity: d.quantity,
  weightKg: d.weight_kg,
  images: d.images || [],
  status: d.status,
  createdAt: d.created_at,
  pickup: {
    date: atMorning(d.pickup.date),
    slot: d.pickup.slot || null,
    address: d.pickup.address,
    contactName: d.pickup.contact_name,
    phone: d.pickup.phone,
    note: d.pickup.note || "",
    partner: d.pickup.partner,
    handoverCode: d.pickup.handover_code || "",
    rescheduleCount: d.pickup.reschedule_count,
  },
  ngo: d.ngo
    ? {
        name: d.ngo,
        city: NGOS.find((n) => n.name === d.ngo)?.city || "Gujarat",
      }
    : null,
  certificateId: d.certificate_id,
  rejectReason: d.reject_reason || "",
  cancelReason: d.cancel_reason || "",
  reward: d.reward || { points: 0, voucher: null },
  events: (d.events || []).map((e) => ({
    id: e.id,
    label: e.label,
    detail: e.detail,
    at: e.at,
    tone: e.tone,
  })),
});

/* ---------------------------------------------------------
   Store (one list per signed-in member)
   --------------------------------------------------------- */

const idle = { list: [], loaded: false, loading: false, error: "", owner: "" };
let state = idle;
const listeners = new Set();
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => state;
const setState = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};
const me = () => getAccount("user")?.public_id || "";

export async function loadDonations(force = false) {
  const owner = me();
  if (state.owner !== owner) state = { ...idle, owner }; // another member signed in
  if (state.loading || (state.loaded && !force)) return;
  setState({ loading: true, error: "" });
  try {
    const rows = await donationApi.list();
    if (state.owner === owner)
      setState({ list: rows.map(adapt), loaded: true, loading: false });
  } catch (e) {
    setState({
      loading: false,
      error: e.message || "Could not load your donations.",
    });
  }
}

const put = (row) => {
  const next = adapt(row);
  const has = state.list.some((d) => d.id === next.id);
  setState({
    list: has
      ? state.list.map((d) => (d.id === next.id ? next : d))
      : [next, ...state.list],
    loaded: true,
  });
  return next;
};

/* `form`: title, category, description, condition, quantity, addressId, contactName, phone,
   date, slot, note, files (File[]). Rejects with .errors (field -> messages) when something is wrong. */
export async function createDonation(form) {
  const body = new FormData();
  [
    ["title", form.title],
    ["category", form.category],
    ["description", form.description],
    ["condition", form.condition],
    ["quantity", form.quantity],
    ["address_id", form.addressId],
    ["contact_name", form.contactName],
    ["phone", form.phone],
    ["date", form.date],
    ["slot", form.slot],
    ["note", form.note || ""],
  ].forEach(([k, v]) => body.append(k, v ?? ""));
  (form.files || []).forEach((file) => body.append("images", file));
  return put(await donationApi.create(body));
}

export async function cancelDonation(id, reason) {
  return put(await donationApi.cancel(id, reason));
}

export async function reschedulePickup(id, { date, slot, reason }) {
  return put(await donationApi.reschedule(id, { date, slot, reason }));
}

export async function updatePickupNote(id, note) {
  return put(await donationApi.note(id, note));
}

/* ---------------------------------------------------------
   Hooks + derived numbers
   --------------------------------------------------------- */

const useStore = () => {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    loadDonations();
  }, []);
  return s.owner === me() ? s : idle;
};

export function useDonations() {
  const { list } = useStore();
  return useMemo(
    () =>
      [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [list],
  );
}

export function useDonation(id) {
  const { list } = useStore();
  return useMemo(() => list.find((item) => item.id === id) || null, [list, id]);
}

/* { loading, error } so pages can wait before saying "not found" */
export function useDonationsStatus() {
  const s = useStore();
  return { loading: s.loading || !s.loaded, error: s.error };
}

/* ---------------------------------------------------------
   Vouchers earned from donations (/api/rewards/me/vouchers/)
   --------------------------------------------------------- */

let vouchers = { list: [], ready: 0, loaded: false, loading: false, owner: "" };
const vSubs = new Set();
const setVouchers = (patch) => {
  vouchers = { ...vouchers, ...patch };
  vSubs.forEach((l) => l());
};

export async function loadVouchers(force = false) {
  const owner = me();
  if (vouchers.owner !== owner)
    vouchers = { list: [], ready: 0, loaded: false, loading: false, owner };
  if (vouchers.loading || (vouchers.loaded && !force)) return;
  setVouchers({ loading: true });
  try {
    const r = await voucherApi.mine();
    setVouchers({
      list: r.vouchers,
      ready: r.ready,
      loaded: true,
      loading: false,
    });
  } catch {
    setVouchers({ loading: false, loaded: true });
  }
}

export function useVouchers() {
  const v = useSyncExternalStore(
    (l) => {
      vSubs.add(l);
      return () => vSubs.delete(l);
    },
    () => vouchers,
    () => vouchers,
  );
  useEffect(() => {
    loadVouchers();
  }, []);
  return {
    vouchers: v.owner === me() ? v.list : [],
    ready: v.owner === me() ? v.ready : 0,
    loading: v.loading,
  };
}

export const estimatePoints = (quantity) =>
  REWARD_RULES.base + REWARD_RULES.perItem * Math.max(1, quantity || 1);

export const estimateWeight = (category, quantity) => {
  return (
    Math.round(
      (SERVER_WEIGHT[category] || 1.5) * Math.max(1, quantity || 1) * 10,
    ) / 10
  );
};

export function summarize(list) {
  const counted = list.filter((d) =>
    ["Picked_Up", "Received", "Completed"].includes(d.status),
  );
  const completed = list.filter((d) => d.status === "Completed");
  const weight = counted.reduce((sum, d) => sum + d.weightKg, 0);
  const earned = list.filter((d) =>
    ["Received", "Completed"].includes(d.status),
  );
  return {
    total: list.length,
    active: list.filter((d) => ACTIVE_STATUSES.includes(d.status)).length,
    completed: completed.length,
    items: counted.reduce((sum, d) => sum + d.quantity, 0),
    weight,
    co2: Math.round(weight * REWARD_RULES.co2PerKg * 10) / 10,
    /* points are paid when the item reaches the warehouse */
    points: earned.reduce((sum, d) => sum + (d.reward?.points || 0), 0),
    pendingPoints: list
      .filter((d) => ["Pending", "Scheduled", "Picked_Up"].includes(d.status))
      .reduce((sum, d) => sum + estimatePoints(d.quantity), 0),
  };
}
