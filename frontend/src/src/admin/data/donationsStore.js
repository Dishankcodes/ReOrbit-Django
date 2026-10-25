/* =========================================================
   Admin › Donations data layer (UI only, in-memory).
   The list is derived live from the Users store, so accepting a
   donation here also shows on that user's profile.
   Backend later: replace with API calls.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { useUsers, getUsers, updateUserDonation } from "./usersStore";
import { SLOTS, PARTNERS, NGOS } from "./donationActions";
import { DEMO_TODAY } from "../utils/format";

/* extra info the admin adds this session */
let extras = {}; // { [donationId]: { events: [], partner, ngo, pickup_date, pickup_slot } }
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => extras;
const emit = () => listeners.forEach((l) => l());

const DAY = 86400000;
const hash = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const capNow = (iso) =>
  new Date(iso).getTime() > DEMO_TODAY.getTime()
    ? DEMO_TODAY.toISOString()
    : iso;
const plus = (iso, days) =>
  new Date(new Date(iso).getTime() + days * DAY).toISOString();

const WEIGHT = {
  Furniture: 12,
  "Home Decor": 3,
  Fashion: 1.2,
  Clothing: 3.5,
  Kitchen: 4,
  Electronics: 5,
  Books: 4,
  Sports: 3,
};
const DESC = {
  Furniture:
    "Sturdy furniture the donor no longer needs. Cleaned and ready for a new home.",
  "Home Decor":
    "Decor pieces in usable condition, packed with care by the donor.",
  Clothing: "Washed and folded clothes, sorted by the donor.",
  Fashion: "Fashion pieces in wearable condition.",
  Kitchen: "Kitchenware that is clean and works as it should.",
  Electronics: "Electronics that power on, with basic accessories.",
  Books: "A tidy bundle of readable books.",
  Sports: "Sports gear with plenty of life left.",
};
export const SLA_DAYS = 3; // pending donations should be reviewed within this many days

function build(user, d, ex) {
  const donated = d.donation_date;
  const status = d.donation_status;
  const pickup_date = ex?.pickup_date ?? d.pickup_date;
  const pickup_slot = ex?.pickup_slot ?? d.pickup_slot;
  const hasPartner = [
    "Scheduled",
    "Picked_Up",
    "Received",
    "Completed",
  ].includes(status);
  const partner =
    ex?.partner ||
    (hasPartner ? PARTNERS[hash(d.donation_id) % PARTNERS.length] : null);
  const ngo =
    ex?.ngo ||
    (status === "Completed"
      ? NGOS[hash(d.donation_id + "n") % NGOS.length]
      : null);
  const waitingDays =
    status === "Pending"
      ? Math.max(
          0,
          Math.floor(
            (DEMO_TODAY.getTime() - new Date(donated).getTime()) / DAY,
          ),
        )
      : 0;

  /* timeline (oldest first) from how the donation first looked, then any actions taken this session */
  const o = ex?.orig || {
    status,
    pickup_date,
    pickup_slot,
    reject_reason: d.reject_reason,
  };
  const events = [
    {
      id: "sub",
      label: "Donation submitted",
      detail: `${user.full_name} offered ${d.quantity} × ${d.title}`,
      at: donated,
      tone: "neutral",
    },
  ];
  const accepted = capNow(plus(donated, 1));
  if (o.status === "Rejected") {
    events.push({
      id: "rej",
      label: "Rejected by admin",
      detail: o.reject_reason || "Not accepted.",
      at: capNow(d.reviewed_at || accepted),
      tone: "bad",
    });
  } else if (o.status !== "Pending") {
    events.push({
      id: "acc",
      label: "Accepted · pickup scheduled",
      detail: `Free pickup ${o.pickup_slot || ""}`.trim(),
      at: accepted,
      tone: "good",
    });
    if (["Picked_Up", "Received", "Completed"].includes(o.status))
      events.push({
        id: "pick",
        label: "Picked up from donor",
        detail: partner || "Pickup team",
        at: capNow(o.pickup_date || accepted),
        tone: "info",
      });
    if (["Received", "Completed"].includes(o.status))
      events.push({
        id: "rec",
        label: "Received at warehouse",
        detail: "Checked in and sorted",
        at: capNow(plus(o.pickup_date || accepted, 1)),
        tone: "info",
      });
    if (o.status === "Completed")
      events.push({
        id: "cmp",
        label: "Donation completed",
        detail: `Given to ${ngo} · certificate issued`,
        at: capNow(plus(o.pickup_date || accepted, 3)),
        tone: "good",
      });
  }
  const added = ex?.events || [];

  return {
    id: d.donation_id,
    title: d.title,
    category: d.category,
    image: d.image,
    quantity: d.quantity,
    donation_date: donated,
    status,
    pickup_date,
    pickup_slot,
    partner,
    ngo,
    certificate: status === "Completed",
    certificate_id:
      status === "Completed" ? `CERT-${d.donation_id.slice(3)}` : null,
    reject_reason: d.reject_reason || ex?.reject_reason || "",
    condition: ["Good", "Good", "Medium", "Worst"][hash(d.donation_id) % 4],
    description: DESC[d.category] || "Item offered for donation.",
    weight_kg: Math.round((WEIGHT[d.category] || 2) * d.quantity * 10) / 10,
    waitingDays,
    overdue: status === "Pending" && waitingDays >= SLA_DAYS,
    events: [...events, ...added],
    donor: {
      id: user.user_id,
      name: user.full_name,
      email: user.email,
      image: user.profile.profile_image,
      phone: user.profile.phone,
      address: user.profile.address,
      city: user.profile.city,
      state: user.profile.state,
      pincode: user.profile.pincode,
      status: user.status,
      path: `/admin-users/${user.user_id}`,
    },
  };
}

export function useDonations() {
  const users = useUsers();
  const ex = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(
    () =>
      users.flatMap((u) =>
        u.donations.map((d) => build(u, d, ex[d.donation_id])),
      ),
    [users, ex],
  );
}
export function useDonation(id) {
  return useDonations().find((d) => d.id === id) || null;
}

/* payload: { date, slot, partner } | { reason } | { ngo } */
export function runDonationAction(donationId, key, payload = {}) {
  const user = getUsers().find((u) =>
    u.donations.some((d) => d.donation_id === donationId),
  );
  if (!user) return;
  const at = new Date().toISOString();
  const raw = user.donations.find((x) => x.donation_id === donationId);
  const cur = extras[donationId] || {
    events: [],
    orig: {
      status: raw.donation_status,
      pickup_date: raw.pickup_date,
      pickup_slot: raw.pickup_slot,
      reject_reason: raw.reject_reason,
    },
  };
  const next = { ...cur, events: [...cur.events] };
  const log = (label, detail, tone = "neutral") =>
    next.events.push({
      id: `x-${Date.now()}-${next.events.length}`,
      label,
      detail: `${detail ? detail + " · " : ""}Admin · You`,
      at,
      tone,
    });
  let patch = {};
  const when = payload.date
    ? new Date(`${payload.date}T09:00:00`).toISOString()
    : null;

  switch (key) {
    case "accept":
      patch = {
        donation_status: "Scheduled",
        pickup_date: when,
        pickup_slot: payload.slot,
        reject_reason: "",
      };
      next.pickup_date = when;
      next.pickup_slot = payload.slot;
      next.partner = payload.partner;
      log(
        "Accepted · pickup scheduled",
        `${payload.slot} · ${payload.partner}`,
        "good",
      );
      break;
    case "reschedule":
      patch = { pickup_date: when, pickup_slot: payload.slot };
      next.pickup_date = when;
      next.pickup_slot = payload.slot;
      next.partner = payload.partner;
      log("Pickup rescheduled", `${payload.slot} · ${payload.partner}`, "wait");
      break;
    case "reject":
    case "cancelPickup":
      patch = {
        donation_status: "Rejected",
        pickup_date: null,
        pickup_slot: null,
        reject_reason: payload.reason,
        reviewed_at: at,
      };
      next.pickup_date = null;
      next.pickup_slot = null;
      log(
        key === "reject" ? "Rejected by admin" : "Pickup cancelled · rejected",
        payload.reason,
        "bad",
      );
      break;
    case "pickedUp":
      patch = { donation_status: "Picked_Up" };
      log("Picked up from donor", "", "info");
      break;
    case "received":
      patch = { donation_status: "Received" };
      log("Received at warehouse", "Checked in", "info");
      break;
    case "complete":
      patch = { donation_status: "Completed", certificate: true };
      next.ngo = payload.ngo;
      log(
        "Donation completed",
        `Given to ${payload.ngo} · certificate issued`,
        "good",
      );
      break;
    case "reopen":
      patch = { donation_status: "Pending", reject_reason: "" };
      log("Moved back to pending", "", "wait");
      break;
    default:
      return;
  }
  extras = { ...extras, [donationId]: next };
  updateUserDonation(user.user_id, donationId, patch);
  emit();
}
