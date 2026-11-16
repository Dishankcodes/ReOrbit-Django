/* =========================================================
   Admin › Complaints data layer, backed by the server
   (/api/complaints/admin/).

   People report four kinds of things: a User, a ReMaker, a
   Product listing or a Review. Each report becomes one
   complaint that the team works through:

       Open → Under review → Resolved  (or Dismissed)

   Complaints point at LIVE records, so a decision here really
   changes them (the server does it):
     - Suspend / block → the account status changes everywhere
     - Remove listing  → the listing leaves the marketplace
     - Remove review   → the review is hidden from public pages
   Warnings are sent to the person's inbox and kept on the complaint.

   Priority and the response-time clock are worked out here from the
   category, repeat reports and age, so they stay live as time passes.
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { complaintsApi } from "../../api/complaints";
import { getAccount } from "../../api/session";
import { useTeam } from "./teamStore";

export { TARGET_TYPES, CATEGORIES } from "../../shared/complaintCategories";

const HOUR = 3600000;

/* How serious a category is. Repeat reports raise it further. */
const SEVERITY = {
  "Scam or fraud": "High",
  "Prohibited or unsafe item": "High",
  "Counterfeit or copied work": "High",
  "Abusive behaviour": "High",
  "Personal information": "High",
  "Abusive language": "High",
  "Item not as described": "Medium",
  "Late delivery": "Medium",
  "Poor quality": "Medium",
  "Rude behaviour": "Medium",
  "Fake account": "Medium",
  "Fake or paid review": "Medium",
  "Misleading photos or description": "Medium",
  "Unrealistic price": "Medium",
  "Duplicate listing": "Low",
  "No-show or unreliable": "Medium",
  Spam: "Low",
  "Already sold": "Low",
  "Off-topic": "Low",
  Other: "Low",
};

/* Hours the team has to pick a complaint up. */
export const SLA_HOURS = { High: 24, Medium: 48, Low: 96 };
export const STATUSES = ["Open", "Under_Review", "Resolved", "Dismissed"];
export const isActive = (c) =>
  c.status === "Open" || c.status === "Under_Review";

/* ---------- server data ---------- */
const idle = {
  list: [],
  loaded: false,
  loading: false,
  error: "",
  owner: "",
  targets: null,
  targetsLoading: false,
};
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

export async function loadComplaints(force = false) {
  const owner = me();
  if (state.owner !== owner) state = { ...idle, owner };
  if (state.loading || (state.loaded && !force)) return;
  setState({ loading: true, error: "" });
  try {
    const r = await complaintsApi.list();
    if (state.owner === owner)
      setState({ list: r.results, loaded: true, loading: false });
  } catch (e) {
    /* loaded stays true so a screen without access does not retry in a loop */
    setState({
      loaded: true,
      loading: false,
      error: e.message || "Could not load complaints.",
    });
  }
}

async function loadTargets() {
  if (state.targets || state.targetsLoading) return;
  setState({ targetsLoading: true });
  try {
    setState({ targets: await complaintsApi.targets(), targetsLoading: false });
  } catch {
    setState({ targetsLoading: false });
  }
}

const put = (row) => {
  const has = state.list.some((c) => c.id === row.id);
  setState({
    list: has
      ? state.list.map((c) => (c.id === row.id ? row : c))
      : [row, ...state.list],
    loaded: true,
  });
  return row;
};

if (typeof window !== "undefined")
  window.addEventListener("reorbit:session-ended", () => {
    state = idle;
    listeners.forEach((l) => l());
  });

const useRaw = () => {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    loadComplaints();
  }, []);
  return s.owner === me() ? s : idle;
};

/* ---------- derived: repeat reports, priority and the response clock ---------- */
function build(list, members) {
  const memberOf = (id) => members.find((m) => m.id === id) || null;
  const byTarget = new Map();
  list.forEach((c) => {
    const k = c.target.key;
    byTarget.set(k, [...(byTarget.get(k) || []), c]);
  });
  const now = Date.now();

  return list
    .map((c) => {
      const same = byTarget
        .get(c.target.key)
        .filter((x) => x.id !== c.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const repeatActive = same.filter((x) => x.status !== "Dismissed").length;
      let priority = SEVERITY[c.category] || "Low";
      if (repeatActive >= 2 && isActive(c)) priority = "High";
      else if (repeatActive >= 1 && isActive(c) && priority === "Low")
        priority = "Medium";

      const ageH = (now - new Date(c.createdAt).getTime()) / HOUR;
      const limit = SLA_HOURS[priority];
      const sla = isActive(c)
        ? {
            ageH,
            limit,
            overdue: ageH > limit,
            overdueH: Math.round(ageH - limit),
            leftH: Math.max(0, Math.round(limit - ageH)),
          }
        : null;
      const tookH = c.resolution?.at
        ? Math.max(
            1,
            Math.round(
              (new Date(c.resolution.at) - new Date(c.createdAt)) / HOUR,
            ),
          )
        : null;

      return {
        ...c,
        priority,
        sla,
        tookH,
        assignee: memberOf(c.assigneeId),
        others: same,
        repeat: repeatActive,
        events: [...c.events].sort((a, b) => new Date(a.at) - new Date(b.at)),
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/* ---------- hooks ---------- */
export function useComplaints() {
  const { list } = useRaw();
  const { members } = useTeam();
  return useMemo(() => build(list, members), [list, members]);
}

export function useComplaint(id) {
  const all = useComplaints();
  return useMemo(() => all.find((c) => c.id === id) || null, [all, id]);
}

/* { loading, error, reload } for the list pages */
export function useComplaintsStatus() {
  const s = useRaw();
  return {
    loading: !s.loaded || s.loading,
    error: s.error,
    reload: () => loadComplaints(true),
  };
}

/* Options for the “Log a complaint” form. */
export function useComplaintTargets() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    loadTargets();
  }, []);
  return s.targets || { User: [], ReMaker: [], Product: [], Review: [] };
}

/* How many complaints are being worked on, for badges and the dashboard. */
export function useComplaintCounts() {
  const all = useComplaints();
  return useMemo(
    () => ({
      open: all.filter((c) => c.status === "Open").length,
      active: all.filter(isActive).length,
      high: all.filter((c) => isActive(c) && c.priority === "High").length,
      overdue: all.filter((c) => c.sla?.overdue).length,
    }),
    [all],
  );
}

/* ---------- actions ----------
   Each one waits for the server and rejects with its message. */

/* values: { type, targetId, category, description, reporterName?, reporterRole? } -> the new complaint id */
export async function logComplaint(values) {
  const row = await complaintsApi.log({
    type: values.type,
    targetId: values.targetId,
    category: values.category,
    description: values.description,
    reporterName: values.reporterName,
    reporterRole: values.reporterRole,
  });
  /* the target list changes with reports, so the form refetches next time */
  return put(row).id;
}

export async function addNote(id, text) {
  put(await complaintsApi.addNote(id, text));
}

/* key: start | assign | dismiss | warn | suspend | block | removeProduct | removeReview | reopen
   payload: { reason, message, assigneeId, alsoResolve } (which ones depends on the action).
   Suspending, blocking and removals change the live record, so other screens are told to reload. */
export async function runComplaintAction(c, key, payload = {}) {
  const row = await complaintsApi.act(c.id, key, {
    reason: payload.reason,
    message: payload.message,
    assigneeId: payload.assigneeId,
    alsoResolve: !!payload.alsoResolve,
  });
  put(row);
  /* "also resolve" closes sibling complaints on the server too */
  if (payload.alsoResolve) await loadComplaints(true);
  return row;
}
