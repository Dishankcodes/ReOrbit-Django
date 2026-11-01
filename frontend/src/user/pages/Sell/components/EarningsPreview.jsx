import React from "react";
import { Wallet } from "lucide-react";
import { formatPrice } from "../../../../data/marketplaceData";
import { platformFeeOf, useCommerce } from "../../../../shared/commerce";

/* What the seller takes home: the full price. The buyer pays the platform fee
   (and delivery) on top, so nothing is taken from the seller. */
export function earningsFor(price, pickup, qty = 1) {
  const gross = Math.max(0, Number(price) || 0) * Math.max(1, qty);
  return { gross, commission: 0, fee: 0, net: gross };
}

export default function EarningsPreview({ price, pickup, qty }) {
  const commerce = useCommerce();
  const e = earningsFor(price, pickup, qty);
  const buyerFee = platformFeeOf(e.gross, commerce);
  return (
    <div className="sl-earn">
      <header>
        <Wallet size={16} /> You'll receive
      </header>
      <strong>{formatPrice(e.net)}</strong>
      <dl>
        <div>
          <dt>Selling price</dt>
          <dd>{formatPrice(e.gross)}</dd>
        </div>
        <div>
          <dt>Fees taken from you</dt>
          <dd>None</dd>
        </div>
        {e.gross > 0 && (
          <div>
            <dt>Buyer pays {commerce.platformFeePct}% platform fee</dt>
            <dd>{formatPrice(buyerFee)}</dd>
          </div>
        )}
        {pickup === "platform" && (
          <div>
            <dt>ReOrbit pickup and delivery</dt>
            <dd>Free for you</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
