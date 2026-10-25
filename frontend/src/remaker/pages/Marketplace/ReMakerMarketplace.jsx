import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  Heart,
  ImageOff,
  Leaf,
  MapPin,
  Package,
  Palette,
  Search,
  SearchX,
  Sparkles,
  X,
} from "lucide-react";

import {
  CONDITIONS,
  MARKET_CATEGORIES,
  MARKET_LISTINGS,
  SORTS,
  SOURCE_LABEL,
  formatPrice,
  sortListings,
} from "../../data/remakerMarketplaceData";
import useWishlist from "../../hooks/useWishlist";

import "../../css/ReMakerMarketplace.css";

function Photo({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <span className="rmk-photo-fallback">
        <ImageOff size={24} />
      </span>
    );
  }

  return (
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
  );
}

export default function ReMakerMarketplace() {
  const [params, setParams] = useSearchParams();
  const wishlist = useWishlist();
  const [savedOnly, setSavedOnly] = useState(false);

  const query = params.get("search") || "";
  const source = params.get("source") || "all";
  const category = params.get("category") || "all";
  const condition = params.get("condition") || "all";
  const sort = params.get("sort") || "newest";

  const setParam = (key, value, fallback = "all") => {
    const next = new URLSearchParams(params);

    if (!value || value === fallback) next.delete(key);
    else next.set(key, value);

    setParams(next, { replace: true });
  };

  const counts = useMemo(
    () => ({
      all: MARKET_LISTINGS.length,
      user: MARKET_LISTINGS.filter((l) => l.source === "user").length,
      remaker: MARKET_LISTINGS.filter((l) => l.source === "remaker").length,
    }),
    [],
  );

  const results = useMemo(() => {
    const text = query.trim().toLowerCase();

    const filtered = MARKET_LISTINGS.filter((listing) => {
      if (source !== "all" && listing.source !== source) return false;
      if (category !== "all" && listing.category !== category) return false;
      if (condition !== "all" && listing.condition !== condition) return false;
      if (savedOnly && !wishlist.has(listing.id)) return false;

      if (!text) return true;

      return [
        listing.title,
        listing.category,
        listing.seller,
        listing.city,
        ...listing.materials,
      ]
        .join(" ")
        .toLowerCase()
        .includes(text);
    });

    return sortListings(filtered, sort);
  }, [query, source, category, condition, sort, savedOnly, wishlist]);

  const filtersActive =
    query ||
    source !== "all" ||
    category !== "all" ||
    condition !== "all" ||
    savedOnly;

  const clearAll = () => {
    setSavedOnly(false);
    setParams({}, { replace: true });
  };

  const paths = [
    {
      key: "all",
      title: "Everything",
      note: "Every listing on ReOrbit",
      icon: Sparkles,
    },
    {
      key: "user",
      title: "Community items",
      note: "Pre-loved pieces to rework",
      icon: Package,
    },
    {
      key: "remaker",
      title: "ReMaker pieces",
      note: "Finished work by other makers",
      icon: Palette,
    },
  ];

  return (
    <section className="rmk">
      {/* SOURCE PATHS */}
      <div className="rmk-paths" role="tablist" aria-label="Where to buy from">
        {paths.map((path) => {
          const Icon = path.icon;
          const active = source === path.key;

          return (
            <button
              type="button"
              role="tab"
              aria-selected={active}
              className={`rmk-path ${active ? "active" : ""}`}
              key={path.key}
              onClick={() => setParam("source", path.key)}
            >
              <span className="rmk-path-icon">
                <Icon size={20} strokeWidth={1.8} />
              </span>
              <span className="rmk-path-text">
                <strong>{path.title}</strong>
                <small>{path.note}</small>
              </span>
              <span className="rmk-path-count">{counts[path.key]}</span>
            </button>
          );
        })}
      </div>

      {/* FILTERS */}
      <div className="rmk-filters">
        <label className="rmk-search">
          <Search size={17} />
          <input
            type="text"
            value={query}
            onChange={(event) => setParam("search", event.target.value, "")}
            placeholder="Search by item, material, seller or city"
            aria-label="Search the marketplace"
          />
          {query && (
            <button
              type="button"
              onClick={() => setParam("search", "", "")}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </label>

        <div className="rmk-selects">
          <label className="rmk-select">
            <span className="sr-only">Condition</span>
            <select
              value={condition}
              onChange={(event) => setParam("condition", event.target.value)}
            >
              <option value="all">Any condition</option>
              {CONDITIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="rmk-select">
            <span className="sr-only">Sort by</span>
            <select
              value={sort}
              onChange={(event) =>
                setParam("sort", event.target.value, "newest")
              }
            >
              {SORTS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className={`rmk-saved ${savedOnly ? "active" : ""}`}
            aria-pressed={savedOnly}
            onClick={() => setSavedOnly((value) => !value)}
          >
            <Heart size={15} fill={savedOnly ? "currentColor" : "none"} />
            Saved
            <span>{wishlist.ids.length}</span>
          </button>
        </div>
      </div>

      <div className="rmk-chips" role="group" aria-label="Category">
        {["all", ...MARKET_CATEGORIES].map((item) => (
          <button
            type="button"
            key={item}
            className={category === item ? "active" : ""}
            aria-pressed={category === item}
            onClick={() => setParam("category", item)}
          >
            {item === "all" ? "All categories" : item}
          </button>
        ))}
      </div>

      <div className="rmk-count" aria-live="polite">
        <span>
          {results.length} {results.length === 1 ? "listing" : "listings"}
        </span>
        {filtersActive && (
          <button type="button" onClick={clearAll}>
            Clear filters
          </button>
        )}
      </div>

      {/* GRID */}
      {results.length === 0 ? (
        <div className="rmk-empty">
          <SearchX size={36} strokeWidth={1.5} />
          <h2>
            {savedOnly && !query ? "Nothing saved yet" : "No listings match"}
          </h2>
          <p>
            {savedOnly && !query
              ? "Tap the heart on a listing to keep it here for later."
              : "Try a different word, or remove a filter."}
          </p>
          <button type="button" onClick={clearAll}>
            Show all listings
          </button>
        </div>
      ) : (
        <div className="rmk-grid">
          {results.map((listing) => {
            const saved = wishlist.has(listing.id);

            return (
              <article className="rmk-card" key={listing.id}>
                <div className="rmk-media">
                  <Photo src={listing.gallery[0]} alt="" />

                  <span className={`rmk-tag ${listing.source}`}>
                    {listing.source === "remaker" ? (
                      <Palette size={12} />
                    ) : (
                      <Package size={12} />
                    )}
                    {SOURCE_LABEL[listing.source]}
                  </span>

                  <span className="rmk-condition">{listing.condition}</span>

                  <button
                    type="button"
                    className={`rmk-heart ${saved ? "on" : ""}`}
                    onClick={() => wishlist.toggle(listing.id)}
                    aria-pressed={saved}
                    aria-label={
                      saved
                        ? `Remove ${listing.title} from saved`
                        : `Save ${listing.title}`
                    }
                  >
                    <Heart size={17} fill={saved ? "currentColor" : "none"} />
                  </button>
                </div>

                <div className="rmk-body">
                  <span className="rmk-cat">{listing.category}</span>

                  <h3>
                    <Link
                      to={`/remaker-marketplace/product/${listing.id}`}
                      className="rmk-link"
                    >
                      {listing.title}
                    </Link>
                  </h3>

                  <p className="rmk-seller">
                    {listing.seller}
                    {listing.source === "remaker" && (
                      <BadgeCheck size={14} aria-label="Verified ReMaker" />
                    )}
                  </p>

                  <div className="rmk-foot">
                    <strong>{formatPrice(listing.price)}</strong>
                    <span>
                      <MapPin size={13} />
                      {listing.city}
                    </span>
                  </div>

                  <div className="rmk-meta">
                    <span>
                      <Leaf size={13} />
                      {listing.co2SavedKg} kg CO₂ saved
                    </span>
                    <span>
                      {listing.quantity > 1
                        ? `${listing.quantity} available`
                        : "1 available"}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
