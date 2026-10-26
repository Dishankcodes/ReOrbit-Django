import React from "react";
import { Wallet } from "lucide-react";
import { COMMISSION_PCT, PLATFORM_PICKUP_FEE } from "../../../data/listingsStore";
import { formatPrice } from "../../../../data/marketplaceData";

/* What the seller takes home for a price + pickup choice. */
export function earningsFor(price, pickup, qty = 1) {
  const gross = Math.max(0, Number(price) || 0) * Math.max(1, qty);
  const commission = Math.round((gross * COMMISSION_PCT) / 100);
  const fee = pickup === "platform" && gross > 0 ? PLATFORM_PICKUP_FEE : 0;
  return { gross, commission, fee, net: Math.max(0, gross - commission - fee) };
}

export default function EarningsPreview({ price, pickup, qty }) {
  const e = earningsFor(price, pickup, qty);
  return (
    <div className="sl-earn">
      <header><Wallet size={16} /> You'll receive</header>
      <strong>{formatPrice(e.net)}</strong>
      <dl>
        <div><dt>Selling price</dt><dd>{formatPrice(e.gross)}</dd></div>
        <div><dt>ReOrbit commission ({COMMISSION_PCT}%)</dt><dd>− {formatPrice(e.commission)}</dd></div>
        {pickup === "platform" && <div><dt>Managed pickup fee</dt><dd>− {formatPrice(e.fee)}</dd></div>}
      </dl>
    </div>
  );
}
