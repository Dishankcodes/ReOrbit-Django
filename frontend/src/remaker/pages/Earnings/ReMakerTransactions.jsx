import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import EarningsNav from "./EarningsNav";
import { EarningBadge } from "../Sales/SalesParts";
import { formatPrice } from "../../data/remakerMarketplaceData";
import { formatDate } from "../../data/ordersStore";
import {
  earningStatus,
  feeOf,
  getCustomer,
  grossOf,
  netOf,
  usePayouts,
  useSales,
} from "../../data/salesStore";

import "../../css/ReMakerOrders.css";
import "../../css/ReMakerSales.css";

const RANGES = [
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
  { key: "all", label: "All time", days: 0 },
];

const STATUSES = ["All", "Clearing", "Available", "In payout", "Paid out", "Reversed", "Cancelled", "In progress"];

function dateOf(order) {
  return order.times.delivered || order.times.collected || order.cancelledAt || order.returnedAt || order.createdAt;
}

function csvEscape(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export default function ReMakerTransactions() {
  const orders = useSales();
  const payouts = usePayouts();

  const [range, setRange] = useState("90");
  const [status, setStatus] = useState("All");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const days = RANGES.find((item) => item.key === range).days;
    const since = days ? Date.now() - days * 86400000 : 0;
    const text = query.trim().toLowerCase();

    return orders
      .map((order) => ({ order, status: earningStatus(order, payouts), date: dateOf(order) }))
      .filter((row) => new Date(row.date).getTime() >= since)
      .filter((row) => status === "All" || row.status === status)
      .filter((row) => {
        if (!text) return true;

        return [row.order.id, row.order.title, getCustomer(row.order.customerId)?.name].join(" ").toLowerCase().includes(text);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [orders, payouts, range, status, query]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => {
          if (["Clearing", "Available", "In payout", "Paid out"].includes(row.status)) {
            sum.gross += grossOf(row.order);
            sum.fee += feeOf(row.order);
            sum.net += netOf(row.order);
          }
          return sum;
        },
        { gross: 0, fee: 0, net: 0 },
      ),
    [rows],
  );

  const downloadCsv = () => {
    const header = ["Date", "Order", "Customer", "Item", "Qty", "Item price", "ReOrbit fee", "You receive", "Status"];
    const lines = rows.map((row) => [
      formatDate(row.date),
      row.order.id,
      getCustomer(row.order.customerId)?.name || "",
      row.order.title,
      row.order.quantity,
      grossOf(row.order),
      feeOf(row.order),
      netOf(row.order),
      row.status,
    ]);

    const csv = [header, ...lines].map((line) => line.map(csvEscape).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = "reorbit-earnings.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rod rsl">
      <EarningsNav />

      <div className="sls-summary">
        <div>
          <small>Item sales</small>
          <strong>{formatPrice(totals.gross)}</strong>
        </div>
        <div>
          <small>ReOrbit fees</small>
          <strong>− {formatPrice(totals.fee)}</strong>
        </div>
        <div className="net">
          <small>You receive</small>
          <strong>{formatPrice(totals.net)}</strong>
        </div>
      </div>

      <div className="sls-filters">
        <label className="rod-search">
          <span className="sr-only">Search transactions</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by order, item or customer"
          />
        </label>

        <div className="sls-selects">
          <label className="rod-select">
            <span className="sr-only">Date range</span>
            <select value={range} onChange={(event) => setRange(event.target.value)}>
              {RANGES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="rod-select">
            <span className="sr-only">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All statuses" : item}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="rod-btn ghost small" onClick={downloadCsv} disabled={rows.length === 0}>
            Download CSV
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rod-empty small">
          <h2>No transactions here</h2>
          <p>Try a longer date range or a different status.</p>
          <button
            type="button"
            className="rod-btn ghost"
            onClick={() => {
              setRange("all");
              setStatus("All");
              setQuery("");
            }}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="sls-table-wrap">
          <table className="sls-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Order</th>
                <th>Customer</th>
                <th className="num">Item price</th>
                <th className="num">Fee</th>
                <th className="num">You receive</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ order, date }) => {
                const customer = getCustomer(order.customerId);
                const dead = ["Cancelled", "Returned"].includes(order.status);

                return (
                  <tr key={order.id} className={dead ? "dead" : ""}>
                    <td data-label="Date">{formatDate(date)}</td>
                    <td data-label="Order">
                      <Link to={`/remaker-sales/${order.id}`} className="sls-order-cell">
                        <img src={order.image} alt="" />
                        <span>
                          <strong>{order.id}</strong>
                          <small>
                            {order.title}
                            {order.quantity > 1 ? ` × ${order.quantity}` : ""}
                          </small>
                        </span>
                      </Link>
                    </td>
                    <td data-label="Customer">{customer?.name}</td>
                    <td className="num" data-label="Item price">
                      {formatPrice(grossOf(order))}
                    </td>
                    <td className="num" data-label="Fee">
                      {dead ? "-" : `− ${formatPrice(feeOf(order))}`}
                    </td>
                    <td className="num strong" data-label="You receive">
                      {dead ? "-" : formatPrice(netOf(order))}
                    </td>
                    <td data-label="Status">
                      <EarningBadge order={order} payouts={payouts} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
