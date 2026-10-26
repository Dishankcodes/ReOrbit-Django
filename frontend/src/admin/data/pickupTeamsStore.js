/* =========================================================
   Admin › Pickup teams (UI only, in-memory).

   A pickup team is a small crew of field staff that goes to a
   customer's door: one Lead, and usually a Driver and a Helper.
   They are NOT admin accounts (see Team & Roles for those).

   Pickups and donations only remember the team NAME, so a name
   is locked once a team has had pickups.

   Rules the screens follow:
     - A team needs an active Lead to take new pickups.
     - A paused team (or one with nobody on duty) is hidden from
       the scheduling list. Its upcoming pickups can be moved to
       another team in the same step.
     - Each team has a daily capacity; the scheduling form shows
       how full a day already is.

   Backend later: Pickup_Teams and Pickup_Team_Members tables.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { usePickups, runPickupAction, TODAY_START } from "./pickupsStore";
import { DEMO_TODAY } from "../utils/format";

const iso = (v) => new Date(v).toISOString();
const DAY = 86400000;

export const ROLES = [
  { key: "Lead", blurb: "Runs the crew and is the contact for the day." },
  { key: "Driver", blurb: "Drives the vehicle and does the loading." },
  { key: "Helper", blurb: "Helps lift, pack and carry." },
];
export const VEHICLES = ["Tata Ace mini-truck", "Mahindra Bolero pickup", "Electric cargo three-wheeler", "Maruti Eeco van", "Bike with carrier"];
export const MEMBER_STATUS = ["Active", "On leave"];

const mem = (n, name, phone, role, joined, status = "Active") => ({ id: `PM-${n}`, name, phone, role, status, joinedAt: iso(joined) });

let state = {
  seq: 4,
  mseq: 10,
  teams: [
    {
      id: "PT-1", name: "Pickup team A", area: "Ahmedabad · West", vehicle: "Tata Ace mini-truck", capacity: 6, status: "Active", pausedReason: "",
      note: "Handles furniture and bulky items. Starts from the Sarkhej warehouse.", createdAt: iso("2025-02-10T09:00:00"),
      members: [
        mem(1, "Ravi Kumar", "+91 98250 41011", "Lead", "2025-02-10T09:00:00"),
        mem(2, "Mahesh Solanki", "+91 98250 41012", "Driver", "2025-02-12T09:00:00"),
        mem(3, "Jignesh Patel", "+91 98250 41013", "Helper", "2025-06-03T09:00:00"),
      ],
    },
    {
      id: "PT-2", name: "Pickup team B", area: "Ahmedabad · East", vehicle: "Mahindra Bolero pickup", capacity: 5, status: "Active", pausedReason: "",
      note: "Electronics and household goods.", createdAt: iso("2025-03-01T09:00:00"),
      members: [
        mem(4, "Imran Qureshi", "+91 98251 52021", "Lead", "2025-03-01T09:00:00"),
        mem(5, "Farhan Shaikh", "+91 98251 52022", "Driver", "2025-03-04T09:00:00"),
      ],
    },
    {
      id: "PT-3", name: "Pickup team C", area: "Gandhinagar and nearby", vehicle: "Electric cargo three-wheeler", capacity: 4, status: "Active", pausedReason: "",
      note: "Small and medium items, clothes and books.", createdAt: iso("2025-05-20T09:00:00"),
      members: [
        mem(6, "Sunita Devi", "+91 98252 63031", "Lead", "2025-05-20T09:00:00"),
        mem(7, "Kanta Ben", "+91 98252 63032", "Helper", "2025-07-15T09:00:00"),
      ],
    },
  ],
};
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => state;
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
const useRaw = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
const stamp = () => new Date().toISOString();

/* ---------- derived ---------- */
export const activeCrew = (t) => t.members.filter((m) => m.status === "Active");
export const hasLead = (t) => activeCrew(t).some((m) => m.role === "Lead");
export const canTakeWork = (t) => t.status === "Active" && hasLead(t);
export const leadOf = (t) => activeCrew(t).find((m) => m.role === "Lead") || t.members.find((m) => m.role === "Lead") || t.members[0] || null;

const diffDays = (d) => Math.round((new Date(new Date(d).setHours(0, 0, 0, 0)) - TODAY_START) / DAY);

/* Teams with live numbers from the pickups list. */
export function usePickupTeams() {
  const { teams } = useRaw();
  const pickups = usePickups();
  return useMemo(() => teams.map((t) => {
    const mine = pickups.filter((p) => p.agent === t.name);
    const scheduled = mine.filter((p) => p.status === "Scheduled");
    const stops = scheduled.filter((p) => p.due?.key === "today").sort((a, b) => a.slot.localeCompare(b.slot));
    const upcoming = scheduled.filter((p) => p.due && p.due.diff > 0);
    const late = scheduled.filter((p) => p.due?.key === "overdue");
    const done = mine.filter((p) => ["Picked_Up", "Completed"].includes(p.status)).length;
    const load = {};
    scheduled.forEach((p) => { const k = new Date(p.date).toISOString().slice(0, 10); load[k] = (load[k] || 0) + 1; });
    return {
      ...t, lead: leadOf(t), crew: activeCrew(t), ready: canTakeWork(t), noLead: !hasLead(t),
      stops, upcoming, late, done, total: mine.length, movable: scheduled, load,
      todayLoad: stops.length, full: stops.length >= t.capacity,
    };
  }), [teams, pickups]);
}

/* Teams that can be picked when scheduling, with how busy each date is. */
export function useTeamOptions() {
  const teams = usePickupTeams();
  return useMemo(() => teams.filter((t) => t.ready).map((t) => ({
    name: t.name, lead: t.lead?.name, phone: t.lead?.phone, capacity: t.capacity, area: t.area,
    loadOn: (dateIso) => t.load[dateIso] || 0,
  })), [teams]);
}

/* “Pickup team A” → { team, lead, phone }. Reactive, so a new lead shows up everywhere. */
export function useTeamLabel() {
  const { teams } = useRaw();
  return useMemo(() => (name) => {
    if (!name) return null;
    const t = teams.find((x) => x.name === name);
    const lead = t ? leadOf(t) : null;
    return { team: name, lead: lead?.name || null, phone: lead?.phone || null, paused: t ? t.status !== "Active" : false, gone: !t, id: t?.id };
  }, [teams]);
}

export function useTeamNames() {
  const { teams } = useRaw();
  return useMemo(() => teams.map((t) => t.name), [teams]);
}

/* ---------- validation helpers (also used by the forms) ---------- */
export const phoneOk = (v) => /^[+\d][\d\s-]{8,16}$/.test(String(v).trim());
export const nameTaken = (name, exceptId) => state.teams.some((t) => t.id !== exceptId && t.name.trim().toLowerCase() === name.trim().toLowerCase());
export const phoneTaken = (phone, exceptMember) => {
  const clean = String(phone).replace(/[\s-]/g, "");
  return state.teams.some((t) => t.members.some((m) => m.id !== exceptMember && m.phone.replace(/[\s-]/g, "") === clean));
};

/* ---------- team actions ---------- */
/* values: { name, area, vehicle, capacity, note, lead: { name, phone } , crew?: [{ name, phone, role }] } */
export function createTeam(values) {
  const id = `PT-${state.seq}`;
  let mseq = state.mseq;
  const members = [{ id: `PM-${mseq++}`, name: values.lead.name.trim(), phone: values.lead.phone.trim(), role: "Lead", status: "Active", joinedAt: stamp() }];
  (values.crew || []).filter((c) => c.name.trim() && c.phone.trim()).forEach((c) => members.push({ id: `PM-${mseq++}`, name: c.name.trim(), phone: c.phone.trim(), role: c.role, status: "Active", joinedAt: stamp() }));
  const team = {
    id, name: values.name.trim(), area: values.area.trim(), vehicle: values.vehicle, capacity: Number(values.capacity), status: "Active", pausedReason: "",
    note: (values.note || "").trim(), createdAt: stamp(), members,
  };
  set({ seq: state.seq + 1, mseq, teams: [...state.teams, team] });
  return id;
}

export function updateTeam(id, values) {
  set({
    teams: state.teams.map((t) => (t.id !== id ? t : {
      ...t, name: values.name !== undefined ? values.name.trim() : t.name, area: values.area.trim(), vehicle: values.vehicle,
      capacity: Number(values.capacity), note: (values.note || "").trim(),
    })),
  });
}

/* Moves every scheduled pickup of one team to another (keeps date and slot). */
export function reassignPickups(pickups, toName) {
  pickups.forEach((p) => runPickupAction(p, "reschedule", { date: new Date(p.date).toISOString().slice(0, 10), slot: p.slot, partner: toName }));
}

export function setTeamStatus(id, status, reason = "") {
  set({ teams: state.teams.map((t) => (t.id === id ? { ...t, status, pausedReason: status === "Paused" ? reason : "" } : t)) });
}

export function removeTeam(id) {
  set({ teams: state.teams.filter((t) => t.id !== id) });
}

/* ---------- member actions ---------- */
/* values: { name, phone, role } — a second Lead replaces the first one. */
export function addMember(teamId, values) {
  const member = { id: `PM-${state.mseq}`, name: values.name.trim(), phone: values.phone.trim(), role: values.role, status: "Active", joinedAt: stamp() };
  set({
    mseq: state.mseq + 1,
    teams: state.teams.map((t) => {
      if (t.id !== teamId) return t;
      const members = member.role === "Lead" ? t.members.map((m) => (m.role === "Lead" ? { ...m, role: "Driver" } : m)) : t.members;
      return { ...t, members: [...members, member] };
    }),
  });
  return member.id;
}

export function updateMember(teamId, memberId, values) {
  set({
    teams: state.teams.map((t) => {
      if (t.id !== teamId) return t;
      let members = t.members.map((m) => (m.id === memberId ? { ...m, name: values.name.trim(), phone: values.phone.trim(), role: values.role, status: values.status || m.status } : m));
      if (values.role === "Lead") members = members.map((m) => (m.id !== memberId && m.role === "Lead" ? { ...m, role: "Driver" } : m));
      return { ...t, members };
    }),
  });
}

export function makeLead(teamId, memberId) {
  set({
    teams: state.teams.map((t) => (t.id !== teamId ? t : {
      ...t, members: t.members.map((m) => (m.id === memberId ? { ...m, role: "Lead", status: "Active" } : m.role === "Lead" ? { ...m, role: "Driver" } : m)),
    })),
  });
}

export function setMemberStatus(teamId, memberId, status) {
  set({ teams: state.teams.map((t) => (t.id !== teamId ? t : { ...t, members: t.members.map((m) => (m.id === memberId ? { ...m, status } : m)) })) });
}

export function removeMember(teamId, memberId) {
  set({ teams: state.teams.map((t) => (t.id !== teamId ? t : { ...t, members: t.members.filter((m) => m.id !== memberId) })) });
}

/* Move a person to another team. They keep their role unless the new team already has a Lead. */
export function moveMember(fromId, memberId, toId) {
  const from = state.teams.find((t) => t.id === fromId);
  const m = from?.members.find((x) => x.id === memberId);
  if (!m) return;
  set({
    teams: state.teams.map((t) => {
      if (t.id === fromId) return { ...t, members: t.members.filter((x) => x.id !== memberId) };
      if (t.id === toId) {
        const role = m.role === "Lead" && t.members.some((x) => x.role === "Lead") ? "Driver" : m.role;
        return { ...t, members: [...t.members, { ...m, role }] };
      }
      return t;
    }),
  });
}

export { DEMO_TODAY };
