import React from "react";
import { Link } from "../../../../shared/portalRouter";
import {
  ChevronRight,
  MapPin,
  BadgeCheck,
  Images,
  Star,
  MessageSquareText,
  Phone,
  Mail,
  Clock3,
} from "lucide-react";
import SafeImage from "../../../components/ui/SafeImage";
import { SellerTypeBadge } from "./OrderBadges";
import { Stars } from "../../../components/ui/Stars";

/* Small clickable seller line used on order cards. */
export function SellerChip({ order }) {
  const { seller, sellerIsRemaker, sellerPath } = order;
  if (!seller) return null;
  const inner = (
    <>
      <SafeImage src={seller.image} alt="" avatar />
      <span>
        <small>{sellerIsRemaker ? "ReMaker" : "Seller"}</small>
        <strong>{seller.name}</strong>
      </span>
      {(sellerIsRemaker || seller.type === "platform") && (
        <BadgeCheck size={14} className="ob-chip-verified" />
      )}
      {sellerPath && <ChevronRight size={14} />}
    </>
  );
  /* ReOrbit's own store has no profile page to open */
  if (!sellerPath) return <span className="ob-chip">{inner}</span>;
  return (
    <Link
      to={sellerPath}
      className="ob-chip"
      onClick={(event) => event.stopPropagation()}
      title={`Open ${seller.name}'s profile`}
    >
      {inner}
    </Link>
  );
}

/* Full seller card for the details + tracking pages. Everything shown here comes from the
   server: the seller's real numbers, and ReOrbit's own address when ReOrbit is the seller. */
export default function SellerCard({ order, compact = false }) {
  const { seller, sellerIsRemaker, sellerPath } = order;
  if (!seller) return null;
  const platform = seller.type === "platform";
  const a = seller.address || {};
  const where = [a.line1, [a.city, a.state].filter(Boolean).join(", "), a.pincode]
    .filter(Boolean)
    .join(" · ");
  const reviews = seller.totalReviews || 0;
  const subline = platform
    ? "Official ReOrbit store"
    : sellerIsRemaker
      ? seller.craft || ""
      : seller.city || "";

  return (
    <section className="dn-card dn-card-pad ob-seller">
      <div className="dn-card-head">
        <h3>{sellerIsRemaker ? "Made by" : "Sold by"}</h3>
        {platform ? (
          <span className="ob-type is-remaker">Official store</span>
        ) : (
          <SellerTypeBadge remaker={sellerIsRemaker} />
        )}
      </div>

      <div className="ob-seller-main">
        <SafeImage
          src={seller.image}
          alt={seller.name}
          className="ob-seller-img"
          avatar
        />
        <div>
          <strong>
            {seller.name}
            {(platform || (sellerIsRemaker && seller.verified)) && (
              <BadgeCheck size={16} className="ob-chip-verified" />
            )}
          </strong>
          {subline && <p>{subline}</p>}
          {!platform &&
            (reviews > 0 ? (
              <div className="ob-seller-rate">
                <Stars value={seller.rating} />
                <b>{Number(seller.rating).toFixed(1)}</b>
                <span>
                  ({reviews} {reviews === 1 ? "review" : "reviews"})
                </span>
              </div>
            ) : (
              <div className="ob-seller-rate">
                <span>No reviews yet</span>
              </div>
            ))}
        </div>
      </div>

      {platform ? (
        <ul className="ob-seller-facts">
          {where && (
            <li>
              <MapPin size={14} /> {where}
            </li>
          )}
          {seller.phone && (
            <li>
              <Phone size={14} /> {seller.phone}
            </li>
          )}
          {seller.email && (
            <li>
              <Mail size={14} /> {seller.email}
            </li>
          )}
          <li>
            <Clock3 size={14} /> Packed and shipped by ReOrbit
          </li>
        </ul>
      ) : (
        !compact && (
          <ul className="ob-seller-facts">
            {seller.city && (
              <li>
                <MapPin size={14} /> {seller.city}
              </li>
            )}
            {sellerIsRemaker && seller.experience && (
              <li>
                <Star size={14} /> {seller.experience} experience
              </li>
            )}
            <li>
              <Images size={14} /> {seller.productsSold || 0} items sold
            </li>
          </ul>
        )
      )}

      {sellerPath && (
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
      )}
    </section>
  );
}
