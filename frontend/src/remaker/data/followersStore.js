import { useEffect, useMemo, useSyncExternalStore } from "react";
import { followApi } from "../../api/social";

let state = { followers: [], following: [] };
let loading = false;
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());
const commit = (next) => { state = next; emit(); };
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
const getSnapshot = () => state;

export async function loadFollowers() {
  if (loading) return;
  loading = true;
  try {
    const [followers, following] = await Promise.all([followApi.followers(), followApi.list()]);
    commit({ followers, following: following.map((row) => ({ ...row, craft: "", city: row.city || "", image: row.image || "", rating: 0, followers: 0, products: 0, profile: true })) });
  } finally { loading = false; }
}

export function useFollowers() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => { loadFollowers().catch(() => {}); }, []);
  return useMemo(() => [...current.followers].sort((a, b) => String(b.followedAt).localeCompare(String(a.followedAt))), [current.followers]);
}
export function useFollowing() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => { loadFollowers().catch(() => {}); }, []);
  return useMemo(() => [...current.following].sort((a, b) => String(b.followedAt).localeCompare(String(a.followedAt))), [current.following]);
}

export function removeFollower(id) {
  const row = state.followers.find((person) => person.id === id) || null;
  if (row) followApi.removeFollower(id).then(() => loadFollowers(true)).catch(() => {});
  return row;
}
export const restoreFollower = () => loadFollowers(true);
export function followBack(person) {
  if (person?.type === "ReMaker") followApi.follow(person.id).then(() => loadFollowers(true)).catch(() => {});
}
export function unfollow(id) {
  const row = state.following.find((person) => person.id === id) || null;
  if (row) followApi.unfollow(id).then(() => loadFollowers(true)).catch(() => {});
  return row;
}
export const restoreFollowing = (item) => item?.id ? followApi.follow(item.id).then(() => loadFollowers(true)) : Promise.resolve();
export const resetFollowers = () => loadFollowers(true);

export function followerStats(followers) {
  const now = Date.now(), month = now - 30 * 86400000, prior = now - 60 * 86400000;
  const last30 = followers.filter((p) => new Date(p.followedAt).getTime() >= month).length;
  const previous30 = followers.filter((p) => { const t = new Date(p.followedAt).getTime(); return t >= prior && t < month; }).length;
  const places = new Map();
  followers.forEach((p) => { if (p.city) places.set(p.city, (places.get(p.city) || 0) + 1); });
  return { total: followers.length, last30, previous30, makers: followers.filter((p) => p.type === "ReMaker").length,
    customers: followers.filter((p) => p.customerId).length, engaged: 0,
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
