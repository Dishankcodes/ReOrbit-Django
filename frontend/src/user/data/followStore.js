/* User-side ReMaker follows. Until the follow API is implemented, IDs are stored locally. */

import { useMemo, useSyncExternalStore } from "react";
import { saveFollowingIds } from "./userUiState";

const KEY = "reorbit_user_following";

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return [];
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

let ids = load();
const listeners = new Set();

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => ids;

export function toggleFollow(id) {
  ids = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
  saveFollowingIds(ids);
  listeners.forEach((listener) => listener());
  return ids.includes(id);
}

export function useFollowing() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(
    () => ({
      ids: list,
      count: list.length,
      isFollowing: (id) => list.includes(id),
      toggle: toggleFollow,
    }),
    [list],
  );
}

export const followerCount = (base, following) => base + (following ? 1 : 0);
