import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  X,
  Star,
  EyeOff,
  Eye,
  Flag,
  CheckCircle2,
  MessageSquareText,
  CornerDownRight,
} from "lucide-react";

import { adminReviewsApi } from "../../../api/reviews";
import { useAccess } from "../../data/teamStore";
import { formatDateTime } from "../../utils/format";
import useToast from "../../components/ui/useToast";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/content/AdminContent.css";
import "../../css/reviews/AdminReviews.css";

const VIEWS = [
  { key: "all", label: "All reviews", count: "all" },
  { key: "reported", label: "Reported", count: "reported" },
  { key: "hidden", label: "Hidden", count: "hidden" },
];
const KINDS = [
  { key: "", label: "Products & sellers" },
  { key: "product", label: "Product reviews" },
  { key: "seller", label: "Seller reviews" },
];
const RATINGS = ["", "5", "4", "3", "2", "1"];

function Stars({ value }) {
  return (
    <span className="arv-stars" aria-label={`${value} out of 5`}>
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

const who = (p) =>
  p ? `${p.name || "—"} · ${p.type === "remaker" ? "ReMaker" : "Member"}` : "—";

export default function AdminReviews() {
  const access = useAccess();
  const canEdit = access.can("complaints", "edit");
  const { toast, toastNode } = useToast();
  const [params, setParams] = useSearchParams();

  const view = VIEWS.some((v) => v.key === params.get("view"))
    ? params.get("view")
    : "all";
  const kind = KINDS.some((k) => k.key === (params.get("kind") || ""))
    ? params.get("kind") || ""
    : "";
  const rating = RATINGS.includes(params.get("rating") || "")
    ? params.get("rating") || ""
    : "";
  const seller = params.get("seller") || "";
  const reviewer = params.get("reviewer") || "";
  const urlQ = params.get("q") || "";

  const [query, setQuery] = useState(urlQ);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {action, review, report}
  const seq = useRef(0);

  const setParam = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) =>
      v ? next.set(k, v) : next.delete(k),
    );
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
    const qs = new URLSearchParams({ page, page_size: pageSize });
    if (view === "reported") qs.set("reported", "1");
    if (view === "hidden") qs.set("status", "Hidden");
    if (kind) qs.set("kind", kind);
    if (rating) qs.set("rating", rating);
    if (seller) qs.set("seller", seller);
    if (reviewer) qs.set("reviewer", reviewer);
    if (urlQ) qs.set("q", urlQ);
    setLoading(true);
    adminReviewsApi
      .list(`?${qs}`)
      .then((d) => {
        if (mine !== seq.current) return;
        setData(d);
        setError(false);
      })
      .catch(() => mine === seq.current && setError(true))
      .finally(() => mine === seq.current && setLoading(false));
  }, [page, pageSize, view, kind, rating, seller, reviewer, urlQ]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = data?.results || [];
  const counts = data?.counts || {};

  const fail = (e) =>
    toast(`Not saved: ${e?.message || "something went wrong."}`);

  const confirm = (reason) => {
    const { action, review, report } = modal;
    setModal(null);
    const job =
      action === "hide"
        ? adminReviewsApi.hide(review.id, reason).then(() => "Review hidden.")
        : action === "restore"
          ? adminReviewsApi.restore(review.id).then(() => "Review restored.")
          : action === "uphold"
            ? adminReviewsApi
                .resolve(report.id, "uphold", reason)
                .then(() => "Report upheld and the review is hidden.")
            : adminReviewsApi
                .resolve(report.id, "dismiss", reason)
                .then(() => "Report dismissed. The review stays up.");
    job.then((m) => {
      toast(m);
      load();
    }, fail);
  };

  const MODALS = {
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

  const filtered =
    view !== "all" || kind || rating || seller || reviewer || urlQ;

  return (
    <div className="au-page arv-page">
      <nav className="cm-tabs arv-views" aria-label="Review views">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            aria-pressed={view === v.key}
            className={view === v.key ? "on" : ""}
            onClick={() => setParam({ view: v.key === "all" ? "" : v.key })}
          >
            <span className="cm-tab-t">
              <strong>
                {v.label}
                {counts[v.count] != null && <em> {counts[v.count]}</em>}
              </strong>
            </span>
          </button>
        ))}
      </nav>

      <section className="au-panel">
        <div className="au-toolbar">
          <label className="au-search">
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search text, reviewer, order or review ID"
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
          <div className="au-toolbar-right">
            <select
              className="au-select"
              value={kind}
              onChange={(e) => setParam({ kind: e.target.value })}
              aria-label="Review type"
            >
              {KINDS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </select>
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

        {(seller || reviewer) && (
          <div className="arv-scope">
            {seller && (
              <span>
                Reviews of seller <b>{seller}</b>
                <button
                  type="button"
                  onClick={() => setParam({ seller: "" })}
                  aria-label="Clear seller filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {reviewer && (
              <span>
                Reviews written by <b>{reviewer}</b>
                <button
                  type="button"
                  onClick={() => setParam({ reviewer: "" })}
                  aria-label="Clear reviewer filter"
                >
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
            icon={MessageSquareText}
            title={filtered ? "No reviews match" : "No reviews yet"}
            text={
              filtered
                ? "Try a different filter or search."
                : "Reviews appear here as soon as buyers post them."
            }
          />
        ) : (
          <ul className={`arv-list ${loading ? "is-busy" : ""}`}>
            {rows.map((r) => {
              const pending = (r.reports || []).filter(
                (x) => x.status === "Pending",
              );
              const hidden = r.status === "Hidden";
              return (
                <li key={r.id} className={hidden ? "is-hidden" : ""}>
                  <header>
                    <Stars value={r.rating} />
                    <strong>{r.title || (r.kind === "seller" ? "Seller review" : "Product review")}</strong>
                    <span className="arv-tag">
                      {r.kind === "seller" ? "Seller" : "Product"}
                    </span>
                    {hidden && <span className="arv-tag bad">Hidden</span>}
                    {pending.length > 0 && (
                      <span className="arv-tag warn">
                        <Flag size={11} /> {pending.length} report
                        {pending.length > 1 ? "s" : ""}
                      </span>
                    )}
                    <small>
                      {r.id} · {formatDateTime(r.created_at)}
                    </small>
                  </header>

                  {r.body && <p className="arv-body">{r.body}</p>}
                  {r.photos?.length > 0 && (
                    <div className="arv-photos">
                      {r.photos.map((p, i) => (
                        <a key={i} href={p.url || p} target="_blank" rel="noreferrer">
                          <img src={p.url || p} alt="" loading="lazy" />
                        </a>
                      ))}
                    </div>
                  )}

                  <dl className="arv-meta">
                    <div>
                      <dt>Written by</dt>
                      <dd>
                        <button
                          type="button"
                          onClick={() => setParam({ reviewer: r.reviewer?.id })}
                        >
                          {who(r.reviewer)}
                        </button>
                        <small>{r.reviewer?.email}</small>
                      </dd>
                    </div>
                    <div>
                      <dt>About</dt>
                      <dd>
                        <button
                          type="button"
                          disabled={!r.seller?.id}
                          onClick={() => setParam({ seller: r.seller?.id })}
                        >
                          {r.seller?.name}
                        </button>
                        {r.product?.title && <small>{r.product.title}</small>}
                      </dd>
                    </div>
                    <div>
                      <dt>Order</dt>
                      <dd>{r.order_id}</dd>
                    </div>
                  </dl>

                  {r.reply && (
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
                    <ul className="arv-reports">
                      {r.reports.map((rep) => (
                        <li key={rep.id} className={`st-${rep.status}`}>
                          <div>
                            <b>{rep.reason}</b>
                            <span className="arv-tag">{rep.status}</span>
                            <small>
                              {who(rep.reporter)} ·{" "}
                              {formatDateTime(rep.created_at)}
                            </small>
                            {rep.note && <p>“{rep.note}”</p>}
                            {rep.status !== "Pending" && rep.resolution_note && (
                              <p className="arv-res">
                                Decision: {rep.resolution_note}
                              </p>
                            )}
                          </div>
                          {rep.status === "Pending" && (
                            <div className="arv-rep-actions">
                              <button
                                type="button"
                                className="ad-btn ad-btn-danger ad-btn-sm"
                                disabled={!canEdit}
                                onClick={() =>
                                  setModal({
                                    action: "uphold",
                                    review: r,
                                    report: rep,
                                  })
                                }
                              >
                                Uphold & hide
                              </button>
                              <button
                                type="button"
                                className="ad-btn ad-btn-ghost ad-btn-sm"
                                disabled={!canEdit}
                                onClick={() =>
                                  setModal({
                                    action: "dismiss",
                                    review: r,
                                    report: rep,
                                  })
                                }
                              >
                                <CheckCircle2 size={13} /> Dismiss
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  <footer>
                    {hidden ? (
                      <button
                        type="button"
                        className="ad-btn ad-btn-ghost ad-btn-sm"
                        disabled={!canEdit}
                        onClick={() =>
                          setModal({ action: "restore", review: r })
                        }
                      >
                        <Eye size={14} /> Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="ad-btn ad-btn-danger ad-btn-sm"
                        disabled={!canEdit}
                        onClick={() => setModal({ action: "hide", review: r })}
                      >
                        <EyeOff size={14} /> Hide review
                      </button>
                    )}
                  </footer>
                </li>
              );
            })}
          </ul>
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

      {modal && (
        <ConfirmActionModal
          action={MODALS[modal.action]}
          targets={[modal.review.id]}
          onConfirm={confirm}
          onClose={() => setModal(null)}
        />
      )}
      {toastNode}
    </div>
  );
}
