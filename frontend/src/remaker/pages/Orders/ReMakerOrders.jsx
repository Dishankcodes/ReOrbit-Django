import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { MiniProgress, StatusBadge } from "../../components/OrderParts";
import { formatPrice } from "../../data/remakerMarketplaceData";
import {
  PAYMENT_LABEL,
  canReport,
  describeStatus,
  formatDate,
  useOrders,
} from "../../data/ordersStore";

import "../../css/ReMakerOrders.css";

const TABS = [
  { key: "all", label: "All orders", test: () => true },
  { key: "active", label: "In progress", test: (o) => o.status === "Pending" || o.status === "Confirmed" },
  { key: "completed", label: "Completed", test: (o) => o.status === "Completed" },
  { key: "closed", label: "Cancelled and returned", test: (o) => o.status === "Cancelled" || o.status === "Returned" },
];

export default function ReMakerOrders() {
  const orders = useOrders();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((item) => [item.key, orders.filter(item.test).length])),
    [orders],
  );

  const visible = useMemo(() => {
    const active = TABS.find((item) => item.key === tab);
    const text = query.trim().toLowerCase();

    return orders.filter((order) => {
      if (!active.test(order)) return false;
      if (!text) return true;

      return [order.id, order.title, order.sellerName, order.category]
        .join(" ")
        .toLowerCase()
        .includes(text);
    });
  }, [orders, tab, query]);

  const inProgress = counts.active;

  /* ---------- no orders at all ---------- */
  if (orders.length === 0) {
    return (
      <section className="rod">
        <div className="rod-empty">
          <div className="rod-empty-art" aria-hidden="true">
            <img className="a" src="/images/products/teak-drawer-chest.jpg" alt="" />
            <img className="b" src="/images/products/ceramic-lamp.jpg" alt="" />
          </div>
          <h2>You haven&apos;t bought anything yet</h2>
          <p>Find reclaimed material and finished pieces from the ReOrbit community.</p>
          <Link to="/remaker-marketplace" className="rod-btn primary">
            Browse the marketplace
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rod">
      <div className="rod-intro">
        <div>
          <h2>Your purchases</h2>
          <p>
            {inProgress > 0
              ? `${inProgress} ${inProgress === 1 ? "order is" : "orders are"} on the way or waiting for the seller.`
              : "Nothing is waiting right now. Everything you bought is complete."}
          </p>
        </div>
        <Link to="/remaker-marketplace" className="rod-btn primary">
          Keep shopping
        </Link>
      </div>

      <div className="rod-toolbar">
        <div className="rod-tabs" role="tablist" aria-label="Filter orders">
          {TABS.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              className={tab === item.key ? "active" : ""}
              key={item.key}
              onClick={() => setTab(item.key)}
            >
              {item.label}
              <span>{counts[item.key]}</span>
            </button>
          ))}
        </div>

        <label className="rod-search">
          <span className="sr-only">Search orders</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by item, seller or order ID"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="rod-empty small">
          <h2>No orders match</h2>
          <p>Try a different tab, or clear your search.</p>
          <button
            type="button"
            className="rod-btn ghost"
            onClick={() => {
              setTab("all");
              setQuery("");
            }}
          >
            Show all orders
          </button>
        </div>
      ) : (
        <div className="rod-list">
          {visible.map((order) => {
            const status = describeStatus(order);
            const active = order.status === "Pending" || order.status === "Confirmed";

            return (
              <article className="rod-card" key={order.id}>
                <header className="rod-card-head">
                  <div>
                    <small>Order</small>
                    <strong>{order.id}</strong>
                  </div>
                  <div>
                    <small>Placed on</small>
                    <strong>{formatDate(order.createdAt)}</strong>
                  </div>
                  <div>
                    <small>Total</small>
                    <strong>{formatPrice(order.total)}</strong>
                  </div>
                  <div className="rod-card-pay">
                    <small>Payment</small>
                    <strong>{PAYMENT_LABEL[order.payment.method]}</strong>
                  </div>
                  <StatusBadge order={order} />
                </header>

                <div className="rod-card-body">
                  <Link to={`/remaker-orders/${order.id}`} className="rod-thumb" aria-label={`View ${order.title}`}>
                    <img src={order.image} alt="" loading="lazy" />
                  </Link>

                  <div className="rod-card-info">
                    <h3>
                      <Link to={`/remaker-orders/${order.id}`}>{order.title}</Link>
                    </h3>
                    <p className="rod-seller">
                      Sold by {order.sellerName}
                      <span className={`rod-chip ${order.sellerType}`}>
                        {order.sellerType === "remaker" ? "ReMaker" : "Community"}
                      </span>
                    </p>
                    <p className="rod-qty">
                      Qty {order.quantity} · {order.fulfilment === "pickup" ? "Self pickup" : "ReOrbit delivery"}
                    </p>
                    <p className="rod-message">{status.message}</p>
                    <MiniProgress order={order} />
                  </div>

                  <div className="rod-card-actions">
                    <Link to={`/remaker-orders/${order.id}`} className="rod-btn primary small">
                      View details
                    </Link>
                    {active && (
                      <Link to={`/remaker-orders/${order.id}/track`} className="rod-btn ghost small">
                        Track order
                      </Link>
                    )}
                    {!active && order.status !== "Cancelled" && (
                      <Link to={`/remaker-marketplace/product/${order.listingId}`} className="rod-btn ghost small">
                        Buy again
                      </Link>
                    )}
                    {canReport(order) && (
                      <Link to={`/remaker-orders/${order.id}/report`} className="rod-link">
                        Report an issue
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
