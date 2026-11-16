import React from "react";
import { useGoBack } from "../../../shared/backNav";
import { Link, useParams } from "react-router-dom";

import { Avatar } from "../../pages-components/ReviewBlocks";
import { PageLoader } from "../../../shared/components/Spinner";
import OrderStatusBadge from "./components/OrderStatusBadge";
import {
  CustomerNotFound,
  CustomersError,
} from "./components/CustomersState";
import { formatPrice } from "../../data/remakerMarketplaceData";
import {
  formatDay,
  formatMonth,
  relativeTime,
  useCustomer,
} from "../../data/customersStore";

import "../../css/ReMakerOrders.css";
import "../../css/ReMakerSales.css";

export default function ReMakerCustomerProfile() {
  const { goBack } = useGoBack("/remaker-customers");
  const { customerId } = useParams();
  const { customer, orders, loading, error, notFound, reload } =
    useCustomer(customerId);

  if (loading) {
    return (
      <section className="rod rsl">
        <PageLoader label="Loading customer…" />
      </section>
    );
  }

  if (notFound) return <CustomerNotFound />;
  if (error || !customer)
    return <CustomersError message={error} onRetry={reload} />;

  const completed = customer.delivered_orders;
  const open = customer.open_orders;
  const { spent, earned } = customer;
  const phoneHref = customer.phone ? customer.phone.replace(/\s/g, "") : "";
  const place = [customer.city, customer.state].filter(Boolean).join(", ");

  return (
    <section className="rod rsl">
      <nav className="rod-crumbs" aria-label="Breadcrumb">
        <button type="button" className="sls-back" onClick={goBack}>
          Back
        </button>
        <span aria-hidden="true">/</span>
        <Link to="/remaker-customers">Customers</Link>
        <span aria-hidden="true">/</span>
        <strong>{customer.name}</strong>
      </nav>

      {/* HERO */}
      <header className="sls-hero">
        <div className="sls-hero-main">
          <span className="sls-avatar xl">
            <Avatar src={customer.image} name={customer.name} />
          </span>

          <div>
            <div className="sls-hero-name">
              <h2>{customer.name}</h2>
              <span
                className={`rod-chip ${customer.type === "remaker" ? "remaker" : ""}`}
              >
                {customer.type === "remaker" ? "ReMaker" : "Customer"}
              </span>
              {customer.orders_count > 1 && (
                <span className="rod-chip repeat">Repeat buyer</span>
              )}
            </div>
            <p>
              {place || "Location not shared"}
              {customer.joined ? ` · Member since ${formatMonth(customer.joined)}` : ""}
            </p>
          </div>
        </div>

        <div className="sls-hero-actions">
          <Link to="/remaker-sales" className="rod-btn ghost">
            All orders
          </Link>
          {customer.phone && (
            <a href={`tel:${phoneHref}`} className="rod-btn primary">
              Call
            </a>
          )}
        </div>
      </header>

      <div className="sls-metrics">
        <div>
          <strong>{customer.orders_count}</strong>
          <span>Orders with you</span>
        </div>
        <div>
          <strong>{formatPrice(spent)}</strong>
          <span>Total spent</span>
        </div>
        <div>
          <strong>{formatPrice(earned)}</strong>
          <span>You earned</span>
        </div>
        <div>
          <strong>{relativeTime(customer.last_order_at)}</strong>
          <span>Last order</span>
        </div>
      </div>

      <div className="rod-grid">
        {/* ORDER HISTORY */}
        <section className="rod-panel">
          <div className="rod-panel-head">
            <h3>Orders with you</h3>
            <small className="sls-muted">
              {completed} completed{open ? `, ${open} open` : ""}
            </small>
          </div>

          <div className="sls-history">
            {orders.map((order) => {
              const first = order.items[0];
              const extra = order.items.length - 1;
              const qty = order.items.reduce((n, item) => n + item.qty, 0);

              return (
                <Link
                  to={`/remaker-sales/${order.id}`}
                  className="sls-history-row"
                  key={order.id}
                  aria-label={`Open order ${order.id}`}
                >
                  {first?.cover ? (
                    <img src={first.cover} alt="" loading="lazy" />
                  ) : (
                    <img src="/images/default-avatar.png" alt="" />
                  )}
                  <div>
                    <strong>
                      {first?.title || "Order"}
                      {extra > 0 ? ` + ${extra} more` : ""}
                    </strong>
                    <small>
                      {order.id} · {formatDay(order.created_at)} · Qty {qty}
                    </small>
                  </div>
                  <div className="sls-history-end">
                    <b>{formatPrice(order.subtotal)}</b>
                    <OrderStatusBadge order={order} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* CONTACT */}
        <aside className="rod-side">
          <section className="rod-panel">
            <h3>Contact</h3>

            <dl className="rod-facts compact">
              <div>
                <dt>Phone</dt>
                <dd>
                  {customer.phone ? (
                    <a href={`tel:${phoneHref}`}>{customer.phone}</a>
                  ) : (
                    "Not shared"
                  )}
                </dd>
              </div>
            </dl>

            <p className="rod-note">
              Only contact customers about their order. Keep payments and chats
              on ReOrbit.
            </p>
          </section>

          <section className="rod-panel">
            <h3>Latest delivery address</h3>

            <p className="sls-address">
              <strong>{customer.recipient}</strong>
              <br />
              {customer.address || "No street address"}
              <br />
              {[customer.city, customer.state].filter(Boolean).join(", ")}{" "}
              {customer.pincode}
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}
