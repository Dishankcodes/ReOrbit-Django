/* =========================================================
   REMAKER FOLLOWERS - API STORE
   Followers: GET /api/social/followers/   (people who follow me)
   Following: GET /api/social/follow/      (ReMakers I follow)
   Nothing here is sample data. Every person, count, date, order and
   wishlist number comes from the server.
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";

import { mapPublicRemaker } from "../../api/remakers";
import { SESSION_ENDED_EVENT } from "../../api/session";
import { followApi } from "../../api/social";

const EMPTY = { followers: [], following: [], loaded: false, error: "" };
let state = EMPTY;
let loading = false;
let queued = false;
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());
const commit = (next) => {
  state = next;
  emit();
};
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => state;

/* A different ReMaker signing in must never see the previous one's people */
if (typeof window !== "undefined") {
  window.addEventListener(SESSION_ENDED_EVENT, () => {
    state = EMPTY;
    queued = false;
    emit();
  });
}

function mapFollower(row) {
  return {
    id: row.id,
    name: row.name || "ReOrbit member",
    type: row.type === "ReMaker" ? "ReMaker" : "User",
    username: row.username || "",
    city: row.city || "",
    state: row.state || "",
    bio: row.bio || "",
    image: row.image || "",
    joined: row.joined || "",
    followedAt: row.followedAt || "",
    customerId: row.customerId || "",
    orders: Number(row.orders) || 0,
    spent: Number(row.spent) || 0,
    saves: Number(row.saves) || 0,
  };
}

function mapFollowing(row) {
  const maker = row.remaker ? mapPublicRemaker(row.remaker) : {};

  return {
    id: row.id,
    name: row.name,
    username: row.username || "",
    craft: maker.craft || "ReMaker",
    city: maker.city || "",
    image: maker.image || "",
    rating: maker.rating || 0,
    followers: maker.followers || 0,
    products: maker.productsCount || 0,
    followedAt: row.followedAt || "",
  };
}

/* Safe to call again at any time. A call made while one is running is
   queued, so the screen always ends on the newest server state. */
export async function loadFollowers() {
  if (loading) {
    queued = true;
    return;
  }

  loading = true;

  try {
    const [followers, following] = await Promise.all([
      followApi.followers(),
      followApi.list(),
    ]);

    commit({
      followers: followers.map(mapFollower),
      following: following.map(mapFollowing),
      loaded: true,
      error: "",
    });
  } catch (error) {
    commit({
      ...state,
      error: error.message || "We couldn't load your followers.",
    });
  } finally {
    loading = false;

    if (queued) {
      queued = false;
      loadFollowers();
    }
  }
}

function useSnapshot() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    loadFollowers();
  }, []);

  return current;
}

/* Newest follower first */
export function useFollowers() {
  const { followers } = useSnapshot();

  return useMemo(
    () =>
      [...followers].sort((a, b) =>
        String(b.followedAt).localeCompare(String(a.followedAt)),
      ),
    [followers],
  );
}

export function useFollowing() {
  const { following } = useSnapshot();

  return useMemo(
    () =>
      [...following].sort((a, b) =>
        String(b.followedAt).localeCompare(String(a.followedAt)),
      ),
    [following],
  );
}

/* { loaded, error, retry } so the page can say "loading" instead of "empty" */
export function useFollowersStatus() {
  const { loaded, error } = useSnapshot();

  return {
    loaded,
    error,
    retry: () => {
      commit({ ...state, error: "" });
      return loadFollowers();
    },
  };
}

/* ---------- actions (all throw an Error with a readable message) ---------- */

/* Takes someone off my followers. They can follow again later. */
export async function removeFollower(id) {
  const row = state.followers.find((person) => person.id === id) || null;

  if (!row) return null;

  commit({
    ...state,
    followers: state.followers.filter((person) => person.id !== id),
  });

  try {
    await followApi.removeFollower(id);
  } catch (error) {
    commit({ ...state, followers: [...state.followers, row] });
    throw error;
  }

  return row;
}

export async function followBack(person) {
  if (person?.type !== "ReMaker") return;

  await followApi.follow(person.id);
  await loadFollowers();
}

export async function unfollow(id) {
  const row = state.following.find((person) => person.id === id) || null;

  if (!row) return null;

  await followApi.unfollow(id);
  await loadFollowers();

  return row;
}

export async function restoreFollowing(item) {
  if (!item?.id) return;

  await followApi.follow(item.id);
  await loadFollowers();
}

export const resetFollowers = () => loadFollowers();

/* "Surat, Gujarat", "Surat", or a plain fallback */
export function placeLabel(person) {
  return (
    [person.city, person.state].filter(Boolean).join(", ") ||
    "Location not added"
  );
}

/* A follower is "engaged" when they have saved something of mine */
export const isEngaged = (person) => person.saves >= 1;

export function followerStats(followers) {
  const now = Date.now(), month = now - 30 * 86400000, prior = now - 60 * 86400000;
  const last30 = followers.filter((p) => new Date(p.followedAt).getTime() >= month).length;
  const previous30 = followers.filter((p) => { const t = new Date(p.followedAt).getTime(); return t >= prior && t < month; }).length;
  const places = new Map();
  followers.forEach((p) => { if (p.city) places.set(p.city, (places.get(p.city) || 0) + 1); });
  return { total: followers.length, last30, previous30, makers: followers.filter((p) => p.type === "ReMaker").length,
    customers: followers.filter((p) => p.customerId).length, engaged: followers.filter(isEngaged).length,
    places: [...places].map(([city, count]) => ({ city, count, percent: followers.length ? count / followers.length * 100 : 0 })).sort((a,b) => b.count-a.count).slice(0,5) };
}
export function growthSeries(followers, weeks = 12) {
  return Array.from({ length: weeks }, (_, i) => { const end = Date.now() - (weeks - i - 1) * 7 * 86400000; const date = new Date(end);
    return { label: `${date.getDate()} ${date.toLocaleString("en-IN", { month: "short" })}`, total: followers.filter((p) => new Date(p.followedAt).getTime() <= end).length }; });
}
export function followedLabel(iso) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return "Just now"; if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24); if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30); if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
  const years = Math.floor(months / 12); return `${years} ${years === 1 ? "year" : "years"} ago`;
}
