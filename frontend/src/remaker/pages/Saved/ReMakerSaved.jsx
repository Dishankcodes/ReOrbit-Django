import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { ITEMS, formatPrice } from "../../../data/marketplaceData";
import { useLiveMarketplace } from "../../../user/data/liveMarketplace";
import useWishlist, {
  clearWishlist,
  setWishlist,
} from "../../hooks/useWishlist";

import SavedCard from "./components/SavedCard";

import "../../css/ReMakerUi.css";
import "./SavedPage.css";

/* a live marketplace row, shaped like the listing the saved cards draw */
const toListing = (i) => ({
  id: i.id,
  title: i.title,
  category: i.category,
  price: i.price,
  quantity: i.soldOut ? 0 : i.quantity,
  gallery: i.image ? [i.image] : [],
  source: i.sellerType,
  seller: i.seller,
  city: i.city,
  condition: i.condition,
});

export default function ReMakerSaved() {
  const wishlist = useWishlist();
  const live =
    useLiveMarketplace(); /* real products join ITEMS once this has loaded */

  const [source, setSource] = useState("all");
  const [sort, setSort] = useState("recent");
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = (text, undo = null) => {
    clearTimeout(timer.current);
    setToast({ text, undo });
    timer.current = setTimeout(() => setToast(null), 6000);
  };

  /* keep the order they were saved in (newest save last in the list) */
  const saved = useMemo(
    () =>
      wishlist.ids
        .map((id, index) => ({
          listing: ITEMS.find((item) => item.id === id),
          index,
        }))
        .filter((entry) => entry.listing)
        .map((entry) => ({ ...entry, listing: toListing(entry.listing) })),
    [wishlist.ids, live.version],
  );

  const counts = {
    all: saved.length,
    user: saved.filter((entry) => entry.listing.source === "user").length,
    remaker: saved.filter((entry) => entry.listing.source === "remaker").length,
    admin: saved.filter((entry) => entry.listing.source === "admin").length,
  };

  const visible = useMemo(() => {
    const filtered = saved.filter(
      (entry) => source === "all" || entry.listing.source === source,
    );

    const sorters = {
      recent: (a, b) => b.index - a.index,
      low: (a, b) => a.listing.price - b.listing.price,
      high: (a, b) => b.listing.price - a.listing.price,
      name: (a, b) => a.listing.title.localeCompare(b.listing.title),
    };

    return [...filtered].sort(sorters[sort]).map((entry) => entry.listing);
  }, [saved, source, sort]);

  const total = visible.reduce((sum, item) => sum + item.price, 0);

  const remove = (listing) => {
    const before = [...wishlist.ids];
    wishlist.toggle(listing.id);
    flash(`Removed ${listing.title}.`, () => setWishlist(before));
  };

  const clearAll = () => {
    const removed = clearWishlist();
    setConfirmClear(false);
    flash("Cleared your saved items.", () => setWishlist(removed));
  };

  if (saved.length === 0 && (wishlist.loading || !live.ready)) {
    return (
      <section className="rk sav">
        <p role="status">Loading your saved items…</p>
      </section>
    );
  }

  if (saved.length === 0) {
    return (
      <section className="rk sav">
        <div className="rk-empty">
          <div className="rk-empty-art" aria-hidden="true">
            <img
              src="https://images.pexels.com/photos/5825540/pexels-photo-5825540.jpeg?auto=compress&cs=tinysrgb&w=1000"
              alt=""
            />
            <img
              src="https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg?auto=compress&cs=tinysrgb&w=1000"
              alt=""
            />
          </div>
          <h3>Nothing saved yet</h3>
          <p>
            Tap the heart on any listing in the marketplace to keep it here for
            later.
          </p>
          <Link to="/remaker-marketplace" className="rk-btn primary">
            Browse the marketplace
          </Link>
        </div>

        {toast && (
          <div className="rk-toast" role="status" aria-live="polite">
            <span>{toast.text}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo();
                  setToast(null);
                }}
              >
                Undo
              </button>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rk sav">
      <header className="rk-top">
        <div>
          <p>
            Pieces you saved from the marketplace. {saved.length}{" "}
            {saved.length === 1 ? "item" : "items"}, worth{" "}
            {formatPrice(
              saved.reduce((sum, entry) => sum + entry.listing.price, 0),
            )}{" "}
            together.
          </p>
        </div>

        <div className="rk-top-actions">
          <Link to="/remaker-marketplace" className="rk-btn ghost">
            Keep browsing
          </Link>
          <button
            type="button"
            className="rk-btn danger-ghost"
            onClick={() => setConfirmClear(true)}
          >
            Clear all
          </button>
        </div>
      </header>

      <div className="sav-bar">
        <div className="rk-tabs" role="tablist" aria-label="Filter saved items">
          {[
            { key: "all", label: "Everything" },
            { key: "user", label: "Community items" },
            { key: "remaker", label: "ReMaker pieces" },
            { key: "admin", label: "ReOrbit store" },
          ].map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={source === item.key}
              className={source === item.key ? "active" : ""}
              key={item.key}
              onClick={() => setSource(item.key)}
            >
              {item.label}
              <span>{counts[item.key]}</span>
            </button>
          ))}
        </div>

        <label className="rk-select">
          <span className="sr-only">Sort saved items</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="recent">Recently saved</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
            <option value="name">Name A to Z</option>
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="rk-empty">
          <h3>Nothing in this group</h3>
          <p>
            Switch to another group, or save more pieces from the marketplace.
          </p>
          <button
            type="button"
            className="rk-btn ghost"
            onClick={() => setSource("all")}
          >
            Show everything
          </button>
        </div>
      ) : (
        <>
          <div className="sav-grid">
            {visible.map((listing) => (
              <SavedCard key={listing.id} listing={listing} onRemove={remove} />
            ))}
          </div>

          <p className="sav-total">
            {visible.length} {visible.length === 1 ? "item" : "items"} shown,{" "}
            {formatPrice(total)} in total
          </p>
        </>
      )}

      {confirmClear && (
        <div
          className="rk-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmClear(false);
          }}
        >
          <div
            className="rk-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="sav-clear-title"
          >
            <h2 id="sav-clear-title">Clear all saved items?</h2>
            <p className="rk-modal-body">
              This removes all {saved.length} items from your saved list. You
              can undo right after.
            </p>
            <div className="rk-modal-actions">
              <button
                type="button"
                className="rk-btn danger"
                onClick={clearAll}
              >
                Clear all
              </button>
              <button
                type="button"
                className="rk-btn ghost"
                onClick={() => setConfirmClear(false)}
              >
                Keep them
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="rk-toast" role="status" aria-live="polite">
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo();
                setToast(null);
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </section>
  );
}
