import { useEffect, useMemo, useSyncExternalStore } from "react";
import { followApi } from "../../api/social";
import { getAccount, isSignedIn, SESSION_ENDED_EVENT } from "../../api/session";
import { bumpFollowDelta, followDelta, resetFollowDeltas } from "../../api/followDeltas";

let ids = [];
let loadedFor = "";
let pending = false;
const listeners = new Set();
const owner = () => getAccount()?.public_id || getAccount()?.id || "";
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => fn());
const getSnapshot = () => ids;

export async function loadFollowing(force = false) {
  const key = owner();
  if (!key || !isSignedIn("user") || (loadedFor === key && !force) || pending) return;
  pending = true;
  try {
    ids = (await followApi.list()).map((row) => row.id);
    loadedFor = key;
  } finally {
    pending = false;
    emit();
  }
}

export function toggleFollow(id) {
  const before = ids;
  const following = !before.includes(id);
  ids = following ? [...before, id] : before.filter((item) => item !== id);
  bumpFollowDelta(id, following ? 1 : -1);
  emit();
  const action = following ? followApi.follow(id) : followApi.unfollow(id);
  action.catch(() => { ids = before; bumpFollowDelta(id, following ? -1 : 1); emit(); });
  return following;
}

if (typeof window !== "undefined") window.addEventListener(SESSION_ENDED_EVENT, () => { ids = []; loadedFor = ""; resetFollowDeltas(); emit(); });

export function useFollowing() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => { loadFollowing(); }, []);
  return useMemo(() => ({ ids: list, count: list.length, isFollowing: (id) => list.includes(id), toggle: toggleFollow }), [list]);
}

// The server's follower count plus any follow / unfollow done on this screen.
export const followerCount = (base, id) =>
  Math.max(0, (Number(base) || 0) + followDelta(id));
