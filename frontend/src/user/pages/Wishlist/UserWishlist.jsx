import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Search, ShoppingBag, Trash2, X, Zap, Store, SearchX, Sparkles, CheckCheck } from "lucide-react";

import { ITEMS, formatPrice } from "../../../data/marketplaceData";
import { useWishlist } from "../../data/wishlistStore";
import { addToCart, startCheckout, useInCart, useStockOf } from "../../data/shopStore";
import { sellerPath } from "../../data/ordersStore";
import ConfirmModal from "../../components/ui/ConfirmModal";
import EmptyState from "../../components/ui/EmptyState";
import SafeImage from "../../components/ui/SafeImage";
import useToast from "../../components/ui/useToast";

import "../../css/shared/ui-base.css";
import "../../css/wishlist/UserWishlist.css";

const SORTS = {
  recent: { label: "Recently saved" },
  low: { label: "Price: low to high", fn: (a, b) => a.price - b.price },
  high: { label: "Price: high to low", fn: (a, b) => b.price - a.price },
  az: { label: "Name A–Z", fn: (a, b) => a.title.localeCompare(b.title) },
};

function WishCard({ item, stock, onRemove, onAdded }) {
  const navigate = useNavigate();
  const inCart = useInCart(item.id);
  const remaker = item.sellerType === "remaker";
  const open = () => navigate(`/user-marketplace/product/${item.id}`);

  return (
    <article className={`wl-card ${stock.purchasable ? "" : "is-off"}`}>
      <div className="wl-media" onClick={open} role="link" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && open()}>
        <SafeImage src={item.image} alt={item.title} />
        {!stock.purchasable && <span className="wl-off">{stock.own ? "Your listing" : "Sold"}</span>}
        {remaker && <span className="wl-tag">ReMaker</span>}
        <button type="button" className="wl-heart" aria-label={`Remove ${item.title} from wishlist`} onClick={(e) => { e.stopPropagation(); onRemove(item); }}>
          <Heart size={16} fill="currentColor" />
        </button>
      </div>

      <div className="wl-body">
        <span className="wl-cat">{item.category} · {item.condition}</span>
        <h3 onClick={open}>{item.title}</h3>
        <Link to={sellerPath(item)} className="dn-link wl-seller">{remaker ? "By" : "Sold by"} {item.seller}</Link>
        <div className="wl-price"><strong>{formatPrice(item.price)}</strong><small>{item.city}</small></div>

        {stock.purchasable ? (
          <div className="wl-actions">
            <button type="button" className="dn-btn dn-btn--sm" onClick={() => { startCheckout([{ id: item.id, qty: 1 }], "buy"); navigate("/user-checkout"); }}><Zap size={14} /> Buy now</button>
            <button type="button" className="dn-btn dn-btn--ghost dn-btn--sm" onClick={() => { addToCart(item.id, 1, stock.available); onAdded(item); }}>
              <ShoppingBag size={14} /> {inCart ? "In cart" : "Add to cart"}
            </button>
          </div>
        ) : (
          <p className="wl-unavail">{stock.reason}</p>
        )}
      </div>
    </article>
  );
}

export default function UserWishlist() {
  const navigate = useNavigate();
  const wish = useWishlist();
  const stockOf = useStockOf();
  const { toast, show } = useToast();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [avail, setAvail] = useState("all");
  const [sort, setSort] = useState("recent");
  const [clearing, setClearing] = useState(false);

  const saved = useMemo(
    () => wish.ids.map((id) => ITEMS.find((i) => i.id === id)).filter(Boolean).map((item) => ({ item, stock: stockOf(item) })),
    [wish.ids, stockOf],
  );
  const categories = useMemo(() => [...new Set(saved.map((s) => s.item.category))], [saved]);

  const rows = useMemo(() => {
    const text = query.trim().toLowerCase();
    const list = saved
      .filter((s) => category === "all" || s.item.category === category)
      .filter((s) => (avail === "all" ? true : avail === "ok" ? s.stock.purchasable : !s.stock.purchasable))
      .filter((s) => (text ? [s.item.title, s.item.seller, s.item.category].some((f) => f.toLowerCase().includes(text)) : true));
    return SORTS[sort].fn ? [...list].sort((a, b) => SORTS[sort].fn(a.item, b.item)) : list;
  }, [saved, query, category, avail, sort]);

  const buyable = saved.filter((s) => s.stock.purchasable);
  const worth = buyable.reduce((n, s) => n + s.item.price, 0);

  const suggestions = useMemo(() => {
    const cats = new Set(saved.map((s) => s.item.category));
    return ITEMS.filter((i) => !wish.has(i.id) && stockOf(i).purchasable)
      .sort((a, b) => Number(cats.has(b.category)) - Number(cats.has(a.category)))
      .slice(0, 4);
  }, [saved, wish, stockOf]);

  const remove = (item) => { wish.toggle(item.id); show("Removed from wishlist."); };
  const reset = () => { setQuery(""); setCategory("all"); setAvail("all"); };

  if (saved.length === 0) {
    return (
      <div className="dn wl">
        <EmptyState icon={Heart} title="Your wishlist is empty" text="Tap the heart on any piece you love and it will wait for you here." actionLabel="Browse marketplace" to="/user-marketplace" />
        {suggestions.length > 0 && <Suggestions items={suggestions} stockOf={stockOf} wish={wish} />}
      </div>
    );
  }

  return (
    <div className="dn wl">
      <header className="wl-head">
        <div>
          <span className="dn-eyebrow">Saved for later</span>
          <h1>Your wishlist</h1>
          <p className="dn-muted">
            {saved.length} {saved.length === 1 ? "piece" : "pieces"} · {buyable.length} available worth {formatPrice(worth)}
          </p>
        </div>
        <div className="wl-head-actions">
          <button
            type="button"
            className="dn-btn"
            disabled={buyable.length === 0}
            onClick={() => { buyable.forEach((s) => addToCart(s.item.id, 1, s.stock.available)); show(`${buyable.length} added to your cart.`); }}
          >
            <CheckCheck size={16} /> Add all available to cart
          </button>
          <button type="button" className="dn-btn dn-btn--ghost" onClick={() => setClearing(true)}><Trash2 size={15} /> Clear</button>
        </div>
      </header>

      <section className="dn-card wl-tools">
        <label className="wl-search">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your wishlist" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
        </label>
        <select className="dn-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="dn-select" value={avail} onChange={(e) => setAvail(e.target.value)} aria-label="Availability">
          <option value="all">Any availability</option>
          <option value="ok">Available</option>
          <option value="off">Unavailable</option>
        </select>
        <select className="dn-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
      </section>

      {rows.length === 0 ? (
        <EmptyState icon={SearchX} title="Nothing matches" text="Try different filters." actionLabel="Clear filters" onAction={reset} />
      ) : (
        <div className="wl-grid">
          {rows.map((s) => <WishCard key={s.item.id} item={s.item} stock={s.stock} onRemove={remove} onAdded={(i) => show(`${i.title} added to cart.`)} />)}
        </div>
      )}

      {suggestions.length > 0 && <Suggestions items={suggestions} stockOf={stockOf} wish={wish} />}

      {clearing && (
        <ConfirmModal icon={Trash2} title="Clear your wishlist?" confirmLabel="Clear wishlist" cancelLabel="Keep it" onClose={() => setClearing(false)} onConfirm={() => { saved.forEach((s) => wish.toggle(s.item.id)); setClearing(false); show("Wishlist cleared."); }}>
          <p>All {saved.length} saved pieces will be removed. You can save them again any time.</p>
        </ConfirmModal>
      )}
      {toast}
    </div>
  );
}

function Suggestions({ items, stockOf, wish }) {
  const navigate = useNavigate();
  return (
    <section className="wl-suggest">
      <div className="wl-suggest-head"><h2><Sparkles size={18} /> You might also like</h2><Link to="/user-marketplace" className="dn-link">See more →</Link></div>
      <div className="wl-suggest-grid">
        {items.map((i) => (
          <article key={i.id} className="wl-mini" onClick={() => navigate(`/user-marketplace/product/${i.id}`)} role="link" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate(`/user-marketplace/product/${i.id}`)}>
            <SafeImage src={i.image} alt={i.title} />
            <div>
              <strong>{i.title}</strong>
              <span>{formatPrice(i.price)}</span>
            </div>
            <button type="button" aria-label={`Save ${i.title}`} onClick={(e) => { e.stopPropagation(); wish.toggle(i.id); }}><Heart size={15} /></button>
          </article>
        ))}
      </div>
    </section>
  );
}
