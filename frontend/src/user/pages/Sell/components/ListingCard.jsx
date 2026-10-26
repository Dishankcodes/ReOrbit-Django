import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Heart, Pencil, ChevronRight, ExternalLink, AlertTriangle } from "lucide-react";
import SafeImage from "../../../components/ui/SafeImage";
import { LISTING_STATUS } from "../../../data/listingsStore";
import { formatPrice } from "../../../../data/marketplaceData";
import { formatDate } from "../../../utils/format";
import { ListingBadge } from "./SellBadges";

export default function ListingCard({ listing }) {
  const navigate = useNavigate();
  const open = () => navigate(`/user-sell/${listing.id}`);
  const editable = ["Draft", "Rejected", "Withdrawn", "Live", "Pending"].includes(listing.status);

  return (
    <article className="sl-card" role="link" tabIndex={0} onClick={open} onKeyDown={(e) => e.key === "Enter" && open()}>
      <div className="sl-card-media">
        <SafeImage src={listing.images[0]} alt={listing.title} />
        <span className="sl-card-badge"><ListingBadge status={listing.status} /></span>
      </div>

      <div className="sl-card-body">
        <span className="dn-dcard-id">{listing.id} · {listing.category}</span>
        <h3>{listing.title}</h3>
        <p className="sl-card-note">
          {listing.status === "Rejected" ? (
            <span className="bad"><AlertTriangle size={13} /> {listing.rejectReason.slice(0, 70)}…</span>
          ) : (
            LISTING_STATUS[listing.status].blurb
          )}
        </p>

        <div className="sl-card-row">
          <strong>{formatPrice(listing.price)}</strong>
          <span><Eye size={13} /> {listing.views}</span>
          <span><Heart size={13} /> {listing.likes}</span>
          <span className="sl-card-date">{formatDate(listing.createdAt)}</span>
        </div>

        <div className="sl-card-actions" onClick={(e) => e.stopPropagation()}>
          {editable && (
            <Link to={`/user-sell/${listing.id}/edit`} className="dn-btn dn-btn--soft dn-btn--sm"><Pencil size={13} /> Edit</Link>
          )}
          {listing.status === "Live" && listing.marketId && (
            <Link to={`/user-marketplace/product/${listing.marketId}`} className="dn-btn dn-btn--ghost dn-btn--sm"><ExternalLink size={13} /> View live</Link>
          )}
          {listing.status === "Reserved" && (
            <Link to="/user-sell/sales" className="dn-btn dn-btn--sm">Pack &amp; ship <ChevronRight size={13} /></Link>
          )}
          <button type="button" className="dn-btn dn-btn--ghost dn-btn--sm" onClick={open}>Details</button>
        </div>
      </div>
    </article>
  );
}
