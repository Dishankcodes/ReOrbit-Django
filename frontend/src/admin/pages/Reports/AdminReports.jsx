import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutDashboard, IndianRupee, ShoppingBag, Percent, Receipt, HeartHandshake, Package, Truck, Scale, Warehouse, Boxes, Tag, AlertTriangle, TrendingUp, Users, Hammer, UserPlus, ShieldAlert, Gift, Coins, Download, CalendarDays } from "lucide-react";

import { useReport, RANGES, toCsv, downloadCsv } from "../../data/reportsStore";
import { formatDate } from "../../utils/format";
import { ChartCard, LineChart, StackedBars, BarList, Tile, delta, SERIES, inr, compactInr, num } from "./charts";

import "../../css/AdminUI.css";
import "../../css/reports/AdminReports.css";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "sales", label: "Sales & revenue", icon: IndianRupee },
  { key: "donations", label: "Donations & pickups", icon: HeartHandshake },
  { key: "warehouse", label: "Warehouse", icon: Warehouse },
  { key: "community", label: "Community", icon: Users },
];
const S = (keys, labels) => keys.map((k, i) => ({ key: k, label: labels?.[i] || k, color: SERIES[i] }));
const rowsTable = (rows, label = "Name", vfmt = num) => ({ columns: [{ key: "label", label }, { key: "value", label: "Value", num: true, fmt: vfmt }], rows });
const csvOf = (name, columns, rows) => () => downloadCsv(`reorbit-${name}.csv`, toCsv(columns, rows));
const share = (rows) => { const t = rows.reduce((n, r) => n + r.value, 0); return rows.map((r) => ({ ...r, share: t ? `${Math.round((r.value / t) * 100)}%` : "0%" })); };

export default function AdminReports() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "overview";
  const [rangeKey, setRangeKey] = useState("90d");
  const r = useReport(rangeKey);
  const setTab = (key) => setParams(key === "overview" ? {} : { tab: key });
  const { orders: o, donations: d, warehouse: w, community: c } = r;

  const revSeries = S(["revenue", "fees"], ["Order value", "Platform fees"]);
  const trendCols = [{ key: "label", label: "Period" }, { key: "revenue", label: "Order value" }, { key: "fees", label: "Platform fees" }, { key: "orders", label: "Orders" }, { key: "refunds", label: "Refunds" }];
  const donSeries = S(["Completed", "In progress", "Pending", "Rejected"]);

  const exportAll = () => {
    const cols = [{ key: "label", label: "Period" }, { key: "revenue", label: "Order value (INR)" }, { key: "fees", label: "Platform fees (INR)" }, { key: "orders", label: "Orders" }, { key: "refunds", label: "Refunds (INR)" }];
    downloadCsv(`reorbit-report-${rangeKey}.csv`, toCsv(cols, o.trend));
  };

  return (
    <div className="rp-page ad-page">
      <div className="rp-toolbar">
        <div className="rp-ranges" role="group" aria-label="Date range">
          <CalendarDays size={16} aria-hidden="true" />
          {RANGES.map((x) => (
            <button key={x.key} type="button" className={rangeKey === x.key ? "on" : ""} onClick={() => setRangeKey(x.key)}>{x.label}</button>
          ))}
        </div>
        <button type="button" data-safe className="ad-btn ad-btn-primary ad-btn-sm" onClick={exportAll}><Download size={15} />Export CSV</button>
      </div>
      <p className="rp-period">Showing {formatDate(r.start)} – {formatDate(r.end)} · grouped {r.weekly ? "weekly" : "monthly"} · compared with the previous {r.range.days >= 1000 ? "period" : `${r.range.days} days`}</p>

      <nav className="rp-tabs" aria-label="Report sections">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)} aria-current={tab === t.key ? "page" : undefined}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <>
          <div className="rp-tiles">
            <Tile icon={IndianRupee} label="Order value" value={compactInr(o.kpi.revenue)} delta={delta(o.kpi.revenue, o.kpi.revenuePrev)} />
            <Tile icon={Percent} label="Platform fees earned" value={inr(o.kpi.fees)} delta={delta(o.kpi.fees, o.kpi.feesPrev)} />
            <Tile icon={HeartHandshake} label="Donations received" value={num(d.kpi.total)} delta={delta(d.kpi.total, d.kpi.totalPrev)} />
            <Tile icon={Warehouse} label="Warehouse stock value" value={compactInr(w.kpi.value)} hint={`${num(w.kpi.items)} items on record`} />
          </div>
          <div className="rp-grid2 wide">
            <ChartCard title="Order value over time" sub="Paid orders only (confirmed or completed)" legend={revSeries} table={{ columns: trendCols.map((x) => (x.key === "label" ? x : { ...x, num: true, fmt: x.key === "orders" ? num : inr })), rows: o.trend }} csv={csvOf("revenue-trend", trendCols, o.trend)}>
              <LineChart data={o.trend} series={revSeries} format={inr} axisFormat={compactInr} area />
            </ChartCard>
            <ChartCard title="Where the money comes from" sub="Order value by category" table={rowsTable(share(o.categoryRows), "Category", inr)}>
              <BarList rows={o.categoryRows.slice(0, 6)} format={inr} />
            </ChartCard>
          </div>
          <div className="rp-grid2">
            <ChartCard title="Donations by outcome" sub="Per period" legend={donSeries} table={{ columns: [{ key: "label", label: "Period" }, ...donSeries.map((s) => ({ key: s.key, label: s.label, num: true }))], rows: d.trend }}>
              <StackedBars data={d.trend} series={donSeries} />
            </ChartCard>
            <ChartCard title="Top sellers" sub="Ranked by order value" table={{ columns: [{ key: "name", label: "Seller" }, { key: "type", label: "Type" }, { key: "orders", label: "Orders", num: true }, { key: "revenue", label: "Value", num: true, fmt: inr }], rows: o.topSellers }}>
              <BarList rows={o.topSellers.map((s) => ({ label: s.name, value: s.revenue }))} format={inr} />
            </ChartCard>
          </div>
        </>
      )}

      {tab === "sales" && (
        <>
          <div className="rp-tiles">
            <Tile icon={IndianRupee} label="Order value" value={inr(o.kpi.revenue)} delta={delta(o.kpi.revenue, o.kpi.revenuePrev)} />
            <Tile icon={ShoppingBag} label="Orders placed" value={num(o.kpi.orders)} delta={delta(o.kpi.orders, o.kpi.ordersPrev)} />
            <Tile icon={Receipt} label="Average order value" value={inr(o.kpi.aov)} hint="Paid orders" />
            <Tile icon={AlertTriangle} label="Cancelled or returned" value={`${o.kpi.cancelRate}%`} hint={`${inr(o.kpi.refunds)} refunded`} tone="warn" />
          </div>
          <ChartCard title="Order value & platform fees" sub="Paid orders per period" legend={revSeries} table={{ columns: trendCols.map((x) => (x.key === "label" ? x : { ...x, num: true, fmt: x.key === "orders" ? num : inr })), rows: o.trend }} csv={csvOf("sales-trend", trendCols, o.trend)}>
            <LineChart data={o.trend} series={revSeries} format={inr} axisFormat={compactInr} area />
          </ChartCard>
          <div className="rp-grid2">
            <ChartCard title="Orders by status" sub="All orders in range" table={rowsTable(share(o.statusRows), "Status")}>
              <BarList rows={o.statusRows} />
            </ChartCard>
            <ChartCard title="Order value by flow" sub="Who sold to whom" table={rowsTable(share(o.flowRows), "Flow", inr)}>
              <BarList rows={o.flowRows.map((x) => ({ ...x, label: x.label.replace(/>/g, " → ") }))} format={inr} />
            </ChartCard>
            <ChartCard title="Payment methods" sub="Orders by method" table={rowsTable(share(o.payRows), "Method")}>
              <BarList rows={o.payRows} />
            </ChartCard>
            <ChartCard title="Platform products vs member items" sub="Order value" table={rowsTable(o.kindRows, "Type", inr)}>
              <BarList rows={o.kindRows} format={inr} />
            </ChartCard>
          </div>
          <ChartCard title="Top sellers" sub="Ranked by order value in range" table={{ columns: [{ key: "name", label: "Seller" }, { key: "type", label: "Type" }, { key: "orders", label: "Orders", num: true }, { key: "revenue", label: "Value", num: true, fmt: inr }], rows: o.topSellers }} csv={csvOf("top-sellers", [{ key: "name", label: "Seller" }, { key: "type", label: "Type" }, { key: "orders", label: "Orders" }, { key: "revenue", label: "Value" }], o.topSellers)}>
            <BarList rows={o.topSellers.map((s) => ({ label: `${s.name} · ${s.type}`, value: s.revenue }))} format={inr} />
          </ChartCard>
        </>
      )}

      {tab === "donations" && (
        <>
          <div className="rp-tiles">
            <Tile icon={HeartHandshake} label="Donations" value={num(d.kpi.total)} delta={delta(d.kpi.total, d.kpi.totalPrev)} />
            <Tile icon={Package} label="Items offered" value={num(d.kpi.items)} hint={`${num(d.kpi.weight)} kg collected`} />
            <Tile icon={TrendingUp} label="Completion rate" value={`${d.kpi.completion}%`} hint="Of reviewed donations" />
            <Tile icon={AlertTriangle} label="Waiting for review" value={num(d.kpi.pending)} hint="Across all time" tone="warn" />
          </div>
          <ChartCard title="Donations by outcome" sub="Per period" legend={donSeries} table={{ columns: [{ key: "label", label: "Period" }, ...donSeries.map((s) => ({ key: s.key, label: s.label, num: true }))], rows: d.trend }} csv={csvOf("donations-trend", [{ key: "label", label: "Period" }, ...donSeries.map((s) => ({ key: s.key, label: s.label }))], d.trend)}>
            <StackedBars data={d.trend} series={donSeries} />
          </ChartCard>
          <div className="rp-grid2">
            <ChartCard title="Items donated by category" sub="Units" table={rowsTable(share(d.cats), "Category")}>
              <BarList rows={d.cats} />
            </ChartCard>
            <ChartCard title="Donation status" sub="Count" table={rowsTable(share(d.status), "Status")}>
              <BarList rows={d.status} />
            </ChartCard>
            <ChartCard title="Pickups by status" sub={`${num(d.pk.kpi.total)} pickups · ${d.pk.kpi.cancelRate}% cancelled`} table={rowsTable(d.pk.status, "Status")}>
              <BarList rows={d.pk.status} />
            </ChartCard>
            <ChartCard title="Pickups by partner" sub="Assigned pickups" table={rowsTable(d.pk.agents, "Partner")}>
              <BarList rows={d.pk.agents} />
            </ChartCard>
          </div>
        </>
      )}

      {tab === "warehouse" && (
        <>
          <div className="rp-tiles">
            <Tile icon={Boxes} label="Items on record" value={num(w.kpi.items)} hint={`${num(w.kpi.listed)} currently listed`} />
            <Tile icon={Tag} label="Stock value" value={compactInr(w.kpi.value)} hint="At list price" />
            <Tile icon={TrendingUp} label="Sell-through" value={`${w.kpi.sellThrough}%`} hint={`${num(w.kpi.sold)} sold`} />
            <Tile icon={AlertTriangle} label="Items needing attention" value={num(w.kpi.alerts)} hint="Unsold too long or stuck" tone="warn" />
          </div>
          <div className="rp-grid2">
            <ChartCard title="Stock by stage" sub="Warehouse status" table={rowsTable(share(w.status), "Stage")}>
              <BarList rows={w.status} />
            </ChartCard>
            <ChartCard title="Sale status" sub="Items" table={rowsTable(share(w.sale), "Status")}>
              <BarList rows={w.sale} />
            </ChartCard>
            <ChartCard title="Stock value by category" sub="List price" table={rowsTable(share(w.cats), "Category", inr)}>
              <BarList rows={w.cats} format={inr} />
            </ChartCard>
            <ChartCard title="How long listed items have waited" sub="Days since listed" table={rowsTable(w.aging, "Age")}>
              <BarList rows={w.aging} />
            </ChartCard>
          </div>
          <ChartCard title="Slowest-moving items" sub="Listed the longest without a sale" table={{ columns: [{ key: "title", label: "Item" }, { key: "category", label: "Category" }, { key: "daysListed", label: "Days listed", num: true }, { key: "list_price", label: "Price", num: true, fmt: inr }], rows: w.stale }} csv={csvOf("slow-movers", [{ key: "title", label: "Item" }, { key: "category", label: "Category" }, { key: "daysListed", label: "Days listed" }, { key: "list_price", label: "Price" }], w.stale)}>
            <BarList rows={w.stale.map((i) => ({ label: i.title, value: i.daysListed }))} unit=" days" />
          </ChartCard>
        </>
      )}

      {tab === "community" && (
        <>
          <div className="rp-tiles">
            <Tile icon={Users} label="Active users" value={num(c.kpi.users)} />
            <Tile icon={Hammer} label="ReMakers" value={num(c.kpi.remakers)} />
            <Tile icon={UserPlus} label="New sign-ups" value={num(c.kpi.newInRange)} hint="In this range" />
            <Tile icon={ShieldAlert} label="Suspended or blocked" value={num(c.kpi.suspended)} hint="Users and ReMakers" tone="warn" />
          </div>
          <ChartCard title="New sign-ups" sub="Users and ReMakers per period" legend={S(["Users", "ReMakers"])} table={{ columns: [{ key: "label", label: "Period" }, { key: "Users", label: "Users", num: true }, { key: "ReMakers", label: "ReMakers", num: true }], rows: c.trend }}>
            <StackedBars data={c.trend} series={S(["Users", "ReMakers"])} />
          </ChartCard>
          <div className="rp-grid2">
            <ChartCard title="User accounts" sub="By status" table={rowsTable(share(c.userStatus), "Status")}><BarList rows={c.userStatus} /></ChartCard>
            <ChartCard title="ReMaker accounts" sub="By status" table={rowsTable(share(c.remakerStatus), "Status")}><BarList rows={c.remakerStatus} /></ChartCard>
            <ChartCard title="Where members live" sub="Top cities" table={rowsTable(c.cities, "City")}><BarList rows={c.cities} /></ChartCard>
            <div className="rp-card rp-facts">
              <header className="rp-card-head"><div><h3>Rewards activity</h3><p>In this range</p></div></header>
              <dl>
                <div><dt><Coins size={16} />Points credited for donations</dt><dd>{num(c.kpi.pointsIssued)}</dd></div>
                <div><dt><Gift size={16} />Vouchers redeemed</dt><dd>{num(c.kpi.redemptions)}</dd></div>
              </dl>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
