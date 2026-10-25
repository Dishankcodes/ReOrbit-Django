/* =========================================================
   In-memory store for the ReMaker pages (UI only).
   Status changes survive moving between list and profile,
   and reset on refresh. Backend later: swap for API calls.
   ========================================================= */

import { useSyncExternalStore } from "react";
import { INITIAL_REMAKERS } from "./adminRemakers";

let remakers = INITIAL_REMAKERS;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => remakers;

export function useRemakers() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useRemaker(id) {
  return useRemakers().find((r) => r.remaker_id === id) || null;
}

export function changeRemakerStatus(ids, newStatus, reason = "") {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  const at = new Date().toISOString();
  remakers = remakers.map((r) =>
    !set.has(r.remaker_id) || r.status === newStatus
      ? r
      : {
          ...r,
          status: newStatus,
          updated_at: at,
          statusHistory: [
            {
              id: `${r.remaker_id}-${Date.now()}`,
              action: newStatus,
              reason: reason || "No reason provided.",
              by: "Admin · You",
              at,
            },
            ...r.statusHistory,
          ],
        },
  );
  emit();
}

/* Admin can pull a product off the marketplace or put it back. */
export function setProductStatus(remakerId, productId, status) {
  remakers = remakers.map((r) =>
    r.remaker_id !== remakerId
      ? r
      : {
          ...r,
          products: r.products.map((p) =>
            p.product_id === productId ? { ...p, status } : p,
          ),
        },
  );
  emit();
}
