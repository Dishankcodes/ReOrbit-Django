import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  ChevronRight,
  CircleCheck,
  ExternalLink,
  Flag,
  Mail,
  MapPin,
  PackageX,
  ShoppingBag,
  Tag,
  X,
} from "lucide-react";

import { BackLink } from "../../../shared/backNav";
import { adminOrdersApi } from "../../../api/orders";
import {
  fetchAdminListing,
  moderateListing,
  suggestListingPrice,
} from "../../../api/listings";
import { useAccess } from "../../data/teamStore";
import {
  ITEM_STATUS_LABEL,
  LISTING_ACTIONS,
} from "../../data/listingModeration";
import {
  formatDate,
  formatDateTime,
  formatINR,
  timeAgo,
} from "../../utils/format";
import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import { ACTION_ICONS } from "../../components/ui/actionIcons";
import useToast from "../../components/ui/useToast";
import { SkeletonRows } from "../../../shared/components/Skeleton";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/users/AdminUserProfile.css";
import "../../css/remakers/AdminRemakers.css";
import "../../css/products/AdminProducts.css";

const PICKUP = {
  Seller_Handover: "Seller hands over",
  Platform_Pickup: "Platform pickup",
};

function Fact({ label, children }) {
  return (
    <div className="aup-detail">
      <dt>{label}</dt>
      <dd>{children || "—"}</dd>
    </div>
  );
}

/* A member listing (LST-…): flag, disable or enable it, and suggest a price.
   Everything is saved on the server, so the marketplace and the seller see it too. */
export default function AdminListingDetailLive() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { can } = useAccess();
  const canEdit = can("products", "edit");
  const { toast, toastNode } = useToast();

  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [orders, setOrders] = useState(null);
  const [shot, setShot] = useState(0);
  const [pending, setPending] = useState(null);
  const [suggesting, setSuggesting] = useState(false);
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setError("");
    setMissing(false);
    fetchAdminListing(productId)
      .then(setP)
      .catch((e) =>
        e.status === 404
          ? setMissing(true)
          : setError(e.message || "Could not load this listing."),
      );
    adminOrdersApi
      .list(`?item=${encodeURIComponent(productId)}&page_size=50`)
      .then((d) => setOrders(d.results))
      .catch(() => setOrders([]));
  }, [productId]);

  useEffect(() => {
    setP(null);
    setShot(0);
    load();
    window.scrollTo({ top: 0 });
  }, [load]);

  const confirm = async (reason) => {
    const { action } = pending;
    setPending(null);
    try {
      setP(await moderateListing(p.id, action.status, reason));
      toast(`“${p.title}” ${action.toast}.`);
    } catch (e) {
      toast(e.message || "Could not update the listing.");
    }
  };

  const openSuggest = () => {
    setPrice(String(p.suggested_price ?? p.listing_price ?? ""));
    setMessage(p.suggested_note || "");
    setSuggesting(true);
  };
  const saveSuggestion = async (event) => {
    event.preventDefault();
    const amount = Number(price);
    if (!Number.isInteger(amount) || amount <= 0) {
      toast("Enter a whole-rupee price greater than zero.");
      return;
    }
    setSaving(true);
    try {
      setP(await suggestListingPrice(p.id, amount, message.trim()));
      toast("The price suggestion was sent to the seller.");
      setSuggesting(false);
    } catch (e) {
      toast(
        e.errors?.price?.[0] ||
          e.message ||
          "Could not save the price suggestion.",
      );
    } finally {
      setSaving(false);
    }
  };

  const back = (
    <BackLink
      to="/admin-products?tab=members"
      className="aup-back"
      icon={<ArrowLeft size={15} />}
      label="Products"
    />
  );

  if (missing) {
    return (
      <div className="aup-page">
        <section className="aup-card">
          <EmptyState
            icon={PackageX}
            title="Listing not found"
            text="This listing does not exist or the link is wrong."
            action={
              <button
                type="button"
                className="ad-btn ad-btn-primary ad-btn-sm"
                onClick={() => navigate("/admin-products?tab=members")}
              >
                <ArrowLeft size={14} /> Back to products
              </button>
            }
          />
        </section>
      </div>
    );
  }
  if (error) {
    return (
      <div className="aup-page">
        <section className="aup-card">
          <ErrorState text={error} onRetry={load} />
        </section>
      </div>
    );
  }
  if (!p) {
    return (
      <div className="aup-page">
        <section className="aup-card">
          <SkeletonRows count={6} />
        </section>
      </div>
    );
  }

  const mod = p.moderation_status;
  const images = p.images || [];
  const main = images[shot]?.url;
  const seller = p.seller;
  const sold = (orders || []).filter(
    (o) => !["Cancelled", "Returned_To_Origin"].includes(o.status),
  );
  const actions = !canEdit
    ? []
    : mod === "Disabled"
      ? [LISTING_ACTIONS.enable]
      : mod === "Flagged"
        ? [LISTING_ACTIONS.enable, LISTING_ACTIONS.disable]
        : [LISTING_ACTIONS.flag, LISTING_ACTIONS.disable];
  const timeline = [
    { id: "made", label: "Listing created", at: p.created_at, tone: "good" },
    ...(p.moderated_at && mod !== "Normal"
      ? [
          {
            id: "mod",
            label: mod === "Disabled" ? "Disabled by admin" : "Flagged by admin",
            detail: p.moderation_note,
            at: p.moderated_at,
            tone: "bad",
          },
        ]
      : []),
    ...(p.suggested_at && p.suggested_price != null
      ? [
          {
            id: "price",
            label: `Suggested ${formatINR(Number(p.suggested_price))}`,
            detail: `${p.suggestion_status}${p.suggested_note ? ` · ${p.suggested_note}` : ""}`,
            at: p.suggested_at,
            tone: "good",
          },
        ]
      : []),
    ...(p.updated_at && p.updated_at !== p.created_at
      ? [{ id: "edit", label: "Last updated", at: p.updated_at, tone: "good" }]
      : []),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));

  return (
    <div className="aup-page">
      <nav className="aup-crumbs" aria-label="Breadcrumb">
        {back}
        <ChevronRight size={14} />
        <span aria-current="page">{p.title}</span>
      </nav>

      {mod === "Disabled" && (
        <div className="aup-notice tone-deleted" role="status">
          <strong>This listing is disabled.</strong>
          <span>Reason: {p.moderation_note || "No reason provided."}</span>
        </div>
      )}
      {mod === "Flagged" && (
        <div className="aup-notice" role="status">
          <strong>This listing is flagged.</strong>
          <span>Reason: {p.moderation_note || "No reason provided."}</span>
        </div>
      )}

      <div className="apd-top">
        <section className="aup-card apd-gallery" aria-label="Photos">
          <div className="apd-main">
            {main ? (
              <img src={main} alt={p.title} />
            ) : (
              <span className="apr-noimg" style={{ width: "100%", height: "100%" }} />
            )}
          </div>
          {images.length > 1 && (
            <div className="apd-thumbs">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  className={shot === i ? "active" : ""}
                  onClick={() => setShot(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-pressed={shot === i}
                >
                  <img src={img.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="aup-card apd-info">
          <div className="apd-badges">
            <span className="ap-type item">Member listing</span>
            {mod !== "Normal" ? (
              <StatusBadge status={mod} />
            ) : (
              <StatusBadge
                status={p.item_status === "Listed" ? "Live" : p.item_status}
              />
            )}
          </div>
          <h2>{p.title}</h2>
          <p className="apd-id">
            <span className="aup-mono">{p.id}</span> · {p.category?.name}
          </p>

          <div className="apd-price">
            <strong>
              {p.listing_price != null ? formatINR(Number(p.listing_price)) : "—"}
            </strong>
            <span>listing price</span>
          </div>
          {p.suggestion_status && p.suggested_price != null && (
            <p className="aup-muted-note" style={{ marginTop: 8 }}>
              Suggested price:{" "}
              <strong>{formatINR(Number(p.suggested_price))}</strong>
              {" · "}
              {p.suggestion_status === "Pending"
                ? "waiting for the seller"
                : p.suggestion_status === "Accepted"
                  ? "accepted by the seller"
                  : "declined by the seller"}
              {p.suggested_note ? ` · ${p.suggested_note}` : ""}
            </p>
          )}

          <dl className="apd-facts">
            <Fact label="Category">{p.category?.name}</Fact>
            <Fact label="Quantity">{p.quantity}</Fact>
            <Fact label="Condition">{p.condition}</Fact>
            <Fact label="Pickup">{PICKUP[p.pickup_preference]}</Fact>
            <Fact label="Lifecycle">
              {ITEM_STATUS_LABEL[p.item_status] || p.item_status}
            </Fact>
            <Fact label="Location">
              {[p.city, p.pincode].filter(Boolean).join(" ")}
            </Fact>
            <Fact label="Posted on">{formatDateTime(p.created_at)}</Fact>
            <Fact label="Posted">{timeAgo(p.created_at)}</Fact>
          </dl>

          <p className="apd-desc">{p.description}</p>

          {canEdit && (
            <div className="apd-actions">
              {actions.map((a) => {
                const Icon = ACTION_ICONS[a.icon];
                return (
                  <button
                    key={a.key}
                    type="button"
                    className={`ad-btn ad-btn-${a.tone === "positive" ? "primary" : a.tone === "warning" ? "ghost" : a.tone}`}
                    onClick={() => setPending(a)}
                  >
                    <Icon size={15} /> {a.label}
                  </button>
                );
              })}
              {!["Sold", "Donated"].includes(p.item_status) && (
                <button
                  type="button"
                  className="ad-btn ad-btn-primary"
                  onClick={openSuggest}
                >
                  <Tag size={15} /> Suggest a new price
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="aup-grid-2">
        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Orders</h3>
                <p>Sales of this listing.</p>
              </div>
            </header>
            {orders === null ? (
              <SkeletonRows count={2} />
            ) : orders.length === 0 ? (
              <p className="aup-muted-note">No orders for this listing yet.</p>
            ) : (
              <ul className="aup-list">
                {orders.map((o) => (
                  <li key={o.id} className="aup-list-row">
                    <div className="aup-list-main">
                      <strong>
                        <Link to={`/admin-orders/${o.id}`} className="aup-mono">
                          {o.id}
                        </Link>
                      </strong>
                      <span>
                        {formatDate(o.created_at)} ·{" "}
                        {String(o.payment?.method || "").replace("_", " ")}
                      </span>
                    </div>
                    <div className="aup-list-end">
                      <strong>{formatINR(o.total)}</strong>
                      <StatusBadge status={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="aup-stack">
          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Posted by</h3>
                <p>Who listed this and when.</p>
              </div>
            </header>
            <div className="apd-owner">
              <UserAvatar name={seller.name} size={56} rounded="16px" />
              <div>
                <strong>{seller.name}</strong>
                <span>
                  <span className="ap-role">User</span>
                </span>
              </div>
            </div>
            <dl className="apd-owner-rows">
              <Fact label="Email">
                <Mail size={13} style={{ verticalAlign: -2 }} /> {seller.email}
              </Fact>
              <Fact label="Location">
                <MapPin size={13} style={{ verticalAlign: -2 }} />{" "}
                {seller.city || p.city}
              </Fact>
              <Fact label="Member since">{formatDate(seller.since)}</Fact>
              <Fact label="Account status">
                <StatusBadge status={seller.status} />
              </Fact>
            </dl>
            {seller.status !== "Active" && (
              <p className="apd-warn">
                <AlertTriangle size={15} /> This account is{" "}
                {String(seller.status).toLowerCase()}. Review the account
                before relisting anything.
              </p>
            )}
            <Link
              to={`/admin-users/${seller.id}`}
              className="ad-btn ad-btn-ghost"
              style={{ width: "100%" }}
            >
              <ExternalLink size={15} /> View user profile
            </Link>
          </section>

          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Engagement</h3>
                <p>How buyers are responding.</p>
              </div>
            </header>
            <div className="apd-metrics">
              <div>
                <small>
                  <ShoppingBag size={13} /> Orders
                </small>
                <strong>{orders === null ? "…" : sold.length}</strong>
              </div>
            </div>
          </section>

          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Listing timeline</h3>
                <p>From posting to today.</p>
              </div>
            </header>
            <ol className="apd-tl">
              {timeline.map((e) => (
                <li key={e.id}>
                  <i className={`apd-dot ${e.tone}`} />
                  <div>
                    <strong>{e.label}</strong>
                    {e.detail && <p>{e.detail}</p>}
                    <time>{formatDateTime(e.at)}</time>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {suggesting && (
        <div
          className="ad-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSuggesting(false);
          }}
        >
          <form
            className="ad-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="apd-suggest-price-title"
            onSubmit={saveSuggestion}
          >
            <button
              type="button"
              className="ad-modal-close"
              onClick={() => setSuggesting(false)}
              aria-label="Close"
            >
              <X size={16} />
            </button>
            <div className="ad-modal-icon tone-positive">
              <Tag size={22} />
            </div>
            <h3 id="apd-suggest-price-title">Suggest a new price</h3>
            <p className="ad-modal-text">
              Suggest a revised price for “{p.title}”. The listing price only
              changes if the seller accepts.
            </p>
            <div className="ad-modal-targets">
              <span>
                Current price:{" "}
                {p.listing_price != null ? formatINR(Number(p.listing_price)) : "—"}
              </span>
            </div>
            <label className="ad-modal-field">
              <span>Suggested price (₹)</span>
              <input
                type="number"
                min="1"
                step="1"
                required
                autoFocus
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="Enter suggested price"
              />
            </label>
            <label className="ad-modal-field">
              <span>Message to the seller (optional)</span>
              <textarea
                rows={3}
                maxLength={300}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Explain why you recommend this price..."
              />
            </label>
            <div className="ad-modal-actions">
              <button
                type="button"
                className="ad-btn ad-btn-ghost"
                onClick={() => setSuggesting(false)}
              >
                Cancel
              </button>
              <button type="submit" className="ad-btn ad-btn-primary" disabled={saving}>
                Send suggestion
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmActionModal
        action={pending}
        targets={[p.title]}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      />
      {toastNode}
    </div>
  );
}
