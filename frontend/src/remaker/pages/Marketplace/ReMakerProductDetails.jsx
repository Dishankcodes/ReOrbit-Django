import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Heart,
  ImageOff,
  Leaf,
  Lightbulb,
  MapPin,
  Minus,
  PackageSearch,
  Palette,
  Plus,
  Recycle,
  ShieldCheck,
  Star,
  Truck,
  Package,
} from "lucide-react";

import MarketOrderModal from "../../pages-components/MarketOrderModal";
import {
  SERVICEABLE_PINCODES,
  SOURCE_LABEL,
  deliveryCharge,
  formatPrice,
  getListingById,
  getRelatedListings,
  getSeller,
  getSellerReviews,
} from "../../data/remakerMarketplaceData";
import useWishlist from "../../hooks/useWishlist";

import "../../css/ReMakerProductDetails.css";

function Photo({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <span className="rmd-photo-fallback">
        <ImageOff size={28} />
      </span>
    );
  }

  return <img src={src} alt={alt} onError={() => setFailed(true)} />;
}

function Stars({ value }) {
  return (
    <span className="rmd-stars" role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={14} fill={star <= Math.round(value) ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

/* Wrapper so the page state resets when the product changes */
export default function ReMakerProductDetails() {
  const { productId } = useParams();
  const listing = getListingById(productId);

  if (!listing) {
    return (
      <section className="rmd">
        <div className="rmd-missing">
          <PackageSearch size={36} strokeWidth={1.5} />
          <h2>We couldn&apos;t find that listing</h2>
          <p>It may have been sold, or the link is out of date.</p>
          <Link to="/remaker-marketplace" className="rmd-btn primary">
            Back to marketplace
          </Link>
        </div>
      </section>
    );
  }

  return <Details key={listing.id} listing={listing} />;
}

function Details({ listing }) {
  const navigate = useNavigate();
  const wishlist = useWishlist();

  const seller = getSeller(listing);
  const reviews = getSellerReviews(listing.sellerId);
  const related = useMemo(() => getRelatedListings(listing), [listing]);

  const [index, setIndex] = useState(0);
  const [tab, setTab] = useState("details");
  const [quantity, setQuantity] = useState(1);
  const [delivery, setDelivery] = useState("pickup");
  const [pincode, setPincode] = useState("");
  const [checked, setChecked] = useState(null); /* null | "ok" | "no" | "bad" */
  const [needPincode, setNeedPincode] = useState(false);
  const [ordering, setOrdering] = useState(false);

  const saved = wishlist.has(listing.id);
  const isRemaker = listing.source === "remaker";
  const charge = deliveryCharge(listing.price);
  const total = listing.price * quantity + (delivery === "platform" ? charge : 0);
  const outOfStock = listing.quantity < 1;

  const step = (delta) =>
    setIndex((current) => (current + delta + listing.gallery.length) % listing.gallery.length);

  const checkPincode = () => {
    const value = pincode.trim();

    if (!/^[0-9]{6}$/.test(value)) {
      setChecked("bad");
      return false;
    }

    const ok = SERVICEABLE_PINCODES.includes(value);
    setChecked(ok ? "ok" : "no");
    return ok;
  };

  const handleBuy = () => {
    if (delivery === "platform") {
      setNeedPincode(true);

      if (checked !== "ok" && !checkPincode()) return;
    }

    setOrdering(true);
  };

  const closeOrder = () => setOrdering(false);

  const sellerMetrics = [
    { label: "Rating", value: seller?.rating ?? listing.sellerRating },
    { label: "Reviews", value: seller?.totalReviews ?? reviews.length },
    {
      label: isRemaker ? "Pieces listed" : "Sold so far",
      value: isRemaker ? seller?.productsCount ?? "-" : seller?.productsSold ?? "-",
    },
  ];

  return (
    <section className="rmd">
      {/* BREADCRUMB */}
      <nav className="rmd-crumbs" aria-label="Breadcrumb">
        <Link to="/remaker-marketplace" className="rmd-back">
          <ArrowLeft size={15} />
          Marketplace
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/remaker-marketplace?category=${encodeURIComponent(listing.category)}`}>
          {listing.category}
        </Link>
        <span aria-hidden="true">/</span>
        <strong>{listing.title}</strong>
      </nav>

      <div className="rmd-hero">
        {/* GALLERY */}
        <div className="rmd-gallery">
          <div className="rmd-stage">
            <Photo src={listing.gallery[index]} alt={`${listing.title}, photo ${index + 1}`} />

            <span className={`rmd-source ${listing.source}`}>
              {isRemaker ? <Palette size={13} /> : <Package size={13} />}
              {SOURCE_LABEL[listing.source]}
            </span>

            <button
              type="button"
              className={`rmd-heart ${saved ? "on" : ""}`}
              onClick={() => wishlist.toggle(listing.id)}
              aria-pressed={saved}
              aria-label={saved ? "Remove from saved" : "Save listing"}
            >
              <Heart size={18} fill={saved ? "currentColor" : "none"} />
            </button>

            {listing.gallery.length > 1 && (
              <>
                <button type="button" className="rmd-nav prev" onClick={() => step(-1)} aria-label="Previous photo">
                  <ChevronLeft size={20} />
                </button>
                <button type="button" className="rmd-nav next" onClick={() => step(1)} aria-label="Next photo">
                  <ChevronRight size={20} />
                </button>
                <span className="rmd-counter">
                  {index + 1} / {listing.gallery.length}
                </span>
              </>
            )}
          </div>

          {listing.gallery.length > 1 && (
            <div className="rmd-thumbs" role="group" aria-label="Photos">
              {listing.gallery.map((src, i) => (
                <button
                  type="button"
                  key={src + i}
                  className={i === index ? "active" : ""}
                  onClick={() => setIndex(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-pressed={i === index}
                >
                  <Photo src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* INFO + BUY */}
        <div className="rmd-info">
          <div className="rmd-eyebrow">
            <span>{listing.category}</span>
            <span className="dot" />
            <span>
              <MapPin size={13} />
              {listing.city}
            </span>
          </div>

          <h2 className="rmd-title">{listing.title}</h2>

          <div className="rmd-rating">
            <Stars value={listing.sellerRating} />
            <strong>{listing.sellerRating}</strong>
            <span>seller rating</span>
            <i />
            <span>{listing.condition} condition</span>
          </div>

          <div className="rmd-price">
            <strong>{formatPrice(listing.price)}</strong>
            <span>per piece</span>
          </div>

          <p className="rmd-summary">{listing.summary}</p>

          {/* WHY IT SUITS A REMAKER */}
          <div className="rmd-callout">
            <span className="rmd-callout-icon">
              {isRemaker ? <Recycle size={18} /> : <Lightbulb size={18} />}
            </span>
            <div>
              <strong>{isRemaker ? "Made from a second life" : "Ideas to rework it into"}</strong>
              {isRemaker ? (
                <p>{listing.madeFrom || "Created by a ReOrbit ReMaker from recovered material."}</p>
              ) : (
                <div className="rmd-ideas">
                  {listing.ideas.map((idea) => (
                    <span key={idea}>{idea}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* BUY PANEL */}
          <div className="rmd-buy">
            <div className="rmd-row">
              <span className="rmd-label">Quantity</span>
              <div className="rmd-stepper">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus size={15} />
                </button>
                <output aria-live="polite">{quantity}</output>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(listing.quantity, q + 1))}
                  disabled={quantity >= listing.quantity}
                  aria-label="Increase quantity"
                >
                  <Plus size={15} />
                </button>
              </div>
              <small>{listing.quantity} available</small>
            </div>

            <fieldset className="rmd-delivery">
              <legend className="rmd-label">How do you want it?</legend>

              <label className={delivery === "pickup" ? "active" : ""}>
                <input
                  type="radio"
                  name="delivery"
                  checked={delivery === "pickup"}
                  onChange={() => setDelivery("pickup")}
                />
                <span className="rmd-radio" aria-hidden="true" />
                <span className="rmd-opt-text">
                  <strong>Self pickup</strong>
                  <small>Collect from {listing.city}. Free.</small>
                </span>
                <b>Free</b>
              </label>

              <label className={delivery === "platform" ? "active" : ""}>
                <input
                  type="radio"
                  name="delivery"
                  checked={delivery === "platform"}
                  onChange={() => setDelivery("platform")}
                />
                <span className="rmd-radio" aria-hidden="true" />
                <span className="rmd-opt-text">
                  <strong>Delivered by ReOrbit</strong>
                  <small>We collect and bring it to you.</small>
                </span>
                <b>{formatPrice(charge)}</b>
              </label>

              {delivery === "platform" && (
                <div className="rmd-pin">
                  <div className="rmd-pin-row">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={pincode}
                      placeholder="Your pincode"
                      aria-label="Delivery pincode"
                      aria-invalid={needPincode && checked !== "ok" ? "true" : undefined}
                      onChange={(event) => {
                        setPincode(event.target.value.replace(/[^0-9]/g, ""));
                        setChecked(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") checkPincode();
                      }}
                    />
                    <button type="button" onClick={checkPincode}>
                      Check
                    </button>
                  </div>

                  {checked === "ok" && (
                    <p className="ok">
                      <Check size={14} />
                      ReOrbit delivers to {pincode}.
                    </p>
                  )}
                  {checked === "no" && (
                    <p className="bad">
                      <CircleAlert size={14} />
                      We don&apos;t deliver to {pincode} yet. Choose self pickup instead.
                    </p>
                  )}
                  {checked === "bad" && (
                    <p className="bad">
                      <CircleAlert size={14} />
                      Enter a 6-digit pincode.
                    </p>
                  )}
                  {checked === null && needPincode && (
                    <p className="bad">
                      <CircleAlert size={14} />
                      Check your pincode before ordering.
                    </p>
                  )}
                </div>
              )}
            </fieldset>

            <div className="rmd-total">
              <span>Total</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            <div className="rmd-cta">
              <button
                type="button"
                className="rmd-btn primary"
                onClick={handleBuy}
                disabled={outOfStock}
              >
                {outOfStock ? "Sold out" : "Buy now"}
              </button>
              <button
                type="button"
                className={`rmd-btn ghost ${saved ? "saved" : ""}`}
                onClick={() => wishlist.toggle(listing.id)}
                aria-pressed={saved}
              >
                <Heart size={16} fill={saved ? "currentColor" : "none"} />
                {saved ? "Saved" : "Save"}
              </button>
            </div>

            <p className="rmd-trust">
              <ShieldCheck size={15} />
              Checked by ReOrbit
              <span />
              <Truck size={15} />
              Tracked until it reaches you
            </p>
          </div>
        </div>
      </div>

      {/* SELLER */}
      <div className="rmd-seller">
        <div className="rmd-seller-main">
          <span className="rmd-avatar">
            <Photo src={seller?.image || listing.sellerImage} alt="" />
          </span>
          <div>
            <small>{isRemaker ? "Verified ReMaker" : "Community seller"}</small>
            <strong>
              {listing.seller}
              {isRemaker && <BadgeCheck size={16} />}
            </strong>
            <em>
              <MapPin size={13} />
              {seller?.city || listing.city}
              {isRemaker && seller?.craft ? ` · ${seller.craft}` : ""}
            </em>
          </div>
        </div>

        <dl className="rmd-metrics">
          {sellerMetrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>
                {metric.label === "Rating" && <Star size={14} fill="currentColor" />}
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* TABS */}
      <div className="rmd-tabs-wrap">
        <div className="rmd-tabs" role="tablist">
          {[
            { key: "details", label: "Details" },
            { key: "journey", label: "Journey" },
            { key: "reviews", label: `Reviews (${reviews.length})` },
          ].map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              className={tab === item.key ? "active" : ""}
              key={item.key}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "details" && (
          <div className="rmd-panel rmd-details">
            <div>
              <h3>About this {isRemaker ? "piece" : "item"}</h3>
              <p>{listing.description}</p>

              <ul className="rmd-impact">
                <li>
                  <Leaf size={18} />
                  <div>
                    <strong>{listing.co2SavedKg} kg CO₂</strong>
                    <small>kept out of new production</small>
                  </div>
                </li>
                <li>
                  <Recycle size={18} />
                  <div>
                    <strong>{isRemaker ? "Reused material" : "Reuse-ready"}</strong>
                    <small>{isRemaker ? "Built from recovered parts" : "Good base for a new project"}</small>
                  </div>
                </li>
              </ul>
            </div>

            <dl className="rmd-specs">
              {[
                ["Category", listing.category],
                ["Condition", listing.condition],
                ["Materials", listing.materials.join(", ")],
                ["Size", listing.dimensions],
                ["Age", listing.age],
                ["Location", `${listing.city}, ${listing.pincode}`],
                ["Listed", listing.listedDate],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          </div>
        )}

        {tab === "journey" && (
          <div className="rmd-panel">
            <h3>Where it has been</h3>
            <ol className="rmd-trail">
              <li>
                <span />
                <div>
                  <strong>{isRemaker ? "Original item rescued" : "Listed by owner"}</strong>
                  <small>
                    {isRemaker
                      ? listing.madeFrom || "Recovered by the ReMaker"
                      : `${listing.seller} listed it from ${listing.city}`}
                  </small>
                </div>
              </li>
              <li>
                <span />
                <div>
                  <strong>{isRemaker ? "Reworked by hand" : "Condition checked"}</strong>
                  <small>
                    {isRemaker
                      ? `${listing.seller} cleaned, repaired and finished it`
                      : `ReOrbit reviewed the photos and marked it ${listing.condition}`}
                  </small>
                </div>
              </li>
              <li>
                <span />
                <div>
                  <strong>Available to you</strong>
                  <small>Listed on {listing.listedDate}</small>
                </div>
              </li>
              <li className="next">
                <span />
                <div>
                  <strong>{isRemaker ? "Your next owner story" : "Your next project"}</strong>
                  <small>
                    {isRemaker
                      ? "Buy it to keep it in use, or study the craft."
                      : "Rework it and list it back on ReOrbit."}
                  </small>
                </div>
              </li>
            </ol>
          </div>
        )}

        {tab === "reviews" && (
          <div className="rmd-panel">
            {reviews.length === 0 ? (
              <p className="rmd-muted">No reviews for this seller yet.</p>
            ) : (
              <div className="rmd-reviews">
                {reviews.map((review) => (
                  <article key={review.id}>
                    <header>
                      <strong>{review.name}</strong>
                      <Stars value={review.rating} />
                      <time>{review.date}</time>
                    </header>
                    <p>{review.text}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RELATED */}
      {related.length > 0 && (
        <div className="rmd-related">
          <div className="rmd-related-head">
            <h3>More to explore</h3>
            <Link to="/remaker-marketplace">See all</Link>
          </div>

          <div className="rmd-related-grid">
            {related.map((other) => (
              <Link
                to={`/remaker-marketplace/product/${other.id}`}
                className="rmd-mini"
                key={other.id}
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                <span className="rmd-mini-media">
                  <Photo src={other.gallery[0]} alt="" />
                </span>
                <small>{SOURCE_LABEL[other.source]}</small>
                <strong>{other.title}</strong>
                <b>{formatPrice(other.price)}</b>
              </Link>
            ))}
          </div>
        </div>
      )}

      {ordering && (
        <MarketOrderModal
          listing={listing}
          quantity={quantity}
          delivery={delivery}
          charge={charge}
          pincode={pincode}
          onClose={closeOrder}
          onBrowse={() => navigate("/remaker-marketplace")}
        />
      )}
    </section>
  );
}
