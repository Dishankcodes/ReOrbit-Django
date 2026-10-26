/* =========================================================
   User › Wishlist (UI only). One shared list of saved listing
   ids (localStorage) so the heart on the marketplace, the product
   page and the Wishlist page always agree.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { saveWishlistIds } from "./userUiState";

const KEY = "reorbit_user_wishlist";
const DEFAULT = ["vintage-reading-chair", "restored-teak-cabinet", "recovered-textile-bag", "classic-novel-collection"];

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return DEFAULT;
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

let ids = load();
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => ids;

const commit = (next) => {
  ids = next;
  saveWishlistIds(ids);
  listeners.forEach((l) => l());
};

export function toggleWishlist(id) {
  const has = ids.includes(id);
  commit(has ? ids.filter((x) => x !== id) : [id, ...ids]);
  return !has;
}
export const removeFromWishlist = (id) => commit(ids.filter((x) => x !== id));
export const clearWishlist = () => commit([]);

export function useWishlist() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(
    () => ({ ids: list, count: list.length, has: (id) => list.includes(id), toggle: toggleWishlist }),
    [list],
  );
}
