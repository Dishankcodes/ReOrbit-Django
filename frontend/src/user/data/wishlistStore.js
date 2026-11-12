/* =========================================================
   Wishlist, shared by the User, ReMaker and Admin portals.
   The list lives on the server (one table, told apart by account
   type). Hearts respond at once and roll back if the server says no.
   `ids` only holds products that are still for sale, so counts match
   what the screens can show.
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { wishlistApi } from "../../api/social";
import { getAccount, isSignedIn, portalOf, SESSION_ENDED_EVENT } from "../../api/session";

const portal = () => portalOf(typeof window !== "undefined" ? window.location.pathname : "/");

/* the old browser-only lists are gone; drop what they left behind */
try {
  ["reorbit_user_wishlist", "reorbit_remaker_wishlist"].forEach((k) => window.localStorage.removeItem(k));
} catch {
  /* ignore */
}

/* whose list is in memory (a new sign-in in the same tab must not see the last person's hearts) */
const who = () => {
  const a = getAccount() || {};
  return `${portal()}:${a.public_id || a.id || ""}`;
};

let state = { ids: [], loaded: false, loading: false, error: "", owner: "" };
const listeners = new Set();
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;
const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export async function loadWishlist(force = false) {
  if (!isSignedIn(portal())) return;
  const owner = who();
  if (state.owner && state.owner !== owner) clearWishlistState();
  if (state.loading || (state.loaded && !force)) return;
  set({ loading: true, error: "", owner });
  try {
    const items = await wishlistApi.list();
    if (who() !== owner) {
      set({ loading: false }); /* signed out or switched while loading */
      return;
    }
    set({ ids: items.filter((i) => !i.unavailable).map((i) => i.id), loaded: true, loading: false });
  } catch (e) {
    set({ loading: false, error: e.message || "Could not load your wishlist." });
  }
}

function clearWishlistState() {
  set({ ids: [], loaded: false, loading: false, error: "", owner: "" });
}
if (typeof window !== "undefined") window.addEventListener(SESSION_ENDED_EVENT, clearWishlistState);

/* Run `call` after changing the list on screen; undo the change if it fails. */
async function optimistic(next, call) {
  const before = state.ids;
  set({ ids: next, error: "" });
  try {
    await call();
  } catch (e) {
    set({ ids: before, error: e.message || "Could not update your wishlist." });
  }
}

/* returns true when the product is now saved */
export function toggleWishlist(id) {
  const has = state.ids.includes(id);
  if (has) optimistic(state.ids.filter((x) => x !== id), () => wishlistApi.remove(id));
  else optimistic([id, ...state.ids], () => wishlistApi.add(id));
  return !has;
}
export const removeFromWishlist = (id) =>
  optimistic(state.ids.filter((x) => x !== id), () => wishlistApi.remove(id));

/* returns the ids that were removed, so the screen can offer Undo */
export function clearWishlist() {
  const removed = state.ids;
  optimistic([], () => wishlistApi.clear());
  return removed;
}

/* Undo: put these back. */
export async function setWishlist(next) {
  const have = new Set(state.ids);
  const missing = next.filter((id) => !have.has(id));
  set({ ids: [...next] });
  try {
    for (const id of missing.slice().reverse()) await wishlistApi.add(id);
  } catch (e) {
    set({ error: e.message || "Could not restore your wishlist." });
    loadWishlist(true);
  }
}

export function useWishlist() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    loadWishlist();
  }, []);
  return useMemo(
    () => ({
      ids: s.ids,
      count: s.ids.length,
      has: (id) => s.ids.includes(id),
      toggle: toggleWishlist,
      loading: s.loading || (!s.loaded && !s.error),
      error: s.error,
      reload: () => loadWishlist(true),
    }),
    [s],
  );
}

export default useWishlist;
