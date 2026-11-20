/* =========================================================
   Admin › Pickups data layer, backed by the server.
   Two kinds of pickup, both free for the customer:
   - Donation pickups: built live from the Donations store, so
     scheduling here is the same action as on the Donations screen.
   - Item pickups: listings a member published as "Managed by ReOrbit"
     (/api/pickups/admin/requests/). The server creates one when the
     listing goes live and checks every step.
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { pickupApi } from "../../api/pickups";
import { getAccount } from "../../api/session";
import { useDonations, runDonationAction } from "./donationsStore";
import { teamNameOf } from "./donationActions";

const DAY = 86400000;
const dayStart = (d) => new Date(new Date(d).setHours(0, 0, 0, 0)).getTime();
export const TODAY_START = dayStart(new Date());

/* "Today", "Tomorrow", "Overdue 2 days" … for an active pickup */
export function dueInfo(p) {
  if (p.status !== "Scheduled" || !p.date) return null;
  const diff = Math.round((dayStart(p.date) - dayStart(new Date())) / DAY);
  if (diff < 0)
    return {
      key: "overdue",
      label: `Overdue ${-diff} day${diff === -1 ? "" : "s"}`,
      diff,
    };
  if (diff === 0) return { key: "today", label: "Today", diff };
  if (diff === 1) return { key: "tomorrow", label: "Tomorrow", diff };
  return { key: "later", label: `In ${diff} days`, diff };
}

/* ---------- item pickups, from the server ---------- */
const idle = { list: [], loaded: false, loading: false, error: "", owner: "" };
let state = idle;
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;
const setState = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const me = () => getAccount("admin")?.public_id || "";

/* PKR-1004 -> PK-I1004 (donation pickups are PK-<donation number>, so the two never clash) */
const itemId = (publicId) => `PK-I${String(publicId).split("-").pop()}`;

function fromRequest(r) {
  const c = r.customer;
  const isOrder = r.kind === "order";
  return {
    id: isOrder ? r.id : itemId(r.id),
    request_id: r.id,
    type: isOrder ? "Order" : "Item",
    ref_id: r.item.id,
    ref_path: isOrder ? r.order.path : `/admin-products/${r.item.id}`,
    ref_label: isOrder ? "Order" : "Item listing",
    order: r.order || null, // order pickups: the order, its buyer and where it goes
    dropTo: r.drop_to || null, // listing pickups: ReOrbit's own address (Admin › Addresses)
    title: r.item.title,
    category: r.item.category,
    image: r.item.image,
    quantity: r.item.quantity,
    customer: c,
    address: c.address,
    city: c.city,
    state: c.state,
    pincode: c.pincode,
    status: r.status,
    /* local time, so the booked day never shifts */
    date: r.date ? `${r.date}T09:00:00` : null,
    slot: r.slot,
    agent: r.partner,
    requested_at: r.requested_at,
    cancel_reason: r.cancel_reason,
    code: r.code || null, // { needed, tries_left }: the code itself is never sent to admins
    events: r.events.map((e) => ({ ...e })),
  };
}

export async function loadItemPickups(force = false) {
  const owner = me();
  if (state.owner !== owner) state = { ...idle, owner };
  if (state.loading || (state.loaded && !force)) return;
  setState({ loading: true, error: "" });
  try {
    const r = await pickupApi.requests();
    if (state.owner === owner)
      setState({ list: r.results.map(fromRequest), loaded: true, loading: false });
  } catch (e) {
    setState({
      loading: false,
      error: e.message || "Could not load pickups.",
    });
  }
}

const put = (row) => {
  const next = fromRequest(row);
  const has = state.list.some((p) => p.id === next.id);
  setState({
    list: has
      ? state.list.map((p) => (p.id === next.id ? next : p))
      : [next, ...state.list],
    loaded: true,
  });
  return next;
};

/* another account signing in on this tab must not see the previous list */
if (typeof window !== "undefined")
  window.addEventListener("reorbit:session-ended", () => {
    state = idle;
    listeners.forEach((l) => l());
  });

function useItemPickups() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    loadItemPickups();
  }, []);
  return s.owner === me() ? s : idle;
}

/* ---------- donation pickups, from the Donations store ---------- */
const STATUS_FROM_DONATION = {
  Pending: "Requested",
  Scheduled: "Scheduled",
  /* a missed collection still has its team and date; admin re-books it */
  Failed_Pickup: "Scheduled",
  Picked_Up: "Picked_Up",
  Received: "Completed",
  Completed: "Completed",
  Rejected: "Cancelled",
  Cancelled: "Cancelled",
};

function fromDonation(d) {
  return {
    id: `PK-${d.id.slice(4)}`,
    type: "Donation",
    ref_id: d.id,
    ref_path: `/admin-donations/${d.id}`,
    ref_label: "Donation",
    title: d.title,
    category: d.category,
    image: d.image,
    quantity: d.quantity,
    customer: d.donor,
    address: d.donor.address,
    city: d.donor.city,
    state: d.donor.state,
    pincode: d.donor.pincode,
    status: STATUS_FROM_DONATION[d.status] || "Requested",
    donationStatus: d.status,
    date: d.pickup_date,
    slot: d.pickup_slot,
    agent: teamNameOf(d.partner),
    requested_at: d.donation_date,
    cancel_reason: d.reject_reason,
    events: d.events.map((e) => ({ ...e })),
  };
}

export function usePickups() {
  const donations = useDonations();
  const { list: items } = useItemPickups();
  return useMemo(() => {
    const all = [...donations.map(fromDonation), ...items];
    return all.map((p) => ({ ...p, due: dueInfo(p) }));
  }, [donations, items]);
}
/* { pickup, loading }. A pickup made a moment ago (e.g. "Hand to ReOrbit Delivery" on an order page)
   isn't in the list loaded earlier: fetch the list again once before saying it doesn't exist. */
const refetched = new Set();
export function usePickup(id) {
  const pickup = usePickups().find((p) => p.id === id) || null;
  const s = useItemPickups();
  const missing = !pickup && /^PKR-/.test(id || "");
  const refetch = missing && s.loaded && !s.loading && !refetched.has(id);
  useEffect(() => {
    if (refetch) {
      refetched.add(id);
      loadItemPickups(true);
    }
  }, [refetch, id]);
  return { pickup, loading: !pickup && (s.loading || !s.loaded || refetch) };
}

/* { loading, error, reload } for the list pages */
export function usePickupsStatus() {
  const s = useItemPickups();
  return {
    loading: s.loading || !s.loaded,
    error: s.error,
    reload: () => loadItemPickups(true),
  };
}

/* key: schedule | reschedule | pickedUp | complete | cancel | reopen
   payload: { date, slot, partner } | { reason } | { code } | { received_quantity … }
   Resolves when the server has accepted it, rejects with the server's message. */
export async function runPickupAction(pickup, key, payload = {}) {
  if (pickup.type === "Donation") {
    const map = {
      schedule: "accept",
      reschedule: "reschedule",
      pickedUp: "pickedUp",
      complete: "received",
      reopen: "reopen",
      cancel: pickup.status === "Requested" ? "reject" : "cancelPickup",
    };
    return runDonationAction(pickup.ref_id, map[key], payload);
  }
  return put(await pickupApi.act(pickup.request_id, key, payload));
}
