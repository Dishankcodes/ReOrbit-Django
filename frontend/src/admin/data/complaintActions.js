/* =========================================================
   Decisions an admin can take on a complaint.
   Which ones appear depends on what was reported and what
   state it is already in (a suspended account cannot be
   suspended again, a removed listing cannot be removed).
   ========================================================= */
import { canApplyProductAction } from "./productActions";
import { isActive } from "./complaintsStore";

export const COMPLAINT_ACTIONS = {
  start: { key: "start", label: "Start review", short: "Start review", tone: "positive", icon: "spark", fields: "none", title: "Start reviewing this complaint?", body: "It moves to Under review and is assigned to you, so the rest of the team knows someone is on it.", confirmLabel: "Start review", toast: "is now under review" },
  assign: { key: "assign", label: "Assign to…", short: "Assign", tone: "positive", icon: "spark", fields: "assign", title: "Assign this complaint", body: "Choose who should look into it. They will see it in their list.", confirmLabel: "Assign", toast: "was assigned" },
  dismiss: { key: "dismiss", label: "Dismiss complaint", short: "Dismiss", tone: "warning", icon: "undo", fields: "dismiss", title: "Dismiss this complaint?", body: "No rule was broken, so no action is taken. The reporter is told why.", confirmLabel: "Dismiss complaint", toast: "was dismissed" },
  warn: { key: "warn", label: "Send a warning", short: "Warn", tone: "warning", icon: "bell-off", fields: "warn", title: "Send a warning?", body: "The person gets a written warning and the complaint is resolved. Warnings are kept on record, so repeat problems are easy to spot.", confirmLabel: "Send warning", toast: "was resolved with a warning" },
  suspend: { key: "suspend", label: "Suspend account", short: "Suspend", tone: "warning", icon: "pause", fields: "reason", title: "Suspend this account?", body: "They can no longer sign in or trade until you reactivate the account. This changes the account everywhere in the admin.", confirmLabel: "Suspend account", toast: "was resolved: account suspended", reasonHint: "shown in the account history" },
  block: { key: "block", label: "Block account", short: "Block", tone: "danger", icon: "ban", fields: "reason", title: "Block this account?", body: "A block is for serious or repeated violations. The person is locked out until someone unblocks the account.", confirmLabel: "Block account", toast: "was resolved: account blocked", reasonHint: "shown in the account history" },
  removeProduct: { key: "removeProduct", label: "Remove listing", short: "Remove", tone: "danger", icon: "hide", fields: "reason", title: "Remove this listing?", body: "The listing leaves the marketplace straight away and its owner can see your reason.", confirmLabel: "Remove listing", toast: "was resolved: listing removed", reasonHint: "the owner can see this" },
  removeReview: { key: "removeReview", label: "Remove review", short: "Remove", tone: "danger", icon: "hide", fields: "reason", title: "Remove this review?", body: "The review is hidden from the marketplace. The rating no longer counts it.", confirmLabel: "Remove review", toast: "was resolved: review removed", reasonHint: "kept in the complaint history" },
  reopen: { key: "reopen", label: "Reopen complaint", short: "Reopen", tone: "positive", icon: "restore", fields: "none", title: "Reopen this complaint?", body: "It goes back to Open so it can be looked at again. The earlier decision stays in the history.", confirmLabel: "Reopen", toast: "was reopened" },
};

const tooHard = (s) => ["Blocked", "Deleted"].includes(s);

/* Actions that settle the complaint (shown in the “Decide” panel). */
export function getDecisions(c) {
  if (!isActive(c)) return [];
  const A = COMPLAINT_ACTIONS;
  const t = c.target;
  const out = [A.dismiss];
  if (c.type === "User" || c.type === "ReMaker") {
    out.push(A.warn);
    if (t.status === "Active") out.push(A.suspend);
    if (!tooHard(t.status)) out.push(A.block);
  } else if (c.type === "Product") {
    out.push(A.warn);
    const p = t.product;
    if (canApplyProductAction(p, p.type === "item" ? "reject" : "deactivate")) out.push(A.removeProduct);
    if (t.owner.status === "Active") out.push(A.suspend);
  } else {
    out.push(A.warn);
    if (t.live) out.push(A.removeReview);
  }
  return out;
}

/* Everything that can be done to a complaint right now. */
export function getComplaintActions(c) {
  if (c.status === "Resolved" || c.status === "Dismissed") return [COMPLAINT_ACTIONS.reopen];
  const lead = c.status === "Open" ? [COMPLAINT_ACTIONS.start] : [];
  return [...lead, ...getDecisions(c)];
}

/* For bulk use on the list: only things that make sense for many at once. */
export const BULK_ACTIONS = [COMPLAINT_ACTIONS.start, COMPLAINT_ACTIONS.assign, COMPLAINT_ACTIONS.dismiss];
export function canApplyComplaintAction(c, key) {
  if (key === "start") return c.status === "Open";
  if (key === "assign") return isActive(c);
  if (key === "dismiss") return isActive(c);
  if (key === "reopen") return !isActive(c);
  return getComplaintActions(c).some((a) => a.key === key);
}

/* Suggested warning text, so the admin only has to adjust it. */
export function warningTemplate(c) {
  const who = c.type === "Review" ? "reviewer" : c.type === "Product" ? c.target.owner.name : c.target.name;
  const first = String(who).split(" ")[0];
  const topic = {
    "Scam or fraud": "Asking for payment outside ReOrbit or not delivering what was paid for is not allowed.",
    "Abusive behaviour": "Abusive or threatening messages are not allowed on ReOrbit.",
    "Abusive language": "Reviews must stay respectful and describe the product.",
    "Item not as described": "Please make sure photos and descriptions match the item exactly.",
    "Late delivery": "Please ship within the time you promised and reply to buyers promptly.",
    "Rude behaviour": "Please stay polite and helpful when talking to buyers.",
    "Misleading photos or description": "Photos and descriptions must show the real item, with any damage mentioned.",
    "Unrealistic price": "Please price items fairly. Prices that look like manipulation can be removed.",
    "Duplicate listing": "Please list each item only once.",
    "Personal information": "Please do not share phone numbers or addresses in reviews.",
    "No-show or unreliable": "Please be available in the slot you chose for the pickup.",
  }[c.category] || "Please follow the ReOrbit community guidelines.";
  return `Hi ${first}, we received a complaint about “${c.category.toLowerCase()}”. ${topic} Repeated problems can lead to your account being suspended.`;
}

export const DISMISS_CHIPS = ["No rule was broken", "Not enough evidence", "Settled between the two people", "Duplicate of another complaint"];
export const REMOVE_CHIPS = ["Breaks the community guidelines", "Misleading or unsafe", "Reported by several people"];
