import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquareText, Package, Search, Store, X } from "lucide-react";

import { adminReviewsApi } from "../../../api/reviews";
import { useAccess } from "../../data/teamStore";
import useToast from "../../components/ui/useToast";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import { REVIEW_MODALS, ReviewCard, ReviewDrawer } from "./components/ReviewBits";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/content/AdminContent.css";
import "../../css/reviews/AdminReviews.css";

/* Product reviews and seller reviews are different things (a product vs. the seller's service),
   so they live on separate tabs, each with its own All / Reported / Hidden views. */
const KINDS = [
  { key: "product", label: "Product reviews", icon: Package, count: "product", hint: "What buyers say about an item" },
  { key: "seller", label: "Seller reviews", icon: Store, count: "seller", hint: "Packing, dispatch and communication" },
];
const VIEWS = [
  { key: "all", label: "All" },
  { key: "reported", label: "Reported", count: "reported" },
  { key: "hidden", label: "Hidden", count: "hidden" },
];
const RATINGS = ["", "5", "4", "3", "2", "1"];

export default function AdminReviews() {
  const access = useAccess();
  const canEdit = access.can("complaints", "edit");
  const { toast, toastNode } = useToast();
  const [params, setParams] = useSearchParams();

  const kind = params.get("kind") === "seller" ? "seller" : "product";
  const view = VIEWS.some((v) => v.key === params.get("view")) ? params.get("view") : "all";
  const rating = RATINGS.includes(params.get("rating") || "") ? params.get("rating") || "" : "";
  const seller = params.get("seller") || "";
  const reviewer = params.get("reviewer") || "";
  const product = params.get("product") || "";
  const urlQ = params.get("q") || "";

  const [query, setQuery] = useState(urlQ);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null); // the review shown in the side panel
  const [modal, setModal] = useState(null); // {action, review, report}
  const seq = useRef(0);

  const setParam = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setPage(1);
    setParams(next, { replace: true });
  };

  // search is debounced into the URL
  useEffect(() => {
    if (query === urlQ) return undefined;
    const t = setTimeout(() => setParam({ q: query.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const load = useCallback(() => {
    const mine = ++seq.current;
    const qs = new URLSearchParams({ page, page_size: pageSize, kind });
    if (view === "reported") qs.set("reported", "1");
    if (view === "hidden") qs.set("status", "Hidden");
    if (rating) qs.set("rating", rating);
    if (seller) qs.set("seller", seller);
    if (reviewer) qs.set("reviewer", reviewer);
    if (product && kind === "product") qs.set("product", product);
    if (urlQ) qs.set("q", urlQ);
    setLoading(true);
    return adminReviewsApi
      .list(`?${qs}`)
      .then((d) => {
        if (mine !== seq.current) return d;
        setData(d);
        setError(false);
        return d;
      })
      .catch(() => mine === seq.current && setError(true))
      .finally(() => mine === seq.current && setLoading(false));
  }, [page, pageSize, view, kind, rating, seller, reviewer, product, urlQ]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = data?.results || [];
  const counts = data?.counts || {};

  const confirm = (reason) => {
    const { action, review, report } = modal;
    setModal(null);
    const job =
      action === "hide"
        ? adminReviewsApi.hide(review.id, reason).then(() => "Review hidden.")
        : action === "restore"
          ? adminReviewsApi.restore(review.id).then(() => "Review restored.")
          : action === "uphold"
            ? adminReviewsApi.resolve(report.id, "uphold", reason).then(() => "Report upheld and the review is hidden.")
            : adminReviewsApi.resolve(report.id, "dismiss", reason).then(() => "Report dismissed. The review stays up.");
    job.then(
      (m) => {
        toast(m);
        load()?.then((d) => {
          const fresh = d?.results?.find((x) => x.id === review.id);
          setOpen((cur) => (cur && cur.id === review.id ? fresh || null : cur));
        });
      },
      (e) => toast(`Not saved: ${e?.message || "something went wrong."}`),
    );
  };

  const filtered = view !== "all" || rating || seller || reviewer || product || urlQ;
  const KindIcon = kind === "seller" ? Store : Package;

  return (
    <div className="au-page arv-page">
      <nav className="cm-tabs arv-views" aria-label="Review type">
        {KINDS.map((k) => {
          const Icon = k.icon;
          return (
            <button
              key={k.key}
              type="button"
              aria-pressed={kind === k.key}
              className={kind === k.key ? "on" : ""}
              onClick={() => setParam({ kind: k.key === "product" ? "" : k.key, view: "", product: "" })}
            >
              <span className="cm-tab-t">
                <strong>
                  <Icon size={15} /> {k.label}
                  {counts[k.count] != null && <em> {counts[k.count]}</em>}
                </strong>
                <small>{k.hint}</small>
              </span>
            </button>
          );
        })}
      </nav>

      <section className="au-panel">
        <div className="au-toolbar">
          <div className="arv-chips" role="tablist" aria-label="Which reviews">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={view === v.key}
                className={view === v.key ? "on" : ""}
                onClick={() => setParam({ view: v.key === "all" ? "" : v.key })}
              >
                {v.label}
                {v.count && counts[v.count] != null && <em>{counts[v.count]}</em>}
              </button>
            ))}
          </div>
          <div className="au-toolbar-right">
            <label className="au-search">
              <Search size={16} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search text, reviewer, order or ID"
                aria-label="Search reviews"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setParam({ q: "" });
                  }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </label>
            <select
              className="au-select"
              value={rating}
              onChange={(e) => setParam({ rating: e.target.value })}
              aria-label="Rating"
            >
              {RATINGS.map((r) => (
                <option key={r} value={r}>
                  {r ? `${r} star${r === "1" ? "" : "s"}` : "Any rating"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(seller || reviewer || product) && (
          <div className="arv-scope">
            {product && (
              <span>
                Reviews of product <b>{product}</b>
                <button type="button" onClick={() => setParam({ product: "" })} aria-label="Clear product filter">
                  <X size={12} />
                </button>
              </span>
            )}
            {seller && (
              <span>
                Reviews of seller <b>{seller}</b>
                <button type="button" onClick={() => setParam({ seller: "" })} aria-label="Clear seller filter">
                  <X size={12} />
                </button>
              </span>
            )}
            {reviewer && (
              <span>
                Reviews written by <b>{reviewer}</b>
                <button type="button" onClick={() => setParam({ reviewer: "" })} aria-label="Clear reviewer filter">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}

        {error && !data ? (
          <ErrorState kind="network" onRetry={load} />
        ) : !data && loading ? (
          <p className="arv-loading">Loading reviews…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={filtered ? MessageSquareText : KindIcon}
            title={filtered ? "No reviews match" : `No ${kind} reviews yet`}
            text={filtered ? "Try a different filter or search." : "Reviews appear here as soon as buyers post them."}
          />
        ) : (
          <div className={`arv-grid ${loading ? "is-busy" : ""}`}>
            {rows.map((r) => (
              <ReviewCard key={r.id} review={r} onOpen={setOpen} />
            ))}
          </div>
        )}

        {data && data.count > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={data.count}
            onPage={setPage}
            onPageSize={(n) => {
              setPageSize(n);
              setPage(1);
            }}
            sizes={[12, 24, 48]}
          />
        )}
      </section>

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
    </div>
  );
}
