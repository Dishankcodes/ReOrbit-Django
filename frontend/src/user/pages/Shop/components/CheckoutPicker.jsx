import React, { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Minus, PackageSearch, Plus, Search, ShoppingBag, X } from "lucide-react";

import { ITEMS, formatPrice } from "../../../../data/marketplaceData";
import { isLiveId } from "../../../data/checkoutStore";
import { useLiveMarketplace } from "../../../data/liveMarketplace";
import {
  addToCheckout,
  removeFromCheckout,
  setCheckoutQty,
  useCheckoutQty,
  useStockOf,
} from "../../../data/shopStore";
import { useNavigate } from "../../../../shared/portalRouter";
import SafeImage from "../../../components/ui/SafeImage";
import { PageLoader } from "../../../../shared/components/Spinner";
import "./CheckoutPicker.css";

const SORTS = [
  { key: "new", label: "Newest" },
  { key: "low", label: "Price: low to high" },
  { key: "high", label: "Price: high to low" },
];
const PAGE = 24;

/* "Add more products" on the checkout page: a small marketplace (search, category, sort) whose
   items go straight into the checkout being paid for. Shared by the User, ReMaker and Admin
   checkout, which are the same page. */
export default function CheckoutPicker({ open, onClose }) {
  const navigate = useNavigate();
  const live = useLiveMarketplace();
  const stockOf = useStockOf();
  const inCheckout = useCheckoutQty();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState("new");
  const [shown, setShown] = useState(PAGE);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setShown(PAGE);
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  /* only live, buyable products (not your own listings, not sold out) */
  const products = useMemo(
    () => ITEMS.filter((i) => i.live && isLiveId(i.id)).map(stockOf).filter((i) => i.purchasable),
    [stockOf, live.version], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products],
  );
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const rows = products.filter(
      (p) =>
        (!cat || p.category === cat) &&
        (!t || `${p.title} ${p.seller} ${p.category}`.toLowerCase().includes(t)),
    );
    if (sort === "low") rows.sort((a, b) => a.price - b.price);
    else if (sort === "high") rows.sort((a, b) => b.price - a.price);
    else rows.sort((a, b) => String(b.listedDate || "").localeCompare(String(a.listedDate || "")));
    return rows;
  }, [products, q, cat, sort]);

  useEffect(() => setShown(PAGE), [q, cat, sort]);

  if (!open) return null;

  const count = Object.values(inCheckout).reduce((n, v) => n + v, 0);
  const total = Object.entries(inCheckout).reduce((n, [id, qty]) => {
    const p = products.find((x) => x.id === id);
    return n + (p ? p.price * qty : 0);
  }, 0);

  return (
    <div className="ckp-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="ckp" role="dialog" aria-modal="true" aria-labelledby="ckp-title">
        <header className="ckp-head">
          <div>
            <h2 id="ckp-title">Add more products</h2>
            <p>Anything you add here goes straight into this order.</p>
          </div>
          <button type="button" className="ckp-x" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="ckp-tools">
          <label className="ckp-search">
            <Search size={16} />
            <input
              ref={searchRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, sellers or categories"
              aria-label="Search products"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </label>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {categories.length > 1 && (
          <div className="ckp-cats" role="tablist" aria-label="Category">
            <button type="button" className={!cat ? "on" : ""} onClick={() => setCat("")}>
              All
            </button>
            {categories.map((c) => (
              <button key={c} type="button" className={cat === c ? "on" : ""} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="ckp-body">
          {!live.ready && products.length === 0 ? (
            <PageLoader label="Loading products…" minHeight={200} />
          ) : list.length === 0 ? (
            <div className="ckp-empty">
              <PackageSearch size={30} />
              <strong>{q || cat ? "Nothing matches" : "No other products right now"}</strong>
              <span>{q || cat ? "Try another search or category." : "Check back soon."}</span>
            </div>
          ) : (
            <>
              <p className="ckp-count">
                {list.length} product{list.length === 1 ? "" : "s"}
              </p>
              <ul className="ckp-grid">
                {list.slice(0, shown).map((p) => {
                  const qty = inCheckout[p.id] || 0;
                  return (
                    <li key={p.id} className={qty ? "in" : ""}>
                      <div className="ckp-img">
                        <SafeImage src={p.image} alt={p.title} />
                        {qty > 0 && <i>{qty} in order</i>}
                      </div>
                      <div className="ckp-info">
                        <strong title={p.title}>{p.title}</strong>
                        <span>
                          {p.sellerType === "remaker" ? "By" : "Sold by"} {p.seller}
                        </span>
                        <div className="ckp-price">
                          <b>{formatPrice(p.price)}</b>
                          {p.available <= 3 && <em>Only {p.available} left</em>}
                        </div>
                      </div>
                      {qty > 0 ? (
                        <div className="ckp-step" aria-label={`Quantity of ${p.title}`}>
                          <button
                            type="button"
                            onClick={() => (qty <= 1 ? removeFromCheckout(p.id) : setCheckoutQty(p.id, qty - 1, p.available))}
                            aria-label={qty <= 1 ? "Remove from order" : "One less"}
                          >
                            <Minus size={14} />
                          </button>
                          <span>{qty}</span>
                          <button
                            type="button"
                            onClick={() => setCheckoutQty(p.id, qty + 1, p.available)}
                            disabled={qty >= p.available}
                            aria-label="One more"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button type="button" className="ckp-add" onClick={() => addToCheckout(p.id, 1, p.available)}>
                          <Plus size={14} /> Add
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {list.length > shown && (
                <button type="button" className="ckp-more" onClick={() => setShown((n) => n + PAGE)}>
                  Show more ({list.length - shown} left)
                </button>
              )}
            </>
          )}
        </div>

        <footer className="ckp-foot">
          <button
            type="button"
            className="ckp-browse"
            onClick={() => {
              onClose();
              navigate("/user-marketplace");
            }}
          >
            <ExternalLink size={14} /> Browse the full marketplace
          </button>
          <button type="button" className="dn-btn" onClick={onClose}>
            <ShoppingBag size={15} /> Back to checkout · {count} item{count === 1 ? "" : "s"}
            {total > 0 ? ` · ${formatPrice(total)}` : ""}
          </button>
        </footer>
      </section>
    </div>
  );
}
