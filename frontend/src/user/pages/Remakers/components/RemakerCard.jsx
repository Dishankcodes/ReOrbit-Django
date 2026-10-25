import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, Check, ChevronRight, MapPin, UserPlus } from "lucide-react";
import SafeImage from "../../../components/ui/SafeImage";
import { Stars } from "../../../components/ui/Stars";
import { followerCount } from "../../../data/followStore";

export const remakerPath = (id) => `/user-marketplace/remaker/${id}`;

export default function RemakerCard({ maker, following, onToggle }) {
  const navigate = useNavigate();
  const open = () => navigate(remakerPath(maker.id));
  const works = (maker.portfolio || []).slice(0, 3);

  return (
    <article
      className="rm-card"
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => event.key === "Enter" && open()}
      aria-label={`Open ${maker.name}'s profile`}
    >
      <div className="rm-cover">
        {works[0] && <SafeImage src={works[0].image} alt="" />}
        <span className="rm-verified"><BadgeCheck size={13} /> Verified ReMaker</span>
      </div>

      <div className="rm-body">
        <SafeImage src={maker.image} alt={maker.name} className="rm-avatar" />

        <div className="rm-title">
          <h3>{maker.name}</h3>
          <p>@{maker.username}</p>
        </div>
        <span className="dn-chip rm-craft">{maker.craft}</span>

        <p className="rm-bio">{maker.bio}</p>

        <div className="rm-meta">
          <span className="rm-rate">
            <Stars value={maker.rating} size={13} /> <b>{maker.rating}</b> ({maker.totalReviews})
          </span>
          <span><MapPin size={13} /> {maker.city}</span>
        </div>

        <dl className="rm-stats">
          <div><dd>{followerCount(maker.followers, following).toLocaleString("en-IN")}</dd><dt>Followers</dt></div>
          <div><dd>{maker.productsCount}</dd><dt>Products</dt></div>
          <div><dd>{maker.itemsRescued}</dd><dt>Rescued</dt></div>
        </dl>

        {works.length > 0 && (
          <div className="rm-works" aria-label="Portfolio preview">
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

        <div className="rm-actions">
          <button
            type="button"
            className={`dn-btn dn-btn--sm rm-follow ${following ? "is-following" : ""}`}
            aria-pressed={following}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(maker);
            }}
          >
            {following ? <Check size={15} /> : <UserPlus size={15} />}
            {following ? "Following" : "Follow"}
          </button>
          <button type="button" className="dn-btn dn-btn--ghost dn-btn--sm" onClick={open}>
            View profile <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}
