/* ReMaker purchases are real orders now (see user/data/ordersStore.js, shared by all three portals).
   This file only keeps the date helpers and a tiny adapter the Help pages use. */
import { useMemo } from "react";

import { useOrders as useLiveOrders } from "../../user/data/ordersStore";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "pm" : "am";

  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${hours % 12 || 12}:${minutes} ${suffix}`;
}


/* purchases for the Help pages; problems are raised from the order itself, so no reports list here */
export function useOrders() {
  const orders = useLiveOrders();
  return useMemo(() => orders.map((o) => ({ ...o, reports: [] })), [orders]);
}
