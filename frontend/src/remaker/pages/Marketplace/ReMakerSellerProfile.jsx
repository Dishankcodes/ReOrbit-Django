import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Check,
  Heart,
  ImageOff,
  Leaf,
  MapPin,
  Package,
  Palette,
  Plus,
  Recycle,
  Star,
  UserX,
  Users,
} from "lucide-react";

import { Avatar, RatingSummary, ReviewList } from "../../pages-components/ReviewBlocks";
import {
  formatPrice,
  getListingsBySeller,
  getSellerProfile,
  getSellerReviews,
} from "../../data/remakerMarketplaceData";
import useWishlist from "../../hooks/useWishlist";

import "../../css/ReMakerSellerProfile.css";

function Photo({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <span className="rsp-photo-fallback">
        <ImageOff size={24} />
      </span>
    );
  }

  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

export default function ReMakerSellerProfile() {
  const { sellerId } = useParams();
  const profile = getSellerProfile(sellerId);

  if (!profile) {
    return (
      <section className="rsp">
        <div className="rsp-missing">
          <UserX size={36} strokeWidth={1.5} />
          <h2>We couldn&apos;t find that profile</h2>
          <p>The seller may have left ReOrbit, or the link is out of date.</p>
          <Link to="/remaker-marketplace" className="rsp-btn primary">
            Back to marketplace
          </Link>
        </div>
      </section>
    );
  }

  return <Profile key={sellerId} profile={profile} />;
}

function Profile({ profile }) {
  const navigate = useNavigate();
  const wishlist = useWishlist();
  const { type, data } = profile;
  const isRemaker = type === "remaker";

  const listings = getListingsBySeller(data.id);
  const reviews = getSellerReviews(data.id);
  const portfolio = isRemaker ? data.portfolio || [] : [];

  const [tab, setTab] = useState("listings");
  const [following, setFollowing] = useState(false);

  const followers = (data.followers || 0) + (following ? 1 : 0);

  const stats = isRemaker
    ? [
        { icon: Star, value: data.rating, label: `${data.totalReviews} reviews` },
        { icon: Users, value: followers.toLocaleString("en-IN"), label: "Followers" },
        { icon: Package, value: data.productsCount, label: "Pieces listed" },
        { icon: Briefcase, value: `${data.yearsOfExperience} yrs`, label: "Experience" },
      ]
    : [
        { icon: Star, value: data.rating, label: `${data.totalReviews} reviews` },
        { icon: Package, value: data.productsSold, label: "Items sold" },
        { icon: CalendarDays, value: data.joined, label: "Member since" },
        { icon: MapPin, value: data.city, label: "Based in" },
      ];

  const tabs = [
    { key: "listings", label: `Listings (${listings.length})` },
    ...(portfolio.length ? [{ key: "portfolio", label: `Portfolio (${portfolio.length})` }] : []),
    { key: "reviews", label: `Reviews (${data.totalReviews})` },
    { key: "about", label: "About" },
  ];

  return (
    <section className="rsp">
      <nav className="rsp-crumbs" aria-label="Breadcrumb">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} />
          Back
        </button>
        <span aria-hidden="true">/</span>
        <Link to="/remaker-marketplace">Marketplace</Link>
        <span aria-hidden="true">/</span>
        <strong>{data.name}</strong>
      </nav>

      {/* HERO */}
      <header className={`rsp-hero ${type}`}>
        <div className="rsp-cover" aria-hidden="true">
          <svg viewBox="0 0 1200 200" preserveAspectRatio="xMaxYMid slice">
            <g fill="none" stroke="currentColor" strokeWidth="1.2">
              <circle cx="1010" cy="100" r="60" />
              <circle cx="1010" cy="100" r="115" />
              <circle cx="1010" cy="100" r="175" />
              <circle cx="1010" cy="100" r="240" />
              <circle cx="1010" cy="100" r="310" />
            </g>
            <circle cx="1085" cy="56" r="7" fill="#c1c8c4" />
            <circle cx="880" cy="140" r="5" fill="#c1c8c4" opacity="0.7" />
          </svg>
        </div>

        <div className="rsp-hero-body">
          <div className="rsp-avatar">
            <Avatar src={data.image} name={data.name} />
          </div>

          <div className="rsp-identity">
            <div className="rsp-name-row">
              <h2>{data.name}</h2>
              <span className={`rsp-badge ${type}`}>
                {isRemaker ? <BadgeCheck size={14} /> : <Users size={14} />}
                {isRemaker ? "Verified ReMaker" : "Community seller"}
              </span>
            </div>

            <p className="rsp-sub">
              {isRemaker && data.craft && (
                <>
                  <Palette size={14} />
                  {data.craft}
                  <span className="rsp-sep" aria-hidden="true" />
                </>
              )}
              <MapPin size={14} />
              {data.city}
              {data.username && (
                <>
                  <span className="rsp-sep" aria-hidden="true" />@{data.username}
                </>
              )}
            </p>

            <p className="rsp-bio">{data.bio}</p>
          </div>

          {isRemaker && (
            <button
              type="button"
              className={`rsp-btn ${following ? "ghost" : "primary"}`}
              onClick={() => setFollowing((value) => !value)}
              aria-pressed={following}
            >
              {following ? <Check size={16} /> : <Plus size={16} />}
              {following ? "Following" : "Follow"}
            </button>
          )}
        </div>

        <dl className="rsp-stats">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div key={stat.label}>
                <Icon size={18} />
                <dd>{stat.value}</dd>
                <dt>{stat.label}</dt>
              </div>
            );
          })}
        </dl>
      </header>

      {/* TABS */}
      <div className="rsp-tabs" role="tablist">
        {tabs.map((item) => (
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

      {/* LISTINGS */}
      {tab === "listings" &&
        (listings.length === 0 ? (
          <p className="rsp-empty">{data.name} has no active listings right now.</p>
        ) : (
          <div className="rsp-grid">
            {listings.map((listing) => {
              const saved = wishlist.has(listing.id);

              return (
                <article className="rsp-card" key={listing.id}>
                  <div className="rsp-card-media">
                    <Photo src={listing.gallery[0]} alt="" />
                    <span className="rsp-condition">{listing.condition}</span>
                    <button
                      type="button"
                      className={`rsp-heart ${saved ? "on" : ""}`}
                      onClick={() => wishlist.toggle(listing.id)}
                      aria-pressed={saved}
                      aria-label={saved ? `Remove ${listing.title} from saved` : `Save ${listing.title}`}
                    >
                      <Heart size={16} fill={saved ? "currentColor" : "none"} />
                    </button>
                  </div>

                  <div className="rsp-card-body">
                    <span>{listing.category}</span>
                    <h3>
                      <Link to={`/remaker-marketplace/product/${listing.id}`} className="rsp-card-link">
                        {listing.title}
                      </Link>
                    </h3>
                    <div className="rsp-card-foot">
                      <strong>{formatPrice(listing.price)}</strong>
                      <small>
                        <Leaf size={13} />
                        {listing.co2SavedKg} kg CO₂
                      </small>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ))}

      {/* PORTFOLIO */}
      {tab === "portfolio" && (
        <div className="rsp-portfolio">
          {portfolio.map((work) => (
            <figure key={work.id}>
              <div>
                <Photo src={work.image} alt={work.title} />
              </div>
              <figcaption>
                <strong>{work.title}</strong>
                <p>{work.description}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {/* REVIEWS */}
      {tab === "reviews" &&
        (reviews.length === 0 ? (
          <p className="rsp-empty">No reviews for {data.name} yet.</p>
        ) : (
          <div className="rsp-reviews">
            <RatingSummary reviews={reviews} average={data.rating} total={data.totalReviews} />
            {data.totalReviews > reviews.length && (
              <p className="rsp-more">
                Showing the latest {reviews.length} of {data.totalReviews} reviews.
              </p>
            )}
            <ReviewList reviews={reviews} />
          </div>
        ))}

      {/* ABOUT */}
      {tab === "about" && (
        <div className="rsp-about">
          <div className="rsp-about-main">
            <h3>About {data.name}</h3>
            <p>{data.bio}</p>

            {isRemaker && (
              <ul className="rsp-impact">
                <li>
                  <Recycle size={18} />
                  <div>
                    <strong>{data.itemsRescued}</strong>
                    <small>items rescued from waste</small>
                  </div>
                </li>
                <li>
                  <Briefcase size={18} />
                  <div>
                    <strong>{data.yearsOfExperience} years</strong>
                    <small>working with reclaimed material</small>
                  </div>
                </li>
              </ul>
            )}
          </div>

          <dl className="rsp-facts">
            {[
              ["Profile type", isRemaker ? "Verified ReMaker" : "Community seller"],
              isRemaker ? ["Craft", data.craft] : null,
              ["Location", data.city],
              ["Rating", `${data.rating} from ${data.totalReviews} reviews`],
              isRemaker
                ? ["Pieces listed", data.productsCount]
                : ["Items sold", data.productsSold],
              !isRemaker ? ["Member since", data.joined] : null,
            ]
              .filter(Boolean)
              .map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
        </div>
      )}
    </section>
  );
}
