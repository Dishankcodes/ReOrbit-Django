/* Team, roles and permissions (in-memory, resets on refresh).

   - The signed-in admin is the Super admin. Only a super admin can add
     sub-admins and decide what each one may see or change.
   - Every module has one of three levels per person: none, view, edit.
   - "Preview as" lets the super admin use the whole panel exactly as a
     sub-admin would see it, which is the quickest way to check access.

   NOTE: this is front-end only. A real backend must enforce the same
   rules on every API call; hiding buttons is not security. */
import { useMemo, useSyncExternalStore } from "react";
import { getSettings, useSettings } from "./settingsStore";

/* ---------- modules that can be granted ---------- */
export const MODULES = [
  { key: "dashboard", label: "Dashboard", group: "Main", path: "/admin-dashboard", locked: true, hint: "Overview for every admin (always view only)" },
  { key: "users", label: "Users", group: "Main", path: "/admin-users", hint: "Accounts, moderation, blocking" },
  { key: "remakers", label: "ReMakers", group: "Main", path: "/admin-remakers", hint: "Verification, portfolios, moderation" },
  { key: "products", label: "Products", group: "Main", path: "/admin-products", hint: "Review and manage listings" },
  { key: "orders", label: "Orders", group: "Main", path: "/admin-orders", hint: "Payments, status, refunds" },
  { key: "shop", label: "Buy Products", group: "Main", path: "/admin-shop", hint: "Buy as the platform" },
  { key: "sell", label: "Sell Products", group: "Main", path: "/admin-sell", hint: "List and sell platform stock" },
  { key: "donations", label: "Donations", group: "Operations", path: "/admin-donations", hint: "Accept, reject, complete" },
  { key: "pickups", label: "Pickups", group: "Operations", path: "/admin-pickups", hint: "Schedule and track pickups" },
  { key: "warehouse", label: "Warehouse", group: "Operations", path: "/admin-warehouse", hint: "Stock, locations, refurbishment" },
  { key: "rewards", label: "Rewards", group: "Management", path: "/admin-rewards", hint: "Points, vouchers, redemptions" },
  { key: "notifications", label: "Notifications", group: "Management", path: "/admin-notifications", hint: "Alerts and announcements" },
  { key: "reports", label: "Reports", group: "Management", path: "/admin-reports", hint: "Analytics and exports" },
  { key: "settings", label: "Platform settings", group: "Management", path: "/admin-settings", hint: "Fees, delivery, warehouse rules, rewards" },
];
export const GROUPS = ["Main", "Operations", "Management"];
export const LEVELS = [
  { key: "none", label: "No access" },
  { key: "view", label: "View" },
  { key: "edit", label: "Edit" },
];
const RANK = { none: 0, view: 1, edit: 2 };

const mk = (obj) => {
  const base = Object.fromEntries(MODULES.map((m) => [m.key, "none"]));
  base.dashboard = "view";
  return { ...base, ...obj };
};
const all = (level) => mk(Object.fromEntries(MODULES.filter((m) => !m.locked).map((m) => [m.key, level])));

/* starting points the super admin can pick, then adjust */
export const ROLE_PRESETS = [
  {
    key: "warehouse", label: "Warehouse staff", blurb: "Receives, stores and moves stock, and runs pickups.",
    permissions: mk({ warehouse: "edit", pickups: "edit", donations: "view", products: "view", notifications: "view" }),
  },
  {
    key: "support", label: "Support agent", blurb: "Helps members: accounts, orders and donations.",
    permissions: mk({ users: "edit", remakers: "view", orders: "edit", donations: "view", rewards: "view", notifications: "edit" }),
  },
  {
    key: "catalog", label: "Catalog manager", blurb: "Keeps listings and ReMakers in good order.",
    permissions: mk({ products: "edit", remakers: "edit", users: "view", sell: "view", notifications: "view" }),
  },
  {
    key: "finance", label: "Finance", blurb: "Payments, refunds, rewards and reporting.",
    permissions: mk({ orders: "edit", shop: "view", sell: "view", rewards: "edit", reports: "view", settings: "view", notifications: "view" }),
  },
  {
    key: "viewer", label: "Viewer / auditor", blurb: "Can look at everything, but change nothing.",
    permissions: all("view"),
  },
  {
    key: "custom", label: "Custom", blurb: "Start from nothing and tick exactly what is needed.",
    permissions: mk({}),
  },
];
export const presetOf = (key) => ROLE_PRESETS.find((r) => r.key === key) || ROLE_PRESETS[ROLE_PRESETS.length - 1];
export const ALL_EDIT = all("edit");

/* ---------- seed data ---------- */
const iso = (s) => new Date(s).toISOString();
function seedMembers() {
  const s = getSettings().profile;
  return [
    { id: "ADM-1", name: s.name, email: s.email, phone: s.phone, role: "super", roleLabel: "Super admin", status: "Active", permissions: all("edit"), createdAt: iso("2025-01-05T09:00:00"), createdBy: null, lastActive: iso("2026-10-20T12:55:00"), note: "Owner of this ReOrbit admin account." },
    { id: "ADM-2", name: "Kavya Menon", email: "kavya.menon@reorbit.in", phone: "+91 98250 11122", role: "warehouse", roleLabel: "Warehouse staff", status: "Active", permissions: presetOf("warehouse").permissions, createdAt: iso("2026-08-12T10:15:00"), createdBy: "ADM-1", lastActive: iso("2026-10-20T11:05:00"), note: "Morning shift at the Ahmedabad warehouse." },
    { id: "ADM-3", name: "Rahul Desai", email: "rahul.desai@reorbit.in", phone: "+91 98790 33445", role: "support", roleLabel: "Support agent", status: "Active", permissions: presetOf("support").permissions, createdAt: iso("2026-08-28T14:40:00"), createdBy: "ADM-1", lastActive: iso("2026-10-19T17:30:00"), note: "" },
    { id: "ADM-4", name: "Sneha Kulkarni", email: "sneha.kulkarni@reorbit.in", phone: "+91 98240 55667", role: "finance", roleLabel: "Finance", status: "Active", permissions: presetOf("finance").permissions, createdAt: iso("2026-09-09T09:30:00"), createdBy: "ADM-1", lastActive: iso("2026-10-18T10:10:00"), note: "Handles refunds and monthly reports." },
    { id: "ADM-5", name: "Arjun Pillai", email: "arjun.pillai@reorbit.in", phone: "+91 98111 77889", role: "catalog", roleLabel: "Catalog manager", status: "Invited", permissions: presetOf("catalog").permissions, createdAt: iso("2026-10-17T16:00:00"), createdBy: "ADM-1", lastActive: null, note: "Invite sent, not accepted yet." },
    { id: "ADM-6", name: "Meghna Shah", email: "meghna.shah@reorbit.in", phone: "+91 98980 99001", role: "viewer", roleLabel: "Viewer / auditor", status: "Suspended", permissions: presetOf("viewer").permissions, createdAt: iso("2026-07-02T11:20:00"), createdBy: "ADM-1", lastActive: iso("2026-09-30T15:45:00"), note: "Audit finished. Access paused." },
  ];
}

let state = {
  members: seedMembers(),
  previewId: null,
  log: [
    { id: "l3", at: iso("2026-10-17T16:00:00"), who: "Nikhil Rao", what: "Invited Arjun Pillai as Catalog manager" },
    { id: "l2", at: iso("2026-10-01T09:20:00"), who: "Nikhil Rao", what: "Suspended Meghna Shah" },
    { id: "l1", at: iso("2026-09-09T09:30:00"), who: "Nikhil Rao", what: "Added Sneha Kulkarni as Finance" },
  ],
};
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const snap = () => state;
const emit = () => listeners.forEach((l) => l());
const set = (patch) => { state = { ...state, ...patch }; emit(); };
const superName = () => getSettings().profile.name || "Super admin";
const log = (what) => ({ id: `l${Date.now()}${Math.random().toString(36).slice(2, 5)}`, at: new Date().toISOString(), who: superName(), what });

export const useTeamState = () => useSyncExternalStore(subscribe, snap, snap);

export function useTeam() {
  const st = useTeamState();
  const { profile } = useSettings();
  return useMemo(() => ({
    ...st,
    members: st.members.map((m) => (m.id === "ADM-1" ? { ...m, name: profile.name, email: profile.email, phone: profile.phone } : m)),
  }), [st, profile]);
}

/* ---------- permission helpers ---------- */
export function moduleForPath(pathname) {
  if (pathname.startsWith("/admin-team")) return "team";
  if (pathname.startsWith("/admin-settings") || pathname.startsWith("/admin-profile") || pathname.startsWith("/admin-help")) return null;
  const m = MODULES.find((x) => pathname === x.path || pathname.startsWith(`${x.path}/`));
  return m ? m.key : null;
}
const levelIn = (member, key) => {
  if (!member) return "none";
  if (member.role === "super") return key === "dashboard" ? "view" : "edit";
  return member.permissions?.[key] || "none";
};

/* What the signed-in admin can do. While previewing, this follows the previewed member. */
export function useAccess() {
  const { members, previewId } = useTeam();
  return useMemo(() => {
    const real = members.find((m) => m.role === "super");
    const previewing = previewId ? members.find((m) => m.id === previewId) : null;
    const me = previewing || real;
    const isSuper = me.role === "super";
    const level = (key) => (key === "team" ? (isSuper ? "edit" : "none") : key === "dashboard" ? "view" : levelIn(me, key));
    return {
      me, real, previewing, isSuper,
      level,
      can: (key, need = "view") => RANK[level(key)] >= RANK[need],
      canSee: (key) => RANK[level(key)] > 0,
    };
  }, [members, previewId]);
}

export const levelRank = (l) => RANK[l] || 0;
export function summarize(perms) {
  const mods = MODULES.filter((m) => !m.locked);
  const edit = mods.filter((m) => perms[m.key] === "edit").length;
  const view = mods.filter((m) => perms[m.key] === "view").length;
  return { edit, view, total: edit + view, all: mods.length };
}

/* ---------- actions (super admin only in the UI) ---------- */
let seq = 7;
const tempPassword = () => `Reo-${Math.random().toString(36).slice(2, 6)}${Math.floor(1000 + Math.random() * 9000)}`;

export function emailTaken(email, exceptId) {
  return state.members.some((m) => m.id !== exceptId && m.email.toLowerCase() === email.trim().toLowerCase());
}

/* values: { name, email, phone, role, permissions, note } */
export function createMember(values) {
  const preset = presetOf(values.role);
  const member = {
    id: `ADM-${seq++}`,
    name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim(),
    role: values.role, roleLabel: preset.label, status: "Invited",
    permissions: { ...values.permissions, dashboard: "view" },
    createdAt: new Date().toISOString(), createdBy: "ADM-1", lastActive: null, note: values.note.trim(),
  };
  set({ members: [...state.members, member], log: [log(`Invited ${member.name} as ${member.roleLabel}`), ...state.log].slice(0, 40) });
  return { member, password: tempPassword() };
}
export function updateMember(id, values) {
  const preset = presetOf(values.role);
  let name = "";
  set({
    members: state.members.map((m) => {
      if (m.id !== id) return m;
      name = values.name.trim();
      return { ...m, name, email: values.email.trim(), phone: values.phone.trim(), role: values.role, roleLabel: preset.label, permissions: { ...values.permissions, dashboard: "view" }, note: values.note.trim() };
    }),
    log: [log(`Changed access for ${name || id}`), ...state.log].slice(0, 40),
  });
}
export function setMemberStatus(id, status) {
  const m = state.members.find((x) => x.id === id);
  if (!m || m.role === "super") return;
  set({
    members: state.members.map((x) => (x.id === id ? { ...x, status } : x)),
    previewId: state.previewId === id && status !== "Active" ? null : state.previewId,
    log: [log(`${status === "Suspended" ? "Suspended" : "Re-activated"} ${m.name}`), ...state.log].slice(0, 40),
  });
}
export function resendInvite(id) {
  const m = state.members.find((x) => x.id === id);
  if (!m) return null;
  set({ log: [log(`Resent the invite to ${m.name}`), ...state.log].slice(0, 40) });
  return tempPassword();
}
export function removeMember(id) {
  const m = state.members.find((x) => x.id === id);
  if (!m || m.role === "super") return;
  set({ members: state.members.filter((x) => x.id !== id), previewId: state.previewId === id ? null : state.previewId, log: [log(`Removed ${m.name}`), ...state.log].slice(0, 40) });
}
export const setPreview = (id) => set({ previewId: id });
export const getTeamState = () => state;
