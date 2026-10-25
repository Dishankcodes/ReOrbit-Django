import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  ArrowLeft,
  PackageX,
  Eye,
  Heart,
  ShoppingBag,
  ExternalLink,
  AlertTriangle,
  Flag,
  Star,
  Link2,
  MapPin,
  CalendarDays,
  Mail,
  Ban,
  Tag,
  X,
  CircleCheck,
} from "lucide-react";

import { useProduct, runProductAction } from "../../data/productsStore";
import { updateUserItem } from "../../data/usersStore";
import { updateRemakerProduct } from "../../data/remakersStore";
import { getProductActions } from "../../data/productActions";
import {
  formatDate,
  formatDateTime,
  formatINR,
  timeAgo,
} from "../../utils/format";

import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import { ACTION_ICONS } from "../../components/ui/actionIcons";
import useToast from "../../components/ui/useToast";
import ProductStatus from "./components/ProductStatus";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/users/AdminUserProfile.css";
import "../../css/remakers/AdminRemakers.css";
import "../../css/products/AdminProducts.css";

/* The dummy data has one photo per listing, so the extra thumbnails are
   different crops of it. With a backend these become Item_Images rows. */
const CROPS = [
  { transform: "scale(1)", transformOrigin: "50% 50%" },
  { transform: "scale(1.7)", transformOrigin: "25% 30%" },
  { transform: "scale(1.7)", transformOrigin: "78% 35%" },
  { transform: "scale(1.7)", transformOrigin: "50% 85%" },
];

function Fact({ label, children }) {
  return (
    <div className="aup-detail">
      <dt>{label}</dt>
      <dd>{children || "—"}</dd>
    </div>
  );
}

function Stars({ value }) {
  return (
    <span className="aup-stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={n <= value ? "on" : ""}
          fill={n <= value ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

export default function AdminProductDetails() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const product = useProduct(productId);
  const { toast, toastNode } = useToast();
  const [shot, setShot] = useState(0);
  const [pending, setPending] = useState(null);
  const [suggestingPrice, setSuggestingPrice] = useState(false);
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [priceMessage, setPriceMessage] = useState("");

  useEffect(() => {
    setShot(0);
    window.scrollTo({ top: 0 });
  }, [productId]);

  if (!product) {
    return (
      <div className="aup-page">
        <section className="aup-card">
          <EmptyState
            icon={PackageX}
            title="Listing not found"
            text="This product does not exist or the link is wrong."
            action={
              <button
                type="button"
                className="ad-btn ad-btn-primary ad-btn-sm"
                onClick={() => navigate("/admin-products")}
              >
                <ArrowLeft size={14} /> Back to products
              </button>
            }
          />
        </section>
      </div>
    );
  }

  const p = product;
  const isItem = p.type === "item";
  const isRemakerProduct = !isItem && p.owner.role === "ReMaker";
  // Community items are submitted directly. ReMaker products retain their
  // existing marketplace actions as well as the new disable/price actions.
  // Hide rejection actions from this details page. Disabling is handled by the
  // dedicated listing control below, and disabled listings can be reactivated.
  const actions = isItem
    ? []
    : getProductActions(p).filter(
        (action) =>
          !/reject/i.test(
            `${action.key || ""} ${action.label || ""} ${action.short || ""}`,
          ),
      );
  const ownerBad = p.owner.status !== "Active";
  const disableActionKey = isItem ? "disable-item" : "disable-remaker-product";

  const reactivateListing = () => {
    const updates = {
      is_disabled: false,
      disabled_reason: "",
      disabled_at: null,
      reactivated_at: new Date().toISOString(),
    };
    const saved = isItem
      ? updateUserItem(p.owner.id, p.id, updates)
      : updateRemakerProduct(p.owner.id, p.id, updates);

    if (saved === false) {
      toast("Could not reactivate this listing. Please refresh and try again.");
      return;
    }
    toast(`“${p.title}” is active again.`);
  };

  const confirmAction = (reason) => {
    if (!pending) return;

    if (
      pending.key === "disable-item" ||
      pending.key === "disable-remaker-product"
    ) {
      const cleanReason = String(reason || "").trim();
      if (!cleanReason) {
        toast("A reason is required to disable this listing.");
        return;
      }

      const updates = {
        is_disabled: true,
        disabled_reason: cleanReason,
        disabled_at: new Date().toISOString(),
      };

      const saved =
        pending.key === "disable-item"
          ? updateUserItem(p.owner.id, p.id, updates)
          : updateRemakerProduct(p.owner.id, p.id, updates);

      if (saved === false) {
        toast("Could not update this listing. Please refresh and try again.");
        return;
      }

      toast(`“${p.title}” has been disabled.`);
    } else {
      runProductAction(p, pending, reason);
      toast(`“${p.title}” ${pending.toast}.`);
    }

    setPending(null);
  };

  const saveSuggestedPrice = (event) => {
    event.preventDefault();
    const amount = Number(suggestedPrice);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast("Enter a valid suggested price greater than zero.");
      return;
    }

    const updates = {
      suggested_price: amount,
      suggested_price_message: priceMessage.trim(),
      suggested_price_at: new Date().toISOString(),
    };

    const saved = isRemakerProduct
      ? updateRemakerProduct(p.owner.id, p.id, updates)
      : updateUserItem(p.owner.id, p.id, updates);

    if (saved === false) {
      toast(
        "Could not save the price suggestion. Please refresh and try again.",
      );
      return;
    }

    toast(`Suggested price saved for “${p.title}”.`);
    setSuggestingPrice(false);
  };

  return (
    <div className="aup-page">
      <nav className="aup-crumbs" aria-label="Breadcrumb">
        <Link to="/admin-products" className="aup-back">
          <ArrowLeft size={15} /> Products
        </Link>
        <ChevronRight size={14} />
        <span aria-current="page">{p.title}</span>
      </nav>

      {(isItem || isRemakerProduct) && p.is_disabled && (
        <div className="aup-notice tone-deleted" role="status">
          <strong>This listing is disabled.</strong>
          <span>Reason: {p.disabled_reason || "No reason provided."}</span>
        </div>
      )}
      {!isItem && p.rawStatus === "Inactive" && (
        <div className="aup-notice tone-deleted" role="status">
          <strong>This product is off the marketplace.</strong>
          <span>It is hidden from buyers until it is reactivated.</span>
        </div>
      )}

      <div className="apd-top">
        <section className="aup-card apd-gallery" aria-label="Photos">
          <div className="apd-main">
            <img src={p.image} alt={p.title} style={CROPS[shot]} />
          </div>
          <div className="apd-thumbs">
            {CROPS.map((crop, i) => (
              <button
                key={i}
                type="button"
                className={shot === i ? "active" : ""}
                onClick={() => setShot(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-pressed={shot === i}
              >
                <img src={p.image} alt="" style={crop} />
              </button>
            ))}
          </div>
        </section>

        <section className="aup-card apd-info">
          <div className="apd-badges">
            <span className={`ap-type ${p.type}`}>{p.typeLabel}</span>
            {p.is_disabled ? (
              <StatusBadge status="Disabled" />
            ) : (
              <ProductStatus product={p} />
            )}
          </div>
          <h2>{p.title}</h2>
          <p className="apd-id">
            <span className="aup-mono">{p.id}</span> · {p.category}
          </p>

          <div className="apd-price">
            <strong>{formatINR(p.price)}</strong>
            <span>{isItem ? "estimated price" : "listing price"}</span>
          </div>
          {(isItem || isRemakerProduct) && p.suggested_price != null && (
            <p className="aup-muted-note" style={{ marginTop: 8 }}>
              Suggested price: <strong>{formatINR(p.suggested_price)}</strong>
              {p.suggested_price_message
                ? ` · ${p.suggested_price_message}`
                : ""}
            </p>
          )}

          <dl className="apd-facts">
            <Fact label="Category">{p.category}</Fact>
            <Fact label={isItem ? "Quantity" : "Stock"}>
              {isItem
                ? p.quantity
                : p.quantity === 0
                  ? "Out of stock"
                  : `${p.quantity} available`}
            </Fact>
            {isItem ? (
              <>
                <Fact label="Condition">{p.condition}</Fact>
                <Fact label="Pickup">{p.pickup}</Fact>
              </>
            ) : (
              <>
                <Fact label="Material source">
                  {p.source_item ? (
                    <span>
                      <Link2 size={13} style={{ verticalAlign: -2 }} /> Upcycled
                      from {p.source_item}
                    </span>
                  ) : (
                    "ReMaker’s own material"
                  )}
                </Fact>
                <Fact label="Listing status">
                  {p.rawStatus.replace("_", " ")}
                </Fact>
              </>
            )}
            <Fact label="Posted on">{formatDateTime(p.posted_at)}</Fact>
            <Fact label="Posted">{timeAgo(p.posted_at)}</Fact>
          </dl>

          <p className="apd-desc">{p.description}</p>

          {(isItem || isRemakerProduct) && (
            <div className="apd-actions">
              {p.is_disabled ? (
                <button
                  type="button"
                  className="ad-btn ad-btn-primary"
                  onClick={reactivateListing}
                >
                  <CircleCheck size={15} /> Active again
                </button>
              ) : (
                <button
                  type="button"
                  className="ad-btn ad-btn-danger"
                  onClick={() =>
                    setPending({
                      key: disableActionKey,
                      tone: "danger",
                      icon: "ban",
                      needsReason: true,
                      title: isItem
                        ? "Disable this item?"
                        : "Disable this product?",
                      body: "This listing will be marked as disabled in the admin panel. Provide a reason for this action.",
                      confirmLabel: isItem ? "Disable item" : "Disable product",
                      placeholder:
                        "Explain why this listing should be disabled...",
                      reasonHint: "required",
                    })
                  }
                >
                  <Ban size={15} /> Disable this listing
                </button>
              )}
              <button
                type="button"
                className="ad-btn ad-btn-primary"
                onClick={() => {
                  setSuggestedPrice(String(p.suggested_price ?? p.price ?? ""));
                  setPriceMessage(p.suggested_price_message || "");
                  setSuggestingPrice(true);
                }}
              >
                <Tag size={15} /> Suggest a new price
              </button>
            </div>
          )}

          {actions.length > 0 && (
            <div className="apd-actions">
              {actions.map((a) => {
                const Icon = ACTION_ICONS[a.icon];
                return (
                  <button
                    key={a.key}
                    type="button"
                    className={`ad-btn ad-btn-${a.tone === "positive" ? "primary" : a.tone}`}
                    onClick={() => setPending(a)}
                  >
                    <Icon size={15} /> {a.label}
                  </button>
                );
              })}
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
            {p.orders.length === 0 ? (
              <p className="aup-muted-note">No orders for this listing yet.</p>
            ) : (
              <ul className="aup-list">
                {p.orders.map((o) => (
                  <li key={o.order_id} className="aup-list-row">
                    <div className="aup-list-main">
                      <strong>
                        <span className="aup-mono">{o.order_id}</span>
                      </strong>
                      <span>
                        Sold to {o.counterparty} · {formatDate(o.order_date)} ·{" "}
                        {o.payment_method.replace("_", " ")}
                      </span>
                    </div>
                    <div className="aup-list-end">
                      <strong>{formatINR(o.amount)}</strong>
                      <StatusBadge status={o.order_status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Reviews</h3>
                <p>
                  {isItem
                    ? "Reviews apply to ReMaker products."
                    : "What buyers said about this product."}
                </p>
              </div>
            </header>
            {p.reviews.length === 0 ? (
              <p className="aup-muted-note">
                {isItem
                  ? "Community items are not reviewed."
                  : "No reviews for this product yet."}
              </p>
            ) : (
              <ul className="aup-reviews">
                {p.reviews.map((r) => (
                  <li key={r.review_id}>
                    <div className="aup-review-head">
                      <div>
                        <strong>{r.reviewer}</strong>
                        <span>{formatDate(r.created_at)}</span>
                      </div>
                      <Stars value={r.rating} />
                    </div>
                    <p>{r.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="aup-card">
            <header className="aup-card-head">
              <div>
                <h3>Reports</h3>
                <p>Reports raised about this listing.</p>
              </div>
            </header>
            {p.reports.length === 0 ? (
              <p className="aup-muted-note">
                No reports. Nobody has flagged this listing.
              </p>
            ) : (
              <ul className="aup-list">
                {p.reports.map((r) => (
                  <li key={r.id} className="aup-list-row aup-report">
                    <span className="aup-report-icon against">
                      <Flag size={16} />
                    </span>
                    <div className="aup-list-main">
                      <strong>{r.reason}</strong>
                      <small>
                        <span className="aup-mono">{r.id}</span> · reported by{" "}
                        {r.by} · {formatDate(r.at)}
                      </small>
                    </div>
                    <div className="aup-list-end">
                      <StatusBadge status={r.status} />
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
              <UserAvatar
                name={p.owner.name}
                src={p.owner.image}
                size={56}
                rounded="16px"
              />
              <div>
                <strong>{p.owner.name}</strong>
                {p.owner.handle && <span>“{p.owner.handle}”</span>}
                <span>
                  <span
                    className={`ap-role ${p.owner.role === "ReMaker" ? "rm" : ""}`}
                  >
                    {p.owner.role}
                  </span>
                </span>
              </div>
            </div>
            <dl className="apd-owner-rows">
              <Fact label="Email">
                <Mail size={13} style={{ verticalAlign: -2 }} /> {p.owner.email}
              </Fact>
              <Fact label="Location">
                <MapPin size={13} style={{ verticalAlign: -2 }} />{" "}
                {p.owner.city}
              </Fact>
              <Fact label="Member since">
                <CalendarDays size={13} style={{ verticalAlign: -2 }} />{" "}
                {formatDate(p.owner.since)}
              </Fact>
              <Fact label="Account status">
                <StatusBadge status={p.owner.status} />
              </Fact>
              <Fact label="Posted this listing">
                {formatDateTime(p.posted_at)}
              </Fact>
            </dl>
            {ownerBad && (
              <p className="apd-warn">
                <AlertTriangle size={15} /> This account is{" "}
                {p.owner.status.toLowerCase()}. Review the account before
                relisting anything.
              </p>
            )}
            <Link
              to={p.owner.path}
              className="ad-btn ad-btn-ghost"
              style={{ width: "100%" }}
            >
              <ExternalLink size={15} /> View{" "}
              {p.owner.role === "User" ? "user" : "ReMaker"} profile
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
                  <Eye size={13} /> Views
                </small>
                <strong>{p.views}</strong>
              </div>
              <div>
                <small>
                  <Heart size={13} /> Wishlisted
                </small>
                <strong>{p.wishlisted}</strong>
              </div>
              <div>
                <small>
                  <ShoppingBag size={13} /> Orders
                </small>
                <strong>{p.orders.length}</strong>
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
              {p.timeline.map((e) => (
                <li key={e.id}>
                  <i className={`apd-dot ${e.tone}`} />
                  <div>
                    <strong>{e.label}</strong>
                    <p>{e.detail}</p>
                    {!e.pending && <time>{formatDateTime(e.at)}</time>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {isRemakerProduct && (
        <section
          className="aup-card apd-warehouse-cta"
          style={{
            marginTop: 20,
            padding: "22px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
            border: "1px solid #cbded4",
            background: "linear-gradient(135deg, #f7fbf8 0%, #edf6f0 100%)",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 6px", color: "#173d2d" }}>
              Want to buy this for the ReOrbit warehouse?
            </h3>
            <p style={{ margin: 0, color: "#63756b" }}>
              Open this product in Admin Shop to review its shop details.
            </p>
          </div>
          <button
            type="button"
            className="ad-btn ad-btn-primary"
            onClick={() =>
              navigate(`/admin-shop/product/${encodeURIComponent(p.id)}`)
            }
          >
            View Admin Shop Details
            <ChevronRight size={16} />
          </button>
        </section>
      )}

      {suggestingPrice && (isItem || isRemakerProduct) && (
        <div
          className="ad-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSuggestingPrice(false);
          }}
        >
          <form
            className="ad-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="apd-suggest-price-title"
            onSubmit={saveSuggestedPrice}
          >
            <button
              type="button"
              className="ad-modal-close"
              onClick={() => setSuggestingPrice(false)}
              aria-label="Close"
            >
              <X size={16} />
            </button>
            <div className="ad-modal-icon tone-positive">
              <Tag size={22} />
            </div>
            <h3 id="apd-suggest-price-title">Suggest a new price</h3>
            <p className="ad-modal-text">
              Suggest a revised price for “{p.title}”. The current listing price
              will not be changed.
            </p>
            <div className="ad-modal-targets">
              <span>Current price: {formatINR(p.price)}</span>
            </div>
            <label className="ad-modal-field">
              <span>Suggested price (₹)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                autoFocus
                value={suggestedPrice}
                onChange={(event) => setSuggestedPrice(event.target.value)}
                placeholder="Enter suggested price"
              />
            </label>
            <label className="ad-modal-field">
              <span>
                Message to {isRemakerProduct ? "the ReMaker" : "owner"}{" "}
                (optional)
              </span>
              <textarea
                rows={3}
                value={priceMessage}
                onChange={(event) => setPriceMessage(event.target.value)}
                placeholder="Explain why you recommend this price..."
              />
            </label>
            <div className="ad-modal-actions">
              <button
                type="button"
                className="ad-btn ad-btn-ghost"
                onClick={() => setSuggestingPrice(false)}
              >
                Cancel
              </button>
              <button type="submit" className="ad-btn ad-btn-primary">
                Save suggestion
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmActionModal
        action={pending}
        targets={[p.title]}
        onConfirm={confirmAction}
        onClose={() => setPending(null)}
      />
      {toastNode}
    </div>
  );
}
