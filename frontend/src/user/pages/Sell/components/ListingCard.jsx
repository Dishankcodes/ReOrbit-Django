import React from "react";
import { productPath } from "../../../../shared/slug";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Heart, Pencil, ChevronRight, ExternalLink, Ban, AlertTriangle, Tag } from "lucide-react";
import SafeImage from "../../../components/ui/SafeImage";
import { LISTING_STATUS } from "../../../data/listingsStore";
import { formatPrice } from "../../../../data/marketplaceData";
import { formatDate } from "../../../utils/format";
import { ListingBadge } from "./SellBadges";

/* What ReOrbit asked of this listing, most serious first: turned off, flagged, a new price. */
function notices(listing) {
  const out = [];
  if (listing.adminDisabled)
    out.push({ key: "off", tone: "red", icon: Ban, badge: "Turned off", text: `Hidden from buyers: ${listing.adminDisabled.reason}` });
  if (listing.flagged)
    out.push({ key: "flag", tone: "amber", icon: AlertTriangle, badge: "Needs attention", text: `ReOrbit flagged it: ${listing.flagged.reason}` });
  if (listing.suggestedPrice != null)
    out.push({
      key: "price", tone: "blue", icon: Tag, badge: "New price suggested",
      text: `ReOrbit suggests ${formatPrice(listing.suggestedPrice)}${listing.suggestedMessage ? `: ${listing.suggestedMessage}` : ". Open to accept or decline."}`,
    });
  return out;
}

export default function ListingCard({ listing }) {
  const navigate = useNavigate();
  const open = () => navigate(`/user-sell/${listing.id}`);
  const editable = ["Draft", "Withdrawn", "Live"].includes(listing.status);
  const alerts = notices(listing);

  return (
    <article
      className="usl-card"
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => e.key === "Enter" && open()}
    >
      <div className="usl-card-media">
        <SafeImage src={listing.images[0]} alt={listing.title} />
        <span className="usl-card-badge">
          {/* a turned-off listing isn't live for buyers, so "Turned off" replaces "Live" */}
          {!(listing.adminDisabled && listing.status === "Live") && <ListingBadge status={listing.status} />}
          {alerts.map((a) => (
            <span key={a.key} className={`dn-badge dn-badge--${a.tone}`}>
              {a.badge}
            </span>
          ))}
        </span>
      </div>

      <div className="usl-card-body">
        <span className="dn-dcard-id">
          {listing.id} · {listing.category}
        </span>
        <h3>{listing.title}</h3>
        {alerts.length ? (
          <ul className="usl-card-alerts">
            {alerts.map((a) => (
              <li key={a.key} className={`tone-${a.tone}`}>
                <a.icon size={14} aria-hidden="true" />
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="usl-card-note">{LISTING_STATUS[listing.status].blurb}</p>
        )}

        <div className="usl-card-row">
          <strong>{formatPrice(listing.price)}</strong>
          <span>
            <Eye size={13} /> {listing.views}
          </span>
          <span>
            <Heart size={13} /> {listing.likes}
          </span>
          <span className="usl-card-date">{formatDate(listing.createdAt)}</span>
        </div>

        <div className="usl-card-actions" onClick={(e) => e.stopPropagation()}>
          {editable && (
            <Link
              to={`/user-sell/${listing.id}/edit`}
              className="dn-btn dn-btn--soft dn-btn--sm"
            >
              <Pencil size={13} /> Edit
            </Link>
          )}
          {listing.status === "Live" && listing.marketId && (
            <Link
              to={productPath(listing.marketId, listing.title)}
              className="dn-btn dn-btn--ghost dn-btn--sm"
            >
              <ExternalLink size={13} /> View live
            </Link>
          )}
          {listing.status === "Reserved" && (
            <Link to="/user-sell/sales" className="dn-btn dn-btn--sm">
              Pack &amp; ship <ChevronRight size={13} />
            </Link>
          )}
          <button
            type="button"
            className="dn-btn dn-btn--ghost dn-btn--sm"
            onClick={open}
          >
            Details
          </button>
        </div>
      </div>
    </article>
  );
}
