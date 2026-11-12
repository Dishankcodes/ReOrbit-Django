/* =========================================================
   Admin > Donations data layer, backed by /api/donations/admin/.
   Every donation members make is here: review it, book the free
   pickup, mark it picked up, mark it received at the warehouse
   (the donor's voucher and points are issued then), and hand it
   on to an NGO. Needs the "donations" admin module.
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { adminDonationApi } from "../../api/donations";
import { getAccount } from "../../api/session";

export const SLA_DAYS = 3; // pending donations should be reviewed within this many days

const adapt = (d) => ({
  id: d.id,
  title: d.title,
  category: d.category,
  image: d.image,
  images: d.images || [],
  quantity: d.quantity,
  donation_date: d.donation_date,
  status: d.status,
  /* local time, so the booked day never shifts */
  pickup_date: d.pickup_date ? `${d.pickup_date}T09:00:00` : null,
  pickup_slot: d.pickup_slot,
  partner: d.partner,
  ngo: d.ngo,
  certificate: d.certificate,
  certificate_id: d.certificate_id,
  reject_reason: d.reject_reason || d.cancel_reason || "",
  condition: d.condition,
  description: d.description,
  weight_kg: d.weight_kg,
  note: d.note,
  contact: d.contact,
  reward: d.reward,
  waitingDays: d.waiting_days,
  overdue: d.overdue,
  events: (d.events || []).map((e) => ({ id: e.id, label: e.label, detail: e.detail, tone: e.tone, at: e.at, actor: e.actor })),
  donor: d.donor,
});

const idle = { list: [], loaded: false, loading: false, error: "", owner: "" };
let state = idle;
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => state;
const setState = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
const me = () => getAccount("admin")?.public_id || "";

export async function loadDonations(force = false) {
  const owner = me();
  if (state.owner !== owner) state = { ...idle, owner };
  if (state.loading || (state.loaded && !force)) return;
  setState({ loading: true, error: "" });
  try {
    const r = await adminDonationApi.list();
    if (state.owner === owner) setState({ list: r.results.map(adapt), loaded: true, loading: false });
  } catch (e) {
    setState({ loading: false, error: e.message || "Could not load donations." });
  }
}

const put = (row) => {
  const next = adapt(row);
  const has = state.list.some((d) => d.id === next.id);
  setState({ list: has ? state.list.map((d) => (d.id === next.id ? next : d)) : [next, ...state.list], loaded: true });
  return next;
};

const useStore = () => {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => { loadDonations(); }, []);
  return s.owner === me() ? s : idle;
};

export function useDonations() {
  const { list } = useStore();
  return list;
}

export function useDonation(id) {
  const { list } = useStore();
  return useMemo(() => list.find((d) => d.id === id) || null, [list, id]);
}

/* { loading, error, reload } for the list pages */
export function useDonationsStatus() {
  const s = useStore();
  return { loading: s.loading || !s.loaded, error: s.error, reload: () => loadDonations(true) };
}

/* key: accept | reject | reschedule | cancelPickup | pickedUp | received | complete | reopen
   payload: { date, slot, partner } | { reason } | { ngo }.
   Resolves with the updated donation, rejects with the server's message. */
export async function runDonationAction(donationId, key, payload = {}) {
  return put(await adminDonationApi.act(donationId, key, payload));
}
