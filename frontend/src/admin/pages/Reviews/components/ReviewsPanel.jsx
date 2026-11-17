import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquareText, Package, Store } from "lucide-react";

import { adminReviewsApi } from "../../../../api/reviews";
import { useAccess } from "../../../data/teamStore";
import useToast from "../../../components/ui/useToast";
import EmptyState from "../../../components/ui/EmptyState";
import ConfirmActionModal from "../../../components/ui/ConfirmActionModal";
import { REVIEW_MODALS, ReviewCard, ReviewDrawer, Stars } from "./ReviewBits";

import "../../../css/reviews/AdminReviews.css";

/* Reviews of one product (`product="RPR-1003"`) or of one seller (`seller="RMK-1001"`, with a
   Product / Seller switch), as cards that open the same side panel as Admin › Reviews. */
export default function ReviewsPanel({ product = "", seller = "", reviewer = "", title = "Reviews", pageSize = 24 }) {
  const access = useAccess();
  const canSee = access.canSee ? access.canSee("complaints") : true;
  const canEdit = access.can ? access.can("complaints", "edit") : false;
  const { toast, toastNode } = useToast();
  const [kind, setKind] = useState("product");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const [modal, setModal] = useState(null);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page_size: pageSize, kind: product ? "product" : kind });
    if (product) qs.set("product", product);
    if (seller) qs.set("seller", seller);
    if (reviewer) qs.set("reviewer", reviewer);
    return adminReviewsApi
      .list(`?${qs}`)
      .then((d) => {
        setData(d);
        setError("");
        return d;
      })
      .catch((e) => setError(e.status === 403 ? "" : e.message || "Could not load reviews."));
  }, [product, seller, reviewer, kind, pageSize]);

  useEffect(() => {
    if (canSee) load();
  }, [load, canSee]);

  if (!canSee) return null;

  const rows = data?.results || [];
  const visible = rows.filter((r) => r.status !== "Hidden");
  const average = visible.length ? visible.reduce((n, r) => n + r.rating, 0) / visible.length : 0;
  const allLink = `/admin-reviews?${new URLSearchParams(
    product
      ? { product }
      : { ...(seller ? { seller } : {}), ...(reviewer ? { reviewer } : {}), ...(kind === "seller" ? { kind: "seller" } : {}) },
  )}`;

  const confirm = (reason) => {
    const { action, review, report } = modal;
    setModal(null);
    const job =
      action === "hide"
        ? adminReviewsApi.hide(review.id, reason)
        : action === "restore"
          ? adminReviewsApi.restore(review.id)
          : adminReviewsApi.resolve(report.id, action, reason);
    job.then(
      () => {
        toast(action === "restore" ? "Review restored." : action === "dismiss" ? "Report dismissed." : "Review hidden.");
        load()?.then((d) => setOpen((cur) => (cur ? d?.results?.find((x) => x.id === cur.id) || null : cur)));
      },
      (e) => toast(`Not saved: ${e?.message || "something went wrong."}`),
    );
  };

  return (
    <section className="arv-panel">
      <header className="arv-panel-head">
        <div>
          <h3>{title}</h3>
          {visible.length > 0 ? (
            <p>
              <Stars value={Math.round(average)} size={13} /> <b>{average.toFixed(1)}</b> from {visible.length} visible
              review{visible.length === 1 ? "" : "s"}
              {data?.count > rows.length ? ` (showing the latest ${rows.length})` : ""}
            </p>
          ) : (
            <p>What buyers said, newest first. Click a review to see everything about it.</p>
          )}
        </div>
        <div className="arv-panel-tools">
          {!product && (
            <div className="arv-chips" role="tablist" aria-label="Review type">
              <button type="button" role="tab" aria-selected={kind === "product"} className={kind === "product" ? "on" : ""} onClick={() => setKind("product")}>
                <Package size={13} /> Product
              </button>
              <button type="button" role="tab" aria-selected={kind === "seller"} className={kind === "seller" ? "on" : ""} onClick={() => setKind("seller")}>
                <Store size={13} /> Seller
              </button>
            </div>
          )}
          <Link to={allLink} className="ad-btn ad-btn-ghost ad-btn-sm">
            Open in Reviews
          </Link>
        </div>
      </header>

      {error ? (
        <p className="arv-loading">{error}</p>
      ) : !data ? (
        <p className="arv-loading">Loading reviews…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="No reviews yet"
          text={
            product
              ? "Reviews of this product will appear here."
              : reviewer
                ? `This account hasn't written any ${kind} reviews yet.`
                : `No ${kind} reviews for this seller yet.`
          }
        />
      ) : (
        <div className="arv-grid">
          {rows.map((r) => (
            <ReviewCard key={r.id} review={r} onOpen={setOpen} />
          ))}
        </div>
      )}

      {open && (
        <ReviewDrawer
          review={open}
          canEdit={canEdit}
          onClose={() => setOpen(null)}
          onAction={(action, review, report) => setModal({ action, review, report })}
        />
      )}
      {modal && (
        <ConfirmActionModal
          action={REVIEW_MODALS[modal.action]}
          targets={[modal.review.id]}
          onConfirm={confirm}
          onClose={() => setModal(null)}
        />
      )}
      {toastNode}
    </section>
  );
}
