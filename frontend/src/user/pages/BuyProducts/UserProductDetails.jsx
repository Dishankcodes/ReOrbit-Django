import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getItemById,
  getProductsBySeller,
  getSellerFromItem,
  getSellerReviews,
  formatPrice,
} from "../../../data/marketplaceData";
import "../../css/marketplace-css/UserProductDetails.css";
import "../../css/marketplace-icons.css";

const getInitials = (name = "") => name.split(" ").filter(Boolean).map((word) => word[0]).join("").slice(0, 2).toUpperCase();

function ImageWithFallback({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) return <div className={`upd-image-fallback ${className}`}><i className="bi bi-image" /></div>;
  return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />;
}

function Stars({ rating = 0 }) {
  return <span className="upd-stars" aria-label={`${rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <i key={star} className={star <= Math.round(rating) ? "bi bi-star-fill" : "bi bi-star"} />)}</span>;
}

function Stat({ icon, label, value }) {
  return <div className="upd-stat"><span><i className={`bi ${icon}`} /></span><small>{label}</small><strong>{value}</strong></div>;
}

export default function UserProductDetails() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const item = getItemById(productId);
  const [liked, setLiked] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [cartMessage, setCartMessage] = useState(false);

  const seller = useMemo(() => getSellerFromItem(item), [item]);
  const reviews = useMemo(() => item ? getSellerReviews(item.sellerId) : [], [item]);
  const related = useMemo(() => item ? getProductsBySeller(item.sellerId).filter((product) => product.id !== item.id).slice(0, 4) : [], [item]);

  if (!item) {
    return <main className="upd-page"><div className="upd-not-found"><div><i className="bi bi-box2-heart" /></div><span className="upd-kicker">Marketplace</span><h1>Product not found</h1><p>This piece may have moved to another orbit or is no longer available.</p><button type="button" className="upd-primary" onClick={() => navigate("/user-marketplace")}><i className="bi bi-arrow-left" /> Back to marketplace</button></div></main>;
  }

  const sellerIsRemaker = item.sellerType === "remaker";
  const gallery = [item.image].filter(Boolean);

  const openSeller = () => navigate(sellerIsRemaker ? `/user-artist-profile/${item.sellerId}` : `/user-seller-profile/${item.sellerId}`);
  const openProduct = (id) => { navigate(`/user-marketplace/product/${id}`); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const showCart = () => { setCartMessage(true); window.clearTimeout(window.__reorbitCartTimer); window.__reorbitCartTimer = window.setTimeout(() => setCartMessage(false), 2600); };

  return (
    <main className="upd-page">
      <div className="upd-container">
        <div className="upd-breadcrumb"><button type="button" onClick={() => navigate("/user-marketplace")}>Marketplace</button><i className="bi bi-chevron-right" /><span>{item.category}</span><i className="bi bi-chevron-right" /><strong>{item.title}</strong></div>
        <button type="button" className="upd-back" onClick={() => navigate(-1)}><i className="bi bi-arrow-left" /> Back</button>

        <section className="upd-hero">
          <div className="upd-gallery">
            <div className="upd-main-image">
              <ImageWithFallback src={gallery[0]} alt={item.title} />
              <div className="upd-image-overlay" />
              <div className="upd-image-badges"><span><i className="bi bi-leaf" /> {item.co2SavedKg} kg CO₂ saved</span><span>{item.condition}</span></div>
              <button type="button" className={`upd-like ${liked ? "active" : ""}`} onClick={() => setLiked((value) => !value)} aria-label={liked ? "Remove from wishlist" : "Save product"}><i className={liked ? "bi bi-heart-fill" : "bi bi-heart"} /></button>
            </div>
            <div className="upd-gallery-note"><i className="bi bi-shield-check" /><span>Community listing</span><b>Checked by ReOrbit</b></div>
          </div>

          <div className="upd-info">
            <div className="upd-category-line"><span>{item.category}</span><span><i className="bi bi-circle-fill" /> {item.city}</span></div>
            <h1>{item.title}</h1>
            <div className="upd-rating"><Stars rating={item.sellerRating} /><strong>{item.sellerRating}</strong><span>seller rating</span><em /> <span>{item.condition}</span></div>
            <div className="upd-price-block"><strong>{formatPrice(item.price)}</strong><span>ReOrbit marketplace price</span></div>
            <p className="upd-summary">{item.summary}</p>

            <div className="upd-impact-card"><div><span><i className="bi bi-recycle" /></span><div><small>Another life</small><strong>{item.co2SavedKg} kg</strong><p>estimated CO₂ kept from new production</p></div></div><i className="bi bi-arrow-up-right" /></div>

            <div className="upd-location"><span><i className="bi bi-geo-alt" /></span><div><small>Item location</small><strong>{item.city}, {item.pincode}</strong><p>Arrange pickup or delivery with the seller after purchase.</p></div></div>

            <div className="upd-actions"><button type="button" className="upd-primary" onClick={showCart}><i className="bi bi-bag-plus" /> Add to collection</button><button type="button" className="upd-secondary" onClick={showCart}>Buy now <i className="bi bi-arrow-right" /></button></div>
            <p className="upd-trust"><i className="bi bi-shield-check" /> Secure checkout <span /> <i className="bi bi-arrow-repeat" /> Circular purchase</p>
          </div>
        </section>

        <section className="upd-seller-card">
          <button type="button" className="upd-seller-main" onClick={openSeller}>
            <span className="upd-seller-avatar"><ImageWithFallback src={seller?.image || item.sellerImage} alt={item.seller} /><b>{getInitials(item.seller)}</b></span>
            <span><small>{sellerIsRemaker ? "Verified ReMaker" : "Community seller"}</small><strong>{item.seller} {sellerIsRemaker && <i className="bi bi-patch-check-fill" />}</strong><em><i className="bi bi-geo-alt" /> {item.city} · {seller?.productsCount || seller?.productsSold || 0} {sellerIsRemaker ? "pieces listed" : "sales"}</em></span>
          </button>
          <div className="upd-seller-metrics"><div><small>Rating</small><strong><i className="bi bi-star-fill" /> {item.sellerRating}</strong></div><div><small>Reviews</small><strong>{seller?.totalReviews || reviews.length}</strong></div><div><small>Listed</small><strong>{item.listedDate}</strong></div></div>
          <button type="button" className="upd-seller-button" onClick={openSeller}>View profile <i className="bi bi-arrow-up-right" /></button>
        </section>

        <section className="upd-details">
          <nav className="upd-tabs"><button type="button" className={activeTab === "details" ? "active" : ""} onClick={() => setActiveTab("details")}>Details</button><button type="button" className={activeTab === "story" ? "active" : ""} onClick={() => setActiveTab("story")}>Item story</button><button type="button" className={activeTab === "reviews" ? "active" : ""} onClick={() => setActiveTab("reviews")}>Reviews <span>{reviews.length}</span></button></nav>

          {activeTab === "details" && <div className="upd-detail-layout"><div><span className="upd-kicker">About this piece</span><h2>Made to stay useful.</h2><p className="upd-long-copy">{item.description}</p><div className="upd-stat-grid"><Stat icon="bi-box-seam" label="Availability" value={item.quantity > 1 ? `${item.quantity} available` : "1 available"} /><Stat icon="bi-eye" label="Views" value={item.views} /><Stat icon="bi-heart" label="Saves" value={item.likes} /><Stat icon="bi-calendar3" label="Listed" value={item.listedDate} /></div></div><div className="upd-spec-card"><span className="upd-kicker">At a glance</span><div><small>Category</small><strong>{item.category}</strong></div><div><small>Condition</small><strong>{item.condition}</strong></div><div><small>Location</small><strong>{item.city}</strong></div><div><small>Impact</small><strong>{item.co2SavedKg} kg CO₂ saved</strong></div><div><small>Seller</small><strong>{sellerIsRemaker ? "Verified ReMaker" : "Community seller"}</strong></div></div></div>}

          {activeTab === "story" && <div className="upd-story"><div className="upd-story-mark"><i className="bi bi-arrow-repeat" /></div><div><span className="upd-kicker">The ReOrbit idea</span><h2>Keep the useful things moving.</h2><p>{item.description}</p><p>This listing keeps an existing product in use, helping extend its useful life instead of creating demand for a new replacement. The seller has shared the condition and location so the next owner can make an informed choice.</p><div className="upd-story-points"><span><i className="bi bi-check2-circle" /> Existing item</span><span><i className="bi bi-check2-circle" /> Community listed</span><span><i className="bi bi-check2-circle" /> {item.co2SavedKg} kg estimated impact</span></div></div></div>}

          {activeTab === "reviews" && <div className="upd-review-layout"><div className="upd-review-summary"><strong>{item.sellerRating}</strong><Stars rating={item.sellerRating} /><span>seller rating</span><p>Based on {seller?.totalReviews || reviews.length} community reviews.</p></div><div className="upd-review-list">{reviews.length ? reviews.map((review) => <article key={review.id}><div><strong>{review.name}</strong><Stars rating={review.rating} /></div><time>{review.date}</time><p>{review.text}</p></article>) : <div className="upd-empty"><i className="bi bi-chat-square-text" /><h3>No reviews yet</h3></div>}</div></div>}
        </section>

        {related.length > 0 && <section className="upd-related"><div className="upd-section-head"><div><span className="upd-kicker">From the same orbit</span><h2>More from {item.seller}</h2></div><button type="button" onClick={openSeller}>View seller <i className="bi bi-arrow-right" /></button></div><div className="upd-related-grid">{related.map((product) => <button type="button" className="upd-related-card" key={product.id} onClick={() => openProduct(product.id)}><div><ImageWithFallback src={product.image} alt={product.title} /><span>{product.condition}</span></div><section><small>{product.category}</small><h3>{product.title}</h3><strong>{formatPrice(product.price)}</strong></section></button>)}</div></section>}
      </div>

      {cartMessage && <div className="upd-toast"><span><i className="bi bi-check2" /></span><div><strong>Saved to your collection</strong><small>{item.title} is ready for the next step.</small></div><button type="button" onClick={() => setCartMessage(false)}><i className="bi bi-x-lg" /></button></div>}
    </main>
  );
}
