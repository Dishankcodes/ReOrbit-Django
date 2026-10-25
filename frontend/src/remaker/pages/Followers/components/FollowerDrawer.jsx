import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import { Avatar } from "../../../pages-components/ReviewBlocks";
import { followedLabel } from "../../../data/followersStore";
import { formatPrice } from "../../../data/remakerMarketplaceData";

/* Slide-over with everything we know about a follower */
export default function FollowerDrawer({
  person,
  customer,
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
  const hasProfile = ["arjun-mehta", "priya-shah", "tara-bose"].includes(
    person.id,
  );

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
          <p>
            {person.city}, {person.state}
          </p>
          <div className="fol-badges center">
            <i className={isMaker ? "maker" : ""}>
              {isMaker ? "ReMaker" : "Shopper"}
            </i>
            {person.customerId && <i className="customer">Customer</i>}
          </div>
        </div>

        <p className="fol-drawer-bio">{person.bio}</p>
        {person.craft && <p className="fol-drawer-craft">{person.craft}</p>}

        <dl className="fol-drawer-facts">
          <div>
            <dt>Follows you since</dt>
            <dd>{followedLabel(person.followedAt)}</dd>
          </div>
          <div>
            <dt>On ReOrbit since</dt>
            <dd>{person.joined}</dd>
          </div>
          <div>
            <dt>Product views</dt>
            <dd>{person.views}</dd>
          </div>
          <div>
            <dt>Wishlist saves</dt>
            <dd>{person.saves}</dd>
          </div>
        </dl>

        {customer && (
          <section className="fol-drawer-buyer">
            <small>Buyer history</small>
            <div>
              <strong>{customer.orders.length}</strong>
              <span>{customer.orders.length === 1 ? "order" : "orders"}</span>
              <strong>{formatPrice(customer.spent)}</strong>
              <span>spent</span>
            </div>
            <Link to={`/remaker-customers/${person.customerId}`}>
              Open customer profile →
            </Link>
          </section>
        )}

        <div className="fol-drawer-actions">
          {hasProfile && (
            <Link
              to={`/remaker-marketplace/seller/${person.id}`}
              className="fol-btn primary"
            >
              View ReMaker profile
            </Link>
          )}

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
