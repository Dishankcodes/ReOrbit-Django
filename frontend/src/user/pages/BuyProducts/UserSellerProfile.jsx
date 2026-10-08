import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getProductsBySeller,
  getSellerReviews,
  getUserById,
  formatPrice,
} from "../../../data/marketplaceData";
import "../../css/marketplace-css/UserSellerProfile.css";
import "../../css/marketplace-css/marketplace-icons.css";

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
  if (failed || !src)
    return (
      <div className={`usp-image-fallback ${className}`}>
        <i className="bi bi-person" />
      </div>
    );
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}

function Stars({ rating = 0 }) {
  return (
    <span className="usp-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={
            star <= Math.round(rating) ? "bi bi-star-fill" : "bi bi-star"
          }
        />
      ))}
    </span>
  );
}

export default function UserSellerProfile() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const seller = getUserById(sellerId);
  const products = getProductsBySeller(sellerId);
  const reviews = getSellerReviews(sellerId);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("listings");

  if (!seller)
    return (
      <main className="usp-page">
        <div className="usp-not-found">
          <span>
            <i className="bi bi-person-x" />
          </span>
          <small>Community seller</small>
          <h1>Seller not found</h1>
          <p>This profile is no longer available.</p>
          <button
            type="button"
            className="usp-primary"
            onClick={() => navigate("/user-marketplace")}
          >
            <i className="bi bi-arrow-left" /> Back to marketplace
          </button>
        </div>
      </main>
    );

  return (
    <main className="usp-page">
      <div className="usp-container">
        <button type="button" className="usp-back" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left" /> Back to marketplace
        </button>
        <section className="usp-profile">
          <div className="usp-cover">
            <div className="usp-cover-grid" />
            <span className="usp-cover-label">
              <i className="bi bi-arrow-repeat" /> ReOrbit community
            </span>
          </div>
          <div className="usp-profile-body">
            <div className="usp-avatar">
              <ImageWithFallback src={seller.image} alt={seller.name} />
              <b>{getInitials(seller.name)}</b>
            </div>
            <div className="usp-main-info">
              <div className="usp-title-row">
                <div>
                  <span className="usp-badge">
                    <i className="bi bi-person-check" /> Community seller
                  </span>
                  <h1>{seller.name}</h1>
                  <p>@{seller.username}</p>
                </div>
                <button
                  type="button"
                  className={`usp-follow ${following ? "active" : ""}`}
                  onClick={() => setFollowing((value) => !value)}
                >
                  <i
                    className={following ? "bi bi-check2" : "bi bi-person-plus"}
                  />{" "}
                  {following ? "Following" : "Follow seller"}
                </button>
              </div>
              <div className="usp-location">
                <i className="bi bi-geo-alt" /> {seller.city} · {seller.pincode}
                <span /> Member since {seller.joined}
              </div>
              <p className="usp-bio">{seller.bio}</p>
            </div>
          </div>
          <div className="usp-stats">
            <div>
              <small>Products sold</small>
              <strong>{seller.productsSold}</strong>
            </div>
            <div>
              <small>Active listings</small>
              <strong>{products.length}</strong>
            </div>
            <div>
              <small>Seller rating</small>
              <strong>
                <i className="bi bi-star-fill" /> {seller.rating}
              </strong>
            </div>
            <div>
              <small>Reviews</small>
              <strong>{seller.totalReviews}</strong>
            </div>
          </div>
        </section>

        <section className="usp-content">
          <nav className="usp-tabs">
            <button
              type="button"
              className={activeTab === "listings" ? "active" : ""}
              onClick={() => setActiveTab("listings")}
            >
              Listings <span>{products.length}</span>
            </button>
            <button
              type="button"
              className={activeTab === "reviews" ? "active" : ""}
              onClick={() => setActiveTab("reviews")}
            >
              Reviews <span>{reviews.length}</span>
            </button>
            <button
              type="button"
              className={activeTab === "about" ? "active" : ""}
              onClick={() => setActiveTab("about")}
            >
              About seller
            </button>
          </nav>

          {activeTab === "listings" && (
            <div className="usp-listings">
              <div className="usp-section-head">
                <div>
                  <span className="usp-kicker">Current collection</span>
                  <h2>Things from {seller.name}</h2>
                </div>
                <span>
                  {products.length} active{" "}
                  {products.length === 1 ? "listing" : "listings"}
                </span>
              </div>
              {products.length ? (
                <div className="usp-product-grid">
                  {products.map((product) => (
                    <article
                      className="usp-product-card"
                      key={product.id}
                      onClick={() =>
                        navigate(`/user-marketplace/product/${product.id}`)
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) =>
                        event.key === "Enter" &&
                        navigate(`/user-marketplace/product/${product.id}`)
                      }
                    >
                      <div className="usp-product-media">
                        <ImageWithFallback
                          src={product.image}
                          alt={product.title}
                        />
                        <span>{product.condition}</span>
                        <b>
                          <i className="bi bi-leaf" /> {product.co2SavedKg} kg
                        </b>
                      </div>
                      <div className="usp-product-body">
                        <small>{product.category}</small>
                        <h3>{product.title}</h3>
                        <p>{product.summary}</p>
                        <div className="usp-product-meta">
                          <span>
                            <i className="bi bi-geo-alt" /> {product.city}
                          </span>
                          <strong>{formatPrice(product.price)}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="usp-empty">
                  <i className="bi bi-box-seam" />
                  <h3>No active listings</h3>
                  <p>This seller doesn't currently have anything listed.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="usp-reviews">
              <div className="usp-review-overview">
                <div>
                  <span className="usp-kicker">Community rating</span>
                  <strong>{seller.rating}</strong>
                  <Stars rating={seller.rating} />
                  <small>Based on {seller.totalReviews} reviews</small>
                </div>
                <div className="usp-rating-bars">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating}>
                      <span>{rating}</span>
                      <i>
                        <b
                          style={{
                            width:
                              rating === 5
                                ? "78%"
                                : rating === 4
                                  ? "18%"
                                  : "4%",
                          }}
                        />
                      </i>
                    </div>
                  ))}
                </div>
              </div>
              <div className="usp-review-list">
                {reviews.length ? (
                  reviews.map((review) => (
                    <article key={review.id}>
                      <div>
                        <strong>{review.name}</strong>
                        <Stars rating={review.rating} />
                      </div>
                      <time>{review.date}</time>
                      <p>{review.text}</p>
                    </article>
                  ))
                ) : (
                  <div className="usp-empty">
                    <i className="bi bi-chat-square-text" />
                    <h3>No reviews yet</h3>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "about" && (
            <div className="usp-about">
              <div className="usp-about-copy">
                <span className="usp-kicker">
                  A little more about this seller
                </span>
                <h2>Good things deserve good homes.</h2>
                <p>{seller.bio}</p>
              </div>
              <div className="usp-about-card">
                <div>
                  <i className="bi bi-calendar3" />
                  <span>
                    <small>Member since</small>
                    <strong>{seller.joined}</strong>
                  </span>
                </div>
                <div>
                  <i className="bi bi-geo-alt" />
                  <span>
                    <small>Based in</small>
                    <strong>{seller.city}</strong>
                  </span>
                </div>
                <div>
                  <i className="bi bi-box-seam" />
                  <span>
                    <small>Products sold</small>
                    <strong>{seller.productsSold}</strong>
                  </span>
                </div>
                <div>
                  <i className="bi bi-star" />
                  <span>
                    <small>Seller rating</small>
                    <strong>{seller.rating} / 5</strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
