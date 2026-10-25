/* =========================================================
   Admin › Sell products (UI only, in-memory).

   The admin lists its own products (warehouse stock, refurbished
   pieces or anything else). Buyers' orders are normal rows in the
   Orders store with seller = ReOrbit Platform, so a sale shows in
   BOTH Sell › Sales and Admin › Orders.

   Stock left is DERIVED from the orders (a cancelled or returned
   order puts the units back on its own).
   Backend later: replace with Listings / Sales APIs.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { useOrders, addOrders, patchOrder } from "./ordersStore";
import { useStock, runWarehouseAction } from "./warehouseStore";
import { canApplyWarehouseAction } from "./warehouseActions";
import {
  SEED_LISTINGS,
  SELL_BUYER_USERS,
  SELL_BUYER_REMAKERS,
  buildSaleOrder,
} from "./adminSell";
import { DEMO_TODAY } from "../utils/format";

/* ---------- state ---------- */
let state = { listings: SEED_LISTINGS, seq: 1006, saleSeq: 0, demoSeq: 0 };
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
  const { listings } = useSellState();
  const sales = useSales();
  return useMemo(
    () =>
      listings
        .map((l) => withStats(l, sales))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [listings, sales],
  );
}
export function useSellListing(id) {
  return useSellListings().find((l) => l.id === id) || null;
}

function withStats(l, sales) {
  const mine = sales.filter((o) => o.listing.id === l.id);
  const live = mine.filter((o) => !COUNTED_OUT.includes(o.order_status));
  const sold = live.reduce((n, o) => n + o.listing.quantity, 0);
  const revenue = mine
    .filter((o) => o.order_status === "Completed")
    .reduce((n, o) => n + o.amount, 0);
  const available = Math.max(0, l.quantity - sold);
  const toHandle = mine.filter((o) => needsAction(o)).length;
  let status = l.status;
  if (status === "Active" && available === 0) status = "Sold_Out";
  return {
    ...l,
    status,
    rawStatus: l.status,
    sold,
    available,
    revenue,
    orderCount: mine.length,
    toHandle,
    sales: mine,
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

/* ---------- listing CRUD ---------- */
/* data: the form values. Returns the listing id. */
export function saveListing(data, { publish = true } = {}) {
  const status = publish ? "Active" : "Draft";
  if (data.id) {
    set({
      listings: state.listings.map((l) =>
        l.id === data.id
          ? {
              ...l,
              ...data,
              status: l.status === "Paused" && publish ? "Paused" : status,
            }
          : l,
      ),
    });
    return data.id;
  }
  const id = `ADL-${state.seq + 1}`;
  const listing = {
    views: 0,
    wishlisted: 0,
    ...data,
    id,
    status,
    created_at: DEMO_TODAY.toISOString(),
  };
  set({ listings: [listing, ...state.listings], seq: state.seq + 1 });
  /* a warehouse item that is now on sale starts its sales timer */
  if (publish && data.inventory_id) {
    const item = { warehouse_status: "Stored", sale_status: "Not listed" };
    if (canApplyWarehouseAction(item, "list"))
      runWarehouseAction(data.inventory_id, "list");
  }
  return id;
}
export function setListingStatus(id, status) {
  set({
    listings: state.listings.map((l) => (l.id === id ? { ...l, status } : l)),
  });
}
export function removeListing(id) {
  set({ listings: state.listings.filter((l) => l.id !== id) });
}

/* ---------- selling-order actions ---------- */
export function shipSale(orderId, { courier, tracking }) {
  const at = new Date().toISOString();
  patchOrder(orderId, (o) => ({
    ...o,
    shipment: { courier, tracking, shipped_at: at },
    events: [
      {
        id: `${orderId}-ship`,
        label: "Shipped",
        detail: `${courier} · ${tracking}`,
        at,
        tone: "info",
      },
      ...o.events,
    ],
  }));
}

/* Demo helper: pretend a buyer just ordered this listing. */
export function simulateBuyerOrder(listing) {
  const demo = state.demoSeq + 1;
  const toRemaker = demo % 4 === 0;
  const pool = toRemaker ? SELL_BUYER_REMAKERS : SELL_BUYER_USERS;
  const buyerPerson = pool[(demo * 3 + listing.id.length) % pool.length];
  const methods = ["UPI", "CARD", "COD", "NET_BANKING", "WALLET"];
  const method = methods[demo % methods.length];
  const isCod = method === "COD";
  const seq = 59000 + demo;
  const order = buildSaleOrder({
    seq,
    listing,
    qty: 1,
    buyerPerson,
    buyerKind: toRemaker ? "ReMaker" : "User",
    placed: new Date(DEMO_TODAY.getTime() + demo * 1000),
    status: "Pending",
    method,
    payment: isCod ? "Pending" : demo % 3 === 0 ? "Pending" : "Pending",
    shipment: null,
    cancelReason: "",
    returnReason: "",
  });
  /* online payers have usually paid by the time the seller sees it */
  if (!isCod && demo % 3 !== 0) {
    order.transaction = {
      ...order.transaction,
      payment_status: "Success",
      transaction_date: order.order_date,
    };
    order.events = order.events.map((e) =>
      e.id === "payment"
        ? {
            ...e,
            label: "Payment received",
            detail: `${method.replace("_", " ")} · paid`,
            tone: "good",
            pending: false,
          }
        : e,
    );
  }
  addOrders([order]);
  set({ demoSeq: demo });
  return order;
}
