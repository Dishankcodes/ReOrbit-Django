import React, { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Ban, CalendarDays, CheckCircle2, Clock, Eye, ExternalLink, Heart, Info, MapPin, Package, Pencil, RotateCcw, Trash2, Truck, Wallet } from "lucide-react";

import { LISTING_STATUS, PICKUP_OPTIONS, deleteListing, relistListing, useListing, useSales, withdrawListing } from "../../data/listingsStore";
import { formatPrice } from "../../../data/marketplaceData";
import { formatDate, formatDateTime } from "../../utils/format";
import ConfirmModal from "../../components/ui/ConfirmModal";
import Crumbs from "../../components/ui/Crumbs";
import DonationTimeline from "../../components/ui/Timeline";
import EmptyState from "../../components/ui/EmptyState";
import SafeImage from "../../components/ui/SafeImage";
import useToast from "../../components/ui/useToast";
import EarningsPreview from "./components/EarningsPreview";
import { ListingBadge } from "./components/SellBadges";

import "../../css/shared/ui-base.css";
import "../../css/sell/sell-base.css";
import "../../css/sell/UserListingDetails.css";

const JUST = { submitted: "Listing submitted. We'll verify it shortly.", updated: "Listing updated.", draft: "Draft saved." };

export default function UserListingDetails() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const listing = useListing(listingId);
  const sale = useSales().find((s) => s.listingId === listingId);
  const { toast, show } = useToast();

  const [photo, setPhoto] = useState(0);
  const [confirm, setConfirm] = useState(null); // "withdraw" | "delete"
  const [announced, setAnnounced] = useState(false);

  React.useEffect(() => {
    const key = location.state?.just;
    if (key && !announced) { show(JUST[key]); setAnnounced(true); }
  }, [location.state, announced, show]);

  if (!listing) {
    return <div className="dn"><EmptyState icon={Package} title="We couldn't find that listing" text="It may have been deleted." actionLabel="Back to my listings" to="/user-sell" /></div>;
  }

  const { status } = listing;
  const meta = LISTING_STATUS[status];
  const editable = ["Draft", "Rejected", "Withdrawn", "Live", "Pending"].includes(status);
  const pickup = PICKUP_OPTIONS.find((o) => o.id === listing.pickup);

  return (
    <div className="dn sl">
      <Crumbs items={[{ label: "Sell", to: "/user-sell" }, { label: listing.id }]} />

      <header className="sl-head">
        <div>
          <div className="sl-head-meta"><span className="dn-dcard-id">{listing.id}</span><ListingBadge status={status} /></div>
          <h1>{listing.title}</h1>
          <p className="dn-muted">Created {formatDate(listing.createdAt)} · {listing.category} · {listing.condition}</p>
        </div>
        <div className="sl-head-actions">
          {editable && <Link to={`/user-sell/${listing.id}/edit`} className="dn-btn"><Pencil size={15} /> {status === "Rejected" ? "Fix & resubmit" : status === "Draft" ? "Continue editing" : "Edit"}</Link>}
          {status === "Live" && listing.marketId && <Link to={`/user-marketplace/product/${listing.marketId}`} className="dn-btn dn-btn--ghost"><ExternalLink size={15} /> View live</Link>}
          {status === "Withdrawn" && <button type="button" className="dn-btn dn-btn--ghost" onClick={() => { relistListing(listing.id); show("Relisted. Sent for verification."); }}><RotateCcw size={15} /> Relist</button>}
          {["Live", "Pending"].includes(status) && <button type="button" className="dn-btn dn-btn--danger" onClick={() => setConfirm("withdraw")}><Ban size={15} /> Withdraw</button>}
          {["Draft", "Rejected", "Withdrawn"].includes(status) && <button type="button" className="dn-btn dn-btn--danger" onClick={() => setConfirm("delete")}><Trash2 size={15} /> Delete</button>}
        </div>
      </header>

      {status === "Rejected" && (
        <div className="dn-banner dn-banner--bad sl-banner"><AlertTriangle size={20} /><div><strong>This listing wasn't approved</strong>{listing.rejectReason}</div></div>
      )}
      {status === "Pending" && (
        <div className="dn-banner dn-banner--warn sl-banner"><Clock size={20} /><div><strong>Verification in progress</strong>Our team is checking your photos and details. Stay on this page: for the demo it goes live in a few seconds.</div></div>
      )}
      {status === "Live" && (
        <div className="dn-banner sl-banner"><CheckCircle2 size={20} /><div><strong>Your listing is live</strong>Buyers can find and order it now. You'll be notified when someone buys it.</div></div>
      )}
      {status === "Reserved" && sale && (
        <div className="dn-banner sl-banner"><Truck size={20} /><div><strong>A buyer ordered this item</strong>Pack it and mark it shipped. <Link to={`/user-sell/sales/${sale.id}`} className="dn-link">Open sale {sale.id} →</Link></div></div>
      )}
      {status === "Sold" && (
        <div className="dn-banner sl-banner"><Wallet size={20} /><div><strong>Sold and delivered</strong>{sale ? <>Your payout is {sale.payout.status.toLowerCase()}. <Link to={`/user-sell/sales/${sale.id}`} className="dn-link">View sale {sale.id} →</Link></> : "Great job."}</div></div>
      )}
      {status === "Withdrawn" && (
        <div className="dn-banner dn-banner--warn sl-banner"><Info size={20} /><div><strong>Removed from the marketplace</strong>Relist it any time. It will be verified again.</div></div>
      )}

      <div className="sl-layout">
        <div className="sl-main">
          <section className="dn-card sl-gallery">
            <div className="sl-gallery-main"><SafeImage src={listing.images[photo]} alt={listing.title} /></div>
            {listing.images.length > 1 && (
              <div className="sl-thumbs">
                {listing.images.map((src, i) => (
                  <button key={`${src}-${i}`} type="button" className={i === photo ? "on" : ""} onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`}><SafeImage src={src} alt="" /></button>
                ))}
              </div>
            )}
          </section>

          <section className="dn-card dn-card-pad">
            <div className="dn-card-head"><h2>Item details</h2><span className="dn-chip">{listing.category}</span></div>
            <p className="sl-desc">{listing.description}</p>
            <dl className="sl-facts">
              <div><dt>Condition</dt><dd>{listing.condition}</dd></div>
              <div><dt>Quantity</dt><dd>{listing.quantity}</dd></div>
              <div><dt>Price</dt><dd>{formatPrice(listing.price)}</dd></div>
              <div><dt><MapPin size={13} /> Pickup from</dt><dd>{listing.city} {listing.pincode}</dd></div>
              <div className="wide"><dt>Handover</dt><dd>{pickup?.label}</dd></div>
            </dl>
          </section>

          <section className="dn-card dn-card-pad">
            <div className="dn-card-head"><div><h2>Activity</h2><small>Every update on this listing</small></div></div>
            <DonationTimeline events={listing.events} />
          </section>
        </div>

        <aside className="sl-side">
          <section className="dn-card dn-card-pad">
            <div className="dn-card-head"><h3>Performance</h3></div>
            <div className="sl-perf">
              <div><Eye size={17} /><strong>{listing.views}</strong><span>Views</span></div>
              <div><Heart size={17} /><strong>{listing.likes}</strong><span>Saves</span></div>
              <div><CalendarDays size={17} /><strong>{Math.max(1, Math.round((Date.now() - new Date(listing.createdAt)) / 86400000))}</strong><span>Days listed</span></div>
            </div>
            <p className="dn-hint" style={{ marginTop: 12 }}>{meta.blurb}</p>
          </section>

          <EarningsPreview price={listing.price} pickup={listing.pickup} qty={listing.quantity} />

          {sale && (
            <section className="dn-card dn-card-pad">
              <div className="dn-card-head"><h3>Sale</h3></div>
              <p className="sl-saleline"><b>{sale.id}</b> · {sale.buyer.name}, {sale.buyer.city}</p>
              <Link to={`/user-sell/sales/${sale.id}`} className="dn-btn dn-btn--soft dn-btn--sm dn-btn--block">Open sale</Link>
            </section>
          )}

          <section className="dn-card dn-card-pad sl-help">
            <Info size={20} />
            <div><strong>Questions about this listing?</strong><p>Read how verification and payouts work.</p><Link to="/user-help" className="dn-link">Help &amp; FAQ →</Link></div>
          </section>
          <p className="dn-hint">Last update {formatDateTime(listing.events[listing.events.length - 1].at)}</p>
        </aside>
      </div>

      {confirm === "withdraw" && (
        <ConfirmModal icon={Ban} title="Withdraw this listing?" confirmLabel="Withdraw" cancelLabel="Keep it live" onClose={() => setConfirm(null)} onConfirm={() => { withdrawListing(listing.id); setConfirm(null); show("Listing withdrawn."); }}>
          <p>{listing.title} will be removed from the marketplace. You can relist it later.</p>
        </ConfirmModal>
      )}
      {confirm === "delete" && (
        <ConfirmModal icon={Trash2} title="Delete this listing?" confirmLabel="Delete" cancelLabel="Keep it" onClose={() => setConfirm(null)} onConfirm={() => { deleteListing(listing.id); navigate("/user-sell", { replace: true }); }}>
          <p>This permanently removes {listing.id}. It can't be undone.</p>
        </ConfirmModal>
      )}

      {toast}
    </div>
  );
}
