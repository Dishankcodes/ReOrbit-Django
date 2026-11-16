/* =========================================================
   REMAKER CUSTOMERS - real data from the backend.
   The server groups this ReMaker's confirmed orders by buyer
   (GET /orders/sales/customers/). Nothing is kept in the browser.
   ========================================================= */

import { useCallback, useEffect, useRef, useState } from "react";

import { customersApi } from "../../api/orders";

/* Runs `load()` on mount and exposes { data, loading, error, notFound, reload }. */
function useRemote(load, deps) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: "",
    notFound: false,
  });
  const seq = useRef(0);

  const run = useCallback(() => {
    const mine = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: "", notFound: false }));

    load()
      .then((data) => {
        if (mine === seq.current)
          setState({ data, loading: false, error: "", notFound: false });
      })
      .catch((error) => {
        if (mine !== seq.current) return;
        const notFound = error.status === 404;
        setState({
          data: null,
          loading: false,
          notFound,
          error: notFound
            ? ""
            : error.message || "Could not load customers. Try again.",
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, reload: run };
}

export function useCustomers() {
  const result = useRemote(() => customersApi.list(), []);

  return {
    ...result,
    customers: result.data?.customers || [],
  };
}

export function useCustomer(id) {
  const result = useRemote(() => customersApi.get(id), [id]);

  return {
    ...result,
    customer: result.data?.customer || null,
    orders: result.data?.orders || [],
  };
}

/* ---------- display helpers ---------- */

export function relativeTime(iso) {
  if (!iso) return "-";

  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 60) return `${days} ${days === 1 ? "day" : "days"} ago`;

  return new Date(iso).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

export const formatDay = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

export const formatMonth = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : "";

/* Status of one order, in the words and tones the ReMaker order pages use. */
const STATUS = {
  Pending_Payment: ["Waiting for payment", "pending"],
  Confirmed: ["To pack", "pending"],
  Packed: ["To ship", "pending"],
  Shipped: ["On the way", "active"],
  Delivered: ["Delivered", "done"],
  Cancelled: ["Cancelled", "cancelled"],
  Delivery_Failed: ["Not delivered", "cancelled"],
  Returned_To_Origin: ["Returned to you", "returned"],
};

export function describeOrder(order) {
  if (order.return?.status === "Refunded") return ["Refunded", "returned"];
  if (order.return && ["Requested", "Approved", "Escalated"].includes(order.return.status))
    return ["Return requested", "pending"];

  return STATUS[order.status] || [order.status, "pending"];
}
