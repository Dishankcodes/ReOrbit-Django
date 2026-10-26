import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, X, Package, Wallet, Truck, Tag, CheckCircle2, ReceiptText, SearchX, ArrowRight } from "lucide-react";

import { summarizeSelling, useListings, useSales } from "../../data/listingsStore";
import { formatPrice } from "../../../data/marketplaceData";
import EmptyState from "../../components/ui/EmptyState";
import ListingCard from "./components/ListingCard";

import "../../css/shared/ui-base.css";
import "../../css/sell/sell-base.css";
import "../../css/sell/UserSell.css";

const TABS = [
  { id: "all", label: "All" },
  { id: "live", label: "Live", match: (l) => l.status === "Live" },
  { id: "sold", label: "Reserved & sold", match: (l) => ["Reserved", "Sold"].includes(l.status) },
  { id: "draft", label: "Drafts", match: (l) => l.status === "Draft" },
];

const SORTS = {
  newest: { label: "Newest first", fn: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) },
  price: { label: "Price: high to low", fn: (a, b) => b.price - a.price },
  views: { label: "Most viewed", fn: (a, b) => b.views - a.views },
};

export default function UserSell() {
  const navigate = useNavigate();
  const listings = useListings();
  const sales = useSales();
  const stats = useMemo(() => summarizeSelling(listings, sales), [listings, sales]);

  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, t.match ? listings.filter(t.match).length : listings.length])),
    [listings],
  );

  const results = useMemo(() => {
    const text = query.trim().toLowerCase();
    const active = TABS.find((t) => t.id === tab);
    return listings
      .filter((l) => (active?.match ? active.match(l) : true))
      .filter((l) => (text ? [l.id, l.title, l.category].some((f) => f.toLowerCase().includes(text)) : true))
      .sort(SORTS[sort].fn);
  }, [listings, tab, query, sort]);

  const summary = [
    { icon: Tag, label: "Live listings", value: stats.live },
    { icon: Package, label: "Drafts", value: stats.drafts },
    { icon: CheckCircle2, label: "Items sold", value: stats.sold },
    { icon: Wallet, label: "Earned so far", value: formatPrice(stats.earned) },
  ];

  return (
    <div className="dn sl">
      <section className="sl-hero">
        <div>
          <span className="dn-eyebrow">Sell on ReOrbit</span>
          <h1>Give your pre-loved things a new home, and earn from it.</h1>
          <p>List an item in minutes. It appears in the marketplace, and you get paid once it's delivered.</p>
          <div className="sl-hero-actions">
            <Link to="/user-sell/new" className="dn-btn"><Plus size={17} /> Sell an item</Link>
            <Link to="/user-sell/sales" className="dn-btn dn-btn--ghost"><ReceiptText size={16} /> Sales &amp; payouts</Link>
          </div>
        </div>
        <ul className="sl-hero-steps">
          <li><b>1</b><span>List it<small>Photos, condition, price</small></span></li>
          <li><b>2</b><span>Reach buyers<small>Your item goes live</small></span></li>
          <li><b>3</b><span>Get paid<small>After delivery</small></span></li>
        </ul>
      </section>

      <section className="sl-stats">
        {summary.map((s) => {
          const Icon = s.icon;
          return (
            <article key={s.label}><span><Icon size={18} /></span><div><strong>{s.value}</strong><small>{s.label}</small></div></article>
          );
        })}
      </section>

      {(stats.toShip > 0) && (
        <section className="sl-attention" aria-label="Needs your attention">
          {stats.toShip > 0 && (
            <Link to="/user-sell/sales" className="sl-alert ship">
              <Truck size={18} />
              <div><strong>{stats.toShip} {stats.toShip === 1 ? "order" : "orders"} to pack and ship</strong><span>Buyers are waiting for these.</span></div>
              <ArrowRight size={16} />
            </Link>
          )}
        </section>
      )}

      <section className="dn-card sl-tools">
        <div className="sl-tabs" role="tablist">
          {TABS.map((t) => (
            <button type="button" key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-active" : ""} onClick={() => setTab(t.id)}>
              {t.label} <em>{counts[t.id]}</em>
            </button>
          ))}
        </div>
        <div className="sl-filters">
          <label className="sl-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your listings" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
          </label>
          <select className="dn-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort listings">
            {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </div>
      </section>

      {listings.length === 0 ? (
        <EmptyState icon={Package} title="You haven't listed anything yet" text="Photograph something you no longer use and list it in a few minutes." actionLabel="List your first item" to="/user-sell/new" />
      ) : results.length === 0 ? (
        <EmptyState icon={SearchX} title="No listings here" text="Nothing matches this tab or search yet." actionLabel="Show all listings" onAction={() => { setTab("all"); setQuery(""); }} />
      ) : (
        <div className="sl-grid">
          {results.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}

      <button type="button" className="sl-fab dn-btn" onClick={() => navigate("/user-sell/new")}><Plus size={17} /> Sell an item</button>
    </div>
  );
}
