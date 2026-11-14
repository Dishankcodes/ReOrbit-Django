import React, { useEffect, useRef } from "react";

import { Avatar } from "../../../pages-components/ReviewBlocks";
import { followedLabel, placeLabel } from "../../../data/followersStore";
import { formatPrice } from "../../../data/remakerMarketplaceData";

function joinedLabel(iso) {
  const date = new Date(iso);

  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/* Slide-over with everything we know about a follower */
export default function FollowerDrawer({
  person,
  following,
  onClose,
  onRemove,
  onFollowBack,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    ref.current?.focus();

    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  const isMaker = person.type === "ReMaker";

  return (
    <div
      className="fol-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="fol-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fol-drawer-name"
        tabIndex={-1}
        ref={ref}
      >
        <button type="button" className="fol-drawer-close" onClick={onClose}>
          Close
        </button>

        <div className="fol-drawer-hero">
          <span className="fol-avatar xl">
            <Avatar src={person.image} name={person.name} />
          </span>
          <h2 id="fol-drawer-name">{person.name}</h2>
          <p>{placeLabel(person)}</p>
          <div className="fol-badges center">
            <i className={isMaker ? "maker" : ""}>
              {isMaker ? "ReMaker" : "Shopper"}
            </i>
            {person.customerId && <i className="customer">Customer</i>}
          </div>
        </div>

        {person.bio && <p className="fol-drawer-bio">{person.bio}</p>}
        {person.craft && <p className="fol-drawer-craft">{person.craft}</p>}

        <dl className="fol-drawer-facts">
          <div>
            <dt>Follows you since</dt>
            <dd>{followedLabel(person.followedAt)}</dd>
          </div>
          <div>
            <dt>On ReOrbit since</dt>
            <dd>{joinedLabel(person.joined)}</dd>
          </div>
          <div>
            <dt>Orders from you</dt>
            <dd>{person.orders}</dd>
          </div>
          <div>
            <dt>Wishlist saves</dt>
            <dd>{person.saves}</dd>
          </div>
        </dl>

        {person.customerId && (
          <section className="fol-drawer-buyer">
            <small>Buyer history</small>
            <div>
              <strong>{person.orders}</strong>
              <span>{person.orders === 1 ? "order" : "orders"}</span>
              <strong>{formatPrice(person.spent)}</strong>
              <span>delivered</span>
            </div>
          </section>
        )}

        <div className="fol-drawer-actions">
          {isMaker && !following && (
            <button
              type="button"
              className="fol-btn primary"
              onClick={() => onFollowBack(person)}
            >
              Follow back
            </button>
          )}

          <button
            type="button"
            className="fol-btn danger-ghost"
            onClick={() => onRemove(person)}
          >
            Remove follower
          </button>
        </div>

        <p className="fol-drawer-note">
          They are not told when you remove them, and they can follow you again
          later.
        </p>
      </aside>
    </div>
  );
}
