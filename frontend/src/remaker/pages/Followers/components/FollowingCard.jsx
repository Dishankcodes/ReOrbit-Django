import React from "react";
import { Link } from "react-router-dom";

import { Avatar } from "../../../pages-components/ReviewBlocks";
import { followedLabel } from "../../../data/followersStore";

/* A ReMaker you follow */
export default function FollowingCard({ item, onUnfollow }) {
  return (
    <article className="fol-follow">
      <span className="fol-avatar big">
        <Avatar src={item.image} name={item.name} />
      </span>

      <div className="fol-follow-text">
        <strong>{item.name}</strong>
        <small>
          {item.craft} · {item.city}
        </small>
        <span>
          {item.rating ? `${item.rating} rating` : "New ReMaker"}
          {item.followers
            ? ` · ${item.followers.toLocaleString("en-IN")} followers`
            : ""}
          {item.products ? ` · ${item.products} pieces` : ""}
        </span>
        <em>Following since {followedLabel(item.followedAt)}</em>
      </div>

      <div className="fol-follow-actions">
        {item.profile && (
          <Link
            to={`/remaker-marketplace/seller/${item.id}`}
            className="fol-btn ghost small"
          >
            View profile
          </Link>
        )}
        <button
          type="button"
          className="fol-btn danger-ghost small"
          onClick={() => onUnfollow(item)}
        >
          Unfollow
        </button>
      </div>
    </article>
  );
}
