import React from "react";

import { describeOrder } from "../../../data/customersStore";

/* Status pill for one real order (same tones as the Orders pages). */
export default function OrderStatusBadge({ order }) {
  const [label, tone] = describeOrder(order);

  return <span className={`rod-badge ${tone}`}>{label}</span>;
}
