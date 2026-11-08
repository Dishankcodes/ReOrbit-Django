/* The ReMaker's own products, from /api/remakers/products/.
   Rows are mapped to the shape the screens already use. The list is loaded
   once and kept; saving updates it in place, so going back to the list is instant. */
import { useEffect, useSyncExternalStore } from "react";
import { fetchProductCategories, listAll, remakerProductApi as api, syncPhotos } from "../../api/products";

function fromApi(p) {
  return {
    id: p.id,
    title: p.title,
    category: p.category?.name || "",
    categoryId: p.category?.id || "",
    description: p.description || "",
    price: Number(p.price) || 0,
    stock: p.stock,
    status: p.status,
    images: (p.images || []).map((i) => i.url),
    imageRows: p.images || [],
    materials: (p.materials || "").split(",").map((m) => m.trim()).filter(Boolean),
    dimensions: p.dimensions || "",
    customization: p.customization_available,
    originType: "own",
    originItemId: "",
    views: 0,
    sales: 0,
    hold: p.deactivation ? { reason: p.deactivation.reason, at: p.deactivation.at } : null,
    updated: p.updated_at,
  };
}

let state = { products: [], loaded: false, error: "", categories: [] };
const listeners = new Set();
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const snap = () => state;
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };

let inFlight = null;
export function loadProducts({ force = false } = {}) {
  if (inFlight && !force) return inFlight;
  inFlight = listAll(api)
    .then((rows) => set({ products: rows.map(fromApi), loaded: true, error: "" }))
    .catch((e) => set({ error: e.message || "Could not load your products." }))
    .finally(() => { inFlight = null; });
  return inFlight;
}

export function useMyProducts() {
  const s = useSyncExternalStore(subscribe, snap, snap);
  useEffect(() => { if (!s.loaded) loadProducts(); }, [s.loaded]);
  return { products: s.products, loaded: s.loaded, error: s.error, retry: () => loadProducts({ force: true }) };
}

/* one product for the edit page: from the list if loaded, else fetched */
export function useMyProduct(id) {
  const s = useSyncExternalStore(subscribe, snap, snap);
  const found = s.products.find((p) => p.id === id) || null;
  useEffect(() => {
    if (found) return;
    api.get(id).then((p) => replace(fromApi(p))).catch(() => set({ error: "not-found" }));
  }, [id, found]);
  return { product: found, error: !found && s.error === "not-found" };
}

export function useProductCategories() {
  const s = useSyncExternalStore(subscribe, snap, snap);
  useEffect(() => {
    if (!s.categories.length) fetchProductCategories().then((c) => set({ categories: c })).catch(() => {});
  }, [s.categories.length]);
  return s.categories;
}

function replace(row) {
  const exists = state.products.some((p) => p.id === row.id);
  set({ products: exists ? state.products.map((p) => (p.id === row.id ? row : p)) : [row, ...state.products] });
  return row;
}

const bodyOf = (v) => ({
  title: v.title,
  category: state.categories.find((c) => c.name === v.category)?.id,
  description: v.description,
  price: v.price === "" ? null : Number(v.price),
  stock: Number(v.stock) || 0,
  materials: (v.materials || []).join(", "),
});

/* Saves the form. goLive: true publishes it, false keeps it as it is (draft or live),
   and `active` (edit screen) pauses or resumes a product that is already live.
   Throws an Error with .errors from the server on a problem. */
export async function saveProduct(values, { id = null, publish = false, active = null, onCreated } = {}) {
  const photos = values.photos.filter(Boolean).map((p) => ({ serverId: p.serverId, file: p.file, id: p.id }));
  let row = id ? await api.update(id, bodyOf(values)) : await api.create(bodyOf(values));
  /* the draft exists now: hand its id back at once so a retry updates it instead of creating another */
  if (!id && onCreated) onCreated(row.id);
  id = row.id;
  const had = id && state.products.find((p) => p.id === id)?.imageRows;
  await syncPhotos(api, id, photos, had || row.images || []);
  row = await api.get(id);
  const live = row.status === "Listed" || row.status === "Sold_Out";
  if (publish && !live) row = await api.publish(id);
  else if (active === false && live) row = await api.pause(id);
  else if (active === true && row.status === "Inactive") row = await api.publish(id);
  return replace(fromApi(row));
}

export async function setProductActive(id, on) {
  return replace(fromApi(on ? await api.publish(id) : await api.pause(id)));
}
export async function deleteProduct(id) {
  await api.remove(id);
  set({ products: state.products.filter((p) => p.id !== id) });
}
