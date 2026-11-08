import { useEffect, useState } from "react";
import { apiRequest } from "./api";

/* Data for the before-login pages. One small request each, cached in memory and for
   5 minutes in sessionStorage so moving between public pages costs nothing. */
const TTL = 5 * 60 * 1000;
const memory = new Map();

function readCache(key) {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  try {
    const raw = JSON.parse(sessionStorage.getItem(`ro_pub_${key}`) || "null");
    if (raw && Date.now() - raw.at < TTL) { memory.set(key, raw); return raw.data; }
  } catch { /* private mode: just fetch */ }
  return null;
}

function writeCache(key, data) {
  const entry = { at: Date.now(), data };
  memory.set(key, entry);
  try { sessionStorage.setItem(`ro_pub_${key}`, JSON.stringify(entry)); } catch { /* ignore */ }
}

const inflight = new Map();
export function fetchPublic(path) {
  const cached = readCache(path);
  if (cached) return Promise.resolve(cached);
  if (!inflight.has(path)) {
    inflight.set(
      path,
      apiRequest(path.startsWith("/marketplace") ? path : `/public${path}`, { auth: false })
        .then((r) => { writeCache(path, r.data); return r.data; })
        .finally(() => inflight.delete(path)),
    );
  }
  return inflight.get(path);
}

/* { data, loading, error }. `data` stays null on failure, so pages fall back to their sample content. */
export function usePublic(path) {
  const [state, setState] = useState(() => {
    const c = readCache(path);
    return { data: c, loading: !c, error: "" };
  });
  useEffect(() => {
    let alive = true;
    const c = readCache(path);
    if (c) { setState({ data: c, loading: false, error: "" }); return undefined; }
    setState((s) => ({ ...s, loading: true }));
    fetchPublic(path)
      .then((data) => alive && setState({ data, loading: false, error: "" }))
      .catch((e) => alive && setState({ data: null, loading: false, error: e.message || "" }));
    return () => { alive = false; };
  }, [path]);
  return state;
}

export const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/* A round-cornered initials picture for a ReMaker without a photo. */
export function initialsImage(name = "") {
  const t = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "R";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#e6ece6"/><text x="50%" y="54%" font-family="Georgia,serif" font-size="140" fill="#2a4d3a" text-anchor="middle" dominant-baseline="middle">${t.replace(/[<&>]/g, "")}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* A marketplace card (any seller) in the shape the before-login pages draw. */
export function publicProduct(c) {
  const kind = c.kind === "admin" ? "refurbished" : c.kind;
  return {
    id: c.id, type: kind,
    category: { user: "Community Listing", remaker: "ReMaker Creation", refurbished: "ReOrbit Refurbished" }[kind],
    title: c.title, price: inr(c.price), location: c.city || "Gujarat",
    condition: c.condition || (kind === "remaker" ? "Handmade" : "New"),
    material: c.category?.name || "", image: c.cover,
  };
}
