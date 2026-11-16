import React, { useMemo, useState } from "react";
import { SkeletonRows } from "../../../shared/components/Skeleton";
import { Link } from "react-router-dom";

import { Avatar } from "../../pages-components/ReviewBlocks";
import { formatPrice } from "../../data/remakerMarketplaceData";
import { relativeTime, useCustomers } from "../../data/customersStore";
import { CustomersError, NoCustomers } from "./components/CustomersState";

import "../../css/ReMakerOrders.css";
import "../../css/ReMakerSales.css";

export default function ReMakerCustomers() {
  const { customers, loading, error, reload } = useCustomers();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();

    return customers.filter((customer) => {
      if (type === "repeat") return false;
      if (type !== "all" && customer.type !== type) return false;
      if (!text) return true;

      return [customer.name, customer.city, customer.state, customer.phone]
        .join(" ")
        .toLowerCase()
        .includes(text);
    });
  }, [customers, query, type]);

  const repeat = useMemo(
    () => customers.filter((entry) => entry.orders_count > 1),
    [customers],
  );
  const list = type === "repeat" ? repeat : visible;
  const totalSpent = customers.reduce((total, entry) => total + entry.spent, 0);

  const tabs = [
    { key: "all", label: "All customers", count: customers.length },
    { key: "repeat", label: "Repeat buyers", count: repeat.length },
    {
      key: "user",
      label: "Community",
      count: customers.filter((c) => c.type === "user").length,
    },
    {
      key: "remaker",
      label: "ReMakers",
      count: customers.filter((c) => c.type === "remaker").length,
    },
  ];

  if (error) return <CustomersError message={error} onRetry={reload} />;
  if (!loading && customers.length === 0) return <NoCustomers />;

  return (
    <section className="rod rsl">
      <div className="rod-intro">
        <div>
          <h2>Your customers</h2>
          <p>
            {loading
              ? "Loading the people who bought from you…"
              : `${customers.length} ${customers.length === 1 ? "person has" : "people have"} bought from you. Together they spent ${formatPrice(totalSpent)}.`}
          </p>
        </div>
        <Link to="/remaker-sales" className="rod-btn ghost">
          View sales
        </Link>
      </div>

      <div className="rod-toolbar">
        <div className="rod-tabs" role="tablist" aria-label="Filter customers">
          {tabs.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={type === item.key}
              className={type === item.key ? "active" : ""}
              key={item.key}
              onClick={() => setType(item.key)}
            >
              {item.label}
              <span>{item.count}</span>
            </button>
          ))}
        </div>

        <label className="rod-search">
          <span className="sr-only">Search customers</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, city or phone"
          />
        </label>
      </div>

      {loading ? (
        <SkeletonRows count={5} />
      ) : list.length === 0 ? (
        <div className="rod-empty small">
          <h2>No customers match</h2>
          <p>Try a different filter, or clear your search.</p>
          <button
            type="button"
            className="rod-btn ghost"
            onClick={() => {
              setType("all");
              setQuery("");
            }}
          >
            Show everyone
          </button>
        </div>
      ) : (
        <div className="sls-customers">
          {list.map((customer) => (
            <article className="sls-ccard" key={customer.id}>
              <div className="sls-ccard-top">
                <span className="sls-avatar big">
                  <Avatar src={customer.image} name={customer.name} />
                </span>
                <div>
                  <h3>
                    <Link
                      to={`/remaker-customers/${customer.id}`}
                      className="sls-ccard-link"
                    >
                      {customer.name}
                    </Link>
                  </h3>
                  <p>
                    {[customer.city, customer.state].filter(Boolean).join(", ") ||
                      "Location not shared"}
                  </p>
                  <span
                    className={`rod-chip ${customer.type === "remaker" ? "remaker" : ""}`}
                  >
                    {customer.type === "remaker" ? "ReMaker" : "Customer"}
                  </span>
                  {customer.orders_count > 1 && (
                    <span className="rod-chip repeat">Repeat buyer</span>
                  )}
                </div>
              </div>

              <dl className="sls-ccard-stats">
                <div>
                  <dt>Orders</dt>
                  <dd>{customer.orders_count}</dd>
                </div>
                <div>
                  <dt>Spent</dt>
                  <dd>{formatPrice(customer.spent)}</dd>
                </div>
                <div>
                  <dt>Last order</dt>
                  <dd>{relativeTime(customer.last_order_at)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
