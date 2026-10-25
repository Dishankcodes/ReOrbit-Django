/* =========================================================
   In-memory store for the ReMaker pages (UI only).

   - Status changes persist while navigating between pages.
   - Product disable details and price suggestions persist too.
   - All changes reset on refresh.
   - Backend later: swap these functions for API calls.
   ========================================================= */

import { useSyncExternalStore } from "react";
import { INITIAL_REMAKERS } from "./adminRemakers";

let remakers = INITIAL_REMAKERS;

const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => remakers;

export function useRemakers() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useRemaker(id) {
  return useRemakers().find((remaker) => remaker.remaker_id === id) || null;
}

/* =========================================================
   Change ReMaker account status
   ========================================================= */

export function changeRemakerStatus(ids, newStatus, reason = "") {
  const selectedIds = new Set(Array.isArray(ids) ? ids : [ids]);
  const at = new Date().toISOString();

  remakers = remakers.map((remaker) => {
    if (!selectedIds.has(remaker.remaker_id) || remaker.status === newStatus) {
      return remaker;
    }

    return {
      ...remaker,
      status: newStatus,
      updated_at: at,
      statusHistory: [
        {
          id: `${remaker.remaker_id}-${Date.now()}`,
          action: newStatus,
          reason: reason || "No reason provided.",
          by: "Admin · You",
          at,
        },
        ...(remaker.statusHistory || []),
      ],
    };
  });

  emit();
}

/* =========================================================
   Update an individual ReMaker product.

   Used for:
   - Disabling a product with a reason
   - Saving a suggested price and message
   - Future admin-only product updates
   ========================================================= */

export function updateRemakerProduct(remakerId, productId, updates) {
  let productFound = false;

  remakers = remakers.map((remaker) => {
    if (remaker.remaker_id !== remakerId) {
      return remaker;
    }

    const products = remaker.products.map((product) => {
      if (product.product_id !== productId) {
        return product;
      }

      productFound = true;

      return {
        ...product,
        ...updates,
      };
    });

    return {
      ...remaker,
      products,
    };
  });

  if (productFound) {
    emit();
  }

  return productFound;
}

/* =========================================================
   Change marketplace listing status.

   Keeps the existing Listed / Inactive functionality intact.
   ========================================================= */

export function setProductStatus(remakerId, productId, status) {
  return updateRemakerProduct(remakerId, productId, { status });
}
