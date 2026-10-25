/* =========================================================
   In-memory store for the Orders pages (UI only).
   Status changes survive moving between the list and a details
   page and reset on refresh. Backend later: swap for API calls.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";
import { INITIAL_ORDERS } from "./adminOrders";
import { SEED_SALES } from "./adminSell";

/* purchases + the admin's own sales, newest first */
let orders = [...SEED_SALES, ...INITIAL_ORDERS].sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => orders;

/* Add the derived fields the pages use. */
function withDerived(order) {
  const pay = order.transaction.payment_status;
  return {
    ...order,
    refundDue: ["Cancelled", "Returned"].includes(order.order_status) && pay === "Success",
    isCod: order.transaction.payment_method === "COD",
  };
}

/* New orders created by the admin Shop (admin is the buyer). */
export function addOrders(newOrders) {
  orders = [...newOrders, ...orders];
  emit();
}

/* Change one order in place (used by the Sell module for shipping). */
export function patchOrder(orderId, fn) {
  orders = orders.map((o) => (o.order_id === orderId ? fn(o) : o));
  emit();
}

export function useOrders() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(() => raw.map(withDerived), [raw]);
}

export function useOrder(orderId) {
  return useOrders().find((o) => o.order_id === orderId) || null;
}

/* Apply one action to one order. Writes the new status and adds a
   line to the order's timeline. */
export function runOrderAction(orderId, actionKey, reason = "") {
  const at = new Date().toISOString();
  const by = "Admin · You";

  orders = orders.map((order) => {
    if (order.order_id !== orderId) return order;
    const next = { ...order, transaction: { ...order.transaction } };
    let label = "";
    let tone = "neutral";
    let detail = by;

    switch (actionKey) {
      case "markPaid":
        next.transaction.payment_status = "Success";
        next.transaction.transaction_date = at;
        label = "Payment marked as received";
        tone = "good";
        break;
      case "confirm":
        next.order_status = "Confirmed";
        label = "Order confirmed";
        tone = "info";
        break;
      case "complete":
        next.order_status = "Completed";
        if (next.transaction.payment_method === "COD" && next.transaction.payment_status === "Pending") {
          next.transaction.payment_status = "Success";
          next.transaction.transaction_date = at;
        }
        label = "Delivered & completed";
        tone = "good";
        break;
      case "cancel":
        next.order_status = "Cancelled";
        next.cancel_reason = reason || "No reason provided.";
        if (next.transaction.payment_status === "Pending") next.transaction.payment_status = "Failed";
        label = "Order cancelled";
        tone = "bad";
        detail = `${by} · “${next.cancel_reason}”`;
        break;
      case "return":
        next.order_status = "Returned";
        next.return_reason = reason || "No reason provided.";
        label = "Order returned";
        tone = "bad";
        detail = `${by} · “${next.return_reason}”`;
        break;
      case "refund":
        next.transaction.payment_status = "Refunded";
        label = "Refund issued";
        tone = "info";
        detail = `${by} · ₹${next.amount.toLocaleString("en-IN")} returned to the buyer`;
        break;
      default:
        return order;
    }

    next.events = [{ id: `${orderId}-${actionKey}-${Date.now()}`, label, detail, at, tone }, ...next.events];
    return next;
  });
  emit();
}
