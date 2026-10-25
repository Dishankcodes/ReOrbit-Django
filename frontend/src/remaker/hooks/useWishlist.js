import { useCallback, useSyncExternalStore } from "react";

/* Saved marketplace listings, shared by every page that shows a heart.
   Kept in localStorage until the Wishlist API exists. A first-time
   ReMaker starts with a few saved pieces so the Saved items page has
   something to show. */

const KEY = "reorbit_remaker_wishlist";
const STARTER = ["restored-teak-cabinet", "upcycled-home-lamp", "teak-drawer-chest"];

function read() {
  try {
    const raw = localStorage.getItem(KEY);

    if (raw === null) return [...STARTER];

    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [...STARTER];
  }
}

let ids = read();
const listeners = new Set();

function commit(next) {
  ids = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable, keep going in memory */
  }

  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => ids;

export function clearWishlist() {
  const removed = ids;
  commit([]);
  return removed;
}

export function setWishlist(next) {
  commit(next);
}

export default function useWishlist() {
  const current = useSyncExternalStore(subscribe, getSnapshot);

  const toggle = useCallback((id) => {
    commit(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  }, []);

  const has = useCallback((id) => current.includes(id), [current]);

  return { ids: current, has, toggle };
}
