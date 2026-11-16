/* =========================================================
   Shared › File a complaint.
   "Report" buttons in the User and ReMaker apps call this. The
   complaint lands in Admin › Complaints, in the same queue as the
   ones the team logs by hand.

   `type` is what is being reported: "User", "ReMaker" or "Product"
   (reviews are reported through the Reviews flow). The report is
   sent to the server with the id of the person or listing.
   ========================================================= */

import { useCallback } from "react";
import { complaintsApi } from "../api/complaints";
import { CATEGORIES } from "./complaintCategories";

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

/* file({ type, id, reason, description, ... }) → { id } of the new complaint.
   Rejects with the server's message (own listing, duplicate, daily limit...). */
function makeFiler() {
  return async ({ type, id, reason, description }) => {
    if (!id) throw new Error("We couldn't tell what you are reporting.");
    try {
      return await complaintsApi.file({
        type,
        target_id: id,
        category: categoryFor(type, reason),
        description: (description || reason || "").trim(),
      });
    } catch (e) {
      const first = e?.errors && Object.values(e.errors).flat()[0];
      throw new Error(first || e?.message || "We couldn't send your report.");
    }
  };
}

export function useRemakerComplaintFiler() {
  return useCallback((args) => makeFiler()(args), []);
}

export function useUserComplaintFiler() {
  return useCallback((args) => makeFiler()(args), []);
}
