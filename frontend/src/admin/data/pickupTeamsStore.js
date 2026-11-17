/* =========================================================
   Admin › Pickup teams, backed by the server (/api/pickups/admin/teams/).

   A pickup team is a small crew of field staff that goes to a
   customer's door: one Lead, and usually a Driver and a Helper.
   They are NOT admin accounts (see Team & Roles for those).

   Rules the server enforces (the screens just show its message):
     - A team needs an active Lead to take new pickups.
     - A paused team is hidden from the scheduling list; pausing a team
       with booked pickups moves them to another team in the same step.
     - A team that has had pickups keeps its name and can't be deleted.
     - Each team has a daily capacity; the scheduling form shows how
       full a day already is.
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { pickupApi } from "../../api/pickups";
import { getAccount } from "../../api/session";
import { usePickups, runPickupAction, loadItemPickups } from "./pickupsStore";
import { loadDonations } from "./donationsStore";

export const ROLES = [
  { key: "Lead", blurb: "Runs the crew and is the contact for the day." },
  { key: "Driver", blurb: "Drives the vehicle and does the loading." },
  { key: "Helper", blurb: "Helps lift, pack and carry." },
];
export const VEHICLES = [
  "Tata Ace mini-truck",
  "Mahindra Bolero pickup",
  "Electric cargo three-wheeler",
  "Maruti Eeco van",
  "Bike with carrier",
];
export const MEMBER_STATUS = ["Active", "On leave"];

const idle = { teams: [], loaded: false, loading: false, error: "", owner: "" };
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

const adapt = (t) => ({
  id: t.id,
  name: t.name,
  area: t.area,
  vehicle: t.vehicle,
  capacity: t.capacity,
  status: t.status,
  pausedReason: t.pausedReason || "",
  note: t.note || "",
  createdAt: t.createdAt,
  members: (t.members || []).map((m) => ({
    id: m.id,
    name: m.name,
    phone: m.phone,
    role: m.role,
    status: m.status,
    joinedAt: m.joinedAt,
  })),
});

export async function loadTeams(force = false) {
  const owner = me();
  if (state.owner !== owner) state = { ...idle, owner };
  if (state.loading || (state.loaded && !force)) return;
  setState({ loading: true, error: "" });
  try {
    const rows = await pickupApi.teams();
    if (state.owner === owner)
      setState({ teams: rows.map(adapt), loaded: true, loading: false });
  } catch (e) {
    setState({
      loading: false,
      error: e.message || "Could not load the pickup teams.",
    });
  }
}

/* another account signing in on this tab must not see the previous teams */
if (typeof window !== "undefined")
  window.addEventListener("reorbit:session-ended", () => {
    state = idle;
    listeners.forEach((l) => l());
  });

const put = (row) => {
  const next = adapt(row);
  const has = state.teams.some((t) => t.id === next.id);
  setState({
    teams: has
      ? state.teams.map((t) => (t.id === next.id ? next : t))
      : [...state.teams, next],
    loaded: true,
  });
  return next;
};

const useRaw = () => {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    loadTeams();
  }, []);
  return s.owner === me() ? s : idle;
};

/* { loading, error, reload } for the teams page */
export function useTeamsStatus() {
  const s = useRaw();
  return {
    loading: s.loading || !s.loaded,
    error: s.error,
    reload: () => loadTeams(true),
  };
}

/* Plain read of the teams, for stores outside React. */
export const getPickupTeams = () => state.teams;

/* ---------- derived ---------- */
export const activeCrew = (t) => t.members.filter((m) => m.status === "Active");
export const hasLead = (t) => activeCrew(t).some((m) => m.role === "Lead");
export const canTakeWork = (t) => t.status === "Active" && hasLead(t);
export const leadOf = (t) =>
  activeCrew(t).find((m) => m.role === "Lead") ||
  t.members.find((m) => m.role === "Lead") ||
  t.members[0] ||
  null;

/* Teams with live numbers from the pickups list. */
export function usePickupTeams() {
  const { teams } = useRaw();
  const pickups = usePickups();
  return useMemo(
    () =>
      teams.map((t) => {
        const mine = pickups.filter((p) => p.agent === t.name);
        const scheduled = mine.filter((p) => p.status === "Scheduled");
        const stops = scheduled
          .filter((p) => p.due?.key === "today")
          .sort((a, b) => a.slot.localeCompare(b.slot));
        const upcoming = scheduled.filter((p) => p.due && p.due.diff > 0);
        const late = scheduled.filter((p) => p.due?.key === "overdue");
        const done = mine.filter((p) =>
          ["Picked_Up", "Completed"].includes(p.status),
        ).length;
        const load = {};
        scheduled.forEach((p) => {
          const k = new Date(p.date).toISOString().slice(0, 10);
          load[k] = (load[k] || 0) + 1;
        });
        return {
          ...t,
          lead: leadOf(t),
          crew: activeCrew(t),
          ready: canTakeWork(t),
          noLead: !hasLead(t),
          stops,
          upcoming,
          late,
          done,
          total: mine.length,
          movable: scheduled,
          load,
          todayLoad: stops.length,
          full: stops.length >= t.capacity,
        };
      }),
    [teams, pickups],
  );
}

/* Teams that can be picked when scheduling, with how busy each date is. */
export function useTeamOptions() {
  const teams = usePickupTeams();
  return useMemo(
    () =>
      teams
        .filter((t) => t.ready)
        .map((t) => ({
          name: t.name,
          lead: t.lead?.name,
          phone: t.lead?.phone,
          capacity: t.capacity,
          area: t.area,
          loadOn: (dateIso) => t.load[dateIso] || 0,
        })),
    [teams],
  );
}

/* “Pickup team A” → { team, lead, phone }. Reactive, so a new lead shows up everywhere. */
export function useTeamLabel() {
  const { teams } = useRaw();
  return useMemo(
    () => (name) => {
      if (!name) return null;
      const t = teams.find((x) => x.name === name);
      const lead = t ? leadOf(t) : null;
      return {
        team: name,
        lead: lead?.name || null,
        phone: lead?.phone || null,
        paused: t ? t.status !== "Active" : false,
        gone: !t,
        id: t?.id,
      };
    },
    [teams],
  );
}

export function useTeamNames() {
  const { teams } = useRaw();
  return useMemo(() => teams.map((t) => t.name), [teams]);
}

/* ---------- validation helpers (also used by the forms; the server checks them again) ---------- */
export { isPhone as phoneOk } from "../../shared/phone"; // 10-digit Indian mobile, same rule as the server
export const nameTaken = (name, exceptId) =>
  state.teams.some(
    (t) =>
      t.id !== exceptId &&
      t.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
export const phoneTaken = (phone, exceptMember) => {
  const clean = String(phone).replace(/[\s-]/g, "");
  return state.teams.some((t) =>
    t.members.some(
      (m) => m.id !== exceptMember && m.phone.replace(/[\s-]/g, "") === clean,
    ),
  );
};

/* ---------- team actions ----------
   Each one waits for the server and rejects with its message (the screens show it). */

/* values: { name, area, vehicle, capacity, note, lead: { name, phone } , crew?: [{ name, phone, role }] } */
export async function createTeam(values) {
  const body = {
    name: values.name.trim(),
    area: values.area.trim(),
    vehicle: values.vehicle,
    capacity: Number(values.capacity),
    note: (values.note || "").trim(),
    lead: { name: values.lead.name.trim(), phone: values.lead.phone.trim() },
    crew: (values.crew || [])
      .filter((c) => c.name.trim() && c.phone.trim())
      .map((c) => ({
        name: c.name.trim(),
        phone: c.phone.trim(),
        role: c.role,
      })),
  };
  return put(await pickupApi.createTeam(body)).id;
}

export async function updateTeam(id, values) {
  const body = {
    area: values.area.trim(),
    vehicle: values.vehicle,
    capacity: Number(values.capacity),
    note: (values.note || "").trim(),
  };
  if (values.name !== undefined) body.name = values.name.trim();
  put(await pickupApi.updateTeam(id, body));
}

/* Moves every scheduled pickup of one team to another (keeps date and slot). */
export async function reassignPickups(pickups, toName) {
  await Promise.all(
    pickups.map((p) =>
      runPickupAction(p, "reschedule", {
        date: new Date(p.date).toISOString().slice(0, 10),
        slot: p.slot,
        partner: toName,
      }),
    ),
  );
}

/* Pausing a team that has booked pickups needs `moveTo` (a team name): the server moves them
   in the same step, so nothing is left with a paused team. */
export async function setTeamStatus(id, status, reason = "", moveTo = "") {
  const row = await pickupApi.setTeamStatus(id, {
    status,
    reason,
    ...(moveTo ? { move_to: moveTo } : {}),
  });
  put(row);
  if (moveTo) await Promise.all([loadDonations(true), loadItemPickups(true)]);
}

export async function removeTeam(id) {
  await pickupApi.removeTeam(id);
  setState({ teams: state.teams.filter((t) => t.id !== id) });
}

/* ---------- member actions (each answers with the whole updated team) ---------- */
/* values: { name, phone, role } — a second Lead replaces the first one. */
export async function addMember(teamId, values) {
  const body = {
    name: values.name.trim(),
    phone: values.phone.trim(),
    role: values.role,
  };
  const team = put(await pickupApi.addMember(teamId, body));
  return team.members[team.members.length - 1]?.id;
}

export async function updateMember(teamId, memberId, values) {
  put(
    await pickupApi.updateMember(teamId, memberId, {
      name: values.name.trim(),
      phone: values.phone.trim(),
      role: values.role,
      status: values.status,
    }),
  );
}

export async function makeLead(teamId, memberId) {
  put(await pickupApi.makeLead(teamId, memberId));
}

export async function setMemberStatus(teamId, memberId, status) {
  put(await pickupApi.setMemberStatus(teamId, memberId, status));
}

export async function removeMember(teamId, memberId) {
  put(await pickupApi.removeMember(teamId, memberId));
}

/* Move a person to another team. They keep their role unless the new team already has a Lead. */
export async function moveMember(fromId, memberId, toId) {
  put(await pickupApi.moveMember(fromId, memberId, toId));
  await loadTeams(true);
}
