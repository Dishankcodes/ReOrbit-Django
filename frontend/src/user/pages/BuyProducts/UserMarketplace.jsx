import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CATEGORIES,
  CONDITIONS,
  IMPACT,
  ITEMS,
  REMAKERS,
  formatPrice,
} from "../../../data/marketplaceData";
import "../../css/marketplace-css/UserMarketplace.css";
import "../../css/marketplace-icons.css";

const categoryIcons = {
  Furniture: "bi-lamp",
  Electronics: "bi-phone",
  "Home & Living": "bi-house-heart",
  Clothing: "bi-bag-heart",
  Books: "bi-book",
  Decor: "bi-palette",
};

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function ImageWithFallback({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className={`um-image-fallback ${className}`}>
        <i className="bi bi-image"></i>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function Stars({ rating = 0 }) {
  return (
    <span className="um-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={star <= Math.round(rating) ? "bi bi-star-fill" : "bi bi-star"}
        />
      ))}
    </span>
  );
}

function ProductCard({ item, wished, onWishlist, listView = false }) {
  const navigate = useNavigate();

  const openProduct = () => navigate(`/user-marketplace/product/${item.id}`);
  const openSeller = (event) => {
    event.stopPropagation();
    navigate(
      item.sellerType === "remaker"
        ? `/user-artist-profile/${item.sellerId}`
        : `/user-seller-profile/${item.sellerId}`,
    );
  };

  return (
    <article className={`um-product-card ${listView ? "list-card" : ""}`}>
      <div
        className="um-product-media"
        role="button"
        tabIndex={0}
        onClick={openProduct}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProduct();
          }
        }}
      >
        <ImageWithFallback src={item.image} alt={item.title} />
        <div className="um-media-shade" />
        <div className="um-media-top">
          <span className="um-condition">{item.condition}</span>
          <button
            type="button"
            className={`um-heart ${wished ? "active" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              onWishlist(item.id);
            }}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          >
            <i className={wished ? "bi bi-heart-fill" : "bi bi-heart"} />
          </button>
        </div>
        <div className="um-media-bottom">
          <span>
            <i className="bi bi-leaf" />
            {item.co2SavedKg} kg CO₂ saved
          </span>
          <span>
            <i className="bi bi-eye" />
            {item.views}
          </span>
        </div>
      </div>

      <div className="um-product-body">
        <div className="um-product-topline">
          <span>{item.category}</span>
          <span className="um-dot" />
          <span>{item.city}</span>
        </div>

        <h3 onClick={openProduct}>{item.title}</h3>
        <p className="um-product-summary">{item.summary}</p>

        <button type="button" className="um-seller" onClick={openSeller}>
          <span className="um-avatar">
            <ImageWithFallback src={item.sellerImage} alt="" />
            <b>{getInitials(item.seller)}</b>
          </span>
          <span className="um-seller-copy">
            <strong>
              {item.seller}
              {item.sellerType === "remaker" && (
                <i className="bi bi-patch-check-fill" title="Verified ReMaker" />
              )}
            </strong>
            <small>{item.sellerType === "remaker" ? "Verified ReMaker" : "Community seller"}</small>
          </span>
          <span className="um-seller-rating">
            <i className="bi bi-star-fill" /> {item.sellerRating}
          </span>
        </button>

        <div className="um-product-footer">
          <div>
            <small>Listed price</small>
            <strong>{formatPrice(item.price)}</strong>
          </div>
          <button type="button" className="um-view" onClick={openProduct}>
            View item <i className="bi bi-arrow-up-right" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function UserMarketplace() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [condition, setCondition] = useState("All");
  const [sort, setSort] = useState("featured");
  const [view, setView] = useState("grid");
  const [maxPrice, setMaxPrice] = useState(10000);
  const [wishlist, setWishlist] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = ITEMS.filter((item) => {
      const matchesSearch = !query || [
        item.title,
        item.category,
        item.city,
        item.seller,
        item.summary,
      ].some((value) => value.toLowerCase().includes(query));
      const matchesCategory = category === "All" || item.category === category;
      const matchesCondition = condition === "All" || item.condition === condition;
      const matchesPrice = item.price <= Number(maxPrice);
      return matchesSearch && matchesCategory && matchesCondition && matchesPrice;
    });

    return result.sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      if (sort === "rating") return b.sellerRating - a.sellerRating;
      if (sort === "co2") return b.co2SavedKg - a.co2SavedKg;
      if (sort === "newest") return new Date(b.listedDate) - new Date(a.listedDate);
      return b.likes + b.views * 0.08 - (a.likes + a.views * 0.08);
    });
  }, [search, category, condition, maxPrice, sort]);

  const activeFilterCount = [
    category !== "All",
    condition !== "All",
    maxPrice < 10000,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearch("");
    setCategory("All");
    setCondition("All");
    setMaxPrice(10000);
    setSort("featured");
  };

  const toggleWishlist = (id) => {
    setWishlist((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    );
  };

  return (
    <main className="um-page">
      <section className="um-hero">
        <div className="um-hero-grid" />
        <div className="um-hero-glow glow-one" />
        <div className="um-hero-glow glow-two" />
        <div className="um-container um-hero-inner">
          <div className="um-hero-copy">
            <span className="um-eyebrow"><i className="bi bi-arrow-repeat" /> ReOrbit Marketplace</span>
            <h1>Things deserve more than <em>one life.</em></h1>
            <p>
              Discover pre-loved, refurbished and thoughtfully remade pieces from a community that believes good things should keep moving.
            </p>
            <div className="um-hero-actions">
              <button type="button" className="um-primary" onClick={() => document.getElementById("um-results")?.scrollIntoView({ behavior: "smooth" })}>
                Explore marketplace <i className="bi bi-arrow-down" />
              </button>
              <button type="button" className="um-ghost" onClick={() => navigate("/user-before-marketplace")}>
                How ReOrbit works <i className="bi bi-arrow-up-right" />
              </button>
            </div>
            <div className="um-hero-stats">
              <div><strong>{IMPACT.itemsRescued.toLocaleString("en-IN")}+</strong><span>items rescued</span></div>
              <div><strong>{IMPACT.co2SavedTonnes}T</strong><span>CO₂ saved</span></div>
              <div><strong>{IMPACT.remakersOnboarded}</strong><span>ReMakers</span></div>
            </div>
          </div>
          <div className="um-hero-art" aria-hidden="true">
            <div className="um-orbit-ring ring-one" />
            <div className="um-orbit-ring ring-two" />
            <div className="um-orbit-ring ring-three" />
            <div className="um-orbit-card card-a"><i className="bi bi-lamp" /><span>Furniture</span></div>
            <div className="um-orbit-card card-b"><i className="bi bi-leaf" /><span>Reused</span></div>
            <div className="um-orbit-card card-c"><i className="bi bi-stars" /><span>Remade</span></div>
            <div className="um-orbit-core"><i className="bi bi-arrow-repeat" /><span>REORBIT</span><small>give it another life</small></div>
          </div>
        </div>
      </section>

      <div className="um-container">
        <section className="um-discovery-bar">
          <div className="um-search">
            <i className="bi bi-search" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, categories or sellers..." />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><i className="bi bi-x-lg" /></button>}
          </div>
          <button type="button" className={`um-filter-trigger ${activeFilterCount ? "has-count" : ""}`} onClick={() => setFiltersOpen(true)}>
            <i className="bi bi-sliders2" /> Filters {activeFilterCount > 0 && <b>{activeFilterCount}</b>}
          </button>
        </section>

        <section className="um-category-row">
          <button type="button" className={category === "All" ? "active" : ""} onClick={() => setCategory("All")}><span><i className="bi bi-grid" /></span>All items</button>
          {CATEGORIES.map((item) => (
            <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>
              <span><i className={`bi ${categoryIcons[item]}`} /></span>{item}
            </button>
          ))}
        </section>

        <section className="um-maker-strip">
          <div className="um-maker-heading">
            <span className="um-kicker">Meet the makers</span>
            <h2>Craft with a second story.</h2>
            <p>Explore verified ReMakers who turn rescued materials into pieces worth keeping.</p>
          </div>
          <div className="um-maker-list">
            {REMAKERS.map((maker) => (
              <button type="button" className="um-maker-card" key={maker.id} onClick={() => navigate(`/user-artist-profile/${maker.id}`)}>
                <span className="um-maker-avatar"><ImageWithFallback src={maker.image} alt={maker.name} /><b>{getInitials(maker.name)}</b></span>
                <span className="um-maker-copy"><strong>{maker.name} <i className="bi bi-patch-check-fill" /></strong><small>{maker.craft}</small><span><i className="bi bi-star-fill" /> {maker.rating} · {maker.productsCount} pieces</span></span>
                <i className="bi bi-arrow-up-right um-maker-arrow" />
              </button>
            ))}
          </div>
        </section>

        <section className="um-market" id="um-results">
          <aside className={`um-filters ${filtersOpen ? "open" : ""}`}>
            <div className="um-filter-head"><div><span className="um-kicker">Refine</span><h3>Find your piece</h3></div><button type="button" onClick={() => setFiltersOpen(false)}><i className="bi bi-x-lg" /></button></div>
            <div className="um-filter-block"><label>Category</label><div className="um-options"><button type="button" className={category === "All" ? "selected" : ""} onClick={() => setCategory("All")}>All categories</button>{CATEGORIES.map((item) => <button type="button" key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
            <div className="um-filter-block"><label>Condition</label><div className="um-options"><button type="button" className={condition === "All" ? "selected" : ""} onClick={() => setCondition("All")}>Any condition</button>{CONDITIONS.map((item) => <button type="button" key={item} className={condition === item ? "selected" : ""} onClick={() => setCondition(item)}>{item}</button>)}</div></div>
            <div className="um-filter-block">
              <div className="um-price-head"><label>Maximum price</label><strong>{formatPrice(maxPrice)}</strong></div>
              <input type="range" min="500" max="10000" step="250" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} />
              <div className="um-range"><span>₹500</span><span>₹10,000+</span></div>
            </div>
            {activeFilterCount > 0 && <button type="button" className="um-reset" onClick={resetFilters}><i className="bi bi-arrow-counterclockwise" /> Reset filters</button>}
          </aside>
          {filtersOpen && <button type="button" className="um-filter-overlay" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />}

          <div className="um-results">
            <div className="um-results-head">
              <div><span className="um-kicker">Marketplace collection</span><h2>{filteredItems.length} <span>{filteredItems.length === 1 ? "piece" : "pieces"} ready for another orbit</span></h2></div>
              <div className="um-toolbar"><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="newest">Newest first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="rating">Highest rated</option><option value="co2">Most CO₂ saved</option></select><div className="um-view"><button type="button" className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="Grid view"><i className="bi bi-grid-3x3-gap" /></button><button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="List view"><i className="bi bi-list" /></button></div></div>
            </div>

            {filteredItems.length > 0 ? (
              <div className={`um-product-grid ${view === "list" ? "list-view" : ""}`}>
                {filteredItems.map((item) => <ProductCard key={item.id} item={item} wished={wishlist.includes(item.id)} onWishlist={toggleWishlist} listView={view === "list"} />)}
              </div>
            ) : (
              <div className="um-empty"><div><i className="bi bi-search" /></div><span className="um-kicker">Nothing matched</span><h3>Let's try another orbit.</h3><p>Change the search or filters and discover something new.</p><button type="button" className="um-primary" onClick={resetFilters}>Clear filters</button></div>
            )}
          </div>
        </section>
      </div>

      {wishlist.length > 0 && <div className="um-wishlist-toast"><i className="bi bi-heart-fill" /><span>{wishlist.length} saved {wishlist.length === 1 ? "piece" : "pieces"}</span><button type="button" onClick={() => setWishlist([])}>Clear</button></div>}
    </main>
  );
}
