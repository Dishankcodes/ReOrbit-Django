import React from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  MapPin,
  BadgeCheck,
  Images,
  Star,
  MessageSquareText,
} from "lucide-react";
import SafeImage from "../../../components/ui/SafeImage";
import { SellerTypeBadge } from "./OrderBadges";
import { Stars } from "../../../components/ui/Stars";

/* Small clickable seller line used on order cards. */
export function SellerChip({ order }) {
  const { seller, sellerIsRemaker, sellerPath } = order;
  if (!seller) return null;
  return (
    <Link
      to={sellerPath}
      className="ob-chip"
      onClick={(event) => event.stopPropagation()}
      title={`Open ${seller.name}'s profile`}
    >
      <SafeImage src={seller.image} alt="" />
      <span>
        <small>{sellerIsRemaker ? "ReMaker" : "Seller"}</small>
        <strong>{seller.name}</strong>
      </span>
      {sellerIsRemaker && <BadgeCheck size={14} className="ob-chip-verified" />}
      <ChevronRight size={14} />
    </Link>
  );
}

/* Full seller card for the details + tracking pages. */
export default function SellerCard({ order, compact = false }) {
  const { seller, sellerIsRemaker, sellerPath } = order;
  if (!seller) return null;

  return (
    <section className="dn-card dn-card-pad ob-seller">
      <div className="dn-card-head">
        <h3>{sellerIsRemaker ? "Made by" : "Sold by"}</h3>
        <SellerTypeBadge remaker={sellerIsRemaker} />
      </div>

      <div className="ob-seller-main">
        <SafeImage
          src={seller.image}
          alt={seller.name}
          className="ob-seller-img"
        />
        <div>
          <strong>
            {seller.name}
            {sellerIsRemaker && seller.verified && (
              <BadgeCheck size={16} className="ob-chip-verified" />
            )}
          </strong>
          <p>{sellerIsRemaker ? seller.craft : `@${seller.username}`}</p>
          <div className="ob-seller-rate">
            <Stars value={seller.rating} />
            <b>{seller.rating}</b>
            <span>({seller.totalReviews} reviews)</span>
          </div>
        </div>
      </div>

      {!compact && (
        <ul className="ob-seller-facts">
          <li>
            <MapPin size={14} /> {seller.city}
          </li>
          {sellerIsRemaker ? (
            <>
              <li>
                <Images size={14} /> {seller.portfolio?.length || 0} portfolio
                works
              </li>
              <li>
                <Star size={14} /> {seller.yearsOfExperience} yrs experience
              </li>
            </>
          ) : (
            <li>
              <Star size={14} /> {seller.productsSold} items sold
            </li>
          )}
        </ul>
      )}

      <div className="ob-seller-actions">
        <Link to={sellerPath} className="dn-btn dn-btn--sm">
          View profile <ChevronRight size={14} />
        </Link>
        {sellerIsRemaker ? (
          <Link
            to={`${sellerPath}?tab=portfolio`}
            className="dn-btn dn-btn--ghost dn-btn--sm"
          >
            <Images size={14} /> Portfolio
          </Link>
        ) : (
          <Link
            to={`${sellerPath}?tab=reviews`}
            className="dn-btn dn-btn--ghost dn-btn--sm"
          >
            <MessageSquareText size={14} /> Reviews
          </Link>
        )}
      </div>
    </section>
  );
}
