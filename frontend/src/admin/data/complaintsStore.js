/* =========================================================
   Admin › Complaints data layer (UI only, in-memory).

   People report four kinds of things: a User, a ReMaker, a
   Product listing or a Review. Each report becomes one
   complaint that the team works through:

       Open → Under review → Resolved  (or Dismissed)

   Complaints point at LIVE records (users, ReMakers, products),
   so taking an action here really changes them:
     - Suspend / block → the account status changes everywhere
     - Remove listing  → the product leaves the marketplace
   Warnings and removed reviews are kept here.

   Backend later: replace with API calls to a Reports table
   (report_id, target_type, target_id, reporter_id, category,
   description, status, assigned_to, resolution).
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { useUsers, changeUserStatus } from "./usersStore";
import { useRemakers, changeRemakerStatus } from "./remakersStore";
import { useProducts, runProductAction } from "./productsStore";
import { PRODUCT_ACTION_LIST } from "./productActions";
import { useTeam } from "./teamStore";
import { DEMO_TODAY } from "../utils/format";

const HOUR = 3600000;
const ago = (h) => new Date(DEMO_TODAY.getTime() - h * HOUR).toISOString();

/* ---------- what can be reported, and why ---------- */
export const TARGET_TYPES = ["User", "ReMaker", "Product", "Review"];

export const CATEGORIES = {
  User: ["Scam or fraud", "Abusive behaviour", "Fake account", "Spam", "No-show or unreliable", "Other"],
  ReMaker: ["Item not as described", "Late delivery", "Poor quality", "Scam or fraud", "Rude behaviour", "Counterfeit or copied work", "Other"],
  Product: ["Misleading photos or description", "Unrealistic price", "Duplicate listing", "Prohibited or unsafe item", "Counterfeit or copied work", "Already sold", "Other"],
  Review: ["Fake or paid review", "Abusive language", "Personal information", "Off-topic", "Other"],
};

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
export const isActive = (c) => c.status === "Open" || c.status === "Under_Review";

/* ---------- seeded complaints ----------
   `pick` is a position in the pool of that type, so targets always exist.
   `pool` narrows the pool (e.g. accounts that are already suspended). */
const SPECS = [
  { n: 1026, type: "ReMaker", pick: 4, cat: "Scam or fraud", text: "Took payment for a custom bookshelf, said it was shipped, and the tracking number does not exist. Stopped replying to my messages.", by: ["Aarav Patel", "User"], ago: 2, status: "Open" },
  { n: 1025, type: "User", pick: 18, cat: "Abusive behaviour", text: "Sent abusive messages in the chat after I declined a lower price for the lamp.", by: ["Meera Iyer", "User"], ago: 12, status: "Open" },
  { n: 1024, type: "Product", pick: 36, cat: "Duplicate listing", text: "The same sofa is listed three times with different prices.", by: ["Nisha Rao", "User"], ago: 44, status: "Open" },
  { n: 1023, type: "Product", pick: 14, cat: "Prohibited or unsafe item", text: "An electrical item with exposed wires is being sold as ‘working’. It looks unsafe to use.", by: ["Anaya Singh", "User"], ago: 3, status: "Open" },
  { n: 1022, type: "Review", pick: 13, cat: "Personal information", text: "The review shares the seller’s phone number and home area.", by: ["Priya Shah", "ReMaker"], ago: 9, status: "Open" },
  { n: 1021, type: "User", pick: 3, cat: "Scam or fraud", text: "Asked me to send ₹1,500 in advance on UPI for a chair, then stopped replying and blocked me.", by: ["Dev Joshi", "User"], ago: 5, status: "Open" },
  { n: 1020, type: "Product", pick: 9, cat: "Unrealistic price", text: "A used chair is listed at ₹95,000. This looks like a price-fixing attempt.", by: ["Dev Joshi", "User"], ago: 20, status: "Open" },
  { n: 1019, type: "Product", pick: 5, cat: "Misleading photos or description", text: "The photos show solid wood but the description says engineered wood, and the legs are visibly damaged.", by: ["Nisha Rao", "User"], ago: 8, status: "Open" },
  { n: 1018, type: "Review", pick: 4, cat: "Fake or paid review", text: "Several five-star reviews were posted by accounts created on the same day.", by: ["Kabir Verma", "ReMaker"], ago: 15, status: "Open" },
  { n: 1017, type: "User", pick: 3, cat: "Scam or fraud", text: "This person also asked me for an advance payment outside ReOrbit for a table.", by: ["Ishita Nair", "User"], ago: 30, status: "Open" },
  { n: 1016, type: "ReMaker", pick: 6, cat: "Counterfeit or copied work", text: "This product copies another ReMaker’s design almost exactly, down to the stitching pattern.", by: ["Priya Shah", "ReMaker"], ago: 40, status: "Open" },
  { n: 1015, type: "ReMaker", pick: 2, cat: "Late delivery", text: "Promised delivery in 5 days. Still not shipped after 12 days and my messages are unanswered.", by: ["Nisha Rao", "User"], ago: 100, status: "Open" },
  { n: 1014, type: "Review", pick: 7, cat: "Abusive language", text: "The review uses abusive language about the seller instead of describing the product.", by: ["Rohan Mehta", "ReMaker"], ago: 60, status: "Open" },
  { n: 1013, type: "Product", pick: 14, cat: "Duplicate listing", text: "This item is already listed by the same person under another title.", by: ["Meera Iyer", "User"], ago: 26, status: "Under_Review", assignee: "ADM-3" },
  { n: 1012, type: "ReMaker", pick: 2, cat: "Item not as described", text: "The upcycled bag arrived in a different fabric from the photos and the zip is loose.", by: ["Aarav Patel", "User"], ago: 50, status: "Under_Review", assignee: "ADM-1" },
  { n: 1011, type: "User", pick: 3, cat: "Abusive behaviour", text: "Threatened me in messages when I refused to lower the price.", by: ["Kabir Verma", "User"], ago: 70, status: "Under_Review", assignee: "ADM-3" },
  { n: 1010, type: "User", pick: 8, cat: "Spam", text: "Keeps sending the same promotional message to every seller.", by: ["Ishita Nair", "User"], ago: 120, status: "Under_Review", assignee: "ADM-3" },
  { n: 1009, type: "User", pick: 15, cat: "Fake account", text: "This profile uses someone else’s photo and the account is two days old.", by: ["Dev Joshi", "User"], ago: 90, status: "Dismissed", took: 14, res: { action: "dismissed", note: "Checked the account. The photo is the person’s own and there is no sign of misuse." } },
  { n: 1008, type: "Review", pick: 12, cat: "Fake or paid review", text: "I think this review was written by the seller’s friend.", by: ["Priya Shah", "ReMaker"], ago: 220, status: "Dismissed", took: 20, res: { action: "dismissed", note: "Not enough evidence. The reviewer has a verified purchase." } },
  { n: 1007, type: "Product", pick: 20, cat: "Already sold", text: "The listing still shows this item as available, but the seller says it was sold last week.", by: ["Anaya Singh", "User"], ago: 150, status: "Dismissed", took: 8, res: { action: "dismissed", note: "The item was sold and restocked. The listing is correct." } },
  { n: 1006, type: "ReMaker", pick: 9, cat: "Rude behaviour", text: "The ReMaker was dismissive and rude when I asked about a repair.", by: ["Meera Iyer", "User"], ago: 260, status: "Resolved", took: 30, res: { action: "warned", note: "A written warning about respectful communication was sent to the ReMaker." } },
  { n: 1005, type: "User", pick: 12, cat: "No-show or unreliable", text: "Was not home for the scheduled pickup twice in a row.", by: ["Pickup team · Ahmedabad", "Staff"], ago: 200, status: "Resolved", took: 22, res: { action: "warned", note: "A reminder about pickup slots was sent to the user." } },
  { n: 1004, type: "Review", pick: 1, cat: "Off-topic", text: "This review is about the courier, not the product.", by: ["Kabir Verma", "ReMaker"], ago: 300, status: "Resolved", took: 40, res: { action: "removedReview", note: "Removed because it did not describe the product." } },
  { n: 1003, type: "Product", pick: 0, pool: "off", cat: "Misleading photos or description", text: "The photos were taken from another website and do not show the actual item.", by: ["Nisha Rao", "User"], ago: 330, status: "Resolved", took: 18, res: { action: "removedProduct", note: "Listing taken down. The photos were not of the real item." } },
  { n: 1002, type: "ReMaker", pick: 0, pool: "Suspended", cat: "Poor quality", text: "Three buyers reported the same finishing problems on their orders.", by: ["Aarav Patel", "User"], ago: 380, status: "Resolved", took: 52, res: { action: "suspended", note: "Account suspended until the quality issue is fixed." } },
  { n: 1001, type: "User", pick: 0, pool: "Suspended", cat: "Scam or fraud", text: "Took advance payments for items and never delivered them.", by: ["Dev Joshi", "User"], ago: 400, status: "Resolved", took: 26, res: { action: "suspended", note: "Account suspended while the payments are investigated." } },
];

/* ---------- overlay: everything the team changes this session ---------- */
let overlay = {};   // { [id]: { status, assignee, events, notes, resolution } }
let custom = [];    // complaints logged by hand
let warnings = {};  // { [targetKey]: [{ at, message, complaintId, by }] }
let hiddenReviews = new Set();
let tick = 1;
let seq = 1027;
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const snap = () => overlay;
const emit = () => { overlay = { ...overlay }; listeners.forEach((l) => l()); };
const useSnap = () => useSyncExternalStore(subscribe, snap, snap);
/* every action gets a slightly later time so the history stays in order */
const stamp = () => new Date(DEMO_TODAY.getTime() + (tick++) * 60000).toISOString();

const patch = (id, fn) => { overlay = { ...overlay, [id]: fn(overlay[id] || {}) }; };
const ev = (label, detail, tone = "neutral") => ({ id: `e${Date.now()}${Math.random().toString(36).slice(2, 6)}`, label, detail, tone, at: stamp() });

/* ---------- target pools (only used for seeding and the “log” form) ---------- */
function pools(users, remakers, products) {
  const byId = (a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  const reviews = remakers
    .filter((r) => r.status !== "Deleted")
    .flatMap((r) => r.reviews.map((rv) => ({ ...rv, id: `${r.remaker_id}:${rv.review_id}`, remaker: r })))
    .sort(byId);
  return {
    User: users.filter((u) => u.status !== "Deleted").map((u) => ({ id: u.user_id, rec: u })).sort(byId),
    ReMaker: remakers.filter((r) => r.status !== "Deleted").map((r) => ({ id: r.remaker_id, rec: r })).sort(byId),
    Product: products.map((p) => ({ id: p.id, rec: p })).sort(byId),
    Review: reviews.map((r) => ({ id: r.id, rec: r })),
  };
}

function pickTarget(spec, P) {
  let list = P[spec.type];
  if (spec.pool === "Suspended") list = list.filter((x) => ["Suspended", "Blocked"].includes(x.rec.status));
  else if (spec.pool === "off") list = list.filter((x) => x.rec.state !== "live");
  else if (spec.type === "Product") list = list.filter((x) => x.rec.state === "live");
  return list.length ? list[spec.pick % list.length].id : null;
}

/* ---------- turn an id into what the screens need ---------- */
function describe(type, id, P) {
  const found = P[type].find((x) => x.id === id);
  if (!found) return null;
  const r = found.rec;
  if (type === "User") {
    return { key: `User:${id}`, type, id, name: r.full_name, image: r.profile.profile_image, path: `/admin-users/${id}`, sub: `${r.profile.city} · User`, status: r.status, email: r.email, since: r.created_at, city: r.profile.city, live: true };
  }
  if (type === "ReMaker") {
    return { key: `ReMaker:${id}`, type, id, name: r.full_name, image: r.profile.profile_image, path: `/admin-remakers/${id}`, sub: `${r.profile.city} · @${r.username}`, status: r.status, email: r.email, since: r.created_at, city: r.profile.city, rating: r.rating, live: true };
  }
  if (type === "Product") {
    const live = r.state === "live";
    return {
      key: `Product:${id}`, type, id, name: r.title, image: r.image, path: `/admin-products/${id}`, sub: `${r.owner.name} · ${r.owner.role}`,
      status: live ? "Live" : r.state === "pending" ? "Pending review" : "Not live", live, price: r.price, category: r.category, product: r,
      owner: { id: r.owner.id, name: r.owner.name, role: r.owner.role, path: r.owner.path, image: r.owner.image, status: r.owner.status },
    };
  }
  const hidden = hiddenReviews.has(id);
  return {
    key: `Review:${id}`, type, id, name: `${r.reviewer}’s review`, image: null, path: `/admin-remakers/${r.remaker.remaker_id}`,
    sub: `On ${r.product} · ${r.rating}★`, status: hidden ? "Removed" : "Visible", live: !hidden, rating: r.rating, text: r.text, reviewer: r.reviewer, onProduct: r.product, at: r.created_at,
    owner: { id: r.remaker.remaker_id, name: r.remaker.full_name, role: "ReMaker", path: `/admin-remakers/${r.remaker.remaker_id}`, image: r.remaker.profile.profile_image, status: r.remaker.status },
  };
}

/* ---------- build the full list ---------- */
function build(users, remakers, products, members, ov, cust, warn) {
  const P = pools(users, remakers, products);
  const memberOf = (id) => members.find((m) => m.id === id) || null;

  const base = [];
  SPECS.forEach((s) => {
    const id = pickTarget(s, P);
    if (!id) return;
    const createdAt = ago(s.ago);
    const resolvedAt = s.took ? new Date(new Date(createdAt).getTime() + s.took * HOUR).toISOString() : null;
    const events = [{ id: `${s.n}-f`, label: "Complaint filed", detail: `Reported by ${s.by[0]}`, tone: "wait", at: createdAt }];
    if (s.assignee) events.push({ id: `${s.n}-a`, label: s.status === "Under_Review" ? "Review started" : "Assigned", detail: `Picked up by ${memberOf(s.assignee)?.name || "the team"}`, tone: "info", at: new Date(new Date(createdAt).getTime() + 3 * HOUR).toISOString() });
    if (s.res) events.push({ id: `${s.n}-r`, label: s.status === "Dismissed" ? "Dismissed" : "Resolved", detail: s.res.note, tone: s.status === "Dismissed" ? "neutral" : "good", at: resolvedAt });
    base.push({
      id: `CP-${s.n}`, type: s.type, targetId: id, category: s.cat, description: s.text, reporter: { name: s.by[0], role: s.by[1] },
      createdAt, status: s.status, assigneeId: s.assignee || null, events, notes: [],
      resolution: s.res ? { ...s.res, by: "Admin team", at: resolvedAt } : null,
    });
  });
  cust.forEach((c) => base.push({ ...c, events: c.events || [], notes: [] }));

  /* apply this session's changes */
  const merged = base.map((c) => {
    const o = ov[c.id];
    if (!o) return c;
    return {
      ...c,
      status: o.status || c.status,
      assigneeId: o.assigneeId !== undefined ? o.assigneeId : c.assigneeId,
      resolution: o.resolution !== undefined ? o.resolution : c.resolution,
      events: [...c.events, ...(o.events || [])],
      notes: [...c.notes, ...(o.notes || [])],
    };
  });

  /* join live targets */
  const withTarget = merged.map((c) => ({ ...c, target: describe(c.type, c.targetId, P) })).filter((c) => c.target);

  /* repeat reports + priority + response time */
  const byTarget = new Map();
  withTarget.forEach((c) => { const k = c.target.key; byTarget.set(k, [...(byTarget.get(k) || []), c]); });

  return withTarget.map((c) => {
    const same = byTarget.get(c.target.key).filter((x) => x.id !== c.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const repeatActive = same.filter((x) => x.status !== "Dismissed").length;
    let priority = SEVERITY[c.category] || "Low";
    if (repeatActive >= 2 && isActive(c)) priority = "High";
    else if (repeatActive >= 1 && isActive(c) && priority === "Low") priority = "Medium";

    const ageH = (DEMO_TODAY.getTime() - new Date(c.createdAt).getTime()) / HOUR;
    const limit = SLA_HOURS[priority];
    const sla = isActive(c) ? { ageH, limit, overdue: ageH > limit, overdueH: Math.round(ageH - limit), leftH: Math.max(0, Math.round(limit - ageH)) } : null;
    const tookH = c.resolution?.at ? Math.max(1, Math.round((new Date(c.resolution.at) - new Date(c.createdAt)) / HOUR)) : null;

    return {
      ...c, priority, sla, tookH,
      assignee: memberOf(c.assigneeId),
      others: same, repeat: repeatActive,
      warnings: warn[c.target.key] || [],
      events: [...c.events].sort((a, b) => new Date(a.at) - new Date(b.at)),
    };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/* ---------- hooks ---------- */
export function useComplaints() {
  const users = useUsers();
  const remakers = useRemakers();
  const products = useProducts();
  const { members } = useTeam();
  const ov = useSnap();
  return useMemo(() => build(users, remakers, products, members, ov, custom, warnings), [users, remakers, products, members, ov]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useComplaint(id) {
  const all = useComplaints();
  return useMemo(() => all.find((c) => c.id === id) || null, [all, id]);
}

/* Options for the “Log a complaint” form. */
export function useComplaintTargets() {
  const users = useUsers();
  const remakers = useRemakers();
  const products = useProducts();
  return useMemo(() => {
    const P = pools(users, remakers, products);
    return {
      User: P.User.map((x) => ({ id: x.id, label: `${x.rec.full_name} · ${x.rec.profile.city}` })),
      ReMaker: P.ReMaker.map((x) => ({ id: x.id, label: `${x.rec.full_name} · @${x.rec.username}` })),
      Product: P.Product.map((x) => ({ id: x.id, label: `${x.rec.title} · ${x.rec.owner.name}` })),
      Review: P.Review.map((x) => ({ id: x.id, label: `${x.rec.reviewer} on ${x.rec.product} (${x.rec.rating}★)` })),
    };
  }, [users, remakers, products]);
}

/* How many complaints are being worked on, for badges and the dashboard. */
export function useComplaintCounts() {
  const all = useComplaints();
  return useMemo(() => ({
    open: all.filter((c) => c.status === "Open").length,
    active: all.filter(isActive).length,
    high: all.filter((c) => isActive(c) && c.priority === "High").length,
    overdue: all.filter((c) => c.sla?.overdue).length,
  }), [all]);
}

/* ---------- actions ---------- */
export function logComplaint({ type, targetId, category, description, reporterName, reporterRole, by }) {
  const id = `CP-${seq++}`;
  const createdAt = stamp();
  custom = [...custom, {
    id, type, targetId, category, description, reporter: { name: reporterName || "ReOrbit team", role: reporterRole || "Staff" },
    createdAt, status: "Open", assigneeId: null, resolution: null,
    events: [{ id: `${id}-f`, label: "Complaint logged", detail: `Logged by ${by} on behalf of ${reporterName || "the team"}`, tone: "wait", at: createdAt }],
  }];
  emit();
  return id;
}

export function addNote(id, text, by) {
  patch(id, (o) => ({ ...o, notes: [...(o.notes || []), { id: `n${Date.now()}`, text, by, at: stamp() }] }));
  emit();
}

const closeOne = (c, status, resolution, label, detail, tone, by) => {
  const at = stamp();
  patch(c.id, (o) => ({
    ...o, status, resolution: { ...resolution, by, at },
    events: [...(o.events || []), { id: `e${Date.now()}${c.id}`, label, detail, tone, at }],
  }));
};

/* payload: { reason, message, assigneeId, alsoResolve, by }  (all optional by action) */
export function runComplaintAction(c, key, payload = {}, all = []) {
  const by = payload.by || "Admin";
  const reason = (payload.reason || "").trim();
  const message = (payload.message || "").trim();

  const finish = (status, resolution, label, detail, tone) => {
    closeOne(c, status, resolution, label, detail, tone, by);
    if (payload.alsoResolve) {
      all.filter((x) => x.id !== c.id && x.target.key === c.target.key && isActive(x)).forEach((x) =>
        closeOne(x, "Resolved", { action: resolution.action, note: `Handled together with ${c.id}. ${resolution.note}` }, "Resolved", `Handled together with ${c.id}`, "good", by));
    }
  };

  switch (key) {
    case "start":
      patch(c.id, (o) => ({ ...o, status: "Under_Review", assigneeId: payload.assigneeId || c.assigneeId || "ADM-1", events: [...(o.events || []), ev("Review started", `${by} started looking into this`, "info")] }));
      break;
    case "assign":
      patch(c.id, (o) => ({ ...o, assigneeId: payload.assigneeId, events: [...(o.events || []), ev("Assigned", payload.assigneeName ? `Assigned to ${payload.assigneeName}` : "Assignee removed", "info")] }));
      break;
    case "reopen":
      patch(c.id, (o) => ({ ...o, status: "Open", resolution: null, events: [...(o.events || []), ev("Reopened", `${by} reopened this complaint`, "wait")] }));
      break;
    case "dismiss":
      finish("Dismissed", { action: "dismissed", note: reason }, "Dismissed", reason, "neutral");
      break;
    case "warn":
      warnings = { ...warnings, [c.target.key]: [...(warnings[c.target.key] || []), { at: stamp(), message, complaintId: c.id, by }] };
      finish("Resolved", { action: "warned", note: `Warning sent: “${message}”` }, "Warning sent", message, "wait");
      break;
    case "suspend":
    case "block": {
      const next = key === "suspend" ? "Suspended" : "Blocked";
      const owner = c.type === "Product" ? c.target.owner : c.target;
      if (c.type === "ReMaker" || owner.role === "ReMaker") changeRemakerStatus(owner.id, next, reason);
      else changeUserStatus(owner.id, next, reason);
      finish("Resolved", { action: key === "suspend" ? "suspended" : "blocked", note: `${owner.name} ${next === "Suspended" ? "suspended" : "blocked"}. ${reason}` }, next === "Suspended" ? "Account suspended" : "Account blocked", reason, "bad");
      break;
    }
    case "removeProduct": {
      const p = c.target.product;
      const action = p.type === "item" ? PRODUCT_ACTION_LIST.reject : PRODUCT_ACTION_LIST.deactivate;
      runProductAction(p, action, reason);
      finish("Resolved", { action: "removedProduct", note: `Listing taken down. ${reason}` }, "Listing removed", reason, "bad");
      break;
    }
    case "removeReview":
      hiddenReviews = new Set(hiddenReviews).add(c.target.id);
      finish("Resolved", { action: "removedReview", note: `Review removed. ${reason}` }, "Review removed", reason, "bad");
      break;
    default:
      break;
  }
  emit();
}

