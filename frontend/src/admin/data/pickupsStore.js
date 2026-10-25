/* =========================================================
   Admin › Pickups data layer (UI only, in-memory).
   Two kinds of pickup, both free for the customer:
   - Donation pickups: derived live from the Donations store
     (so scheduling here also updates the donation).
   - Item pickups: items a user listed with "Managed by platform".
   Backend later: replace with API calls to Pickup_Requests.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { useUsers } from "./usersStore";
import { useDonations, runDonationAction } from "./donationsStore";
import { PARTNERS } from "./donationActions";
import { DEMO_TODAY } from "../utils/format";

/* ---------- item-pickup changes made this session ---------- */
let overlay = {}; // { [pickupId]: { status, date, slot, agent, events: [] } }
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => overlay;
const emit = () => listeners.forEach((l) => l());

const DAY = 86400000;
const hash = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i += 1) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const dayStart = (d) => new Date(new Date(d).setHours(0, 0, 0, 0)).getTime();
export const TODAY_START = dayStart(DEMO_TODAY);
const atDay = (offset) => new Date(TODAY_START + offset * DAY + 9 * 3600000).toISOString();
const capNow = (iso) => (new Date(iso).getTime() > DEMO_TODAY.getTime() ? DEMO_TODAY.toISOString() : iso);
const SLOTS = ["9:00 AM – 12:00 PM", "12:00 PM – 3:00 PM", "3:00 PM – 6:00 PM"];
export const AGENTS = PARTNERS;

/* "Today", "Tomorrow", "Overdue 2 days" … for an active pickup */
export function dueInfo(p) {
  if (p.status !== "Scheduled" || !p.date) return null;
  const diff = Math.round((dayStart(p.date) - TODAY_START) / DAY);
  if (diff < 0) return { key: "overdue", label: `Overdue ${-diff} day${diff === -1 ? "" : "s"}`, diff };
  if (diff === 0) return { key: "today", label: "Today", diff };
  if (diff === 1) return { key: "tomorrow", label: "Tomorrow", diff };
  return { key: "later", label: `In ${diff} days`, diff };
}

const STATUS_FROM_DONATION = { Pending: "Requested", Scheduled: "Scheduled", Picked_Up: "Picked_Up", Received: "Completed", Completed: "Completed", Rejected: "Cancelled" };

function fromDonation(d) {
  const status = STATUS_FROM_DONATION[d.status];
  return {
    id: `PK-${d.id.slice(3)}`,
    type: "Donation",
    ref_id: d.id,
    ref_path: `/admin-donations/${d.id}`,
    ref_label: "Donation",
    title: d.title, category: d.category, image: d.image, quantity: d.quantity,
    customer: d.donor,
    address: d.donor.address, city: d.donor.city, state: d.donor.state, pincode: d.donor.pincode,
    status,
    date: d.pickup_date, slot: d.pickup_slot, agent: d.partner,
    requested_at: d.donation_date,
    cancel_reason: d.reject_reason,
    events: d.events.map((e) => ({ ...e })),
  };
}

function fromItem(user, item, index, ov) {
  const id = `PK-${item.item_id.replace("ITM-", "I")}`;
  let status; let date = null; let slot = null; let agent = null;
  if (item.verification_status === "Pending") status = "Requested";
  else if (item.verification_status === "Rejected") status = "Cancelled";
  else {
    const m = index % 6;
    status = m < 2 ? "Scheduled" : m === 2 ? "Picked_Up" : "Completed";
  }
  const h = hash(id);
  if (status === "Scheduled") { const offs = [-2, 0, 0, 0, 1, 1, 2, 3]; date = atDay(offs[h % offs.length]); }
  if (status === "Picked_Up") date = atDay(-(h % 2));
  if (status === "Completed") date = atDay(-(2 + (h % 12)));
  if (date) { slot = SLOTS[h % 3]; agent = AGENTS[h % AGENTS.length]; }
  const requested = new Date(new Date(item.created_at).getTime()).toISOString();

  const base = { status, date, slot, agent, cancel_reason: status === "Cancelled" ? "Item was not approved, so no pickup is needed." : "" };
  const cur = { ...base, ...(ov || {}) };

  const events = [{ id: "req", label: "Pickup requested", detail: `${user.full_name} chose “Managed by platform”`, at: requested, tone: "neutral" }];
  if (base.status === "Cancelled") events.push({ id: "can", label: "Pickup cancelled", detail: base.cancel_reason, at: capNow(new Date(new Date(requested).getTime() + DAY).toISOString()), tone: "bad" });
  if (["Scheduled", "Picked_Up", "Completed"].includes(base.status)) events.push({ id: "sch", label: "Pickup scheduled", detail: `${base.slot} · ${base.agent}`, at: capNow(new Date(new Date(requested).getTime() + DAY).toISOString()), tone: "good" });
  if (["Picked_Up", "Completed"].includes(base.status)) events.push({ id: "pic", label: "Picked up from customer", detail: base.agent, at: capNow(base.date), tone: "info" });
  if (base.status === "Completed") events.push({ id: "cmp", label: "Delivered to warehouse", detail: "Checked in and stored", at: capNow(new Date(new Date(base.date).getTime() + 4 * 3600000).toISOString()), tone: "good" });

  return {
    id, type: "Item", ref_id: item.item_id, ref_path: `/admin-products/${item.item_id}`, ref_label: "Item listing",
    title: item.title, category: item.category, image: item.image, quantity: item.quantity,
    customer: {
      id: user.user_id, name: user.full_name, email: user.email, image: user.profile.profile_image,
      phone: user.profile.phone, address: user.profile.address, city: user.profile.city, state: user.profile.state,
      pincode: user.profile.pincode, status: user.status, path: `/admin-users/${user.user_id}`,
    },
    address: user.profile.address, city: user.profile.city, state: user.profile.state, pincode: user.profile.pincode,
    status: cur.status, date: cur.date, slot: cur.slot, agent: cur.agent,
    requested_at: requested, cancel_reason: cur.cancel_reason,
    events: [...events, ...(ov?.events || [])],
  };
}

export function usePickups() {
  const users = useUsers();
  const donations = useDonations();
  const ov = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(() => {
    const itemPickups = [];
    let i = 0;
    users.forEach((u) => u.items.forEach((item) => {
      if (item.pickup_preference === "Self Pickup") return;
      const id = `PK-${item.item_id.replace("ITM-", "I")}`;
      itemPickups.push(fromItem(u, item, i, ov[id]));
      i += 1;
    }));
    const all = [...donations.map(fromDonation), ...itemPickups];
    return all.map((p) => ({ ...p, due: dueInfo(p) }));
  }, [users, donations, ov]);
}
export function usePickup(id) {
  return usePickups().find((p) => p.id === id) || null;
}

/* payload: { date, slot, partner } | { reason } */
export function runPickupAction(pickup, key, payload = {}) {
  if (pickup.type === "Donation") {
    const map = { schedule: "accept", reschedule: "reschedule", pickedUp: "pickedUp", complete: "received", reopen: "reopen",
      cancel: pickup.status === "Requested" ? "reject" : "cancelPickup" };
    runDonationAction(pickup.ref_id, map[key], payload);
    return;
  }
  const at = new Date().toISOString();
  const cur = overlay[pickup.id] || { events: [] };
  const next = { ...cur, events: [...cur.events] };
  const when = payload.date ? new Date(`${payload.date}T09:00:00`).toISOString() : null;
  const log = (label, detail, tone = "neutral") => next.events.push({ id: `x-${Date.now()}-${next.events.length}`, label, detail: `${detail ? detail + " · " : ""}Admin · You`, at, tone });
  switch (key) {
    case "schedule": Object.assign(next, { status: "Scheduled", date: when, slot: payload.slot, agent: payload.partner }); log("Pickup scheduled", `${payload.slot} · ${payload.partner}`, "good"); break;
    case "reschedule": Object.assign(next, { date: when, slot: payload.slot, agent: payload.partner }); log("Pickup rescheduled", `${payload.slot} · ${payload.partner}`, "wait"); break;
    case "pickedUp": next.status = "Picked_Up"; log("Picked up from customer", "", "info"); break;
    case "complete": next.status = "Completed"; log("Delivered to warehouse", "Checked in", "good"); break;
    case "cancel": Object.assign(next, { status: "Cancelled", date: null, slot: null, cancel_reason: payload.reason }); log("Pickup cancelled", payload.reason, "bad"); break;
    case "reopen": Object.assign(next, { status: "Requested", cancel_reason: "" }); log("Pickup reopened", "", "wait"); break;
    default: return;
  }
  overlay = { ...overlay, [pickup.id]: next };
  emit();
}
