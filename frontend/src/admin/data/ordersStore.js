/* =========================================================
   Every order on the platform, from the server (GET /api/orders/admin/report/).

   The Orders and Sales screens open orders one at a time from the server. This store feeds the
   screens that need the whole picture: Dashboard, Reports, Earnings, alerts and the Sell tab badge.
   It keeps the older shape those screens already read (order_id, order_date, amount,
   order_status, transaction, seller, buyer, ...) and fills it from the server's rows, so their
   numbers are now real orders. It loads once, then refreshes every minute and whenever the tab
   comes back into view.
   ========================================================= */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { adminOrdersApi } from "../../api/orders";
import { isActive, onActive } from "../../shared/activity";

const PARTY = { platform: "Admin", remaker: "ReMaker", user: "User", admin: "Admin" };

/* the server's order statuses -> the words the numbers screens use */
function statusOf(o) {
  switch (o.status) {
    case "Pending_Payment":
      return "Pending";
    case "Delivered":
      return o.payment_status === "Refunded" ? "Returned" : "Completed";
    case "Cancelled":
      return "Cancelled";
    case "Returned_To_Origin":
      return "Returned";
    default:
      return "Confirmed"; /* Confirmed, Packed, Shipped and Delivery_Failed are all still in progress */
  }
}

/* payment: Success means money is in, Pending means it is expected, Failed means it never was */
function paymentOf(o) {
  switch (o.payment_status) {
    case "Paid":
    case "Refund_Pending":
    case "Refund_Failed":
      return "Success";
    case "Refunded":
      return "Refunded";
    case "Void":
      return "Failed";
    default:
      return "Pending"; /* Pending, COD_Due, COD_Collected: cash not with ReOrbit yet */
  }
}

export function toLegacy(o) {
  const items = o.items || [];
  const quantity = items.reduce((n, i) => n + (i.qty || 0), 0);
  const first = items[0];
  const isCod = o.method === "COD";
  return {
    order_id: o.id,
    order_date: o.created_at,
    amount: o.total,
    subtotal: o.subtotal,
    platform_fee: o.platform_fee,
    delivery_fee: o.delivery_fee,
    discount: o.discount,
    order_status: statusOf(o),
    server_status: o.status,
    cancel_reason: o.cancel_reason || "",
    transaction: {
      payment_status: paymentOf(o),
      payment_method: isCod ? "COD" : "ONLINE",
      transaction_date: o.cod_received_at || o.confirmed_at,
    },
    seller: { name: o.seller?.name || "ReOrbit", type: PARTY[o.seller?.type] || "Admin" },
    buyer: { name: o.buyer?.name || "—", type: PARTY[o.buyer?.type] || "User" },
    listing: {
      title: first ? (items.length > 1 ? `${first.title} +${items.length - 1} more` : first.title) : "Order",
      quantity: quantity || 1,
    },
    listing_ids: items.map((i) => i.ref),
    shipment: o.shipped_at ? { shipped_at: o.shipped_at } : null,
    /* the order screens read these too; the full timeline lives on the order's own page */
    events: [],
    refundDue: Boolean(o.refund_due),
    isCod,
  };
}

/* ---------- state ---------- */
let state = { orders: [], loaded: false, error: "", truncated: false };
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

let inFlight = null;
export function loadOrders({ force = false } = {}) {
  if (inFlight && !force) return inFlight;
  inFlight = adminOrdersApi
    .report()
    .then((d) =>
      set({
        orders: d.orders.map(toLegacy),
        truncated: Boolean(d.truncated),
        loaded: true,
        error: "",
      }),
    )
    .catch((e) =>
      /* an admin without the Orders permission simply has no order numbers */
      set({
        loaded: true,
        error: e.status === 403 ? "" : e.message || "Could not load orders.",
        orders: e.status === 403 ? [] : state.orders,
      }),
    )
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/* one timer and one tab listener for the whole app, started by the first screen that needs orders */
let started = false;
function startRefreshing() {
  if (started) return;
  started = true;
  window.setInterval(() => {
    if (isActive() && state.loaded) loadOrders({ force: true });
  }, 60000);
  onActive(() => state.loaded && loadOrders({ force: true }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.loaded) loadOrders({ force: true });
  });
}

function useOrdersState() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (!state.loaded) loadOrders();
    startRefreshing();
  }, []);
  return s;
}

export function useOrders() {
  const { orders } = useOrdersState();
  return useMemo(
    () => [...orders].sort((a, b) => new Date(b.order_date) - new Date(a.order_date)),
    [orders],
  );
}

export function useOrder(orderId) {
  return useOrders().find((o) => o.order_id === orderId) || null;
}

/* loaded / error / retry, for screens that show a loading or error state */
export function useOrdersStatus() {
  const s = useOrdersState();
  return {
    loaded: s.loaded,
    error: s.error,
    truncated: s.truncated,
    retry: () => loadOrders({ force: true }),
  };
}

/* Orders change on the server (the order pages do that); this just asks for the fresh list. */
export const refreshOrders = () => loadOrders({ force: true });

/* Kept so older callers still work: orders are created and changed on the server now. */
export function addOrders() {
  return refreshOrders();
}
export function patchOrder() {
  return refreshOrders();
}

/* Cancelling is the one action the old callers still use; the order pages offer the full set. */
export async function runOrderAction(orderId, actionKey, reason = "") {
  if (actionKey !== "cancel")
    throw new Error("Open the order to do this. It has every action, with the rules the server checks.");
  await adminOrdersApi.act(orderId, "cancel", { reason });
  await refreshOrders();
}
