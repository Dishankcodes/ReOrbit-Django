import React, { useMemo, useState } from "react";
import { Search, SlidersHorizontal, PackageSearch, X, Heart, ShieldCheck, Truck, Recycle } from "lucide-react";

import { useShopProducts, useCart, useWishlist } from "../../data/shopStore";
import ProductCard from "./components/ProductCard";
import ShopNav from "./components/ShopNav";
import EmptyState from "../../components/ui/EmptyState";
import useToast from "../../components/ui/useToast";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/shop/AdminShop.css";

const SOURCES = [
  { key: "all", label: "Everything" },
  { key: "item", label: "Community items" },
  { key: "product", label: "ReMaker products" },
];
const SORTS = [
  { key: "new", label: "Newest first" },
  { key: "low", label: "Price: low to high" },
  { key: "high", label: "Price: high to low" },
  { key: "popular", label: "Most viewed" },
];
const PAGE = 12;

export default function AdminShop() {
  const products = useShopProducts();
  const cart = useCart();
  const saved = useWishlist();
  const { toast, toastNode } = useToast();

  const [q, setQ] = useState("");
  const [source, setSource] = useState("all");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("new");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const categories = useMemo(() => {
    const c = {};
    products.forEach((p) => { c[p.category] = (c[p.category] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [products]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const lo = min === "" ? 0 : Number(min);
    const hi = max === "" ? Infinity : Number(max);
    const list = products.filter((p) =>
      (source === "all" || p.type === source) &&
      (category === "All" || p.category === category) &&
      p.price >= lo && p.price <= hi &&
      (!onlySaved || saved.has(p.id)) &&
      (!t || `${p.title} ${p.category} ${p.owner.name} ${p.owner.handle || ""} ${p.owner.city}`.toLowerCase().includes(t)));
    const by = { new: (a, b) => new Date(b.posted_at) - new Date(a.posted_at), low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price, popular: (a, b) => b.views - a.views };
    return list.sort(by[sort]);
  }, [products, q, source, category, sort, min, max, onlySaved, saved]);

  const inCart = new Set(cart.all.map((l) => l.id));
  const filtersOn = q || source !== "all" || category !== "All" || min || max || onlySaved;
  const reset = () => { setQ(""); setSource("all"); setCategory("All"); setMin(""); setMax(""); setOnlySaved(false); setSort("new"); };
  const count = (k) => products.filter((p) => k === "all" || p.type === k).length;

  return (
    <div className="au-page sh-page">
      <ShopNav />

      <section className="sh-hero">
        <div className="sh-hero-copy">
          <span className="sh-eyebrow">Buy products</span>
          <h2>Shop the marketplace as ReOrbit</h2>
          <p>Browse live community items and ReMaker creations. Orders you place here are made by the platform and appear in Orders too.</p>
          <label className="sh-search">
            <Search size={18} />
            <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Search products, sellers or cities" aria-label="Search products" />
            {q && <button type="button" onClick={() => setQ("")} aria-label="Clear search"><X size={15} /></button>}
          </label>
        </div>
        <ul className="sh-hero-points">
          <li><ShieldCheck size={18} /> Every listing is verified</li>
          <li><Truck size={18} /> Free delivery on big orders</li>
          <li><Recycle size={18} /> Platform fee waived for admin</li>
        </ul>
      </section>

      <section className="sh-filters" aria-label="Filters">
        <div className="sh-seg" role="tablist" aria-label="Seller type">
          {SOURCES.map((s) => (
            <button key={s.key} type="button" role="tab" aria-selected={source === s.key} className={source === s.key ? "on" : ""} onClick={() => { setSource(s.key); setLimit(PAGE); }}>
              {s.label} <em>{count(s.key)}</em>
            </button>
          ))}
        </div>
        <div className="sh-filter-tools">
          <label className="sh-select"><SlidersHorizontal size={14} />
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
          <div className="sh-price"><span>₹</span>
            <input type="number" min="0" inputMode="numeric" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} aria-label="Minimum price" />
            <i>–</i>
            <input type="number" min="0" inputMode="numeric" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} aria-label="Maximum price" />
          </div>
          <button type="button" className={`sh-toggle ${onlySaved ? "on" : ""}`} aria-pressed={onlySaved} onClick={() => setOnlySaved((v) => !v)}><Heart size={14} /> Saved {saved.size > 0 && <em>{saved.size}</em>}</button>
        </div>
      </section>

      <div className="sh-chips" aria-label="Categories">
        <button type="button" className={category === "All" ? "on" : ""} onClick={() => { setCategory("All"); setLimit(PAGE); }}>All categories</button>
        {categories.map(([c, n]) => (
          <button key={c} type="button" className={category === c ? "on" : ""} onClick={() => { setCategory(c); setLimit(PAGE); }}>{c} <em>{n}</em></button>
        ))}
      </div>

      <div className="sh-resultbar">
        <span><strong>{shown.length}</strong> product{shown.length === 1 ? "" : "s"} available</span>
        {filtersOn && <button type="button" className="sh-link" onClick={reset}>Clear all filters</button>}
      </div>

      {shown.length === 0 ? (
        <section className="au-panel">
          <EmptyState icon={PackageSearch} title="No products match" text="Try a different search, category or price range." action={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={reset}>Clear filters</button>} />
        </section>
      ) : (
        <>
          <div className="sh-grid">
            {shown.slice(0, limit).map((p) => (
              <ProductCard key={p.id} product={p} inCart={inCart.has(p.id)} onAdded={(x) => toast(`${x.title} added to cart`)} />
            ))}
          </div>
          {limit < shown.length && (
            <div className="sh-more"><button type="button" className="ad-btn ad-btn-ghost" onClick={() => setLimit((n) => n + PAGE)}>Show {Math.min(PAGE, shown.length - limit)} more</button></div>
          )}
        </>
      )}
      {toastNode}
    </div>
  );
}
