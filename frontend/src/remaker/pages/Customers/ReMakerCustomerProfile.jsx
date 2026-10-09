import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Avatar } from "../../pages-components/ReviewBlocks";
import { SaleBadge } from "../Sales/SalesParts";
import { formatPrice } from "../../data/remakerMarketplaceData";
import { formatDate } from "../../data/ordersStore";
import {
  getCustomer,
  netOf,
  relativeTime,
  useCustomers,
} from "../../data/salesStore";

import "../../css/ReMakerOrders.css";
import "../../css/ReMakerSales.css";

export default function ReMakerCustomerProfile() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const customers = useCustomers();

  const customer = getCustomer(customerId);
  const entry = customers.find((item) => item.customer.id === customerId);

  if (!customer || !entry) {
    return (
      <section className="rod rsl">
        <div className="rod-empty">
          <div className="rod-empty-art single" aria-hidden="true">
            <img className="a" src="/images/users/rohan-shah.jpg" alt="" />
          </div>
          <h2>We couldn&apos;t find that customer</h2>
          <p>They may not have bought from you, or the link is out of date.</p>
          <Link to="/remaker-customers" className="rod-btn primary">
            Back to customers
          </Link>
        </div>
      </section>
    );
  }

  const { orders, spent, lastOrderAt } = entry;
  const completed = orders.filter(
    (order) => order.status === "Completed",
  ).length;
  const open = orders.filter(
    (order) => order.status === "Pending" || order.status === "Confirmed",
  ).length;
  const earned = orders
    .filter((order) => order.status === "Completed")
    .reduce((total, order) => total + netOf(order), 0);

  return (
    <section className="rod rsl">
      <nav className="rod-crumbs" aria-label="Breadcrumb">
        <button type="button" className="sls-back" onClick={() => navigate(-1)}>
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
                className={`rod-chip ${customer.type === "ReMaker" ? "remaker" : ""}`}
              >
                {customer.type === "ReMaker" ? "ReMaker" : "Customer"}
              </span>
              {orders.length > 1 && (
                <span className="rod-chip repeat">Repeat buyer</span>
              )}
            </div>
            <p>
              {customer.city}, {customer.state} · Member since {customer.joined}
            </p>
          </div>
        </div>

        <div className="sls-hero-actions">
          <a href={`mailto:${customer.email}`} className="rod-btn ghost">
            Email
          </a>
          <a
            href={`tel:${customer.phone.replace(/\s/g, "")}`}
            className="rod-btn primary"
          >
            Call
          </a>
        </div>
      </header>

      <div className="sls-metrics">
        <div>
          <strong>{orders.length}</strong>
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
          <strong>{relativeTime(lastOrderAt)}</strong>
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
            {orders.map((order) => (
              <Link
                to={`/remaker-sales/${order.id}`}
                className="sls-history-row"
                key={order.id}
              >
                <img src={order.image} alt="" />
                <div>
                  <strong>{order.title}</strong>
                  <small>
                    {order.id} · {formatDate(order.createdAt)} · Qty{" "}
                    {order.quantity}
                  </small>
                </div>
                <div className="sls-history-end">
                  <b>{formatPrice(order.unitPrice * order.quantity)}</b>
                  <SaleBadge order={order} />
                </div>
              </Link>
            ))}
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
                  <a href={`tel:${customer.phone.replace(/\s/g, "")}`}>
                    {customer.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${customer.email}`}>{customer.email}</a>
                </dd>
              </div>
            </dl>

            <p className="rod-note">
              Only contact customers about their order. Keep payments and chats
              on ReOrbit.
            </p>
          </section>

          <section className="rod-panel">
            <h3>Delivery address</h3>

            <p className="sls-address">
              <strong>{customer.name}</strong>
              <br />
              {customer.address}
              <br />
              {customer.city}, {customer.state} {customer.pincode}
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}
