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
} from "lucide-react";

import { useProduct, runProductAction } from "../../data/productsStore";
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
  const actions = getProductActions(p);
  const isItem = p.type === "item";
  const ownerBad = p.owner.status !== "Active";

  const confirmAction = (reason) => {
    runProductAction(p, pending, reason);
    toast(`“${p.title}” ${pending.toast}.`);
    setPending(null);
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

      {p.state === "pending" && (
        <div className="aup-notice tone-suspended" role="status">
          <strong>This item is waiting for review.</strong>
          <span>
            Check the photos and condition, then verify it to go live or reject
            it with a message.
          </span>
        </div>
      )}
      {p.state === "rejected" && (
        <div className="aup-notice tone-blocked" role="status">
          <strong>This item was rejected.</strong>
          {p.rejection_message && (
            <span>Message to owner: “{p.rejection_message}”</span>
          )}
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
            <ProductStatus product={p} />
            {isItem && p.verification === "Verified" && (
              <StatusBadge status="Verified" />
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
