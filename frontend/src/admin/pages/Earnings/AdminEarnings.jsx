import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Download,
  Percent,
  Store,
  ShoppingCart,
  Scale,
  Hourglass,
  Settings2,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  Info,
} from "lucide-react";

import { useEarnings, RANGES } from "../../data/earningsStore";
import { useAccess } from "../../data/teamStore";
import { toCsv, downloadCsv } from "../../data/reportsStore";
import { formatDate, formatINR } from "../../utils/format";
import StatusBadge from "../../components/ui/StatusBadge";
import Pagination from "../../components/ui/Pagination";
import {
  ChartCard,
  LineChart,
  StackedBars,
  BarList,
  Tile,
  delta,
  inr,
  compactInr,
  num,
  useWidth,
  Tooltip,
  niceMax,
  PAD,
} from "../Reports/charts";

import "../../css/AdminUI.css";
import "../../css/reports/AdminReports.css";
import "../../css/earnings/AdminEarnings.css";

const C_FEE = "var(--rp-c1)";
const C_SALE = "var(--rp-c3)";
const C_OUT = "var(--rp-c2)";
const C_TOTAL = "var(--er-total)";
const COLOR = {
  fees: C_FEE,
  sales: C_SALE,
  refunds: C_OUT,
  purchases: C_OUT,
  earnings: C_TOTAL,
  net: C_TOTAL,
};
const NOTE = {
  fees: "Charged to the buyer on every User or ReMaker order.",
  sales:
    "Your own warehouse and refurbished products, with the delivery you charged.",
  refunds: "Fees and sales given back on refunded orders.",
  earnings: "Everything earned after refunds.",
  purchases: "What the platform spent buying products.",
  net: "Earnings minus purchases.",
};
const signed = (n) => `${n < 0 ? "−" : ""}${inr(Math.abs(n))}`;

/* ---------- earning flow: money in, money out, subtotals ---------- */
function Waterfall({ steps }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState(null);
  const top = 30,
    bottom = 54,
    H2 = 300;
  const iw = w - PAD.l - PAD.r;
  const ih = H2 - top - bottom;

  let run = 0;
  const bars = steps.map((s) => {
    if (s.kind === "total") {
      run = s.value;
      return { ...s, from: 0, to: s.value, after: run };
    }
    const from = run;
    run += s.value;
    return { ...s, from, to: run, after: run };
  });
  const levels = bars.flatMap((b) => [b.from, b.to, 0]);
  const hi = niceMax(Math.max(...levels, 1));
  const lo = Math.min(...levels, 0) < 0 ? -niceMax(-Math.min(...levels, 0)) : 0;
  const y = (v) => top + ih * (1 - (v - lo) / (hi - lo));
  const slot = iw / bars.length;
  const bw = Math.max(18, Math.min(64, slot * 0.58));
  const ticks = [0, 1, 2, 3, 4].map((k) => lo + ((hi - lo) / 4) * k);
  const cx = (i) => PAD.l + slot * i + slot / 2;

  return (
    <div className="rp-plot" ref={ref}>
      <svg
        width={w}
        height={H2}
        role="img"
        aria-label="Earning flow from platform fees and product sales to net cash flow"
      >
        {ticks.map((tk) => (
          <g key={tk}>
            <line
              x1={PAD.l}
              x2={w - PAD.r}
              y1={y(tk)}
              y2={y(tk)}
              className="rp-grid"
            />
            <text
              x={PAD.l - 8}
              y={y(tk) + 4}
              textAnchor="end"
              className="rp-axis"
            >
              {compactInr(tk)}
            </text>
          </g>
        ))}
        <line
          x1={PAD.l}
          x2={w - PAD.r}
          y1={y(0)}
          y2={y(0)}
          className="er-zero"
        />
        {bars.slice(0, -1).map((b, i) => (
          <line
            key={`c${b.key}`}
            x1={cx(i) + bw / 2}
            x2={cx(i + 1) - bw / 2}
            y1={y(b.after)}
            y2={y(b.after)}
            className="er-conn"
          />
        ))}
        {bars.map((b, i) => {
          const y1 = Math.min(y(b.from), y(b.to));
          const h = Math.max(3, Math.abs(y(b.from) - y(b.to)));
          const neg = b.value < 0;
          const labelY = neg && b.kind === "total" ? y1 + h + 15 : y1 - 7;
          return (
            <g key={b.key} opacity={hover == null || hover === i ? 1 : 0.55}>
              <rect
                x={cx(i) - bw / 2}
                y={y1}
                width={bw}
                height={h}
                rx="4"
                fill={COLOR[b.key]}
              />
              <text x={cx(i)} y={labelY} textAnchor="middle" className="er-val">
                {b.kind === "loss" ? "−" : ""}
                {compactInr(Math.abs(b.value))}
              </text>
              {b.label
                .split(" ")
                .reduce((rows, word) => {
                  const last = rows[rows.length - 1];
                  if (last && (last + " " + word).length <= 11)
                    rows[rows.length - 1] = `${last} ${word}`;
                  else rows.push(word);
                  return rows;
                }, [])
                .map((line, li) => (
                  <text
                    key={li}
                    x={cx(i)}
                    y={H2 - 30 + li * 14}
                    textAnchor="middle"
                    className={`rp-axis ${b.kind === "total" ? "er-strong" : ""}`}
                  >
                    {line}
                  </text>
                ))}
            </g>
          );
        })}
        {bars.map((b, i) => (
          <rect
            key={`h${b.key}`}
            x={PAD.l + slot * i}
            y={top - 20}
            width={slot}
            height={ih + 20}
            fill="transparent"
            onPointerEnter={() => setHover(i)}
            onPointerMove={() => setHover(i)}
            onPointerDown={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover != null && (
        <Tooltip
          x={cx(hover)}
          y={top}
          width={w}
          title={bars[hover].label}
          rows={[
            {
              label:
                bars[hover].kind === "total"
                  ? "Total"
                  : bars[hover].value < 0
                    ? "Money out"
                    : "Money in",
              color: COLOR[bars[hover].key],
              value: signed(bars[hover].value),
            },
            {
              label: "Running total",
              color: "#9fb3a9",
              value: signed(bars[hover].after),
            },
          ]}
        />
      )}
    </div>
  );
}

export default function AdminEarnings() {
  const [rangeKey, setRangeKey] = useState("90d");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const e = useEarnings(rangeKey);
  const access = useAccess();
  const { cur, prev } = e;

  const seriesMain = [
    { key: "Platform fees", label: "Platform fees", color: C_FEE },
    { key: "Product sales", label: "Product sales", color: C_SALE },
  ];
  const flowRows = e.flow.map((s) => ({ step: s.label, amount: s.value }));
  const trendCols = [
    { key: "label", label: "Period" },
    { key: "Platform fees", label: "Platform fees" },
    { key: "Product sales", label: "Product sales" },
    { key: "refunds", label: "Refunds" },
    { key: "earnings", label: "Earnings" },
  ];
  const tableCols = trendCols.map((c) =>
    c.key === "label" ? c : { ...c, num: true, fmt: inr },
  );

  const entries = e.entries;
  const pageRows = entries.slice((page - 1) * pageSize, page * pageSize);
  const exportCsv = () =>
    downloadCsv(
      `reorbit-earnings-${rangeKey}.csv`,
      toCsv(
        [
          { key: "at", label: "Date" },
          { key: "order_id", label: "Order" },
          { key: "type", label: "Type" },
          { key: "party", label: "Party" },
          { key: "title", label: "Item" },
          { key: "amount", label: "Amount (INR)" },
          { key: "status", label: "Status" },
        ],
        entries.map((x) => ({ ...x, at: x.at.slice(0, 10) })),
      ),
    );
  const shareRows = (rows) => {
    const t = rows.reduce((n, r) => n + r.value, 0);
    return rows.map((r) => ({
      ...r,
      share: t ? `${Math.round((r.value / t) * 100)}%` : "0%",
    }));
  };
  const tbl = (rows, label) => ({
    columns: [
      { key: "label", label },
      { key: "value", label: "Amount", num: true, fmt: inr },
      { key: "share", label: "Share", num: true },
    ],
    rows: shareRows(rows),
  });
  const dEarn = delta(cur.earnings, prev.earnings);

  return (
    <div className="rp-page er-page ad-page">
      <div className="rp-toolbar">
        <div className="rp-ranges" role="group" aria-label="Date range">
          <CalendarDays size={16} aria-hidden="true" />
          {RANGES.map((x) => (
            <button
              key={x.key}
              type="button"
              className={rangeKey === x.key ? "on" : ""}
              onClick={() => {
                setRangeKey(x.key);
                setPage(1);
              }}
            >
              {x.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          data-safe
          className="ad-btn ad-btn-primary ad-btn-sm"
          onClick={exportCsv}
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      <section className="er-hero">
        <div className="er-hero-main">
          <span className="er-eyebrow">
            <Coins size={14} /> Total earnings · {e.range.label.toLowerCase()}
          </span>
          <strong>{inr(cur.earnings)}</strong>
          <span
            className={`er-delta ${dEarn != null && dEarn < 0 ? "down" : "up"}`}
          >
            {dEarn == null ? (
              "No earnings in the previous period"
            ) : Math.abs(dEarn) > 500 ? (
              <>
                <ArrowUpRight size={15} />
                Up from {inr(prev.earnings)} in the previous period
              </>
            ) : (
              <>
                {dEarn < 0 ? (
                  <ArrowDownRight size={15} />
                ) : (
                  <ArrowUpRight size={15} />
                )}
                {Math.abs(dEarn)}% vs previous period
              </>
            )}
          </span>
        </div>
        <ul className="er-formula" aria-label="How total earnings add up">
          <li>
            <i style={{ background: C_FEE }} />
            <span>Platform fees</span>
            <b>{inr(cur.fees)}</b>
          </li>
          <li>
            <i style={{ background: C_SALE }} />
            <span>Product sales</span>
            <b>+ {inr(cur.sales + cur.delivery)}</b>
          </li>
          <li>
            <i style={{ background: C_OUT }} />
            <span>Refunds</span>
            <b>− {inr(cur.refunds)}</b>
          </li>
        </ul>
      </section>

      <div className="rp-tiles">
        <Tile
          icon={Percent}
          label="Platform fees"
          value={inr(cur.fees)}
          delta={delta(cur.fees, prev.fees)}
        />
        <Tile
          icon={Store}
          label="Product sales"
          value={inr(cur.sales + cur.delivery)}
          delta={delta(cur.sales + cur.delivery, prev.sales + prev.delivery)}
          hint={`Incl. ${inr(cur.delivery)} delivery`}
        />
        <Tile
          icon={ShoppingCart}
          label="Platform purchases"
          value={inr(cur.purchases)}
          hint="Money spent buying products"
          tone="warn"
        />
        <Tile
          icon={Scale}
          label="Net cash flow"
          value={signed(cur.net)}
          hint="Earnings minus purchases"
        />
      </div>

      <div className="rp-grid2 wide">
        <ChartCard
          title="Earning flow"
          sub="From money in to what is left"
          legend={[
            { label: "Platform fees", color: C_FEE },
            { label: "Product sales", color: C_SALE },
            { label: "Money out", color: C_OUT },
            { label: "Totals", color: C_TOTAL },
          ]}
          table={{
            columns: [
              { key: "step", label: "Step" },
              { key: "amount", label: "Amount", num: true, fmt: signed },
            ],
            rows: flowRows,
          }}
        >
          <Waterfall steps={e.flow} />
        </ChartCard>

        <section className="rp-card er-rate">
          <header className="rp-card-head">
            <div>
              <h3>Platform fee</h3>
              <p>Taken from the buyer on each order</p>
            </div>
          </header>
          <div className="er-rate-big">
            <strong>{e.feePct}%</strong>
            <span>per order</span>
          </div>
          <dl>
            <div>
              <dt>Effective take rate</dt>
              <dd>{e.takeRate}%</dd>
            </div>
            <div>
              <dt>Orders charged</dt>
              <dd>{num(e.feeOrders)}</dd>
            </div>
            <div>
              <dt>On a ₹1,000 order</dt>
              <dd>{formatINR(Math.round((1000 * e.feePct) / 100))}</dd>
            </div>
          </dl>
          <p className="er-rate-note">
            <Info size={14} />
            <span>
              Orders the platform buys itself carry no fee, so the take rate is
              measured only on member orders.
            </span>
          </p>
          {access.canSee("settings") && (
            <Link
              className="ad-btn ad-btn-ghost ad-btn-sm"
              to="/admin-settings?section=commerce"
            >
              <Settings2 size={14} />
              Change fee in Settings
            </Link>
          )}
        </section>
      </div>

      <div className="er-pending" role="status">
        <Hourglass size={18} />
        <div>
          <strong>
            {inr(e.pending.fees + e.pending.sales)} still to come in
          </strong>
          <span>
            {num(e.pending.orders)} orders are waiting for payment:{" "}
            {inr(e.pending.fees)} in fees and {inr(e.pending.sales)} in product
            sales. It counts as earned once payment is received.
          </span>
        </div>
        <Link className="ad-btn ad-btn-ghost ad-btn-sm" to="/admin-orders">
          View orders
        </Link>
      </div>

      <div className="rp-grid2">
        <ChartCard
          title="Earnings by period"
          sub="Fees and product sales"
          legend={seriesMain}
          table={{ columns: tableCols, rows: e.trend }}
          csv={() =>
            downloadCsv(
              `reorbit-earnings-trend-${rangeKey}.csv`,
              toCsv(trendCols, e.trend),
            )
          }
        >
          <StackedBars data={e.trend} series={seriesMain} format={inr} />
        </ChartCard>
        <ChartCard
          title="Running total"
          sub="Earnings added up over the period"
          table={{
            columns: [
              { key: "label", label: "Period" },
              { key: "cumulative", label: "Total so far", num: true, fmt: inr },
            ],
            rows: e.trend,
          }}
        >
          <LineChart
            data={e.trend}
            series={[
              { key: "cumulative", label: "Total earnings", color: C_TOTAL },
            ]}
            format={inr}
            axisFormat={compactInr}
            area
          />
        </ChartCard>
      </div>

      <div className="rp-grid2 er-grid3">
        <ChartCard
          title="Fees by category"
          sub="What buyers were buying"
          table={tbl(e.feeByCategory, "Category")}
        >
          <BarList rows={e.feeByCategory} format={inr} />
        </ChartCard>
        <ChartCard
          title="Fees by who pays"
          sub="Buyer type"
          table={tbl(e.feeByBuyer, "Buyer")}
        >
          <BarList rows={e.feeByBuyer} format={inr} />
        </ChartCard>
        <ChartCard
          title="Fees by what was sold"
          sub="Seller side"
          table={tbl(e.feeBySeller, "Sold by")}
        >
          <BarList rows={e.feeBySeller} format={inr} />
        </ChartCard>
      </div>

      <div className="rp-grid2">
        <ChartCard
          title="Your product sales by category"
          sub="Warehouse and refurbished stock"
          table={tbl(e.salesByCategory, "Category")}
        >
          <BarList rows={e.salesByCategory} format={inr} />
        </ChartCard>
        <ChartCard
          title="Sellers that bring in the most fees"
          sub="Fee earned from their orders"
          table={{
            columns: [
              { key: "name", label: "Seller" },
              { key: "type", label: "Type" },
              { key: "orders", label: "Orders", num: true },
              { key: "volume", label: "Sales", num: true, fmt: inr },
              { key: "fee", label: "Fee", num: true, fmt: inr },
            ],
            rows: e.topSellers,
          }}
        >
          <BarList
            rows={e.topSellers.map((s) => ({
              label: `${s.name} · ${s.type}`,
              value: s.fee,
            }))}
            format={inr}
          />
        </ChartCard>
      </div>

      <section className="rp-card er-ledger">
        <header className="rp-card-head">
          <div>
            <h3>Every money movement</h3>
            <p>
              {num(entries.length)} entries in this range. Click an order to
              open it.
            </p>
          </div>
        </header>
        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Order</th>
                <th>Type</th>
                <th>Party</th>
                <th>Item</th>
                <th className="num">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="er-empty">
                    No money moved in this range.
                  </td>
                </tr>
              )}
              {pageRows.map((x) => (
                <tr key={x.id}>
                  <td>{formatDate(x.at)}</td>
                  <td>
                    <Link
                      className="er-link"
                      to={`/admin-orders/${x.order_id}`}
                    >
                      {x.order_id}
                    </Link>
                  </td>
                  <td>{x.type}</td>
                  <td>{x.party}</td>
                  <td className="er-item">{x.title}</td>
                  <td className={`num er-amt ${x.amount < 0 ? "neg" : "pos"}`}>
                    {x.amount < 0 ? "−" : "+"}
                    {inr(Math.abs(x.amount))}
                  </td>
                  <td>
                    <StatusBadge status={x.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {entries.length > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={entries.length}
            onPage={setPage}
            onPageSize={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        )}
      </section>
    </div>
  );
}
