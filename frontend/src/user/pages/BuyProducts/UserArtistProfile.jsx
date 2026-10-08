import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  formatPrice,
  getRemakerById,
  getRemakerProducts,
  getSellerReviews,
} from "../../../data/marketplaceData";
import "../../css/marketplace-css/UserArtistProfile.css";
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
      <div className={`uap-image-fallback ${className}`}>
        <i className="bi bi-image" />
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
    <span className="uap-stars">
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

export default function UserArtistProfile() {
  const { artistId } = useParams();
  const navigate = useNavigate();
  const artist = getRemakerById(artistId);
  const products = getRemakerProducts(artistId);
  const reviews = getSellerReviews(artistId);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("studio");

  const portfolio = artist?.portfolio || [];
  const totalProducts = useMemo(
    () => Math.max(artist?.productsCount || 0, products.length),
    [artist, products.length],
  );

  if (!artist)
    return (
      <main className="uap-page">
        <div className="uap-not-found">
          <span>
            <i className="bi bi-person-workspace" />
          </span>
          <small>ReMaker profile</small>
          <h1>ReMaker not found</h1>
          <p>This maker may have moved to another orbit.</p>
          <button
            type="button"
            className="uap-primary"
            onClick={() => navigate("/user-marketplace")}
          >
            <i className="bi bi-arrow-left" /> Back to marketplace
          </button>
        </div>
      </main>
    );

  return (
    <main className="uap-page">
      <div className="uap-container">
        <button type="button" className="uap-back" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left" /> Back to marketplace
        </button>
        <section className="uap-profile">
          <div className="uap-cover">
            <div className="uap-cover-lines" />
            <div className="uap-cover-orbit">
              <span />
              <span />
              <span />
            </div>
            <span className="uap-cover-label">
              <i className="bi bi-patch-check-fill" /> Verified ReMaker
            </span>
          </div>
          <div className="uap-profile-body">
            <div className="uap-avatar">
              <ImageWithFallback src={artist.image} alt={artist.name} />
              <b>{getInitials(artist.name)}</b>
              <span>
                <i className="bi bi-patch-check-fill" />
              </span>
            </div>
            <div className="uap-main-info">
              <div className="uap-title-row">
                <div>
                  <span className="uap-badge">
                    <i className="bi bi-recycle" /> {artist.craft}
                  </span>
                  <h1>{artist.name}</h1>
                  <p>@{artist.username}</p>
                </div>
                <button
                  type="button"
                  className={`uap-follow ${following ? "active" : ""}`}
                  onClick={() => setFollowing((value) => !value)}
                >
                  <i
                    className={following ? "bi bi-check2" : "bi bi-person-plus"}
                  />{" "}
                  {following ? "Following" : "Follow ReMaker"}
                </button>
              </div>
              <div className="uap-location">
                <i className="bi bi-geo-alt" /> {artist.city} · {artist.pincode}
                <span /> {artist.yearsOfExperience} years of experience
              </div>
              <p className="uap-bio">{artist.bio}</p>
            </div>
            <div className="uap-rating">
              <small>Maker rating</small>
              <strong>{artist.rating}</strong>
              <Stars rating={artist.rating} />
              <span>{artist.totalReviews} reviews</span>
            </div>
          </div>
          <div className="uap-stats">
            <div>
              <small>Items rescued</small>
              <strong>{artist.itemsRescued}</strong>
            </div>
            <div>
              <small>Products</small>
              <strong>{totalProducts}</strong>
            </div>
            <div>
              <small>Followers</small>
              <strong>{artist.followers.toLocaleString("en-IN")}</strong>
            </div>
            <div>
              <small>Experience</small>
              <strong>{artist.yearsOfExperience} yrs</strong>
            </div>
          </div>
        </section>

        <section className="uap-content">
          <nav className="uap-tabs">
            <button
              type="button"
              className={activeTab === "studio" ? "active" : ""}
              onClick={() => setActiveTab("studio")}
            >
              Studio
            </button>
            <button
              type="button"
              className={activeTab === "portfolio" ? "active" : ""}
              onClick={() => setActiveTab("portfolio")}
            >
              Portfolio <span>{portfolio.length}</span>
            </button>
            <button
              type="button"
              className={activeTab === "products" ? "active" : ""}
              onClick={() => setActiveTab("products")}
            >
              Products <span>{products.length}</span>
            </button>
            <button
              type="button"
              className={activeTab === "reviews" ? "active" : ""}
              onClick={() => setActiveTab("reviews")}
            >
              Reviews <span>{reviews.length}</span>
            </button>
          </nav>

          {activeTab === "studio" && (
            <div className="uap-studio">
              <div className="uap-studio-intro">
                <span className="uap-kicker">The studio story</span>
                <h2>Crafting another life for overlooked materials.</h2>
                <p>{artist.bio}</p>
                <div className="uap-principles">
                  <div>
                    <span>
                      <i className="bi bi-recycle" />
                    </span>
                    <strong>Circular making</strong>
                    <small>Existing materials stay useful for longer.</small>
                  </div>
                  <div>
                    <span>
                      <i className="bi bi-hand-index" />
                    </span>
                    <strong>Thoughtful craft</strong>
                    <small>Each piece receives hands-on finishing.</small>
                  </div>
                  <div>
                    <span>
                      <i className="bi bi-leaf" />
                    </span>
                    <strong>Lower impact</strong>
                    <small>Making with what already exists.</small>
                  </div>
                </div>
              </div>
              <div className="uap-featured">
                <div className="uap-section-head">
                  <div>
                    <span className="uap-kicker">Featured work</span>
                    <h3>From the studio</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("portfolio")}
                  >
                    View portfolio <i className="bi bi-arrow-right" />
                  </button>
                </div>
                <div className="uap-featured-grid">
                  {portfolio.slice(0, 3).map((work) => (
                    <article key={work.id}>
                      <div>
                        <ImageWithFallback src={work.image} alt={work.title} />
                      </div>
                      <section>
                        <small>Portfolio</small>
                        <h4>{work.title}</h4>
                        <p>{work.description}</p>
                      </section>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "portfolio" && (
            <div className="uap-portfolio">
              <div className="uap-tab-head">
                <span className="uap-kicker">Selected work</span>
                <h2>A studio built around second chances.</h2>
                <p>
                  Explore restoration, reuse and remaking projects by{" "}
                  {artist.name}.
                </p>
              </div>
              <div className="uap-portfolio-grid">
                {portfolio.map((work) => (
                  <article key={work.id}>
                    <div className="uap-portfolio-image">
                      <ImageWithFallback src={work.image} alt={work.title} />
                    </div>
                    <section>
                      <small>{artist.craft}</small>
                      <h3>{work.title}</h3>
                      <p>{work.description}</p>
                      <button type="button">
                        <i className="bi bi-arrow-up-right" /> View project
                      </button>
                    </section>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <div className="uap-products">
              <div className="uap-tab-head">
                <span className="uap-kicker">Shop the maker</span>
                <h2>Pieces made by {artist.name}.</h2>
                <p>
                  Browse currently listed products and give one another orbit.
                </p>
              </div>
              {products.length ? (
                <div className="uap-product-grid">
                  {products.map((product) => (
                    <article
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
                      <div className="uap-product-image">
                        <ImageWithFallback
                          src={product.image}
                          alt={product.title}
                        />
                        <span>
                          <i className="bi bi-leaf" /> {product.co2SavedKg} kg
                        </span>
                      </div>
                      <section>
                        <small>{product.category}</small>
                        <h3>{product.title}</h3>
                        <p>{product.summary}</p>
                        <div>
                          <strong>{formatPrice(product.price)}</strong>
                          <span>
                            View <i className="bi bi-arrow-right" />
                          </span>
                        </div>
                      </section>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="uap-empty">
                  <i className="bi bi-box-seam" />
                  <h3>No products listed</h3>
                  <p>This ReMaker doesn't currently have active products.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="uap-reviews">
              <div className="uap-review-overview">
                <span className="uap-kicker">Community feedback</span>
                <strong>{artist.rating}</strong>
                <Stars rating={artist.rating} />
                <small>Based on {artist.totalReviews} reviews</small>
                <div className="uap-review-note">
                  <i className="bi bi-heart" />
                  <p>
                    Buyers have shared positive experiences with this ReMaker's
                    products and craftsmanship.
                  </p>
                </div>
              </div>
              <div className="uap-review-list">
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
                  <div className="uap-empty">
                    <i className="bi bi-chat-square-text" />
                    <h3>No reviews yet</h3>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
