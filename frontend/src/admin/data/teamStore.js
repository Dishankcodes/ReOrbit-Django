/* Team, roles and permissions, backed by /api/admins/team/.

   - Only a Super Admin can add admins and decide what each may see or change.
   - Every module has one of three levels per person: none, view, edit.
   - "Preview as" lets the Super Admin use the panel exactly as a sub-admin
     would see it. It is a view only; the server enforces the real access.
   - Speed: the signed-in admin's own access comes from the account saved at
     sign-in, so menus and pages render at once. The team list is cached for
     the tab and refreshed quietly in the background.

   The backend checks every request; hiding buttons here is only convenience. */
import { useMemo, useSyncExternalStore } from "react";
import {
  ACCOUNT_UPDATED_EVENT,
  getAccount,
  updateAccount,
} from "../../api/session";
import {
  createTeamMember,
  fetchMe,
  fetchTeam,
  fetchTeamActivity,
  removeTeamMember,
  resetTeamMemberPassword,
  setTeamMemberStatus,
  updateTeamMember,
} from "../../api/team";

/* ---------- modules that can be granted ---------- */
export const MODULES = [
  {
    key: "dashboard",
    label: "Dashboard",
    group: "Main",
    path: "/admin-dashboard",
    locked: true,
    hint: "Overview for every admin (always view only)",
  },
  {
    key: "users",
    label: "Users",
    group: "Main",
    path: "/admin-users",
    hint: "Accounts, moderation, blocking",
  },
  {
    key: "remakers",
    label: "ReMakers",
    group: "Main",
    path: "/admin-remakers",
    hint: "Accounts, portfolios, moderation",
  },
  {
    key: "products",
    label: "Products",
    group: "Main",
    path: "/admin-products",
    hint: "Review and manage listings",
  },
  {
    key: "orders",
    label: "Orders",
    group: "Main",
    path: "/admin-orders",
    hint: "Payments, status, refunds",
  },
  {
    key: "shop",
    label: "Buy Products",
    group: "Main",
    path: "/admin-shop",
    hint: "Buy as the platform",
  },
  {
    key: "sell",
    label: "Sell Products",
    group: "Main",
    path: "/admin-sell",
    hint: "List and sell platform stock",
  },
  {
    key: "donations",
    label: "Donations",
    group: "Operations",
    path: "/admin-donations",
    hint: "Accept, reject, complete",
  },
  {
    key: "pickups",
    label: "Pickups",
    group: "Operations",
    path: "/admin-pickups",
    hint: "Schedule and track pickups",
  },
  {
    key: "complaints",
    label: "Complaints",
    group: "Operations",
    path: "/admin-complaints",
    hint: "Reports about users, ReMakers, listings and reviews",
  },
  {
    key: "support",
    label: "Support",
    group: "Operations",
    path: "/admin-support",
    hint: "Help tickets from users and ReMakers",
  },
  {
    key: "warehouse",
    label: "Warehouse",
    group: "Operations",
    path: "/admin-warehouse",
    hint: "Stock, locations, refurbishment",
  },
  {
    key: "rewards",
    label: "Rewards",
    group: "Management",
    path: "/admin-rewards",
    hint: "Points, vouchers, redemptions",
  },
  {
    key: "notifications",
    label: "Notifications",
    group: "Management",
    path: "/admin-notifications",
    hint: "Alerts and announcements",
  },
  {
    key: "content",
    label: "Content",
    group: "Management",
    path: "/admin-content",
    hint: "Categories, banners, FAQs and policy text",
  },
  {
    key: "earnings",
    label: "Earnings",
    group: "Management",
    path: "/admin-earnings",
    hint: "Platform fees, sales income and cash flow",
  },
  {
    key: "reports",
    label: "Reports",
    group: "Management",
    path: "/admin-reports",
    hint: "Analytics and exports",
  },
  {
    key: "settings",
    label: "Platform settings",
    group: "Management",
    path: "/admin-settings",
    hint: "Fees, delivery, warehouse rules, rewards",
  },
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
const all = (level) =>
  mk(
    Object.fromEntries(
      MODULES.filter((m) => !m.locked).map((m) => [m.key, level]),
    ),
  );

/* starting points the super admin can pick, then adjust */
export const ROLE_PRESETS = [
  {
    key: "warehouse",
    label: "Warehouse staff",
    blurb: "Receives, stores and moves stock, and runs pickups.",
    permissions: mk({
      warehouse: "edit",
      pickups: "edit",
      donations: "view",
      products: "view",
      notifications: "view",
    }),
  },
  {
    key: "support",
    label: "Support agent",
    blurb: "Helps members: accounts, orders and donations.",
    permissions: mk({
      users: "edit",
      remakers: "view",
      orders: "edit",
      donations: "view",
      complaints: "edit",
      support: "edit",
      rewards: "view",
      content: "view",
      notifications: "edit",
    }),
  },
  {
    key: "catalog",
    label: "Catalog manager",
    blurb: "Keeps listings and ReMakers in good order.",
    permissions: mk({
      products: "edit",
      remakers: "edit",
      users: "view",
      sell: "view",
      complaints: "view",
      content: "edit",
      notifications: "view",
    }),
  },
  {
    key: "finance",
    label: "Finance",
    blurb: "Payments, refunds, rewards, earnings and reporting.",
    permissions: mk({
      orders: "edit",
      shop: "view",
      sell: "view",
      rewards: "edit",
      earnings: "view",
      reports: "view",
      settings: "view",
      notifications: "view",
    }),
  },
  {
    key: "viewer",
    label: "Viewer / auditor",
    blurb: "Can look at everything, but change nothing.",
    permissions: all("view"),
  },
  {
    key: "custom",
    label: "Custom",
    blurb: "Start from nothing and tick exactly what is needed.",
    permissions: mk({}),
  },
];
export const presetOf = (key) =>
  ROLE_PRESETS.find((r) => r.key === key) ||
  ROLE_PRESETS[ROLE_PRESETS.length - 1];
export const ALL_EDIT = all("edit");

/* ---------- shape of a member in the UI ---------- */
const labelOf = (key) => (ROLE_PRESETS.find((r) => r.key === key) || ROLE_PRESETS.at(-1)).label;

function fromApi(a) {
  if (!a) return null;
  const isSuper = a.permission_level === "Super_Admin";
  const role = isSuper ? "super" : a.role_key || "custom";
  const status =
    a.status === "Blocked" ? "Suspended" : a.invited && !isSuper ? "Invited" : "Active";
  return {
    id: a.public_id,
    name: a.full_name,
    email: a.email,
    phone: a.phone || "",
    role,
    roleLabel: isSuper ? "Super admin" : labelOf(role),
    status,
    permissions: { ...a.modules },
    createdAt: a.created_at,
    createdBy: a.created_by || null,
    lastActive: a.last_login_at || null,
    note: a.note || "",
  };
}

const CACHE_KEY = "reorbit_admin_team";
const readCache = () => {
  try {
    return JSON.parse(window.sessionStorage.getItem(CACHE_KEY) || "null");
  } catch {
    return null;
  }
};
const writeCache = (members, log) => {
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ members, log }));
  } catch {
    /* storage blocked: the page still works */
  }
};

const cached = readCache();
let state = {
  me: fromApi(getAccount("admin")),
  members: cached?.members || [],
  log: cached?.log || [],
  loaded: !!cached,
  error: "",
  previewId: null,
};
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snap = () => state;
const emit = () => listeners.forEach((l) => l());
const set = (patch) => {
  state = { ...state, ...patch };
  emit();
};

/* keep "me" in step with the saved account (sign-in, profile edit, access refresh) */
if (typeof window !== "undefined") {
  window.addEventListener(ACCOUNT_UPDATED_EVENT, () =>
    set({ me: fromApi(getAccount("admin")) }),
  );
}

export const useTeamState = () => useSyncExternalStore(subscribe, snap, snap);

/* members: the whole team for a Super Admin, otherwise just the signed-in admin */
export function useTeam() {
  const st = useTeamState();
  return useMemo(() => {
    const members = st.members.length ? st.members : st.me ? [st.me] : [];
    return { ...st, members };
  }, [st]);
}

/* ---------- loading ---------- */
let teamInFlight = null;
export function loadTeam({ force = false } = {}) {
  if (teamInFlight && !force) return teamInFlight;
  teamInFlight = (async () => {
    try {
      const [rows, log] = await Promise.all([fetchTeam(), fetchTeamActivity()]);
      const members = rows.map(fromApi);
      set({ members, log, loaded: true, error: "" });
      writeCache(members, log);
    } catch (e) {
      set({ error: e.message || "Could not load the team.", loaded: state.loaded });
    } finally {
      teamInFlight = null;
    }
  })();
  return teamInFlight;
}

/* Re-read the signed-in admin so changes the Super Admin made to their
   access show up without signing in again. */
let meChecked = false;
export function refreshMyAccess() {
  if (meChecked) return;
  meChecked = true;
  fetchMe()
    .then((admin) => updateAccount("admin", { ...(getAccount("admin") || {}), ...admin }))
    .catch(() => {
      meChecked = false;
    });
}

/* ---------- permission helpers ---------- */
export function moduleForPath(pathname) {
  if (pathname.startsWith("/admin-team")) return "team";
  if (
    pathname.startsWith("/admin-settings") ||
    pathname.startsWith("/admin-profile") ||
    pathname.startsWith("/admin-help")
  )
    return null;
  const m = MODULES.find(
    (x) => pathname === x.path || pathname.startsWith(`${x.path}/`),
  );
  return m ? m.key : null;
}
const levelIn = (member, key) => {
  if (!member) return "none";
  if (member.role === "super") return key === "dashboard" ? "view" : "edit";
  return member.permissions?.[key] || "none";
};

/* What the signed-in admin can do. While previewing, this follows the previewed member. */
export function useAccess() {
  const { me: real, members, previewId } = useTeam();
  return useMemo(() => {
    const previewing = previewId
      ? members.find((m) => m.id === previewId) || null
      : null;
    const me = previewing || real || { name: "Admin", role: "custom", roleLabel: "", permissions: {} };
    const isSuper = me.role === "super";
    const level = (key) =>
      key === "team"
        ? isSuper
          ? "edit"
          : "none"
        : key === "dashboard"
          ? "view"
          : levelIn(me, key);
    return {
      me,
      real,
      previewing,
      isSuper,
      level,
      can: (key, need = "view") => RANK[level(key)] >= RANK[need],
      canSee: (key) => RANK[level(key)] > 0,
    };
  }, [real, members, previewId]);
}

export const levelRank = (l) => RANK[l] || 0;
export function summarize(perms) {
  const mods = MODULES.filter((m) => !m.locked);
  const edit = mods.filter((m) => perms[m.key] === "edit").length;
  const view = mods.filter((m) => perms[m.key] === "view").length;
  return { edit, view, total: edit + view, all: mods.length };
}

/* ---------- actions (Super Admin only; the server refuses anyone else) ---------- */
export function emailTaken(email, exceptId) {
  return state.members.some(
    (m) =>
      m.id !== exceptId && m.email.toLowerCase() === email.trim().toLowerCase(),
  );
}

const payloadOf = (values) => ({
  full_name: values.name.trim(),
  email: values.email.trim(),
  phone: values.phone.trim(),
  note: (values.note || "").trim(),
  role_key: values.role,
  modules: { ...values.permissions, dashboard: "view" },
});

const replace = (member) => {
  const members = state.members.some((m) => m.id === member.id)
    ? state.members.map((m) => (m.id === member.id ? member : m))
    : [...state.members, member];
  set({ members });
  writeCache(members, state.log);
};
const refreshLog = () =>
  fetchTeamActivity()
    .then((log) => {
      set({ log });
      writeCache(state.members, log);
    })
    .catch(() => {});

/* values: { name, email, phone, role, permissions, note }
   -> { member, password }. Throws an Error with `.errors` (field messages) on failure. */
export async function createMember(values) {
  const data = await createTeamMember(payloadOf(values));
  const member = fromApi(data.member);
  replace(member);
  refreshLog();
  return { member, password: data.temporary_password };
}
export async function updateMember(id, values) {
  const member = fromApi(await updateTeamMember(id, payloadOf(values)));
  replace(member);
  refreshLog();
  return member;
}
export async function setMemberStatus(id, status) {
  const member = fromApi(
    await setTeamMemberStatus(id, status === "Suspended" ? "Blocked" : "Active"),
  );
  replace(member);
  if (state.previewId === id && status !== "Active") set({ previewId: null });
  refreshLog();
  return member;
}
export async function resendInvite(id) {
  const password = await resetTeamMemberPassword(id);
  refreshLog();
  return password;
}
export async function removeMember(id) {
  await removeTeamMember(id);
  const members = state.members.filter((x) => x.id !== id);
  set({ members, previewId: state.previewId === id ? null : state.previewId });
  writeCache(members, state.log);
  refreshLog();
}
export const setPreview = (id) => set({ previewId: id });
export const getTeamState = () => state;
