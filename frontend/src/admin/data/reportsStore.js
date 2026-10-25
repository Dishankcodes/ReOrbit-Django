/* Reports: pure aggregation over every module store. No state of its own,
   so numbers always agree with the Orders / Donations / Warehouse pages. */
import { useMemo } from "react";
import { DEMO_TODAY } from "../utils/format";
import { useOrders } from "./ordersStore";
import { useDonations } from "./donationsStore";
import { usePickups } from "./pickupsStore";
import { useStock } from "./warehouseStore";
import { useUsers } from "./usersStore";
import { useRemakers } from "./remakersStore";
import { useRedemptions, useDonationRewards } from "./rewardsStore";

export const RANGES = [
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "6m", label: "Last 6 months", days: 182 },
  { key: "12m", label: "Last 12 months", days: 365 },
  { key: "all", label: "All time", days: 1200 },
];

export const DAY = 86400000;
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
const t = (v) => new Date(v).getTime();
const sum = (arr, f) => arr.reduce((n, x) => n + (f(x) || 0), 0);

/* group a list into labelled buckets: weekly for short ranges, monthly otherwise */
export function makeBuckets(start, end, weekly) {
  const out = [];
  if (weekly) {
    for (let s = start; s < end; s += 7 * DAY) {
      const d = new Date(s);
      out.push({
        from: s,
        to: Math.min(s + 7 * DAY, end + 1),
        label: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
      });
    }
  } else {
    const d = new Date(start);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    while (d.getTime() <= end) {
      const from = d.getTime();
      const n = new Date(d);
      n.setMonth(n.getMonth() + 1);
      out.push({
        from: Math.max(from, start),
        to: n.getTime(),
        label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      });
      d.setMonth(d.getMonth() + 1);
    }
  }
  return out;
}
export const inB = (b, v) => t(v) >= b.from && t(v) < b.to;

function tally(list, keyFn, valFn = () => 1) {
  const m = new Map();
  list.forEach((x) => {
    const k = keyFn(x);
    if (k == null) return;
    m.set(k, (m.get(k) || 0) + valFn(x));
  });
  return [...m.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}
/* keep the top N and fold the rest into "Other" (never invent a 5th colour) */
function topN(rows, n) {
  if (rows.length <= n) return rows;
  const head = rows.slice(0, n - 1);
  return [
    ...head,
    { label: "Other", value: sum(rows.slice(n - 1), (r) => r.value) },
  ];
}
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

export function useReport(rangeKey) {
  const orders = useOrders();
  const donations = useDonations();
  const pickups = usePickups();
  const stock = useStock();
  const users = useUsers();
  const remakers = useRemakers();
  const redemptions = useRedemptions();
  const donationRewards = useDonationRewards();

  return useMemo(() => {
    const range = RANGES.find((r) => r.key === rangeKey) || RANGES[1];
    const end = DEMO_TODAY.getTime();
    const start = end - range.days * DAY;
    const prevStart = start - range.days * DAY;
    const weekly = range.days <= 60;
    const buckets = makeBuckets(start, end, weekly);

    const inRange = (v) => t(v) >= start && t(v) <= end;
    const inPrev = (v) => t(v) >= prevStart && t(v) < start;

    /* ---------- orders / revenue ---------- */
    const ordersIn = orders.filter((o) => inRange(o.order_date));
    const ordersPrev = orders.filter((o) => inPrev(o.order_date));
    const paid = (o) =>
      o.transaction.payment_status === "Success" &&
      ["Confirmed", "Completed"].includes(o.order_status);
    const gmv = (list) => sum(list.filter(paid), (o) => o.amount);
    const fees = (list) => sum(list.filter(paid), (o) => o.platform_fee);
    const refunds = (list) =>
      sum(
        list.filter((o) => o.transaction.payment_status === "Refunded"),
        (o) => o.amount,
      );

    const trend = buckets.map((b) => {
      const list = ordersIn.filter((o) => inB(b, o.order_date));
      return {
        label: b.label,
        revenue: gmv(list),
        fees: fees(list),
        orders: list.length,
        refunds: refunds(list),
      };
    });

    const statuses = [
      "Completed",
      "Confirmed",
      "Pending",
      "Cancelled",
      "Returned",
    ];
    const statusRows = statuses.map((s) => ({
      label: s,
      value: ordersIn.filter((o) => o.order_status === s).length,
    }));

    const flowRows = tally(
      ordersIn.filter(paid),
      (o) => o.flow,
      (o) => o.amount,
    );
    const categoryRows = tally(
      ordersIn.filter(paid),
      (o) => o.listing?.category || "Other",
      (o) => o.amount,
    );
    const payRows = tally(ordersIn, (o) =>
      (o.transaction.payment_method || "Other").replace(/_/g, " "),
    );
    const kindRows = [
      {
        label: "Platform products",
        value: gmv(ordersIn.filter((o) => o.listing?.kind === "product")),
      },
      {
        label: "Member items",
        value: gmv(ordersIn.filter((o) => o.listing?.kind === "item")),
      },
    ];

    const sellerMap = new Map();
    ordersIn.filter(paid).forEach((o) => {
      const k = `${o.seller?.name || "ReOrbit"}|${o.seller?.type || "Admin"}`;
      const cur = sellerMap.get(k) || {
        name: o.seller?.name || "ReOrbit",
        type: o.seller?.type || "Admin",
        orders: 0,
        revenue: 0,
      };
      cur.orders += 1;
      cur.revenue += o.amount;
      sellerMap.set(k, cur);
    });
    const topSellers = [...sellerMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const orderKpi = {
      revenue: gmv(ordersIn),
      revenuePrev: gmv(ordersPrev),
      orders: ordersIn.length,
      ordersPrev: ordersPrev.length,
      fees: fees(ordersIn),
      feesPrev: fees(ordersPrev),
      aov: ordersIn.filter(paid).length
        ? Math.round(gmv(ordersIn) / ordersIn.filter(paid).length)
        : 0,
      refunds: refunds(ordersIn),
      cancelRate: pct(
        ordersIn.filter((o) =>
          ["Cancelled", "Returned"].includes(o.order_status),
        ).length,
        ordersIn.length,
      ),
    };

    /* ---------- donations & pickups ---------- */
    const donIn = donations.filter((d) => inRange(d.donation_date));
    const donPrev = donations.filter((d) => inPrev(d.donation_date));
    const donTrend = buckets.map((b) => {
      const list = donIn.filter((d) => inB(b, d.donation_date));
      return {
        label: b.label,
        Completed: list.filter((d) => d.status === "Completed").length,
        "In progress": list.filter((d) =>
          ["Scheduled", "Picked_Up", "Received", "Accepted"].includes(d.status),
        ).length,
        Pending: list.filter((d) => d.status === "Pending").length,
        Rejected: list.filter((d) => d.status === "Rejected").length,
      };
    });
    const donCats = topN(
      tally(
        donIn,
        (d) => d.category,
        (d) => d.quantity,
      ),
      5,
    );
    const donStatus = tally(donIn, (d) => d.status.replace(/_/g, " "));
    const donKpi = {
      total: donIn.length,
      totalPrev: donPrev.length,
      items: sum(donIn, (d) => d.quantity),
      weight: Math.round(
        sum(
          donIn.filter((d) =>
            ["Picked_Up", "Received", "Completed"].includes(d.status),
          ),
          (d) => d.weight_kg,
        ),
      ),
      completion: pct(
        donIn.filter((d) => d.status === "Completed").length,
        donIn.filter((d) => d.status !== "Pending").length,
      ),
      pending: donations.filter((d) => d.status === "Pending").length,
    };

    const pkIn = pickups.filter((p) =>
      inRange(p.requested_at || p.date || DEMO_TODAY),
    );
    const pkStatus = [
      "Requested",
      "Scheduled",
      "Picked_Up",
      "Completed",
      "Cancelled",
    ].map((s) => ({
      label: s.replace(/_/g, " "),
      value: pkIn.filter((p) => p.status === s).length,
    }));
    const pkAgents = tally(
      pkIn.filter((p) => p.agent),
      (p) => p.agent,
    );
    const pkKpi = {
      total: pkIn.length,
      done: pkIn.filter((p) => p.status === "Completed").length,
      overdue: pkIn.filter((p) => p.due?.overdue || p.due?.tone === "bad")
        .length,
      cancelRate: pct(
        pkIn.filter((p) => p.status === "Cancelled").length,
        pkIn.length,
      ),
    };

    /* ---------- warehouse ---------- */
    const wh = stock.filter(
      (i) => i.warehouse_status !== "Released" || i.sale_status === "Donated",
    );
    const whStatus = [
      "Received",
      "Stored",
      "Assigned",
      "Refurbishment",
      "Released",
    ].map((s) => ({
      label: s,
      value: stock.filter((i) => i.warehouse_status === s).length,
    }));
    const whSale = ["Listed", "Not listed", "Sold", "Donated"].map((s) => ({
      label: s,
      value: stock.filter((i) => i.sale_status === s).length,
    }));
    const whCats = topN(
      tally(
        stock,
        (i) => i.category,
        (i) => i.list_price || 0,
      ),
      5,
    );
    const aging = [
      { label: "0–7 days", min: 0, max: 7 },
      { label: "8–14 days", min: 8, max: 14 },
      { label: "15–30 days", min: 15, max: 30 },
      { label: "31+ days", min: 31, max: 9999 },
    ].map((b) => ({
      label: b.label,
      value: stock.filter(
        (i) =>
          i.sale_status === "Listed" &&
          i.daysListed >= b.min &&
          i.daysListed <= b.max,
      ).length,
    }));
    const whKpi = {
      items: stock.length,
      value: sum(
        stock.filter((i) => i.warehouse_status !== "Released"),
        (i) => i.list_price,
      ),
      listed: stock.filter((i) => i.sale_status === "Listed").length,
      alerts: stock.filter((i) => i.alert).length,
      sold: stock.filter((i) => i.sale_status === "Sold").length,
      sellThrough: pct(
        stock.filter((i) => i.sale_status === "Sold").length,
        stock.filter((i) => ["Listed", "Sold"].includes(i.sale_status)).length,
      ),
    };
    const stale = stock
      .filter((i) => i.alert)
      .sort((a, b) => b.daysListed - a.daysListed)
      .slice(0, 8);

    /* ---------- community ---------- */
    const joined = (u) =>
      u.created_at ||
      u.joined ||
      u.joined_at ||
      u.profile?.joined ||
      u.registered_at;
    const alive = (u) => u.status !== "Deleted";
    const userTrend = buckets.map((b) => ({
      label: b.label,
      Users: users.filter((u) => joined(u) && inB(b, joined(u))).length,
      ReMakers: remakers.filter((r) => joined(r) && inB(b, joined(r))).length,
    }));
    const userStatus = tally(users, (u) => u.status);
    const remakerStatus = tally(remakers, (u) => u.status);
    const cities = topN(
      tally(
        [...users, ...remakers].filter(alive),
        (u) => u.profile?.city || u.city || "Unknown",
      ),
      6,
    );
    const redIn = redemptions.filter((r) => inRange(r.at));
    const pointsIssued = sum(
      donationRewards.filter((r) => r.status === "Credited" && inRange(r.at)),
      (r) => r.points,
    );
    const comKpi = {
      users: users.filter(alive).length,
      remakers: remakers.filter(alive).length,
      newInRange:
        users.filter((u) => joined(u) && inRange(joined(u))).length +
        remakers.filter((r) => joined(r) && inRange(joined(r))).length,
      suspended:
        users.filter((u) => ["Suspended", "Blocked"].includes(u.status))
          .length +
        remakers.filter((r) => ["Suspended", "Blocked"].includes(r.status))
          .length,
      redemptions: redIn.length,
      pointsIssued,
    };

    return {
      range,
      start,
      end,
      weekly,
      orders: {
        kpi: orderKpi,
        trend,
        statusRows,
        flowRows,
        categoryRows,
        payRows,
        kindRows,
        topSellers,
      },
      donations: {
        kpi: donKpi,
        trend: donTrend,
        cats: donCats,
        status: donStatus,
        pk: { kpi: pkKpi, status: pkStatus, agents: pkAgents },
      },
      warehouse: {
        kpi: whKpi,
        status: whStatus,
        sale: whSale,
        cats: whCats,
        aging,
        stale,
      },
      community: {
        kpi: comKpi,
        trend: userTrend,
        userStatus,
        remakerStatus,
        cities,
      },
      _wh: wh.length,
    };
  }, [
    orders,
    donations,
    pickups,
    stock,
    users,
    remakers,
    redemptions,
    donationRewards,
    rangeKey,
  ]);
}

/* ---------- CSV ---------- */
export function toCsv(columns, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    columns.map((c) => esc(c.label)).join(","),
    ...rows.map((r) => columns.map((c) => esc(r[c.key])).join(",")),
  ].join("\n");
}
export function downloadCsv(name, csv) {
  try {
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  } catch {
    /* ignore */
  }
}
