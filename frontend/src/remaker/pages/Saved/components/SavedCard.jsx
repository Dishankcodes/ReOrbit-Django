import React, { useState } from "react";
import { Link } from "react-router-dom";

import { SOURCE_LABEL, formatPrice } from "../../../data/remakerMarketplaceData";

export default function SavedCard({ listing, onRemove }) {
  const [failed, setFailed] = useState(false);
  const soldOut = listing.quantity < 1;

  return (
    <article className="sav-card">
      <div className="sav-media">
        {failed || !listing.gallery[0] ? (
          <span className="sav-noimg" />
        ) : (
          <img src={listing.gallery[0]} alt="" loading="lazy" onError={() => setFailed(true)} />
        )}

        <span className={`sav-tag ${listing.source}`}>{SOURCE_LABEL[listing.source]}</span>
        <span className="sav-condition">{listing.condition}</span>
        {soldOut && <span className="sav-sold">Sold out</span>}
      </div>

      <div className="sav-body">
        <span className="sav-cat">{listing.category}</span>
        <h3>
          <Link to={`/remaker-marketplace/product/${listing.id}`} className="sav-link">
            {listing.title}
          </Link>
        </h3>
        <p className="sav-seller">
          {listing.seller} · {listing.city}
        </p>

        <div className="sav-foot">
          <strong>{formatPrice(listing.price)}</strong>
          <small>{listing.quantity > 1 ? `${listing.quantity} available` : "1 available"}</small>
        </div>
      </div>

      <div className="sav-actions">
        <Link to={`/remaker-marketplace/product/${listing.id}`} className="rk-btn primary small">
          {soldOut ? "View details" : "Buy now"}
        </Link>
        <button type="button" className="rk-btn ghost small" onClick={() => onRemove(listing)}>
          Remove
        </button>
      </div>
    </article>
  );
}
