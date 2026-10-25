import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  X,
  Store,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Wallet,
  SearchX,
  PackageOpen,
} from "lucide-react";

import { isActive, useOrders } from "../../data/ordersStore";
import EmptyState from "../../components/ui/EmptyState";
import OrderCard, { inr } from "./components/OrderCard";

import "../../css/shared/ui-base.css";
import "../../css/orders/orders-base.css";
import "../../css/orders/UserOrders.css";

const TABS = [
  "All",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];
const PAGE = 5;

const SORTS = {
  newest: {
    label: "Newest first",
    fn: (a, b) => new Date(b.placedAt) - new Date(a.placedAt),
  },
  oldest: {
    label: "Oldest first",
    fn: (a, b) => new Date(a.placedAt) - new Date(b.placedAt),
  },
  high: { label: "Price: high to low", fn: (a, b) => b.total - a.total },
  low: { label: "Price: low to high", fn: (a, b) => a.total - b.total },
};

export default function UserOrders() {
  const orders = useOrders();

  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState("newest");
  const [visible, setVisible] = useState(PAGE);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((t) => [
          t,
          t === "All"
            ? orders.length
            : orders.filter((o) => o.status === t).length,
        ]),
      ),
    [orders],
  );

  const stats = useMemo(() => {
    const spent = orders
      .filter((o) => !o.cancelled)
      .reduce((sum, o) => sum + o.total, 0);
    return {
      total: orders.length,
      active: orders.filter(isActive).length,
      delivered: orders.filter((o) => o.status === "Delivered").length,
      spent,
    };
  }, [orders]);

  const results = useMemo(() => {
    const text = query.trim().toLowerCase();
    return orders
      .filter((o) => tab === "All" || o.status === tab)
      .filter(
        (o) => kind === "all" || (kind === "remaker") === o.sellerIsRemaker,
      )
      .filter((o) =>
        text
          ? [o.id, o.item.title, o.item.category, o.seller?.name || ""].some(
              (f) => f.toLowerCase().includes(text),
            )
          : true,
      )
      .sort(SORTS[sort].fn);
  }, [orders, tab, kind, query, sort]);

  const filtered = tab !== "All" || kind !== "all" || query.trim() !== "";
  const reset = () => {
    setTab("All");
    setKind("all");
    setQuery("");
    setVisible(PAGE);
  };

  const summary = [
    { icon: ShoppingBag, label: "Total orders", value: stats.total },
    { icon: Truck, label: "In progress", value: stats.active },
    { icon: CheckCircle2, label: "Delivered", value: stats.delivered },
    { icon: Wallet, label: "Total spent", value: inr(stats.spent) },
  ];

  return (
    <div className="dn ob ob-history">
      <header className="ob-head">
        <div>
          <span className="dn-eyebrow">Your purchase journey</span>
          <h1>My orders</h1>
          <p className="dn-muted">
            Every order you've placed, from pre-loved finds to ReMaker
            creations.
          </p>
        </div>
        <Link to="/user-marketplace" className="dn-btn">
          <Store size={16} /> Browse marketplace
        </Link>
      </header>

      <section className="ob-summary">
        {summary.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label}>
              <span>
                <Icon size={18} />
              </span>
              <div>
                <strong>{item.value}</strong>
                <small>{item.label}</small>
              </div>
            </article>
          );
        })}
      </section>

      <section className="dn-card ob-tools">
        <div className="ob-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              type="button"
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? "is-active" : ""}
              onClick={() => {
                setTab(t);
                setVisible(PAGE);
              }}
            >
              {t} <em>{counts[t]}</em>
            </button>
          ))}
        </div>

        <div className="ob-filters">
          <label className="ob-search">
            <Search size={16} />
            <input
              value={query}
              placeholder="Search by order ID, product or seller"
              onChange={(event) => {
                setQuery(event.target.value);
                setVisible(PAGE);
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </label>

          <select
            className="dn-select"
            value={kind}
            aria-label="Seller type"
            onChange={(event) => {
              setKind(event.target.value);
              setVisible(PAGE);
            }}
          >
            <option value="all">All sellers</option>
            <option value="user">Community sellers</option>
            <option value="remaker">ReMakers</option>
          </select>

          <select
            className="dn-select"
            value={sort}
            aria-label="Sort orders"
            onChange={(event) => setSort(event.target.value)}
          >
            {Object.entries(SORTS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {orders.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No orders yet"
          text="When you buy something on ReOrbit, it will show up here with live tracking."
          actionLabel="Start exploring"
          to="/user-marketplace"
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No orders match"
          text="Try a different search or clear your filters."
          actionLabel="Clear filters"
          onAction={reset}
        />
      ) : (
        <>
          <p className="ob-count">
            Showing {Math.min(visible, results.length)} of {results.length}{" "}
            {results.length === 1 ? "order" : "orders"}
            {filtered && (
              <button type="button" className="dn-link" onClick={reset}>
                Clear filters
              </button>
            )}
          </p>

          <div className="ob-list">
            {results.slice(0, visible).map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>

          {results.length > visible && (
            <div className="ob-more">
              <button
                type="button"
                className="dn-btn dn-btn--ghost"
                onClick={() => setVisible((n) => n + PAGE)}
              >
                Show more orders
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
