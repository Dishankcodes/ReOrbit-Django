/* =========================================================
   Shared › Commerce rules.
   One place that User and ReMaker read the money rules the
   admin sets in Settings > Commerce:
   - platform fee (charged to the BUYER on member orders)
   - delivery fees and the free-delivery limit
   - cash on delivery (on/off and the order limit)
   Changing a value in Admin Settings changes the numbers
   everywhere. Backend later: one GET /settings/commerce.
   ========================================================= */

import { getSettings, useSettings } from "../admin/data/settingsStore";

export const getCommerce = () => getSettings().commerce;
export const useCommerce = () => useSettings().commerce;

const num = (v) => Number(v) || 0;

/* The buyer pays this on top of the price. The seller keeps the full price. */
export const platformFeeOf = (subtotal, c = getCommerce()) =>
  Math.round((num(subtotal) * num(c.platformFeePct)) / 100);

/* Delivery for one order line.
   - Member items (user listings): free when the seller hands it to the
     courier, `itemDelivery` when ReOrbit manages the pickup and delivery.
   - ReMaker products: `productDelivery`, free from `freeDeliveryFrom`. */
export function deliveryFor(
  { sellerType, pickup, subtotal },
  c = getCommerce(),
) {
  if (sellerType === "user") {
    return pickup === "platform" || pickup === "Managed by platform"
      ? num(c.itemDelivery)
      : 0;
  }
  return num(subtotal) >= num(c.freeDeliveryFrom) ? 0 : num(c.productDelivery);
}

/* Cash on delivery: off, or too large an order. Returns "" when allowed. */
export function codBlockReason(total, c = getCommerce()) {
  if (!c.codEnabled) return "Pay on delivery is switched off right now.";
  if (num(total) > num(c.codLimit))
    return `Pay on delivery is available for orders up to ₹${num(c.codLimit).toLocaleString("en-IN")}.`;
  return "";
}

export const feeLabel = (c = getCommerce()) =>
  `Platform fee (${num(c.platformFeePct)}%)`;

/* What a seller keeps: the full price. No commission is taken from sellers. */
export const sellerKeeps = (gross) => num(gross);
