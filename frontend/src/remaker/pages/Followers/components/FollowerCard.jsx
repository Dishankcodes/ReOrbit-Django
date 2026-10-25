import React from "react";

import { Avatar } from "../../../pages-components/ReviewBlocks";
import { followedLabel } from "../../../data/followersStore";

/* One follower, as a card or as a row */
export default function FollowerCard({
  person,
  view,
  following,
  onOpen,
  onFollowBack,
}) {
  const engaged = person.views >= 34 || person.saves >= 5;

  return (
    <article className={`fol-card ${view}`}>
      <button
        type="button"
        className="fol-card-main"
        onClick={() => onOpen(person)}
        aria-label={`View ${person.name}`}
      >
        <span className="fol-avatar">
          <Avatar src={person.image} name={person.name} />
        </span>

        <span className="fol-card-text">
          <strong>{person.name}</strong>
          <small>
            {person.city}, {person.state}
          </small>

          <span className="fol-badges">
            <i className={person.type === "ReMaker" ? "maker" : ""}>
              {person.type === "ReMaker" ? "ReMaker" : "Shopper"}
            </i>
            {person.customerId && <i className="customer">Customer</i>}
            {engaged && <i className="engaged">Engaged</i>}
          </span>
        </span>

        {view === "list" && (
          <span className="fol-card-stats">
            <b>{person.views}</b>
            <small>views</small>
            <b>{person.saves}</b>
            <small>saves</small>
          </span>
        )}

        <span className="fol-card-date">
          Followed {followedLabel(person.followedAt)}
        </span>
      </button>

      {person.type === "ReMaker" && (
        <div className="fol-card-actions">
          {following ? (
            <span className="fol-following">Following</span>
          ) : (
            <button
              type="button"
              className="fol-btn ghost small"
              onClick={() => onFollowBack(person)}
            >
              Follow back
            </button>
          )}
        </div>
      )}
    </article>
  );
}
