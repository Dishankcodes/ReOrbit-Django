import React, { useState } from "react";
import { Link, useNavigate } from "../../../shared/portalRouter";
import {
  BadgeCheck,
  CalendarDays,
  Heart,
  MapPin,
  PackageSearch,
  Package,
  Star,
  UserCheck,
  UserPlus,
  Users,
  Recycle,
  Award,
} from "lucide-react";

import { useGoBack } from "../../../shared/backNav";
import ReportButton from "../../../shared/components/ReportButton";
import { formatPrice } from "../../../data/marketplaceData";
import SafeImage from "../../components/ui/SafeImage";
import MessageButton from "../../components/ui/MessageButton";

import "../../css/shared/ui-base.css";
import "../../css/marketplace-css/UserMarketplaceV2.css";
import "../../css/marketplace-css/UserProfileV2.css";

const Stars = ({ rating = 0 }) => (
  <span className="ushp-stars" aria-label={`${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={13}
        fill={s <= Math.round(rating) ? "currentColor" : "none"}
      />
    ))}
  </span>
);

/* One profile layout for community sellers and ReMakers.
   props: person, isMaker, products, reviews, portfolio, following, onFollow, chat, reportType, reportTarget, fileComplaint */
export default function ProfileShell({
  person,
  isMaker,
  products,
  reviews,
  portfolio = [],
  following,
  onFollow,
  chat,
  reportType,
  reportTarget,
  fileComplaint,
  initialTab,
}) {
  const navigate = useNavigate();
  const { goBack, canGoBack, prevLabel } = useGoBack("/user-marketplace");
  const tabs = isMaker
    ? [
        ["studio", "Studio"],
        ["portfolio", `Portfolio (${portfolio.length})`],
        ["products", `Products (${products.length})`],
        ["reviews", `Reviews (${reviews.length})`],
      ]
    : [
        ["listings", `Listings (${products.length})`],
        ["reviews", `Reviews (${reviews.length})`],
        ["about", "About"],
      ];
  const [tab, setTab] = useState(
    tabs.some(([k]) => k === initialTab) ? initialTab : tabs[0][0],
  );

  const stats = isMaker
    ? [
        [Star, person.rating, `${person.totalReviews} reviews`],
        [Recycle, person.itemsRescued, "items rescued"],
        [Users, person.followers?.toLocaleString("en-IN"), "followers"],
        [Award, `${person.yearsOfExperience} yrs`, "experience"],
      ]
    : [
        [Star, person.rating, `${person.totalReviews} reviews`],
        [Package, person.productsSold, "items sold"],
        [CalendarDays, person.joined, "member since"],
        [MapPin, person.city, "based in"],
      ];

  return (
    <div className="dn sp">
      <nav className="pd-top" aria-label="Breadcrumb">
        <button type="button" className="pd-back" onClick={goBack}>
          ← {canGoBack ? `Back to ${prevLabel}` : "Marketplace"}
        </button>
        <span className="pd-crumbs">
          <Link to="/user-marketplace">Marketplace</Link> / <b>{person.name}</b>
        </span>
      </nav>

      <section className="ushp-card">
        <div className="ushp-banner" aria-hidden="true" />
        <div className="ushp-id">
          <SafeImage
            className="ushp-avatar"
            src={person.image}
            alt={person.name}
          />
          <div className="ushp-name">
            <h1>
              {person.name} {isMaker && <BadgeCheck size={20} />}
            </h1>
            <p>
              <span className={`ushp-role ${isMaker ? "maker" : ""}`}>
                {isMaker ? person.craft : "Community seller"}
              </span>
              <span>
                <MapPin size={13} /> {person.city}
              </span>
              {person.username && <span>@{person.username}</span>}
            </p>
            {person.bio && <p className="ushp-bio">{person.bio}</p>}
          </div>
          <div className="ushp-actions">
            <button
              type="button"
              className={`dn-btn ${following ? "dn-btn--ghost" : ""}`}
              onClick={onFollow}
              aria-pressed={following}
            >
              {following ? (
                <>
                  <UserCheck size={15} /> Following
                </>
              ) : (
                <>
                  <UserPlus size={15} /> Follow
                </>
              )}
            </button>
            <MessageButton target={chat} label="Message" />
            <ReportButton
              type={reportType}
              label="Report"
              file={fileComplaint}
              target={reportTarget}
            />
          </div>
        </div>
        <dl className="ushp-stats">
          {stats.map(([Icon, value, label]) => (
            <div key={label}>
              <Icon size={17} />
              <dd>{value}</dd>
              <dt>{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <div className="pd-tabs" role="tablist">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? "on" : ""}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>

      {(tab === "studio" || tab === "about") && (
        <section className="ushp-about">
          <h2>
            {isMaker
              ? "About the studio"
              : `About ${person.name.split(" ")[0]}`}
          </h2>
          <p>{person.bio}</p>
          <ul>
            <li>
              <MapPin size={15} /> {person.city}
              {person.pincode ? `, ${person.pincode}` : ""}
            </li>
            {isMaker ? (
              <li>
                <Recycle size={15} /> {person.itemsRescued} items rescued so far
              </li>
            ) : (
              <li>
                <CalendarDays size={15} /> Member since {person.joined}
              </li>
            )}
            <li>
              <Star size={15} /> {person.rating} average from{" "}
              {person.totalReviews} reviews
            </li>
          </ul>
        </section>
      )}

      {tab === "portfolio" &&
        (portfolio.length ? (
          <div className="ushp-portfolio">
            {portfolio.map((w) => (
              <article key={w.id}>
                <SafeImage src={w.image} alt={w.title} />
                <div>
                  <h3>{w.title}</h3>
                  <p>{w.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="pd-none">No portfolio pieces yet.</p>
        ))}

      {(tab === "listings" || tab === "products") &&
        (products.length ? (
          <div className="mk-grid">
            {products.map((p) => (
              <article className="mk-card" key={p.id}>
                <div
                  className="mk-media"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/user-marketplace/product/${p.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      navigate(`/user-marketplace/product/${p.id}`);
                  }}
                >
                  <SafeImage src={p.image} alt={p.title} />
                  <span className="mk-cond">{p.condition}</span>
                </div>
                <div className="mk-body">
                  <span className="mk-cat">{p.category}</span>
                  <h3
                    onClick={() =>
                      navigate(`/user-marketplace/product/${p.id}`)
                    }
                  >
                    {p.title}
                  </h3>
                  <div className="mk-foot">
                    <div>
                      <strong>{formatPrice(p.price)}</strong>
                      <small>
                        <MapPin size={11} /> {p.city}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="mk-add"
                      onClick={() =>
                        navigate(`/user-marketplace/product/${p.id}`)
                      }
                    >
                      View
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mk-empty">
            <PackageSearch size={30} />
            <h3>No listings right now</h3>
            <p>
              Follow {person.name.split(" ")[0]} to hear when something new goes
              up.
            </p>
          </div>
        ))}

      {tab === "reviews" && (
        <section className="pd-reviews">
          {reviews.length ? (
            reviews.map((r) => (
              <article key={r.id}>
                <div>
                  <strong>{r.name}</strong>
                  <Stars rating={r.rating} />
                  <time>{r.date}</time>
                </div>
                <p>{r.text}</p>
                <ReportButton
                  type="Review"
                  label="Report review"
                  file={fileComplaint}
                  target={{
                    name: `${r.name}’s review`,
                    sub: `On ${person.name} · ${r.rating}★`,
                    reviewer: r.name,
                    rating: r.rating,
                    text: r.text,
                    ownerName: person.name,
                    ownerRole: isMaker ? "ReMaker" : "User",
                  }}
                />
              </article>
            ))
          ) : (
            <p className="pd-none">No reviews yet.</p>
          )}
        </section>
      )}
    </div>
  );
}
