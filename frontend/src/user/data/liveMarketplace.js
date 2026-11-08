/* Loads the live marketplace once and keeps it in ITEMS (see setLiveItems).
   Returns a number that changes when the live rows change, for useMemo deps. */
import { useEffect, useSyncExternalStore } from "react";
import { fetchMarketplace } from "../../api/marketplace";
import { setLiveItems } from "../../data/marketplaceData";

let state = { version: 0, ready: false };
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const snap = () => state;
let started = false;
let loadedAt = 0;
const STALE_MS = 60 * 1000; /* re-check quietly when a page opens after a minute */

export function loadLiveMarketplace(force = false) {
  if (started && !force && Date.now() - loadedAt < STALE_MS) return;
  started = true;
  fetchMarketplace()
    .then((rows) => { loadedAt = Date.now(); setLiveItems(rows); state = { version: state.version + 1, ready: true }; })
    .catch(() => { state = { ...state, ready: true }; started = false; })
    .finally(() => listeners.forEach((l) => l()));
}

export function useLiveMarketplace() {
  const s = useSyncExternalStore(subscribe, snap, snap);
  useEffect(() => { loadLiveMarketplace(); }, []);
  return s;
}
