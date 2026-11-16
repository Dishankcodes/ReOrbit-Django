/* =========================================================
   Admin › Sell products: ReOrbit's own listings, from the server (/api/admins/store/).

   A listing saved here is a real Admin_Items row, so once it is published it shows on the
   member marketplace, the ReMaker marketplace and the admin Shop (they all read /api/marketplace/).
   Rows are mapped to the shape the Sell screens already use. The list is loaded once and kept;
   saving, pausing and deleting update it in place.

   Sales (the Orders screens) are still the in-memory mock further down.
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  adminStoreApi as api,
  fetchProductCategories,
  listAll,
  syncPhotos,
} from "../../api/products";
import { fetchStoreStats } from "../../api/adminProducts";
import { adminOrdersApi } from "../../api/orders";
import { loadLiveMarketplace } from "../../user/data/liveMarketplace";
import { useOrders, refreshOrders } from "./ordersStore";
import { useStock } from "./warehouseStore";

/* server status -> the words the Sell screens use */
const STATUS_IN = {
  Listed: "Active",
  Draft: "Draft",
  Inactive: "Paused",
  Sold_Out: "Sold_Out",
};

function fromApi(p) {
  return {
    id: p.id,
    sku: p.sku,
    title: p.title,
    category: p.category?.name || "",
    description: p.description || "",
    condition: p.condition || "",
    source: p.source || "other",
    inventory_id: p.inventory_id || null,
    price: Number(p.price) || 0,
    mrp: p.mrp ? Number(p.mrp) : null,
    stock: p.stock,
    delivery: p.delivery || "flat",
    returnable: p.returnable !== false,
    specs: p.specs || {},
    images: (p.images || []).map((i) => i.url),
    imageRows: p.images || [],
    status: STATUS_IN[p.status] || p.status,
    views: p.views || 0,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

/* ---------- state ---------- */
let state = { listings: [], stats: {}, loaded: false, error: "", categories: [] };
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
const useSellState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

let inFlight = null;
export function loadSellListings({ force = false } = {}) {
  if (inFlight && !force) return inFlight;
  inFlight = Promise.all([
    listAll(api),
    fetchStoreStats().catch(() => state.stats),
  ])
    .then(([rows, stats]) =>
      set({ listings: rows.map(fromApi), stats, loaded: true, error: "" }),
    )
    .catch((e) =>
      set({ error: e.message || "Could not load your listings.", loaded: true }),
    )
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/* loaded / error / retry, for screens that want to show a loading or error state */
export function useSellStatus() {
  const s = useSellState();
  useEffect(() => {
    if (!s.loaded) loadSellListings();
  }, [s.loaded]);
  return {
    loaded: s.loaded,
    error: s.error,
    retry: () => loadSellListings({ force: true }),
  };
}

/* categories that can hold a product (the server rejects any other) */
export function useSellCategories() {
  const s = useSellState();
  useEffect(() => {
    if (!s.categories.length)
      fetchProductCategories()
        .then((c) => set({ categories: c }))
        .catch(() => {});
  }, [s.categories.length]);
  return s.categories;
}

/* after any change: the marketplace (user, ReMaker and admin Shop screens) re-reads the server */
const refreshMarketplace = () => {
  try {
    loadLiveMarketplace(true);
  } catch {
    /* the marketplace refreshes itself the next time a page opens */
  }
};

function replace(row) {
  const exists = state.listings.some((l) => l.id === row.id);
  set({
    listings: exists
      ? state.listings.map((l) => (l.id === row.id ? row : l))
      : [row, ...state.listings],
  });
  refreshMarketplace();
  fetchStoreStats()
    .then((stats) => set({ stats }))
    .catch(() => {});
  return row;
}

const COUNTED_OUT = ["Cancelled", "Returned"];

/* ---------- sales (orders where the admin is the seller) ---------- */
export function useSales() {
  const orders = useOrders();
  return useMemo(
    () => orders.filter((o) => o.seller.type === "Admin"),
    [orders],
  );
}
export function useSale(orderId) {
  return useSales().find((o) => o.order_id === orderId) || null;
}

/* ---------- listings with their numbers ---------- */
export function useSellListings() {
  const { listings, stats } = useSellState();
  const sales = useSales();
  useEffect(() => {
    if (!state.loaded) loadSellListings();
  }, []);
  return useMemo(
    () =>
      listings
        .map((l) =>
          withStats(
            l,
            stats[l.id],
            sales.filter((o) => o.listing_ids.includes(l.id)),
          ),
        )
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [listings, stats, sales],
  );
}
export function useSellListing(id) {
  const all = useSellListings();
  const found = all.find((l) => l.id === id) || null;
  useEffect(() => {
    if (!id || found || !state.loaded) return;
    api
      .get(id)
      .then((p) => replace(fromApi(p)))
      .catch(() => {});
  }, [id, found]);
  return found;
}

/* the numbers come from the server: sold units and revenue count real orders */
function withStats(l, s = {}, sales = []) {
  const sold = s.sold || 0;
  return {
    ...l,
    rawStatus: l.status,
    quantity: l.stock + sold, /* units listed in total = left + sold */
    available: l.stock,
    sold,
    revenue: s.revenue || 0,
    orderCount: s.orders || 0,
    toHandle: s.to_handle || 0,
    wishlisted: s.wishlisted || 0,
    sales,
  };
}

/* an order the admin still has to act on */
export function needsAction(o) {
  if (o.order_status === "Pending") return true;
  if (o.order_status === "Confirmed" && !o.shipment) return true;
  if (
    o.order_status === "Confirmed" &&
    o.shipment &&
    o.transaction.payment_method === "COD" &&
    o.transaction.payment_status === "Pending"
  )
    return false;
  if (o.refundDue) return true;
  return false;
}

/* where is a sale in the seller's flow? 0 new · 1 confirmed · 2 shipped · 3 delivered · -1 stopped */
export function saleStage(o) {
  if (COUNTED_OUT.includes(o.order_status)) return -1;
  if (o.order_status === "Completed") return 3;
  if (o.order_status === "Confirmed") return o.shipment ? 2 : 1;
  return 0;
}

/* ---------- warehouse stock that could be listed ---------- */
export function useListableStock() {
  const stock = useStock();
  const { listings } = useSellState();
  return useMemo(() => {
    const used = new Set(listings.map((l) => l.inventory_id).filter(Boolean));
    return stock.filter(
      (i) =>
        i.warehouse_status === "Stored" &&
        i.sale_status === "Not listed" &&
        !used.has(i.inventory_id),
    );
  }, [stock, listings]);
}

/* ---------- listing CRUD (server) ---------- */
const fail = (message, errors) =>
  Object.assign(new Error(message), { errors });

async function categoryId(name) {
  const rows = state.categories.length
    ? state.categories
    : await fetchProductCategories();
  const found = rows.find((c) => c.name === name);
  if (!found)
    throw fail(`“${name}” cannot hold a product. Choose another category.`, {
      category: ["Choose a category that can hold products."],
    });
  return found.id;
}

/* the form keeps photos as pictures (data URLs); keep the ones already on the server, upload the rest */
async function photosFrom(images, current) {
  const out = [];
  for (const src of images) {
    const row = current.find((r) => r.url === src);
    if (row) {
      out.push({ serverId: row.id });
      continue;
    }
    try {
      const blob = await (await fetch(src)).blob();
      const type = blob.type || "image/jpeg";
      out.push({
        file: new File([blob], `photo.${type.split("/")[1] || "jpg"}`, { type }),
      });
    } catch {
      /* a photo that cannot be read is skipped (a warehouse lot keeps its own photos) */
    }
  }
  return out;
}

/* data: the form values. Saves, uploads the photos and (publish) puts it on sale.
   Resolves with the listing id; throws an Error (with .errors from the server) on a problem. */
export async function saveListing(data, { publish = true } = {}) {
  const existing = data.id ? state.listings.find((l) => l.id === data.id) : null;
  const sold = existing ? state.stats[existing.id]?.sold || 0 : 0;
  const body = {
    title: data.title,
    category: await categoryId(data.category),
    description: data.description,
    price: data.price,
    stock: Math.max(0, Number(data.quantity) - sold),
    mrp: data.mrp > 0 ? data.mrp : null,
    condition: data.condition,
    source: data.source,
    inventory_id: data.inventory_id || "",
    delivery: data.delivery,
    returnable: data.returnable,
    specs: data.specs,
  };
  let row = existing ? await api.update(existing.id, body) : await api.create(body);
  const id = row.id;
  await syncPhotos(
    api,
    id,
    await photosFrom(data.images || [], existing?.imageRows || row.images || []),
    existing?.imageRows || row.images || [],
  );
  row = await api.get(id);
  const live = row.status === "Listed" || row.status === "Sold_Out";
  /* a paused listing stays paused when it is only edited; a draft goes live when published */
  if (publish && !live && !(existing && existing.status === "Paused"))
    row = await api.publish(id);
  replace(fromApi(row));
  return id;
}

export async function setListingStatus(id, status) {
  const row = await (status === "Active" ? api.publish(id) : api.pause(id));
  return replace(fromApi(row));
}

export async function removeListing(id) {
  /* the server only deletes a product that is not on sale, so take it off sale first */
  const current = state.listings.find((l) => l.id === id);
  if (current && (current.status === "Active" || current.status === "Sold_Out"))
    await api.pause(id);
  await api.remove(id);
  set({ listings: state.listings.filter((l) => l.id !== id) });
  refreshMarketplace();
}

/* ---------- selling-order actions ---------- */
export async function shipSale(orderId, { courier, tracking }) {
  await adminOrdersApi.act(orderId, "ship", {
    courier_name: courier,
    tracking_no: tracking,
  });
  await refreshOrders();
}
