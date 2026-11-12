import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Check,
  ChevronRight,
  MapPin,
  UserPlus,
} from "lucide-react";
import SafeImage from "../../../components/ui/SafeImage";
import { Stars } from "../../../components/ui/Stars";
import { followerCount } from "../../../data/followStore";

/* the card is also used on the Following page, which must not depend on the Remakers page for its styles */
import "../../../css/remakers/UserRemakers.css";

export const remakerPath = (id) => `/user-marketplace/remaker/${id}`;

export default function RemakerCard({ maker, following, onToggle }) {
  const navigate = useNavigate();
  const open = () => navigate(remakerPath(maker.id));
  const works = (maker.portfolio || []).slice(0, 3);

  return (
    <article
      className="urm-card"
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => event.key === "Enter" && open()}
      aria-label={`Open ${maker.name}'s profile`}
    >
      <div className="urm-cover">
        {works[0] && <SafeImage src={works[0].image} alt="" />}
        <span className="urm-verified">
          <BadgeCheck size={13} /> Verified ReMaker
        </span>
      </div>

      <div className="urm-body">
        <SafeImage src={maker.image} alt={maker.name} className="urm-avatar" />

        <div className="urm-title">
          <h3>{maker.name}</h3>
          <p>@{maker.username}</p>
        </div>
        <span className="dn-chip urm-craft">{maker.craft}</span>

        <p className="urm-bio">{maker.bio}</p>

        <div className="urm-meta">
          <span className="urm-rate">
            <Stars value={maker.rating} size={13} /> <b>{maker.rating}</b> (
            {maker.totalReviews})
          </span>
          <span>
            <MapPin size={13} /> {maker.city}
          </span>
        </div>

        <dl className="urm-stats">
          <div>
            <dd>
              {followerCount(maker.followers, following).toLocaleString(
                "en-IN",
              )}
            </dd>
            <dt>Followers</dt>
          </div>
          <div>
            <dd>{maker.productsCount}</dd>
            <dt>Products</dt>
          </div>
          <div>
            <dd>{maker.itemsRescued}</dd>
            <dt>Rescued</dt>
          </div>
        </dl>

        {works.length > 0 && (
          <div className="urm-works" aria-label="Portfolio preview">
            {works.map((work) => (
              <Link
                key={work.id}
                to={`${remakerPath(maker.id)}?tab=portfolio`}
                title={work.title}
                onClick={(event) => event.stopPropagation()}
              >
                <SafeImage src={work.image} alt={work.title} />
              </Link>
            ))}
          </div>
        )}

        <div className="urm-actions">
          <button
            type="button"
            className={`dn-btn dn-btn--sm urm-follow ${following ? "is-following" : ""}`}
            aria-pressed={following}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(maker);
            }}
          >
            {following ? <Check size={15} /> : <UserPlus size={15} />}
            {following ? "Following" : "Follow"}
          </button>
          <button
            type="button"
            className="dn-btn dn-btn--ghost dn-btn--sm"
            onClick={open}
          >
            View profile <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}
