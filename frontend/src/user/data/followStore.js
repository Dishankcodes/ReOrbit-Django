/* =========================================================
   User › Following (UI only). One shared list of followed
   ReMaker ids, saved in localStorage so the follow button on a
   profile and on the "All ReMakers" page always agree.
   Backend later: replace with follow / unfollow API calls.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { saveFollowingIds } from "./userUiState";

const KEY = "reorbit_user_following";
const DEFAULT_FOLLOWING = ["priya-shah"];

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return DEFAULT_FOLLOWING;
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : DEFAULT_FOLLOWING;
  } catch {
    return DEFAULT_FOLLOWING;
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

/* followers shown on a profile include the user's own follow */
export const followerCount = (base, following) => base + (following ? 1 : 0);
