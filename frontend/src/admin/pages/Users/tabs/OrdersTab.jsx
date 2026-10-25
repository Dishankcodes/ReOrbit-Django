import React, { useMemo, useState } from "react";
import { PackageSearch, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import StatusBadge from "../../../components/ui/StatusBadge";
import EmptyState from "../../../components/ui/EmptyState";
import { formatDate, formatINR, humanize } from "../../../utils/format";

const FILTERS = [
  { key: "all", label: "All orders" },
  { key: "Buyer", label: "Bought" },
  { key: "Seller", label: "Sold" },
];

export default function OrdersTab({ user }) {
  const [filter, setFilter] = useState("all");

  const rows = useMemo(
    () => user.orders.filter((order) => filter === "all" || order.role === filter),
    [user.orders, filter],
  );

  return (
    <section className="aup-card aup-flush">
      <header className="aup-card-head aup-pad">
        <div>
          <h3>Order history</h3>
          <p>Every purchase and sale linked to this account.</p>
        </div>
        <div className="aup-seg" role="tablist" aria-label="Filter orders">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={filter === item.key}
              className={filter === item.key ? "active" : ""}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {rows.length === 0 ? (
        <EmptyState icon={PackageSearch} title="No orders to show" text="This user has no orders in this view yet." />
      ) : (
        <div className="aup-table-wrap">
          <table className="aup-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Item</th>
                <th>Role</th>
                <th>Other party</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <tr key={order.order_id}>
                  <td><span className="aup-mono">{order.order_id}</span></td>
                  <td>
                    <div className="aup-cell-item">
                      <img src={order.image} alt="" className="aup-thumb sm" />
                      <span>{order.title}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`aup-role ${order.role === "Buyer" ? "buy" : "sell"}`}>
                      {order.role === "Buyer" ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                      {order.role === "Buyer" ? "Bought" : "Sold"}
                    </span>
                  </td>
                  <td>
                    <strong className="aup-strong">{order.counterparty}</strong>
                    <span className="aup-sub">{order.counterparty_type}</span>
                  </td>
                  <td><strong className="aup-strong">{formatINR(order.amount)}</strong></td>
                  <td>
                    <span className="aup-strong">{order.payment_method.replace("_", " ")}</span>
                    <span className="aup-sub">{humanize(order.payment_status)}</span>
                  </td>
                  <td><StatusBadge status={order.order_status} /></td>
                  <td className="aup-nowrap">{formatDate(order.order_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
