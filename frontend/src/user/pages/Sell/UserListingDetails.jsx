import React, { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  Clock,
  Tag,
  CheckCircle2,
  Eye,
  ExternalLink,
  Heart,
  Info,
  MapPin,
  Package,
  Pencil,
  RotateCcw,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";

import {
  LISTING_STATUS,
  PICKUP_OPTIONS,
  deleteListing,
  relistListing,
  useListing,
  useSales,
  withdrawListing,
} from "../../data/listingsStore";
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

const JUST = {
  submitted: "Your listing is live. Buyers can find it on the marketplace now.",
  updated: "Listing updated.",
  draft: "Draft saved.",
};

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
    if (key && !announced) {
      show(JUST[key]);
      setAnnounced(true);
    }
  }, [location.state, announced, show]);

  if (!listing) {
    return (
      <div className="dn">
        <EmptyState
          icon={Package}
          title="We couldn't find that listing"
          text="It may have been deleted."
          actionLabel="Back to my listings"
          to="/user-sell"
        />
      </div>
    );
  }

  const { status } = listing;
  const meta = LISTING_STATUS[status];
  const editable = [
    "Draft",
    "Withdrawn",
    "Live",
  ].includes(status);
  const pickup = PICKUP_OPTIONS.find((o) => o.id === listing.pickup);

  return (
    <div className="dn sl">
      <Crumbs
        items={[{ label: "Sell", to: "/user-sell" }, { label: listing.id }]}
      />

      <header className="usl-head">
        <div>
          <div className="usl-head-meta">
            <span className="dn-dcard-id">{listing.id}</span>
            <ListingBadge status={status} />
          </div>
          <h1>{listing.title}</h1>
          <p className="dn-muted">
            Created {formatDate(listing.createdAt)} · {listing.category} ·{" "}
            {listing.condition}
          </p>
        </div>
        <div className="usl-head-actions">
          {editable && (
            <Link to={`/user-sell/${listing.id}/edit`} className="dn-btn">
              <Pencil size={15} />{" "}
              {status === "Draft" ? "Continue editing" : "Edit"}
            </Link>
          )}
          {status === "Live" && listing.marketId && (
            <Link
              to={`/user-marketplace/product/${listing.marketId}`}
              className="dn-btn dn-btn--ghost"
            >
              <ExternalLink size={15} /> View live
            </Link>
          )}
          {status === "Withdrawn" && (
            <button
              type="button"
              className="dn-btn dn-btn--ghost"
              onClick={() => {
                relistListing(listing.id);
                show("Listing is live on the marketplace again.");
              }}
            >
              <RotateCcw size={15} /> Relist
            </button>
          )}
          {status === "Live" && (
            <button
              type="button"
              className="dn-btn dn-btn--danger"
              onClick={() => setConfirm("withdraw")}
            >
              <Ban size={15} /> Withdraw
            </button>
          )}
          {["Draft", "Withdrawn"].includes(status) && (
            <button
              type="button"
              className="dn-btn dn-btn--danger"
              onClick={() => setConfirm("delete")}
            >
              <Trash2 size={15} /> Delete
            </button>
          )}
        </div>
      </header>
      {listing.adminDisabled && (
        <div className="dn-banner dn-banner--bad usl-banner" role="alert">
          <AlertTriangle size={20} />
          <div>
            <strong>ReOrbit turned this listing off</strong>
            {listing.adminDisabled.reason} Buyers can't see it until the team turns it back on.{" "}
            <Link to="/user-help/contact" className="dn-link">
              Contact support →
            </Link>
          </div>
        </div>
      )}
      {listing.suggestedPrice != null && ["Live", "Draft"].includes(status) && listing.suggestedPrice !== listing.price && (
        <div className="dn-banner dn-banner--warn usl-banner">
          <Tag size={20} />
          <div>
            <strong>ReOrbit suggests {formatPrice(listing.suggestedPrice)}</strong>
            {listing.suggestedMessage || "Our team thinks this price will help it sell."}{" "}
            <Link to={`/user-sell/${listing.id}/edit`} className="dn-link">
              Change the price →
            </Link>
          </div>
        </div>
      )}
      {status === "Live" && (
        <div className="dn-banner usl-banner">
          <CheckCircle2 size={20} />
          <div>
            <strong>Your listing is live</strong>Buyers can find and order it
            now. You'll be notified when someone buys it.
          </div>
        </div>
      )}
      {status === "Reserved" && sale && (
        <div className="dn-banner usl-banner">
          <Truck size={20} />
          <div>
            <strong>A buyer ordered this item</strong>Pack it and mark it
            shipped.{" "}
            <Link to={`/user-sell/sales/${sale.id}`} className="dn-link">
              Open sale {sale.id} →
            </Link>
          </div>
        </div>
      )}
      {status === "Sold" && (
        <div className="dn-banner usl-banner">
          <Wallet size={20} />
          <div>
            <strong>Sold and delivered</strong>
            {sale ? (
              <>
                Your payout is {sale.payout.status.toLowerCase()}.{" "}
                <Link to={`/user-sell/sales/${sale.id}`} className="dn-link">
                  View sale {sale.id} →
                </Link>
              </>
            ) : (
              "Great job."
            )}
          </div>
        </div>
      )}
      {status === "Withdrawn" && (
        <div className="dn-banner dn-banner--warn usl-banner">
          <Info size={20} />
          <div>
            <strong>Removed from the marketplace</strong>Relist it any time. It
            will be published again.
          </div>
        </div>
      )}

      <div className="usl-layout">
        <div className="usl-main">
          <section className="dn-card usl-gallery">
            <div className="usl-gallery-main">
              <SafeImage src={listing.images[photo]} alt={listing.title} />
            </div>
            {listing.images.length > 1 && (
              <div className="usl-thumbs">
                {listing.images.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    className={i === photo ? "on" : ""}
                    onClick={() => setPhoto(i)}
                    aria-label={`Photo ${i + 1}`}
                  >
                    <SafeImage src={src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="dn-card dn-card-pad">
            <div className="dn-card-head">
              <h2>Item details</h2>
              <span className="dn-chip">{listing.category}</span>
            </div>
            <p className="usl-desc">{listing.description}</p>
            <dl className="usl-facts">
              <div>
                <dt>Condition</dt>
                <dd>{listing.condition}</dd>
              </div>
              <div>
                <dt>Quantity</dt>
                <dd>{listing.quantity}</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>{formatPrice(listing.price)}</dd>
              </div>
              <div>
                <dt>
                  <MapPin size={13} /> Pickup from
                </dt>
                <dd>
                  {listing.city} {listing.pincode}
                </dd>
              </div>
              <div className="wide">
                <dt>Handover</dt>
                <dd>{pickup?.label}</dd>
              </div>
            </dl>
          </section>

          <section className="dn-card dn-card-pad">
            <div className="dn-card-head">
              <div>
                <h2>Activity</h2>
                <small>Every update on this listing</small>
              </div>
            </div>
            <DonationTimeline events={listing.events} />
          </section>
        </div>

        <aside className="usl-side">
          <section className="dn-card dn-card-pad">
            <div className="dn-card-head">
              <h3>Performance</h3>
            </div>
            <div className="usl-perf">
              <div>
                <Eye size={17} />
                <strong>{listing.views}</strong>
                <span>Views</span>
              </div>
              <div>
                <Heart size={17} />
                <strong>{listing.likes}</strong>
                <span>Saves</span>
              </div>
              <div>
                <CalendarDays size={17} />
                <strong>
                  {Math.max(
                    1,
                    Math.round(
                      (Date.now() - new Date(listing.createdAt)) / 86400000,
                    ),
                  )}
                </strong>
                <span>Days listed</span>
              </div>
            </div>
            <p className="dn-hint" style={{ marginTop: 12 }}>
              {meta.blurb}
            </p>
          </section>

          <EarningsPreview
            price={listing.price}
            pickup={listing.pickup}
            qty={listing.quantity}
          />

          {sale && (
            <section className="dn-card dn-card-pad">
              <div className="dn-card-head">
                <h3>Sale</h3>
              </div>
              <p className="usl-saleline">
                <b>{sale.id}</b> · {sale.buyer.name}, {sale.buyer.city}
              </p>
              <Link
                to={`/user-sell/sales/${sale.id}`}
                className="dn-btn dn-btn--soft dn-btn--sm dn-btn--block"
              >
                Open sale
              </Link>
            </section>
          )}

          <section className="dn-card dn-card-pad usl-help">
            <Info size={20} />
            <div>
              <strong>Questions about this listing?</strong>
              <p>Read how selling and payouts work.</p>
              <Link to="/user-help" className="dn-link">
                Help &amp; FAQ →
              </Link>
            </div>
          </section>
          <p className="dn-hint">
            Last update{" "}
            {formatDateTime(listing.events[listing.events.length - 1].at)}
          </p>
        </aside>
      </div>

      {confirm === "withdraw" && (
        <ConfirmModal
          icon={Ban}
          title="Withdraw this listing?"
          confirmLabel="Withdraw"
          cancelLabel="Keep it live"
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            withdrawListing(listing.id);
            setConfirm(null);
            show("Listing withdrawn.");
          }}
        >
          <p>
            {listing.title} will be removed from the marketplace. You can relist
            it later.
          </p>
        </ConfirmModal>
      )}
      {confirm === "delete" && (
        <ConfirmModal
          icon={Trash2}
          title="Delete this listing?"
          confirmLabel="Delete"
          cancelLabel="Keep it"
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            deleteListing(listing.id);
            navigate("/user-sell", { replace: true });
          }}
        >
          <p>This permanently removes {listing.id}. It can't be undone.</p>
        </ConfirmModal>
      )}

      {toast}
    </div>
  );
}
