import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  X,
  Gift,
  Hourglass,
  CheckCircle2,
  Package,
  SearchX,
  HandHeart,
} from "lucide-react";

import {
  ACTIVE_STATUSES,
  CLOSED_STATUSES,
  DONATION_CATEGORIES,
  summarize,
  useDonations,
} from "../../data/donationsStore";
import Crumbs from "../../components/ui/Crumbs";
import DonationCard from "./components/DonationCard";
import EmptyState from "../../components/ui/EmptyState";

import "../../css/shared/ui-base.css";
import "../../css/donations/DonationCard.css";
import "../../css/donations/UserDonationHistory.css";

const PAGE_SIZE = 6;

const TABS = [
  { id: "all", label: "All" },
  {
    id: "active",
    label: "In progress",
    match: (d) => ACTIVE_STATUSES.includes(d.status),
  },
  {
    id: "completed",
    label: "Completed",
    match: (d) => d.status === "Completed",
  },
  {
    id: "closed",
    label: "Closed",
    match: (d) => CLOSED_STATUSES.includes(d.status),
  },
];

const SORTS = {
  newest: {
    label: "Newest first",
    fn: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  },
  oldest: {
    label: "Oldest first",
    fn: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  },
  items: { label: "Most items", fn: (a, b) => b.quantity - a.quantity },
  weight: { label: "Heaviest", fn: (a, b) => b.weightKg - a.weightKg },
};

export default function UserDonationHistory() {
  const donations = useDonations();
  const stats = useMemo(() => summarize(donations), [donations]);

  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState("list");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((item) => [
          item.id,
          item.match ? donations.filter(item.match).length : donations.length,
        ]),
      ),
    [donations],
  );

  const results = useMemo(() => {
    const text = query.trim().toLowerCase();
    const activeTab = TABS.find((item) => item.id === tab);

    return donations
      .filter((d) => (activeTab?.match ? activeTab.match(d) : true))
      .filter((d) => (category === "all" ? true : d.category === category))
      .filter((d) =>
        text
          ? [d.id, d.title, d.category, d.ngo?.name || ""].some((field) =>
              field.toLowerCase().includes(text),
            )
          : true,
      )
      .sort(SORTS[sort].fn);
  }, [donations, tab, category, query, sort]);

  const filtered = tab !== "all" || category !== "all" || query.trim() !== "";
  const reset = () => {
    setTab("all");
    setCategory("all");
    setQuery("");
    setVisible(PAGE_SIZE);
  };

  const shown = results.slice(0, visible);

  const summary = [
    { icon: Gift, label: "Total donations", value: stats.total },
    { icon: Hourglass, label: "In progress", value: stats.active },
    { icon: CheckCircle2, label: "Completed", value: stats.completed },
    { icon: Package, label: "Items given", value: stats.items },
  ];

  return (
    <div className="dn dn-history">
      <Crumbs
        items={[
          { label: "Donations", to: "/user-donations" },
          { label: "History" },
        ]}
      />

      <header className="dn-hist-head">
        <div>
          <span className="dn-eyebrow">Your giving</span>
          <h1>Donation history</h1>
          <p className="dn-muted">
            Every donation you've made, with its status, pickup and certificate.
          </p>
        </div>
        <Link to="/user-donations/new" className="dn-btn">
          <Plus size={17} /> New donation
        </Link>
      </header>

      <section className="dn-hist-summary">
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

      <section className="dn-card dn-hist-tools">
        <div className="dn-tabs" role="tablist">
          {TABS.map((item) => (
            <button
              type="button"
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? "is-active" : ""}
              onClick={() => {
                setTab(item.id);
                setVisible(PAGE_SIZE);
              }}
            >
              {item.label} <em>{counts[item.id]}</em>
            </button>
          ))}
        </div>

        <div className="dn-hist-filters">
          <label className="dn-search">
            <Search size={16} />
            <input
              value={query}
              placeholder="Search by name, ID or NGO"
              onChange={(event) => {
                setQuery(event.target.value);
                setVisible(PAGE_SIZE);
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
            value={category}
            aria-label="Filter by category"
            onChange={(event) => {
              setCategory(event.target.value);
              setVisible(PAGE_SIZE);
            }}
          >
            <option value="all">All categories</option>
            {DONATION_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            className="dn-select"
            value={sort}
            aria-label="Sort donations"
            onChange={(event) => setSort(event.target.value)}
          >
            {Object.entries(SORTS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>

          <div className="dn-view" role="group" aria-label="Layout">
            <button
              type="button"
              className={view === "list" ? "is-active" : ""}
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              className={view === "grid" ? "is-active" : ""}
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </section>

      {donations.length === 0 ? (
        <EmptyState
          icon={HandHeart}
          title="No donations yet"
          text="When you donate an item, it will show up here with its status and certificate."
          actionLabel="Donate your first item"
          to="/user-donations/new"
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No donations match"
          text="Try a different search or clear your filters to see everything."
          actionLabel="Clear filters"
          onAction={reset}
        />
      ) : (
        <>
          <p className="dn-hist-count">
            Showing {shown.length} of {results.length}{" "}
            {results.length === 1 ? "donation" : "donations"}
            {filtered && (
              <button type="button" className="dn-link" onClick={reset}>
                Clear filters
              </button>
            )}
          </p>

          <div className={view === "grid" ? "dn-hist-grid" : "dn-list"}>
            {shown.map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                variant={view}
              />
            ))}
          </div>

          {results.length > visible && (
            <div className="dn-hist-more">
              <button
                type="button"
                className="dn-btn dn-btn--ghost"
                onClick={() => setVisible((n) => n + PAGE_SIZE)}
              >
                Show more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
