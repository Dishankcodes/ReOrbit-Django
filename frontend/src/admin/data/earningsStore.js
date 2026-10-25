/* Earnings: how ReOrbit itself makes (and spends) money.

   Income
   - Platform fee: added to every order a User or ReMaker places
     (buyer.type is not "Admin"). Orders the platform buys carry no fee.
   - Product sales: the platform's own warehouse / refurbished products
     (seller.type is "Admin"), plus the delivery charges collected on them.
   Money out
   - Refunds: fees and sales given back on refunded orders.
   - Purchases: what the platform spends buying products (buyer.type "Admin").

   "Earned" means payment received and the order confirmed or completed,
   the same rule as Reports. Everything here is derived from the orders list,
   so it always agrees with Orders, Buy Products and Sell Products. */
import { useMemo } from "react";
import { DEMO_TODAY } from "../utils/format";
import { useOrders } from "./ordersStore";
import { useSettings } from "./settingsStore";
import { RANGES, DAY, makeBuckets, inB } from "./reportsStore";

export { RANGES };
const t = (v) => new Date(v).getTime();
const sum = (arr, f) => arr.reduce((n, x) => n + (f(x) || 0), 0);
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

const earnedOrder = (o) =>
  o.transaction.payment_status === "Success" &&
  ["Confirmed", "Completed"].includes(o.order_status);
const pendingOrder = (o) =>
  o.transaction.payment_status === "Pending" &&
  ["Pending", "Confirmed"].includes(o.order_status);
const refundedOrder = (o) => o.transaction.payment_status === "Refunded";
const feeOf = (o) => (o.buyer?.type !== "Admin" ? o.platform_fee || 0 : 0);
const isOwnSale = (o) => o.seller?.type === "Admin";
const isOwnBuy = (o) => o.buyer?.type === "Admin";
const saleOf = (o) => (isOwnSale(o) ? o.subtotal || 0 : 0);
const deliveryOf = (o) => (isOwnSale(o) ? o.delivery_fee || 0 : 0);
const refundOf = (o) => feeOf(o) + saleOf(o) + deliveryOf(o);

function totals(list) {
  const earned = list.filter(earnedOrder);
  const fees = sum(earned, feeOf);
  const sales = sum(earned, saleOf);
  const delivery = sum(earned, deliveryOf);
  const refunds = sum(list.filter(refundedOrder), refundOf);
  const purchases = sum(earned.filter(isOwnBuy), (o) => o.amount);
  const earnings = fees + sales + delivery - refunds;
  return {
    fees,
    sales,
    delivery,
    refunds,
    purchases,
    earnings,
    net: earnings - purchases,
  };
}

export function useEarnings(rangeKey) {
  const orders = useOrders();
  const { commerce } = useSettings();

  return useMemo(() => {
    const range = RANGES.find((r) => r.key === rangeKey) || RANGES[1];
    const end = DEMO_TODAY.getTime();
    const start = end - range.days * DAY;
    const prevStart = start - range.days * DAY;
    const weekly = range.days <= 60;
    const buckets = makeBuckets(start, end, weekly);

    const inRange = orders.filter(
      (o) => t(o.order_date) >= start && t(o.order_date) <= end,
    );
    const inPrev = orders.filter(
      (o) => t(o.order_date) >= prevStart && t(o.order_date) < start,
    );
    const cur = totals(inRange);
    const prev = totals(inPrev);

    /* trend + running total */
    let running = 0;
    const trend = buckets.map((b) => {
      const list = inRange.filter((o) => inB(b, o.order_date));
      const tt = totals(list);
      running += tt.earnings;
      return {
        label: b.label,
        "Platform fees": tt.fees,
        "Product sales": tt.sales + tt.delivery,
        refunds: tt.refunds,
        earnings: tt.earnings,
        purchases: tt.purchases,
        cumulative: running,
      };
    });

    /* waterfall: income, deductions, subtotals */
    const flow = [
      { key: "fees", label: "Platform fees", value: cur.fees, kind: "gain" },
      {
        key: "sales",
        label: "Product sales",
        value: cur.sales + cur.delivery,
        kind: "gain",
      },
      { key: "refunds", label: "Refunds", value: -cur.refunds, kind: "loss" },
      {
        key: "earnings",
        label: "Earnings",
        value: cur.earnings,
        kind: "total",
      },
      {
        key: "purchases",
        label: "Purchases",
        value: -cur.purchases,
        kind: "loss",
      },
      { key: "net", label: "Net cash flow", value: cur.net, kind: "total" },
    ];

    /* where the fee comes from */
    const feeOrders = inRange.filter((o) => earnedOrder(o) && feeOf(o) > 0);
    const group = (list, keyFn, valFn) => {
      const m = new Map();
      list.forEach((x) => {
        const k = keyFn(x);
        m.set(k, (m.get(k) || 0) + valFn(x));
      });
      return [...m.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    };
    const feeByCategory = group(
      feeOrders,
      (o) => o.listing?.category || "Other",
      feeOf,
    ).slice(0, 6);
    const feeByBuyer = group(feeOrders, (o) => o.buyer?.type || "User", feeOf);
    const feeBySeller = group(
      feeOrders,
      (o) =>
        o.seller?.type === "Admin"
          ? "Platform products"
          : o.seller?.type === "ReMaker"
            ? "ReMaker products"
            : "Member items",
      feeOf,
    );
    const salesByCategory = group(
      inRange.filter((o) => earnedOrder(o) && isOwnSale(o)),
      (o) => o.listing?.category || "Other",
      (o) => saleOf(o) + deliveryOf(o),
    ).slice(0, 6);

    const sellerMap = new Map();
    feeOrders.forEach((o) => {
      const k = `${o.seller?.name || "ReOrbit"}|${o.seller?.type}`;
      const c = sellerMap.get(k) || {
        name: o.seller?.name || "ReOrbit",
        type: o.seller?.type || "Admin",
        orders: 0,
        fee: 0,
        volume: 0,
      };
      c.orders += 1;
      c.fee += feeOf(o);
      c.volume += o.subtotal || 0;
      sellerMap.set(k, c);
    });
    const topSellers = [...sellerMap.values()]
      .sort((a, b) => b.fee - a.fee)
      .slice(0, 6);

    /* money still to come in */
    const pendingList = inRange.filter(pendingOrder);
    const pending = {
      orders: pendingList.length,
      fees: sum(pendingList, feeOf),
      sales: sum(pendingList, (o) => saleOf(o) + deliveryOf(o)),
    };

    /* every money event, newest first */
    const entries = [];
    inRange.forEach((o) => {
      const base = {
        order_id: o.order_id,
        at: o.order_date,
        party: o.buyer?.name || "—",
        title: o.listing?.title || "Order",
      };
      const status = earnedOrder(o)
        ? "Earned"
        : refundedOrder(o)
          ? "Refunded"
          : pendingOrder(o)
            ? "Pending"
            : null;
      if (!status) return;
      const sign = status === "Refunded" ? -1 : 1;
      if (feeOf(o) > 0)
        entries.push({
          ...base,
          id: `${o.order_id}-fee`,
          type: "Platform fee",
          amount: sign * feeOf(o),
          status,
        });
      if (saleOf(o) > 0)
        entries.push({
          ...base,
          id: `${o.order_id}-sale`,
          type: "Product sale",
          amount: sign * (saleOf(o) + deliveryOf(o)),
          status,
        });
      if (isOwnBuy(o) && status === "Earned")
        entries.push({
          ...base,
          id: `${o.order_id}-buy`,
          type: "Purchase",
          amount: -o.amount,
          status: "Spent",
          party: o.seller?.name || "—",
        });
    });
    entries.sort((a, b) => t(b.at) - t(a.at));

    const gmvEligible = sum(
      inRange.filter((o) => earnedOrder(o) && feeOf(o) > 0),
      (o) => o.subtotal,
    );
    return {
      range,
      start,
      end,
      weekly,
      cur,
      prev,
      trend,
      flow,
      feeByCategory,
      feeByBuyer,
      feeBySeller,
      salesByCategory,
      topSellers,
      pending,
      entries,
      takeRate: pct(cur.fees, gmvEligible),
      feeOrders: feeOrders.length,
      feePct: commerce.platformFeePct,
    };
  }, [orders, rangeKey, commerce.platformFeePct]);
}
