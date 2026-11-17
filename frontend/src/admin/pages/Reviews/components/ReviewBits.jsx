import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  CornerDownRight,
  ExternalLink,
  Eye,
  EyeOff,
  Flag,
  Image as ImageIcon,
  Package,
  Star,
  Store,
  X,
} from "lucide-react";

import { formatDateTime } from "../../../utils/format";

/* Shared by Admin › Reviews and the admin product / ReMaker pages, so a review looks and
   behaves the same everywhere: a clickable card, and a side panel with everything about it. */

export function Stars({ value, size = 14 }) {
  return (
    <span className="arv-stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= value ? "on" : ""}
          fill={n <= value ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

const roleOf = (p) =>
  p?.type === "remaker" ? "ReMaker" : p?.type === "admin" ? "ReOrbit team" : p?.type === "platform" ? "ReOrbit store" : "Member";

/* where an account opens in the admin */
export const accountPath = (p) =>
  !p?.id ? null : p.type === "remaker" ? `/admin-remakers/${p.id}` : p.type === "user" ? `/admin-users/${p.id}` : null;

const photoUrl = (p) => (typeof p === "string" ? p : p?.url || "");

export function ReviewCard({ review: r, onOpen }) {
  const pending = (r.reports || []).filter((x) => x.status === "Pending").length;
  const hidden = r.status === "Hidden";
  const isProduct = r.kind !== "seller";
  const title = r.title || (isProduct ? r.product?.title || "Product review" : `Review of ${r.seller?.name || "the seller"}`);
  return (
    <button
      type="button"
      className={`arv-card ${hidden ? "is-hidden" : ""} ${pending ? "is-reported" : ""}`}
      onClick={() => onOpen(r)}
      aria-label={`Open review ${r.id}`}
    >
      <span className="arv-card-media">
        {isProduct && r.product?.image ? (
          <img src={r.product.image} alt="" loading="lazy" />
        ) : isProduct ? (
          <Package size={26} />
        ) : (
          <span className="arv-avatar">{initials(r.seller?.name)}</span>
        )}
        {r.photos?.length > 0 && (
          <em className="arv-card-photos">
            <ImageIcon size={11} /> {r.photos.length}
          </em>
        )}
      </span>
      <span className="arv-card-body">
        <span className="arv-card-top">
          <Stars value={r.rating} size={13} />
          <span className="arv-card-badges">
            {hidden && <span className="arv-tag bad">Hidden</span>}
            {pending > 0 && (
              <span className="arv-tag warn">
                <Flag size={10} /> {pending}
              </span>
            )}
          </span>
        </span>
        <strong className="arv-card-title">{title}</strong>
        {isProduct && r.product?.title && r.title && <small className="arv-card-sub">{r.product.title}</small>}
        {r.body ? <span className="arv-card-text">{r.body}</span> : <span className="arv-card-text muted">No written comment.</span>}
        <span className="arv-card-foot">
          <span>
            by <b>{r.reviewer?.name || "—"}</b>
          </span>
          <span>
            <Store size={12} /> {r.seller?.name || "ReOrbit"}
          </span>
          <time>{formatDateTime(r.created_at)}</time>
        </span>
      </span>
    </button>
  );
}

export function ReviewDrawer({ review: r, canEdit, onClose, onAction }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!r) return null;
  const hidden = r.status === "Hidden";
  const isProduct = r.kind !== "seller";
  const sellerLink = accountPath(r.seller);
  const reviewerLink = accountPath(r.reviewer);

  return (
    <div className="arv-drawer-wrap" role="presentation" onClick={onClose}>
      <aside
        className="arv-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Review ${r.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="arv-drawer-head">
          <div>
            <span className="arv-tag">{isProduct ? "Product review" : "Seller review"}</span>
            {hidden && <span className="arv-tag bad">Hidden</span>}
            <small>
              {r.id} · {formatDateTime(r.created_at)}
              {r.edited_at ? " · edited" : ""}
            </small>
          </div>
          <button type="button" className="arv-x" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="arv-drawer-body">
          {isProduct && r.product && (
            <Link to={`/admin-products/${encodeURIComponent(r.product.ref)}`} className="arv-product">
              {r.product.image ? <img src={r.product.image} alt="" /> : <span><Package size={22} /></span>}
              <div>
                <strong>{r.product.title}</strong>
                <small>
                  {r.product.ref} <ExternalLink size={11} />
                </small>
              </div>
            </Link>
          )}

          <div className="arv-rating-row">
            <Stars value={r.rating} size={18} />
            <b>{r.rating}.0</b>
            {r.recommend === false && <span className="arv-tag warn">Would not recommend</span>}
            {r.recommend === true && isProduct && <span className="arv-tag good">Recommends</span>}
          </div>
          {r.title && <h3 className="arv-drawer-title">{r.title}</h3>}
          {r.body ? <p className="arv-body">{r.body}</p> : <p className="arv-body muted">No written comment.</p>}

          {r.aspects && Object.keys(r.aspects).length > 0 && (
            <dl className="arv-aspects">
              {Object.entries(r.aspects)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k.replace(/_/g, " ")}</dt>
                    <dd>
                      <Stars value={v} size={12} />
                    </dd>
                  </div>
                ))}
            </dl>
          )}
          {r.tags?.length > 0 && (
            <div className="arv-tags">
              {r.tags.map((t) => (
                <span key={t} className="arv-tag">
                  {t}
                </span>
              ))}
            </div>
          )}

          {r.photos?.length > 0 && (
            <div className="arv-photos">
              {r.photos.map((p, i) => (
                <a key={i} href={photoUrl(p)} target="_blank" rel="noreferrer">
                  <img src={photoUrl(p)} alt={`Photo ${i + 1}`} loading="lazy" />
                </a>
              ))}
            </div>
          )}

          <dl className="arv-meta">
            <div>
              <dt>Written by</dt>
              <dd>
                {reviewerLink ? <Link to={reviewerLink}>{r.reviewer?.name}</Link> : <b>{r.reviewer?.name}</b>}
                <small>
                  {roleOf(r.reviewer)}
                  {r.reviewer?.email ? ` · ${r.reviewer.email}` : ""}
                </small>
              </dd>
            </div>
            <div>
              <dt>Seller</dt>
              <dd>
                {sellerLink ? <Link to={sellerLink}>{r.seller?.name}</Link> : <b>{r.seller?.name || "ReOrbit"}</b>}
                <small>{roleOf(r.seller)}</small>
              </dd>
            </div>
            <div>
              <dt>Order</dt>
              <dd>
                <Link to={`/admin-orders/${encodeURIComponent(r.order_id)}`}>{r.order_id}</Link>
              </dd>
            </div>
          </dl>

          {r.reply && (r.reply.body || r.reply.text) && (
            <div className="arv-reply">
              <CornerDownRight size={14} />
              <div>
                <b>Seller reply</b>
                <p>{r.reply.body || r.reply.text}</p>
              </div>
            </div>
          )}

          {hidden && (
            <p className="arv-hidden-note">
              Hidden{r.hidden_by ? ` by ${r.hidden_by}` : ""}
              {r.hidden_at ? ` · ${formatDateTime(r.hidden_at)}` : ""}
              {r.hidden_reason ? ` — ${r.hidden_reason}` : ""}
            </p>
          )}

          {(r.reports || []).length > 0 && (
            <section>
              <h4 className="arv-section-title">Reports</h4>
              <ul className="arv-reports">
                {r.reports.map((rep) => (
                  <li key={rep.id} className={`st-${rep.status}`}>
                    <div>
                      <b>{rep.reason}</b>
                      <span className="arv-tag">{rep.status}</span>
                      <small>
                        {rep.reporter?.name} · {roleOf(rep.reporter)} · {formatDateTime(rep.created_at)}
                      </small>
                      {rep.note && <p>“{rep.note}”</p>}
                      {rep.status !== "Pending" && rep.resolution_note && (
                        <p className="arv-res">Decision: {rep.resolution_note}</p>
                      )}
                    </div>
                    {rep.status === "Pending" && onAction && (
                      <div className="arv-rep-actions">
                        <button
                          type="button"
                          className="ad-btn ad-btn-danger ad-btn-sm"
                          disabled={!canEdit}
                          onClick={() => onAction("uphold", r, rep)}
                        >
                          Uphold & hide
                        </button>
                        <button
                          type="button"
                          className="ad-btn ad-btn-ghost ad-btn-sm"
                          disabled={!canEdit}
                          onClick={() => onAction("dismiss", r, rep)}
                        >
                          <CheckCircle2 size={13} /> Dismiss
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {onAction && (
          <footer className="arv-drawer-foot">
            {hidden ? (
              <button
                type="button"
                className="ad-btn ad-btn-ghost"
                disabled={!canEdit}
                onClick={() => onAction("restore", r)}
              >
                <Eye size={15} /> Restore review
              </button>
            ) : (
              <button
                type="button"
                className="ad-btn ad-btn-danger"
                disabled={!canEdit}
                onClick={() => onAction("hide", r)}
              >
                <EyeOff size={15} /> Hide review
              </button>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}

/* The confirm dialogs every review action uses */
export const REVIEW_MODALS = {
  hide: {
    title: "Hide this review?",
    body: "It leaves public pages and no longer counts toward the rating. The reviewer is told why.",
    tone: "danger",
    icon: "hide",
    needsReason: true,
    reasonHint: "the reviewer will see this",
    placeholder: "e.g. Contains personal details or abusive language",
    confirmLabel: "Hide review",
  },
  restore: {
    title: "Restore this review?",
    body: "It goes back on public pages and counts toward the rating again.",
    tone: "positive",
    icon: "restore",
    confirmLabel: "Restore review",
  },
  uphold: {
    title: "Uphold this report and hide the review?",
    body: "Every open report on this review is settled and the reporters are told.",
    tone: "danger",
    icon: "hide",
    needsReason: true,
    reasonHint: "the reviewer and reporters will see this",
    placeholder: "e.g. Breaks the review rules: abusive language",
    confirmLabel: "Uphold & hide",
  },
  dismiss: {
    title: "Dismiss this report?",
    body: "The review stays up. The reporter is told it follows the rules.",
    tone: "positive",
    icon: "check",
    confirmLabel: "Dismiss report",
  },
};
