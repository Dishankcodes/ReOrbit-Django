import React, { useMemo, useState } from "react";
import { useNavigate } from "../../../shared/portalRouter";
import { Check, Heart, Leaf, MapPin, PackageSearch, Search, ShoppingBag, ShoppingCart, SlidersHorizontal, Sparkles, Star, BadgeCheck, Boxes, X } from "lucide-react";

import { addToCart, useCartCount, useInCart, useStockOf } from "../../data/shopStore";
import { clearWishlist, useWishlist } from "../../data/wishlistStore";
import { CONDITIONS, IMPACT, ITEMS, formatPrice } from "../../../data/marketplaceData";
import { useCategoryNames } from "../../../shared/catalog";
import BannerSlot from "../../../shared/components/BannerSlot";
import { SkeletonCards } from "../../../shared/components/Skeleton";
import { useLiveMarketplace } from "../../data/liveMarketplace";
import SafeImage from "../../components/ui/SafeImage";

import "../../css/shared/ui-base.css";
import "../../../shared/components/Skeleton.css";
import "../../css/marketplace-css/UserMarketplaceV2.css";

import Spinner from "../../../shared/components/Spinner";
const SORTS = [
  { key: "featured", label: "Featured" },
  { key: "newest", label: "Newest first" },
  { key: "price-low", label: "Price: low to high" },
  { key: "price-high", label: "Price: high to low" },
  { key: "rating", label: "Top rated sellers" },
  { key: "co2", label: "Most CO₂ saved" },
];

const PRICE_CAPS = [
  { value: 100000, label: "Any price" },
  { value: 1000, label: "Up to ₹1,000" },
  { value: 2500, label: "Up to ₹2,500" },
  { value: 5000, label: "Up to ₹5,000" },
  { value: 10000, label: "Up to ₹10,000" },
];

function ProductCard({ item, wished, onWishlist, onAdded }) {
  const navigate = useNavigate();
  const stock = useStockOf()(item);
  const inCart = useInCart(item.id);
  const isMaker = item.sellerType === "remaker";

  const openProduct = () => navigate(`/user-marketplace/product/${item.id}`);
  const openSeller = (e) => {
    e.stopPropagation();
    if (item.live) return; // seller pages for live sellers come with the profiles module
    navigate(isMaker ? `/user-marketplace/remaker/${item.sellerId}` : `/user-marketplace/seller/${item.sellerId}`);
  };

  return (
    <article className="mk-card">
      <div className="mk-media" role="button" tabIndex={0} onClick={openProduct} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProduct(); } }}>
        <SafeImage src={item.image} alt={item.title} />
        <span className={`mk-type ${isMaker ? "maker" : ""}`}>
          {isMaker ? <><Sparkles size={12} /> ReMaker piece</> : item.sellerType === "admin" ? <><ShoppingBag size={12} /> ReOrbit store</> : <><Boxes size={12} /> Community item</>}
        </span>
        <button type="button" className={`mk-heart ${wished ? "on" : ""}`} aria-label={wished ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={wished} onClick={(e) => { e.stopPropagation(); onWishlist(item.id); }}>
          <Heart size={16} fill={wished ? "currentColor" : "none"} />
        </button>
        <span className="mk-cond">{item.condition}</span>
      </div>

      <div className="mk-body">
        <span className="mk-cat">{item.category}</span>
        <h3 onClick={openProduct}>{item.title}</h3>
        <button type="button" className="mk-seller" onClick={openSeller}>
          by <b>{item.seller}</b>
          {isMaker && <BadgeCheck size={13} />}
          <span className="mk-rate"><Star size={11} fill="currentColor" /> {item.sellerRating}</span>
        </button>

        <div className="mk-foot">
          <div>
            <strong>{formatPrice(item.price)}</strong>
            <small><MapPin size={11} /> {item.city}</small>
          </div>
          <button
            type="button"
            className={`mk-add ${inCart ? "in" : ""}`}
            disabled={!stock.purchasable}
            title={stock.reason || ""}
            onClick={(e) => { e.stopPropagation(); addToCart(item.id, 1, stock.available); onAdded?.(item); }}
          >
            {inCart ? <Check size={14} /> : <ShoppingBag size={14} />}
            {!stock.purchasable ? (stock.own ? "Yours" : "Sold") : inCart ? "In cart" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function UserMarketplace() {
  const navigate = useNavigate();
  const categoryNames = useCategoryNames();
  const wish = useWishlist();
  const cartCount = useCartCount();

  const [source, setSource] = useState("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [condition, setCondition] = useState("All");
  const [sort, setSort] = useState("featured");
  const [maxPrice, setMaxPrice] = useState(100000);
  const [savedOnly, setSavedOnly] = useState(false);
  const [toast, setToast] = useState(null);

  /* your own listings are not shown to you as things to buy */
  const live = useLiveMarketplace();
  const loading = !live.ready; /* real: live listings are still arriving */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const base = useMemo(() => ITEMS.filter((i) => i.sellerId !== "user-aarav-patel"), [live.version]);
  const counts = useMemo(() => ({
    all: base.length,
    user: base.filter((i) => i.sellerType === "user").length,
    remaker: base.filter((i) => i.sellerType === "remaker").length,
    admin: base.filter((i) => i.sellerType === "admin").length,
  }), [base]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = base.filter((i) => {
      if (source !== "all" && i.sellerType !== source) return false;
      if (savedOnly && !wish.ids.includes(i.id)) return false;
      if (category !== "All" && i.category !== category) return false;
      if (condition !== "All" && i.condition !== condition) return false;
      if (i.price > maxPrice) return false;
      return !q || [i.title, i.category, i.city, i.seller, i.summary].some((v) => String(v).toLowerCase().includes(q));
    });
    return out.sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      if (sort === "rating") return b.sellerRating - a.sellerRating;
      if (sort === "co2") return b.co2SavedKg - a.co2SavedKg;
      if (sort === "newest") return new Date(b.listedDate) - new Date(a.listedDate);
      return b.likes + b.views * 0.08 - (a.likes + a.views * 0.08);
    });
  }, [base, source, search, category, condition, maxPrice, sort, savedOnly, wish.ids]);

  const filtered = search || category !== "All" || condition !== "All" || maxPrice < 100000 || savedOnly || source !== "all";
  const reset = () => { setSource("all"); setSearch(""); setCategory("All"); setCondition("All"); setMaxPrice(100000); setSort("featured"); setSavedOnly(false); };

  const showToast = (item) => {
    setToast(item);
    window.clearTimeout(window.__reorbitMarketCartTimer);
    window.__reorbitMarketCartTimer = window.setTimeout(() => setToast(null), 3200);
  };

  const SOURCES = [
    { key: "all", label: "Everything", sub: "Every listing on ReOrbit", count: counts.all, icon: Sparkles },
    { key: "user", label: "Community items", sub: "Pre-loved items from members", count: counts.user, icon: Boxes },
    { key: "remaker", label: "ReMaker pieces", sub: "Finished work by makers", count: counts.remaker, icon: BadgeCheck },
    ...(counts.admin ? [{ key: "admin", label: "ReOrbit store", sub: "Sold by ReOrbit itself", count: counts.admin, icon: ShoppingBag }] : []),
  ];

  return (
    <div className="dn mk">
      <BannerSlot placement="Shop top" viewer="Signed-in members" />

      <header className="mk-head">
        <div>
          <span className="dn-eyebrow">ReOrbit marketplace</span>
          <h1>Things deserve more than one life.</h1>
          <p>Pre-loved, refurbished and remade pieces from the ReOrbit community.</p>
        </div>
        <ul className="mk-impact" aria-label="Community impact">
          <li><strong>{IMPACT.itemsRescued.toLocaleString("en-IN")}+</strong><span>items rescued</span></li>
          <li><strong>{IMPACT.co2SavedTonnes}T</strong><span>CO₂ saved</span></li>
          <li><strong>{IMPACT.remakersOnboarded}</strong><span>ReMakers</span></li>
        </ul>
      </header>

      <div className="mk-sources" role="tablist" aria-label="Listing type">
        {SOURCES.map(({ key, label, sub, count, icon: Icon }) => (
          <button key={key} type="button" role="tab" aria-selected={source === key} className={`mk-source ${source === key ? "on" : ""}`} onClick={() => setSource(key)}>
            <span className="mk-source-icon"><Icon size={18} /></span>
            <span><strong>{label}</strong><small>{sub}</small></span>
            <b>{count}</b>
          </button>
        ))}
      </div>

      <div className="mk-tools">
        <label className="mk-search">
          <Search size={16} />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by item, category, seller or city" aria-label="Search the marketplace" />
          {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}
        </label>
        <select value={condition} onChange={(e) => setCondition(e.target.value)} aria-label="Condition">
          <option value="All">Any condition</option>
          {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} aria-label="Price">
          {PRICE_CAPS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <button type="button" className={`mk-saved ${savedOnly ? "on" : ""}`} aria-pressed={savedOnly} onClick={() => setSavedOnly((v) => !v)}>
          <Heart size={15} fill={savedOnly ? "currentColor" : "none"} /> Saved <b>{wish.ids.length}</b>
        </button>
      </div>

      <div className="mk-chips" role="group" aria-label="Categories">
        {["All", ...categoryNames].map((c) => (
          <button key={c} type="button" className={category === c ? "on" : ""} aria-pressed={category === c} onClick={() => setCategory(c)}>
            {c === "All" ? "All categories" : c}
          </button>
        ))}
      </div>

      <p className="mk-count" aria-live="polite">
        {loading ? <Spinner label="Loading listings…" /> : <><strong>{results.length}</strong> {results.length === 1 ? "listing" : "listings"}{filtered && <button type="button" onClick={reset}>Clear filters</button>}</>}
      </p>

      {loading ? (
        <SkeletonCards count={8} min={240} />
      ) : results.length ? (
        <div className="mk-grid">
          {results.map((item) => (
            <ProductCard key={item.id} item={item} wished={wish.ids.includes(item.id)} onWishlist={wish.toggle} onAdded={showToast} />
          ))}
        </div>
      ) : (
        <div className="mk-empty">
          <PackageSearch size={30} />
          <h3>{savedOnly ? "No saved pieces match" : "Nothing matches that yet"}</h3>
          <p>Try a different search or clear the filters.</p>
          <button type="button" className="dn-btn" onClick={reset}><SlidersHorizontal size={15} /> Clear filters</button>
        </div>
      )}

      {toast && (
        <div className="mk-toast" role="status">
          <ShoppingBag size={15} />
          <span>{toast.title} added to cart</span>
          <button type="button" onClick={() => navigate("/user-cart")}>View cart</button>
        </div>
      )}
      {wish.ids.length > 0 && !toast && (
        <div className="mk-toast alt">
          <Leaf size={15} />
          <span>{wish.ids.length} saved {wish.ids.length === 1 ? "piece" : "pieces"}</span>
          <button type="button" onClick={() => navigate("/user-wishlist")}>View</button>
          <button type="button" onClick={clearWishlist}>Clear</button>
        </div>
      )}
    </div>
  );
}
