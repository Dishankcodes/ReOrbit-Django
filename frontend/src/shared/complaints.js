/* =========================================================
   Shared › File a complaint.
   "Report" buttons in the User and ReMaker apps call this. The
   complaint lands in Admin › Complaints, in the same queue as the
   ones the team logs by hand.

   `type` is what is being reported: "User", "ReMaker", "Product"
   or "Review". The reported person or listing is sent as a small
   snapshot (name, picture, owner), because the member apps and
   the admin do not share ids yet. Backend later: send the id.
   ========================================================= */

import { useCallback } from "react";
import { logComplaint, CATEGORIES } from "../admin/data/complaintsStore";
import { useMyRemakerAccount, useMyUserAccount } from "./identity";

/* member wording → one of the admin categories for that type */
const WORDS = [
  [
    /not responding|no reply|not delivered|delayed|late/i,
    { ReMaker: "Late delivery", User: "No-show or unreliable" },
  ],
  [
    /rude|unsafe|abusive|hateful|threat/i,
    {
      ReMaker: "Rude behaviour",
      User: "Abusive behaviour",
      Review: "Abusive language",
    },
  ],
  [
    /outside reorbit|scam|fraud|advance|payment/i,
    {
      ReMaker: "Scam or fraud",
      User: "Scam or fraud",
      Product: "Prohibited or unsafe item",
    },
  ],
  [
    /damaged|broken|missing|wrong item|not as described|misleading|photos/i,
    {
      ReMaker: "Item not as described",
      Product: "Misleading photos or description",
    },
  ],
  [
    /fake|paid|looks fake/i,
    {
      Review: "Fake or paid review",
      User: "Fake account",
      Product: "Counterfeit or copied work",
    },
  ],
  [/personal information/i, { Review: "Personal information" }],
  [
    /not about|off-topic|spam|advert/i,
    { Review: "Off-topic", User: "Spam", Product: "Duplicate listing" },
  ],
  [/price/i, { Product: "Unrealistic price" }],
  [/duplicate/i, { Product: "Duplicate listing" }],
  [/sold/i, { Product: "Already sold" }],
  [
    /copied|counterfeit|stolen/i,
    {
      ReMaker: "Counterfeit or copied work",
      Product: "Counterfeit or copied work",
    },
  ],
];

export function categoryFor(type, reason) {
  const list = CATEGORIES[type] || [];
  if (list.includes(reason)) return reason;
  for (const [re, map] of WORDS)
    if (re.test(reason || "") && map[type]) return map[type];
  return "Other";
}

const slug = (s) =>
  String(s || "x")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function snapshot(type, t) {
  const owner = {
    id: `ext-${slug(t.ownerName || t.name)}`,
    name: t.ownerName || t.name,
    role: t.ownerRole || (type === "User" ? "User" : "ReMaker"),
    path: "/admin-complaints",
    image: t.ownerImage || t.image || null,
    status: "Active",
  };
  const base = {
    key: `${type}:ext:${slug(t.name)}:${slug(t.sub)}`,
    type,
    id: `ext-${slug(t.name)}`,
    name: t.name,
    image: t.image || null,
    path: "/admin-complaints",
    sub: t.sub || "",
    external: true,
  };
  if (type === "Product")
    return {
      ...base,
      status: "Live",
      live: true,
      price: t.price || 0,
      category: t.category || "",
      product: { title: t.name, image: t.image || null, price: t.price || 0 },
      owner,
    };
  if (type === "Review")
    return {
      ...base,
      status: "Visible",
      live: true,
      rating: t.rating || 0,
      text: t.text || "",
      reviewer: t.reviewer || "",
      onProduct: t.onProduct || "",
      at: t.at || "",
      owner,
    };
  return { ...base, status: "Active", email: "", since: "" };
}

/* file({ type, name, sub, image, ownerName, ..., reason, description }) → complaint id */
function makeFiler(reporterName, reporterRole) {
  return ({ type, reason, description, ...target }) =>
    logComplaint({
      type,
      targetId: `ext-${slug(target.name)}`,
      category: categoryFor(type, reason),
      description: (description || reason || "").trim(),
      reporterName,
      reporterRole,
      by: reporterName,
      target: snapshot(type, target),
      source: "member",
    });
}

export function useRemakerComplaintFiler() {
  const me = useMyRemakerAccount();
  const name = me?.full_name || "A ReMaker";
  return useCallback((args) => makeFiler(name, "ReMaker")(args), [name]);
}

export function useUserComplaintFiler() {
  const me = useMyUserAccount();
  const name = me?.full_name || "A member";
  return useCallback((args) => makeFiler(name, "User")(args), [name]);
}
