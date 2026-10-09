import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Avatar } from "../../pages-components/ReviewBlocks";
import { SaleBadge, SaleProgress } from "../Sales/SalesParts";
import { formatPrice } from "../../data/remakerMarketplaceData";
import { formatDate } from "../../data/ordersStore";
import {
  acceptSale,
  describeSale,
  getCustomer,
  netOf,
  relativeTime,
  useSales,
} from "../../data/salesStore";

import "../../css/ReMakerOrders.css";
import "../../css/ReMakerSales.css";

const TABS = [
  { key: "all", label: "All sales", test: () => true },
  { key: "new", label: "New", test: (o) => o.status === "Pending" },
  {
    key: "progress",
    label: "In progress",
    test: (o) => o.status === "Confirmed",
  },
  { key: "done", label: "Completed", test: (o) => o.status === "Completed" },
  {
    key: "closed",
    label: "Cancelled and returned",
    test: (o) => o.status === "Cancelled" || o.status === "Returned",
  },
];

export default function ReMakerSales() {
  const orders = useSales();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((item) => [item.key, orders.filter(item.test).length]),
      ),
    [orders],
  );

  const needAction = useMemo(
    () => orders.filter((order) => describeSale(order).needsAction).length,
    [orders],
  );

  const visible = useMemo(() => {
    const active = TABS.find((item) => item.key === tab);
    const text = query.trim().toLowerCase();

    return orders.filter((order) => {
      if (!active.test(order)) return false;
      if (!text) return true;

      const customer = getCustomer(order.customerId);

      return [order.id, order.title, customer?.name, customer?.city]
        .join(" ")
        .toLowerCase()
        .includes(text);
    });
  }, [orders, tab, query]);

  if (orders.length === 0) {
    return (
      <section className="rod rsl">
        <div className="rod-empty">
          <div className="rod-empty-art" aria-hidden="true">
            <img
              className="a"
              src="/images/portfolio/tara-console.jpg"
              alt=""
            />
            <img className="b" src="/images/portfolio/arjun-lamp.jpg" alt="" />
          </div>
          <h2>No sales yet</h2>
          <p>
            When someone buys one of your products, the order shows up here.
          </p>
          <Link to="/remaker-products" className="rod-btn primary">
            Go to my products
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rod rsl">
      <div className="rod-intro">
        <div>
          <h2>Orders from customers</h2>
          <p>
            {needAction > 0
              ? `${needAction} ${needAction === 1 ? "order needs" : "orders need"} your attention.`
              : "You are all caught up. Nothing needs your attention."}
          </p>
        </div>
        <Link to="/remaker-earnings" className="rod-btn ghost">
          View earnings
        </Link>
      </div>

      <div className="sls-stats">
        <button
          type="button"
          className="sls-stat attention"
          onClick={() => setTab("new")}
        >
          <strong>{counts.new}</strong>
          <span>New orders</span>
        </button>
        <div className="sls-stat">
          <strong>{counts.progress}</strong>
          <span>In progress</span>
        </div>
        <div className="sls-stat">
          <strong>{counts.done}</strong>
          <span>Completed</span>
        </div>
        <div className="sls-stat">
          <strong>
            {formatPrice(
              orders
                .filter((o) => o.status === "Completed")
                .reduce((t, o) => t + netOf(o), 0),
            )}
          </strong>
          <span>Earned from completed orders</span>
        </div>
      </div>

      <div className="rod-toolbar">
        <div className="rod-tabs" role="tablist" aria-label="Filter sales">
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
          <span className="sr-only">Search sales</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by customer, item or order ID"
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
            Show all sales
          </button>
        </div>
      ) : (
        <div className="rod-list">
          {visible.map((order) => {
            const customer = getCustomer(order.customerId);
            const status = describeSale(order);

            return (
              <article
                className={`rod-card ${status.needsAction ? "sls-attention" : ""}`}
                key={order.id}
              >
                <header className="rod-card-head">
                  <div>
                    <small>Order</small>
                    <strong>{order.id}</strong>
                  </div>
                  <div>
                    <small>Received</small>
                    <strong>{formatDate(order.createdAt)}</strong>
                  </div>
                  <div>
                    <small>Order value</small>
                    <strong>
                      {formatPrice(order.unitPrice * order.quantity)}
                    </strong>
                  </div>
                  <div className="rod-card-pay">
                    <small>You earn</small>
                    <strong>{formatPrice(netOf(order))}</strong>
                  </div>
                  <SaleBadge order={order} />
                </header>

                <div className="rod-card-body">
                  <Link
                    to={`/remaker-sales/${order.id}`}
                    className="rod-thumb"
                    aria-label={`View ${order.title}`}
                  >
                    <img src={order.image} alt="" loading="lazy" />
                  </Link>

                  <div className="rod-card-info">
                    <h3>
                      <Link to={`/remaker-sales/${order.id}`}>
                        {order.title}
                      </Link>
                    </h3>

                    <p className="sls-buyer">
                      <span className="sls-avatar">
                        <Avatar src={customer?.image} name={customer?.name} />
                      </span>
                      <Link to={`/remaker-customers/${order.customerId}`}>
                        {customer?.name}
                      </Link>
                      <span
                        className={`rod-chip ${customer?.type === "ReMaker" ? "remaker" : ""}`}
                      >
                        {customer?.type === "ReMaker" ? "ReMaker" : "Customer"}
                      </span>
                      <em>{customer?.city}</em>
                    </p>

                    <p className="rod-qty">
                      Qty {order.quantity} ·{" "}
                      {order.fulfilment === "pickup"
                        ? "Customer collects"
                        : "ReOrbit delivery"}{" "}
                      · {relativeTime(order.createdAt)}
                    </p>
                    <p className="rod-message">{status.message}</p>
                    <SaleProgress order={order} />
                  </div>

                  <div className="rod-card-actions">
                    {order.status === "Pending" ? (
                      <>
                        <button
                          type="button"
                          className="rod-btn primary small"
                          onClick={() => acceptSale(order.id)}
                        >
                          Accept order
                        </button>
                        <Link
                          to={`/remaker-sales/${order.id}`}
                          className="rod-btn ghost small"
                        >
                          View details
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to={`/remaker-sales/${order.id}`}
                          className={`rod-btn small ${status.needsAction ? "primary" : "ghost"}`}
                        >
                          {status.needsAction ? "Take action" : "View details"}
                        </Link>
                        <Link
                          to={`/remaker-customers/${order.customerId}`}
                          className="rod-link"
                        >
                          Customer info
                        </Link>
                      </>
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
