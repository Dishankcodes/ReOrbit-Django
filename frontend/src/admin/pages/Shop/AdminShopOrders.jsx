import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  ReceiptText,
  Wallet,
  Package,
  Truck,
  CheckCircle2,
  ArrowRight,
  Store,
  RotateCw,
  X,
} from "lucide-react";

import { usePurchases, useShopProduct, addToCart } from "../../data/shopStore";
import { formatDate, formatINR } from "../../utils/format";
import ProductImg from "./components/ProductImg";
import ShopNav from "./components/ShopNav";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import useToast from "../../components/ui/useToast";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/orders/AdminOrders.css";
import "../../css/shop/AdminShop.css";

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  {
    key: "open",
    label: "In progress",
    test: (o) => ["Pending", "Confirmed"].includes(o.order_status),
  },
  {
    key: "done",
    label: "Delivered",
    test: (o) => o.order_status === "Completed",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    test: (o) => o.order_status === "Cancelled",
  },
  {
    key: "returned",
    label: "Returned",
    test: (o) => o.order_status === "Returned",
  },
];
const PAGE = 8;

function BuyAgain({ order, onDone }) {
  const p = useShopProduct(order.listing.id);
  if (!p || !p.purchasable)
    return <span className="sh-muted">Not available</span>;
  return (
    <button
      type="button"
      className="ad-btn ad-btn-ghost ad-btn-sm"
      onClick={() => {
        addToCart(p.id, 1, p.available);
        onDone(p);
      }}
    >
      <RotateCw size={13} /> Buy again
    </button>
  );
}

/* Purchase history: everything the admin has bought. */
export default function AdminShopOrders() {
  const navigate = useNavigate();
  const orders = usePurchases();
  const { toast, toastNode } = useToast();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("new");
  const [limit, setLimit] = useState(PAGE);

  const stats = useMemo(() => {
    const counted = orders.filter(
      (o) => !["Cancelled", "Returned"].includes(o.order_status),
    );
    return {
      spent: counted.reduce((n, o) => n + o.amount, 0),
      total: orders.length,
      open: orders.filter(FILTERS[1].test).length,
      done: orders.filter(FILTERS[2].test).length,
    };
  }, [orders]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const f = FILTERS.find((x) => x.key === filter);
    const list = orders.filter(
      (o) =>
        f.test(o) &&
        (!t ||
          `${o.order_id} ${o.listing.title} ${o.seller.name} ${o.listing.category}`
            .toLowerCase()
            .includes(t)),
    );
    return list.sort((a, b) =>
      sort === "new"
        ? new Date(b.order_date) - new Date(a.order_date)
        : sort === "old"
          ? new Date(a.order_date) - new Date(b.order_date)
          : b.amount - a.amount,
    );
  }, [orders, filter, q, sort]);

  return (
    <div className="au-page sh-page">
      <ShopNav />
      <section className="ao-money" aria-label="Purchase summary">
        <div className="ao-money-card">
          <span className="ao-money-icon good">
            <Wallet size={18} />
          </span>
          <div>
            <small>Total spent</small>
            <strong>{formatINR(stats.spent)}</strong>
            <em>Without cancelled or returned</em>
          </div>
        </div>
        <div className="ao-money-card">
          <span className="ao-money-icon info">
            <ReceiptText size={18} />
          </span>
          <div>
            <small>Orders placed</small>
            <strong>{stats.total}</strong>
            <em>All time</em>
          </div>
        </div>
        <button
          type="button"
          className="ao-money-card is-link"
          onClick={() => setFilter("open")}
        >
          <span className="ao-money-icon wait">
            <Truck size={18} />
          </span>
          <div>
            <small>In progress</small>
            <strong>{stats.open}</strong>
            <em>On their way to you</em>
          </div>
        </button>
        <button
          type="button"
          className="ao-money-card is-link"
          onClick={() => setFilter("done")}
        >
          <span className="ao-money-icon good">
            <CheckCircle2 size={18} />
          </span>
          <div>
            <small>Delivered</small>
            <strong>{stats.done}</strong>
            <em>Completed orders</em>
          </div>
        </button>
      </section>

      <section className="au-panel">
        <div className="sh-orders-bar">
          <div className="rw-chips" role="tablist" aria-label="Order status">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                className={filter === f.key ? "on" : ""}
                onClick={() => {
                  setFilter(f.key);
                  setLimit(PAGE);
                }}
              >
                {f.label} <em>{orders.filter(f.test).length}</em>
              </button>
            ))}
          </div>
          <label className="au-search">
            <Search size={16} />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(PAGE);
              }}
              placeholder="Search by order, product or seller"
              aria-label="Search purchases"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Clear">
                <X size={14} />
              </button>
            )}
          </label>
          <select
            className="sh-sortsel"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort orders"
          >
            <option value="new">Newest first</option>
            <option value="old">Oldest first</option>
            <option value="amount">Highest amount</option>
          </select>
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon={Package}
            title={orders.length ? "No orders match" : "No purchases yet"}
            text={
              orders.length
                ? "Try another filter or search."
                : "Orders you place in the shop will appear here."
            }
            action={
              !orders.length && (
                <Link
                  to="/admin-shop"
                  className="ad-btn ad-btn-primary ad-btn-sm"
                >
                  <Store size={14} /> Browse products
                </Link>
              )
            }
          />
        ) : (
          <ul className="sh-orders">
            {shown.slice(0, limit).map((o) => (
              <li key={o.order_id} className="sh-order">
                <Link
                  to={`/admin-shop/orders/${o.order_id}`}
                  className="sh-order-img"
                >
                  <ProductImg src={o.listing.image} alt={o.listing.title} />
                </Link>
                <div className="sh-order-main">
                  <div className="sh-order-top">
                    <strong className="aup-mono">{o.order_id}</strong>
                    <StatusBadge status={o.order_status} />
                    <span className="sh-paychip">
                      Payment{" "}
                      <StatusBadge status={o.transaction.payment_status} />
                    </span>
                  </div>
                  <h3>
                    <Link to={`/admin-shop/orders/${o.order_id}`}>
                      {o.listing.title}
                    </Link>
                    {o.listing.quantity > 1 && <em> × {o.listing.quantity}</em>}
                  </h3>
                  <p>
                    Sold by{" "}
                    <Link to={`/admin-shop/seller/${o.seller.id}`}>
                      {o.seller.name}
                    </Link>{" "}
                    · Placed {formatDate(o.order_date)}
                  </p>
                </div>
                <div className="sh-order-side">
                  <strong>{formatINR(o.amount)}</strong>
                  <div className="sh-order-actions">
                    <button
                      type="button"
                      className="ad-btn ad-btn-primary ad-btn-sm"
                      onClick={() =>
                        navigate(`/admin-shop/orders/${o.order_id}`)
                      }
                    >
                      Details <ArrowRight size={13} />
                    </button>
                    <BuyAgain
                      order={o}
                      onDone={(p) => toast(`${p.title} added to cart`)}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {limit < shown.length && (
          <div className="sh-more pad">
            <button
              type="button"
              className="ad-btn ad-btn-ghost"
              onClick={() => setLimit((n) => n + PAGE)}
            >
              Show more ({shown.length - limit} left)
            </button>
          </div>
        )}
      </section>
      {toastNode}
    </div>
  );
}
