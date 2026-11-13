/* =========================================================
   Admin › Sell products. Real data from the server.

   Listings are ReOrbit's own store products (/api/admins/store/), the same
   rows the Products > ReOrbit Store tab edits. Their numbers (units sold,
   revenue, orders to handle, saves) come from /api/admins/store/stats/, and
   each product's sales are the platform orders that contain it.

   The screens were built on an older in-memory shape, so the rows are mapped
   to that shape here and the screens did not need to change.
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { apiRequest } from "../../api/api";
import { adminOrdersApi } from "../../api/orders";
import {
  adminStoreApi as api,
  fetchProductCategories,
  listAll,
  syncPhotos,
} from "../../api/products";
import { useStock, runWarehouseAction } from "./warehouseStore";
import { canApplyWarehouseAction } from "./warehouseActions";

/* ---------- state ---------- */
let state = {
  rows: [], // store products, as the server sends them
  stats: {}, // { "ADI-1": { sold, revenue, orders, to_handle, wishlisted } }
  sales: [], // platform orders, as the server sends them
  itemSales: {}, // { "ADI-1": [orders] }, loaded when a product page opens
  loaded: false,
  loading: false,
  error: "",
};
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

/* ---------- loading ---------- */
async function fetchSales(params = "") {
  const rows = [];
  let page = 1;
  let pages = 1;
  do {
    const sep = params.includes("?") ? "&" : "?";
    const res = await adminOrdersApi.list(
      `${params}${sep}page_size=100&page=${page}`,
    );
    rows.push(...res.results);
    pages = res.total_pages || 1;
    page += 1;
  } while (page <= pages && page <= 5);
  return rows;
}

export async function loadSell(force = false) {
  if (state.loading || (state.loaded && !force)) return;
  set({ loading: true, error: "" });
  try {
    const [rows, stats, sales] = await Promise.all([
      listAll(api),
      apiRequest("/admins/store/stats/").then((r) => r.data.stats),
      fetchSales("?seller_type=platform"),
    ]);
    set({ rows, stats, sales, loaded: true, loading: false });
  } catch (e) {
    set({
      loading: false,
      error: e.message || "Could not load your store products.",
    });
  }
}

/* one product's own orders, for its detail page */
export async function loadItemSales(id) {
  try {
    const sales = await fetchSales(`?item=${encodeURIComponent(id)}`);
    set({ itemSales: { ...state.itemSales, [id]: sales } });
  } catch {
    /* the page still works without the table */
  }
}

/* Start loading when a screen opens. */
function useLoaded() {
  const s = useSellState();
  useEffect(() => {
    loadSell();
  }, []);
  return s;
}

/* ---------- server row -> screen shape ---------- */
const STATUS = {
  Draft: "Draft",
  Listed: "Active",
  Sold_Out: "Sold_Out",
  Inactive: "Paused",
};
const RAW = { Draft: "Draft", Listed: "Active", Sold_Out: "Active", Inactive: "Paused" };

const PAY = {
  Paid: "Success",
  COD_Collected: "Success",
  Pending: "Pending",
  COD_Pending: "Pending",
  Failed: "Failed",
  Refunded: "Refunded",
};

function toSale(o) {
  const line = (o.items || [])[0] || {};
  const qty = (o.items || []).reduce((n, l) => n + l.qty, 0);
  const shipped = ["Shipped", "Delivery_Failed", "Delivered"].includes(o.status);
  const returning =
    o.return && ["Requested", "Escalated", "Approved"].includes(o.return.status);
  const status =
    o.status === "Pending_Payment"
      ? "Pending"
      : o.status === "Delivered"
      ? "Completed"
      : o.status === "Cancelled"
        ? "Cancelled"
        : o.status === "Returned_To_Origin"
          ? "Returned"
          : "Confirmed";
  return {
    order_id: o.id,
    order_status: status,
    order_date: o.created_at,
    amount: o.total,
    buyer: {
      name: o.buyer?.name || "Buyer",
      type:
        o.buyer?.type === "remaker"
          ? "ReMaker"
          : o.buyer?.type === "admin"
            ? "Admin"
            : "User",
      image: "",
    },
    listing: {
      id: line.id,
      title:
        (o.items || []).length > 1
          ? `${line.title} + ${o.items.length - 1} more`
          : line.title,
      quantity: qty,
      image: line.cover || "",
      unit_price: line.unit_price,
    },
    transaction: {
      payment_method: o.payment?.method,
      payment_status: PAY[o.payment?.status] || "Pending",
    },
    shipment: shipped
      ? {
          courier: o.courier?.name || "",
          tracking: o.courier?.tracking_no || "",
          shipped_at: o.shipped_at,
        }
      : null,
    refundDue: !!returning,
    todo:
      ["Confirmed", "Packed", "Delivery_Failed"].includes(o.status) ||
      !!returning,
  };
}

function toListing(p, stat = {}, sales = []) {
  const sold = stat.sold || 0;
  const status = STATUS[p.status] || p.status;
  return {
    id: p.id,
    sku: p.sku,
    title: p.title,
    category: p.category?.name || "",
    source: p.source || "other",
    inventory_id: p.inventory_id || null,
    condition: p.condition || "",
    description: p.description || "",
    price: Number(p.price) || 0,
    mrp: p.mrp ? Number(p.mrp) : 0,
    quantity: p.stock + sold, // everything that was ever put up for sale
    images: (p.images || []).map((i) => i.url),
    imageRows: p.images || [],
    status,
    rawStatus: RAW[p.status] || status,
    created_at: p.created_at,
    specs: p.specs || {},
    delivery: p.delivery || "flat",
    returnable: p.returnable !== false,
    views: p.views || 0,
    wishlisted: stat.wishlisted || 0,
    sold,
    available: p.stock,
    revenue: stat.revenue || 0,
    orderCount: stat.orders || 0,
    toHandle: stat.to_handle || 0,
    sales: sales.map(toSale),
  };
}

/* ---------- sales (orders where the admin is the seller) ---------- */
export function useSales() {
  const { sales } = useLoaded();
  return useMemo(() => sales.map(toSale), [sales]);
}

/* an order the admin still has to act on */
export const needsAction = (o) => !!o.todo;

/* ---------- listings with their numbers ---------- */
export function useSellListings() {
  const { rows, stats } = useLoaded();
  return useMemo(
    () =>
      rows
        .map((p) => toListing(p, stats[p.id]))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [rows, stats],
  );
}

export function useSellListing(id) {
  const { rows, stats, itemSales } = useLoaded();
  useEffect(() => {
    if (id) loadItemSales(id);
  }, [id]);
  const row = rows.find((p) => p.id === id);
  return useMemo(
    () => (row ? toListing(row, stats[id], itemSales[id] || []) : null),
    [row, stats, itemSales, id],
  );
}

export function useSellStatus() {
  const { loaded, loading, error } = useSellState();
  return { loaded, loading, error };
}

/* ---------- warehouse stock that could be listed ---------- */
export function useListableStock() {
  const stock = useStock();
  const { rows } = useSellState();
  return useMemo(() => {
    const used = new Set(rows.map((p) => p.inventory_id).filter(Boolean));
    return stock.filter(
      (i) =>
        i.warehouse_status === "Stored" &&
        i.sale_status === "Not listed" &&
        !used.has(i.inventory_id),
    );
  }, [stock, rows]);
}

/* ---------- listing CRUD ---------- */
function replaceRow(p) {
  const rows = state.rows.some((r) => r.id === p.id)
    ? state.rows.map((r) => (r.id === p.id ? p : r))
    : [p, ...state.rows];
  set({ rows });
}

async function categoryId(name) {
  const cats = await fetchProductCategories();
  const hit = cats.find((c) => c.name === name);
  if (!hit) throw new Error("Choose a category.");
  return hit.public_id || hit.id;
}

/* a photo on the form is either a picture the server already has (its URL) or a new one
   (a data: URL from the picker) */
async function toPhotos(images, current) {
  const known = new Map(current.map((r) => [r.url, r.id]));
  return Promise.all(
    images.map(async (src) => {
      if (known.has(src)) return { serverId: known.get(src) };
      let blob;
      try {
        blob = await (await fetch(src)).blob();
      } catch {
        throw new Error("One of the photos could not be read. Upload it again from your device.");
      }
      return {
        file: new File([blob], "photo.jpg", {
          type: blob.type || "image/jpeg",
        }),
      };
    }),
  );
}

/* data: the form values. Saves it, adds the photos, then publishes (or keeps it a draft).
   Returns the listing id. */
export async function saveListing(data, { publish = true } = {}) {
  const body = {
    title: data.title,
    category: await categoryId(data.category),
    description: data.description,
    price: data.price,
    /* the form's quantity is everything put up for sale; what is left is that minus what sold */
    stock: Math.max(0, Number(data.quantity) - (state.stats[data.id]?.sold || 0)),
    mrp: data.mrp || null,
    condition: data.condition,
    source: data.source,
    inventory_id: data.inventory_id || "",
    delivery: data.delivery,
    returnable: data.returnable,
    specs: data.specs,
  };
  const current = data.id ? state.rows.find((r) => r.id === data.id) : null;
  let p = current
    ? await api.update(data.id, body)
    : await api.create(body);
  const id = p.id;
  await syncPhotos(api, id, await toPhotos(data.images || [], p.images || []), p.images || []);
  p = await api.get(id);
  if (publish && p.status === "Draft") p = await api.publish(id);
  replaceRow(p);
  loadSell(true); /* the numbers */
  /* a warehouse item that is now on sale starts its sales timer */
  if (publish && !current && data.inventory_id) {
    const item = { warehouse_status: "Stored", sale_status: "Not listed" };
    if (canApplyWarehouseAction(item, "list"))
      runWarehouseAction(data.inventory_id, "list");
  }
  return id;
}

export async function setListingStatus(id, status) {
  const p = status === "Paused" ? await api.pause(id) : await api.publish(id);
  replaceRow(p);
}

export async function removeListing(id) {
  const row = state.rows.find((r) => r.id === id);
  if (row && ["Listed", "Sold_Out"].includes(row.status)) await api.pause(id);
  await api.remove(id);
  set({ rows: state.rows.filter((r) => r.id !== id) });
}

export const clearSell = () =>
  set({
    rows: [],
    stats: {},
    sales: [],
    itemSales: {},
    loaded: false,
    loading: false,
    error: "",
  });
