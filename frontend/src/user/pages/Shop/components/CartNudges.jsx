import React from "react";
import { Tag, Truck } from "lucide-react";

import { formatPrice } from "../../../../data/marketplaceData";

/* Small helpers under the cart / checkout summary, all worked out by the server (quote):
   - "Add ₹X more from <seller> for free delivery", with a progress bar, for each order that still pays
     delivery and has a free-delivery limit (ReOrbit store, ReOrbit-delivered ReMaker pieces);
   - sale items: what they already save, and that coupons don't apply to them (Zomato-style "not on
     offer items"). `showCoupon` adds the coupon line (checkout, where the code box is). */
export default function CartNudges({ quote, showCoupon = false }) {
  if (!quote) return null;
  const gaps = (quote.groups || []).filter((g) => g.free_delivery && g.free_delivery.gap > 0);
  const sale = quote.sale_items > 0;
  if (!gaps.length && !sale) return null;
  return (
    <div className="ushp-nudges">
      {gaps.map((g) => {
        const { from, gap } = g.free_delivery;
        const pct = Math.min(100, Math.round(((from - gap) / from) * 100));
        const who = g.seller.type === "platform" ? "ReOrbit" : g.seller.name;
        return (
          <div key={`${g.seller.type}-${g.seller.id}`} className="ushp-nudge">
            <p>
              <Truck size={14} />
              <span>
                Add <b>{formatPrice(gap)}</b> more {quote.groups.length > 1 ? `from ${who} ` : ""}to get{" "}
                <b>free delivery</b> (saves {formatPrice(g.delivery_fee)}).
              </span>
            </p>
            <span className="ushp-nudge-bar" aria-hidden="true">
              <i style={{ width: `${pct}%` }} />
            </span>
          </div>
        );
      })}
      {sale && (
        <p className="ushp-nudge ushp-nudge--sale">
          <Tag size={14} />
          <span>
            {quote.sale_savings > 0 && (
              <>
                You save <b>{formatPrice(quote.sale_savings)}</b> on sale items.{" "}
              </>
            )}
            {showCoupon &&
              (quote.coupon_eligible > 0
                ? `Coupons apply to the other ${formatPrice(quote.coupon_eligible)} only.`
                : "Sale items aren't eligible for coupons.")}
            {!showCoupon && "They aren't eligible for coupons."}
          </span>
        </p>
      )}
    </div>
  );
}
