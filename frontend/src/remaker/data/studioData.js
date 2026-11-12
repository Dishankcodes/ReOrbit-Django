/* Real numbers for the ReMaker home screen: the studio's own orders, listings and wallet.
   Nothing here is sample data. */
import { useEffect, useMemo, useState } from "react";

import { salesApi } from "../../api/orders";
import { walletApi } from "../../api/payouts";
import { remakerProductApi } from "../../api/products";

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
const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const short = (n) =>
  n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000
      ? `₹${+(n / 1000).toFixed(1)}k`
      : `₹${Math.round(n)}`;

async function loadOrders() {
  const first = await salesApi.list("?page_size=100");
  let rows = first.results;
  for (let p = 2; p <= Math.min(first.total_pages || 1, 5); p += 1)
    rows = rows.concat(
      (await salesApi.list(`?page_size=100&page=${p}`)).results,
    );
  return rows;
}

export function useStudio() {
  const [raw, setRaw] = useState({
    loading: true,
    error: "",
    orders: [],
    listed: 0,
    available: 0,
  });

  useEffect(() => {
    let live = true;
    Promise.all([
      loadOrders(),
      remakerProductApi
        .list("?status=Listed&page_size=1")
        .then((r) => r.count)
        .catch(() => 0),
      walletApi
        .get()
        .then((w) => w.balances?.available || 0)
        .catch(() => 0),
    ])
      .then(
        ([orders, listed, available]) =>
          live &&
          setRaw({ loading: false, error: "", orders, listed, available }),
      )
      .catch(
        (e) =>
          live &&
          setRaw((s) => ({
            ...s,
            loading: false,
            error: e.message || "Could not load your studio numbers.",
          })),
      );
    return () => {
      live = false;
    };
  }, []);

  return useMemo(() => {
    const { orders } = raw;
    const now = new Date();
    const delivered = orders.filter(
      (o) =>
        o.status === "Delivered" &&
        !(o.return && o.return.status === "Refunded"),
    );
    const earn = (o) => o.seller_earning || 0;
    const inMonth = (o, back) => {
      const d = new Date(o.delivered_at || o.created_at);
      const ref = new Date(now.getFullYear(), now.getMonth() - back, 1);
      return (
        d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
      );
    };
    const months = Array.from({ length: 12 }, (_, i) => {
      const ref = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return {
        label: MONTHS[ref.getMonth()],
        value: delivered
          .filter((o) => inMonth(o, 11 - i))
          .reduce((n, o) => n + earn(o), 0),
      };
    });
    const total = delivered.reduce((n, o) => n + earn(o), 0);
    const thisMonth = months[11].value;
    const lastMonth = months[10].value;
    const growth =
      lastMonth > 0
        ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
        : null;
    const count = (...st) => orders.filter((o) => st.includes(o.status)).length;
    const finished = count(
      "Delivered",
      "Delivery_Failed",
      "Returned_To_Origin",
      "Cancelled",
    );
    const items = new Map();
    delivered.forEach((o) =>
      o.items.forEach((l) => {
        const row = items.get(l.title) || {
          name: l.title,
          sales: 0,
          revenue: 0,
        };
        row.sales += l.qty;
        row.revenue += l.line_total;
        items.set(l.title, row);
      }),
    );
    return {
      ...raw,
      inr,
      short,
      total,
      thisMonth,
      growth,
      months,
      chartMax: Math.max(1, ...months.map((m) => m.value)),
      confirmed: orders.filter((o) => o.status !== "Pending_Payment").length,
      toFulfil: count("Confirmed", "Packed"),
      pipeline: {
        pending: count("Confirmed"),
        processing: count("Packed"),
        shipped: count("Shipped"),
        delivered: count("Delivered"),
      },
      deliveredCount: delivered.length,
      deliveryRate: finished
        ? Math.round((count("Delivered") / finished) * 100)
        : null,
      avgOrder: delivered.length ? total / delivered.length : 0,
      openReturns: orders.filter(
        (o) =>
          o.return &&
          ["Requested", "Approved", "Escalated"].includes(o.return.status),
      ).length,
      itemsSold: delivered.reduce(
        (n, o) => n + o.items.reduce((m, l) => m + l.qty, 0),
        0,
      ),
      top: [...items.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3),
      recent: orders.filter((o) => o.status !== "Pending_Payment").slice(0, 4),
    };
  }, [raw]);
}
