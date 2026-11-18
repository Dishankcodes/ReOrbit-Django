import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  Check,
  MessageSquareQuote,
  Search,
  Star,
  Store,
  X,
} from "lucide-react";

import { reviewsApi } from "../../api/reviews";
import Spinner, { PageLoader } from "./Spinner";
import "./Spinner.css";
import "./MyReviews.css";

/* "My reviews" for a member or a ReMaker: what I have bought and delivered, and what I said about it.
     <MyReviews accent="#2a4d3a" orderPath={(id) => `/user-orders/${id}`} />
   The server decides what can be reviewed (delivered orders only; no seller review when ReOrbit sold it). */

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
const PRODUCT_ASPECTS = [
  ["quality", "Quality"],
  ["as_described", "As described"],
  ["value", "Value for money"],
  ["packaging", "Packaging"],
];
const SELLER_ASPECTS = [
  ["communication", "Communication"],
  ["packing", "Packing"],
  ["dispatch", "Dispatch speed"],
  ["as_promised", "Item as promised"],
];
const day = (v) =>
  v
    ? new Date(v).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "";
const SELLER_KIND = { user: "Member", remaker: "ReMaker" };

/* ------------------------------------------------------------------ stars */
function Stars({ value = 0, size = 16 }) {
  return (
    <span
      className="rv-stars"
      role="img"
      aria-label={value ? `${value} out of 5 stars` : "Not rated"}
      style={{ fontSize: size }}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= value ? "on" : ""} />
      ))}
    </span>
  );
}

function StarInput({ value, onChange, label, big = false }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div
      className={`rv-sinput${big ? " big" : ""}`}
      role="radiogroup"
      aria-label={label}
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={n <= shown ? "on" : ""}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(value === n && !big ? 0 : n)}
        >
          <Star size={big ? 34 : 16} />
        </button>
      ))}
      {big && <b className="rv-slabel">{LABELS[shown] || "Tap a star"}</b>}
    </div>
  );
}

/* ------------------------------------------------------------------ modal */
function ReviewModal({ entry, start, options, onClose, onChanged }) {
  const pr = entry.product_review;
  const sr = entry.seller_review;
  /* Product and seller reviews are written separately (each from its own tab), so the dialog
     shows one of them: step 1 is the product, step 2 the seller. */
  const twoSteps = false;
  const [step, setStep] = useState(start === "seller" && entry.can_review_seller ? 2 : 1);
  const [productDone, setProductDone] = useState(!!pr);

  const [p, setP] = useState({
    rating: pr?.rating || 0,
    title: pr?.title || "",
    body: pr?.body || "",
    recommend: pr ? pr.recommend : true,
    quality: pr?.quality || 0,
    as_described: pr?.as_described || 0,
    value: pr?.value || 0,
    packaging: pr?.packaging || 0,
  });
  const [keep, setKeep] = useState(pr?.photos || []);
  const [added, setAdded] = useState([]); // [{file, url}]
  const [s, setS] = useState({
    rating: sr?.rating || 0,
    body: sr?.body || "",
    tags: sr?.tags || [],
    communication: sr?.communication || 0,
    packing: sr?.packing || 0,
    dispatch: sr?.dispatch || 0,
    as_promised: sr?.as_promised || 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errs, setErrs] = useState({});
  const box = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    box.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [busy, onClose]);

  useEffect(() => () => added.forEach((a) => URL.revokeObjectURL(a.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const room = options.max_photos - keep.length - added.length;
  const pickPhotos = (e) => {
    const files = Array.from(e.target.files || []).slice(0, Math.max(room, 0));
    e.target.value = "";
    setAdded((a) => [
      ...a,
      ...files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
  };

  const submitProduct = async () => {
    if (!p.rating) {
      setErrs({ rating: "Choose a star rating." });
      return false;
    }
    setBusy(true);
    setError("");
    setErrs({});
    const f = new FormData();
    f.append("rating", p.rating);
    f.append("title", p.title);
    f.append("body", p.body);
    f.append("recommend", p.recommend ? "true" : "false");
    PRODUCT_ASPECTS.forEach(([k]) => {
      if (p[k]) f.append(k, p[k]);
    });
    added.forEach((a) => f.append("photos", a.file));
    if (pr)
      pr.photos
        .filter((x) => !keep.some((k) => k.id === x.id))
        .forEach((x) => f.append("remove_photos", x.id));
    try {
      await reviewsApi.saveProduct(entry.order_id, entry.line_id, f);
      setProductDone(true);
      return true;
    } catch (e) {
      setErrs(e.errors || {});
      setError(e.message || "Could not save your review.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitSeller = async () => {
    if (!s.rating) {
      setErrs({ rating: "Choose a star rating." });
      return;
    }
    setBusy(true);
    setError("");
    setErrs({});
    const body = { rating: s.rating, body: s.body, tags: s.tags };
    SELLER_ASPECTS.forEach(([k]) => {
      if (s[k]) body[k] = s[k];
    });
    try {
      await reviewsApi.saveSeller(entry.order_id, body);
      onChanged("Thanks, your reviews are saved.");
    } catch (e) {
      setErrs(e.errors || {});
      setError(e.message || "Could not save your review.");
    } finally {
      setBusy(false);
    }
  };

  const onProduct = async () => {
    const ok = await submitProduct();
    if (!ok) return;
    if (twoSteps) {
      setStep(2);
      box.current?.scrollTo?.(0, 0);
    } else onChanged("Thanks, your review is saved.");
  };

  const toggleTag = (t) =>
    setS((x) => ({
      ...x,
      tags: x.tags.includes(t) ? x.tags.filter((y) => y !== t) : [...x.tags, t],
    }));
  const total = twoSteps ? 2 : 1;
  const seller = entry.seller;

  return (
    <div
      className="rv-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="rv-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rv-title"
        tabIndex={-1}
        ref={box}
      >
        <button
          type="button"
          className="rv-x"
          onClick={onClose}
          aria-label="Close"
          disabled={busy}
        >
          <X size={18} />
        </button>
        <h2 id="rv-title">
          {step === 1
            ? pr
              ? "Edit your review"
              : "Review your order"
            : "Rate the seller"}
        </h2>
        <p className="rv-sub">
          {step === 1 ? (
            <>
              {entry.item.title}
              {seller.type !== "platform" ? ` · ${seller.name}` : ""}
            </>
          ) : (
            <>
              {seller.name} · {SELLER_KIND[seller.type]} · order{" "}
              {entry.order_id}
            </>
          )}
        </p>
        {total > 1 && (
          <div className="rv-steps" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={i < step ? "on" : ""} />
            ))}
          </div>
        )}

        {error && (
          <p className="rv-error" role="alert">
            {error}
          </p>
        )}

        {step === 1 ? (
          <div className="rv-form">
            <h4>{total > 1 ? "1 · " : ""}The product</h4>
            <StarInput
              big
              label="Product rating"
              value={p.rating}
              onChange={(n) => setP({ ...p, rating: n })}
            />
            {errs.rating && (
              <p className="rv-field-error">
                {Array.isArray(errs.rating) ? errs.rating[0] : errs.rating}
              </p>
            )}
            <div className="rv-aspects">
              {PRODUCT_ASPECTS.map(([k, label]) => (
                <div key={k}>
                  <span>{label}</span>
                  <StarInput
                    label={label}
                    value={p[k]}
                    onChange={(n) => setP({ ...p, [k]: n })}
                  />
                </div>
              ))}
            </div>
            <input
              className="rv-input"
              maxLength={80}
              placeholder="Give your review a title (optional)"
              aria-label="Review title"
              value={p.title}
              onChange={(e) => setP({ ...p, title: e.target.value })}
            />
            <textarea
              className="rv-input"
              maxLength={1000}
              rows={4}
              placeholder="What did you like or not like? Was it as described?"
              aria-label="Your review"
              value={p.body}
              onChange={(e) => setP({ ...p, body: e.target.value })}
            />
            <SuggestChips kind="product" rating={p.rating} value={p.body} onChange={(body) => setP({ ...p, body })} />
            {errs.body && <p className="rv-field-error">{errs.body[0]}</p>}

            <div className="rv-photos">
              {keep.map((x) => (
                <figure key={x.id}>
                  <img src={x.url} alt="" />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setKeep(keep.filter((k) => k.id !== x.id))}
                  >
                    <X size={12} />
                  </button>
                </figure>
              ))}
              {added.map((a) => (
                <figure key={a.url}>
                  <img src={a.url} alt="" />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => {
                      URL.revokeObjectURL(a.url);
                      setAdded(added.filter((x) => x !== a));
                    }}
                  >
                    <X size={12} />
                  </button>
                </figure>
              ))}
              {room > 0 && (
                <button
                  type="button"
                  className="rv-add"
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera size={18} />
                  <span>Add photo</span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={pickPhotos}
              />
            </div>
            {errs.photos && <p className="rv-field-error">{errs.photos[0]}</p>}

            <label className="rv-switch">
              <input
                type="checkbox"
                checked={p.recommend}
                onChange={(e) => setP({ ...p, recommend: e.target.checked })}
              />
              <span aria-hidden="true" /> I'd recommend this to others
            </label>
          </div>
        ) : (
          <div className="rv-form">
            <h4>The seller</h4>
            <StarInput
              big
              label="Seller rating"
              value={s.rating}
              onChange={(n) => setS({ ...s, rating: n })}
            />
            {errs.rating && (
              <p className="rv-field-error">
                {Array.isArray(errs.rating) ? errs.rating[0] : errs.rating}
              </p>
            )}
            <div className="rv-aspects">
              {SELLER_ASPECTS.map(([k, label]) => (
                <div key={k}>
                  <span>{label}</span>
                  <StarInput
                    label={label}
                    value={s[k]}
                    onChange={(n) => setS({ ...s, [k]: n })}
                  />
                </div>
              ))}
            </div>
            <div className="rv-chips" role="group" aria-label="What went well">
              {options.seller_tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={s.tags.includes(t)}
                  className={s.tags.includes(t) ? "on" : ""}
                  onClick={() => toggleTag(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              className="rv-input"
              maxLength={1000}
              rows={3}
              placeholder="How was your experience with this seller?"
              aria-label="Seller review"
              value={s.body}
              onChange={(e) => setS({ ...s, body: e.target.value })}
            />
            <SuggestChips kind="seller" rating={s.rating} value={s.body} onChange={(body) => setS({ ...s, body })} />
            <p className="rv-note">
              Seller reviews are public on the seller's profile. You can edit
              your reviews for {options.edit_days} days.
            </p>
          </div>
        )}

        <footer>
          <span className="rv-step-label">
            {total > 1 ? `Step ${step} of ${total}` : step === 1 ? "Product review" : "Seller review"}
          </span>
          <span className="rv-footbtns">
            {(
              <button
                type="button"
                className="rv-btn ghost"
                disabled={busy}
                onClick={onClose}
              >
                Cancel
              </button>
            )}
            {step === 1 ? (
              <button
                type="button"
                className="rv-btn"
                disabled={busy}
                onClick={onProduct}
              >
                {busy ? (
                  <Spinner label="Saving…" />
                ) : twoSteps ? (
                  "Next: rate seller →"
                ) : pr ? (
                  "Save changes"
                ) : (
                  "Submit review"
                )}
              </button>
            ) : (
              <button
                type="button"
                className="rv-btn"
                disabled={busy}
                onClick={submitSeller}
              >
                {busy ? (
                  <Spinner label="Saving…" />
                ) : sr ? (
                  "Save changes"
                ) : (
                  "Submit review"
                )}
              </button>
            )}
          </span>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- tile */
const stillEditable = (r) => r && new Date(r.edit_until) > new Date();

function ProductTile({ entry, orderPath, onOpen }) {
  const pr = entry.product_review;
  const sellerKind = entry.seller.type;
  const canEdit = !pr || (stillEditable(pr) && pr.status !== "Hidden");

  return (
    <article className="rv-tile">
      <div className="rv-photo">
        {entry.item.cover ? (
          <img src={entry.item.cover} alt="" loading="lazy" />
        ) : (
          <span className="rv-noimg" aria-hidden="true" />
        )}
        <span className="rv-badge">Delivered {day(entry.delivered_at)}</span>
      </div>
      <div className="rv-in">
        <h3>
          {entry.item.title}
          {entry.item.qty > 1 ? <small> × {entry.item.qty}</small> : null}
        </h3>
        <p className="rv-seller">
          <Store size={13} />{" "}
          {sellerKind === "platform" ? "Sold by ReOrbit" : <>{entry.seller.name} · {SELLER_KIND[sellerKind]}</>}
        </p>

        <div className="rv-mini">
          <div>
            <small>Your rating</small>
            <Stars value={pr?.rating || 0} size={16} />
          </div>
        </div>

        {pr?.status === "Hidden" && (
          <p className="rv-na">ReOrbit hid this review: {pr.hidden_reason || "it broke our review rules."}</p>
        )}
        {pr?.title && <p className="rv-quote"><b>{pr.title}</b></p>}
        {pr?.body && <p className="rv-quote">“{pr.body}”</p>}
        {pr?.reply && (
          <p className="rv-reply">
            <MessageSquareQuote size={13} /> <b>Seller reply:</b> {pr.reply}
          </p>
        )}
        {pr && !canEdit && <p className="rv-na">Reviews are locked after 30 days.</p>}

        <div className="rv-actions">
          {(!pr || canEdit) && (
            <button type="button" className={`rv-btn ${pr ? "ghost" : ""}`} onClick={() => onOpen(entry, "product")}>
              {pr ? "Edit review" : "Write review"}
            </button>
          )}
          <Link to={orderPath(entry.order_id)} className="rv-link">
            View order
          </Link>
        </div>
      </div>
    </article>
  );
}

/* One card per order: the seller's service (packing, dispatch, communication) is rated once per order. */
function SellerTile({ group, orderPath, onOpen }) {
  const entry = group.entries[0];
  const sr = entry.seller_review;
  const canEdit = !sr || (stillEditable(sr) && sr.status !== "Hidden");
  const name = entry.seller.name || "Seller";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <article className="rv-tile rv-tile-seller">
      <div className="rv-photo rv-photo-seller">
        <span className="rv-seller-avatar" aria-hidden="true">{initials}</span>
        <span className="rv-badge">Order {entry.order_id}</span>
      </div>
      <div className="rv-in">
        <h3>{name}</h3>
        <p className="rv-seller">
          <Store size={13} /> {SELLER_KIND[entry.seller.type]} · delivered {day(entry.delivered_at)}
        </p>
        <p className="rv-items">
          {group.entries.map((e) => e.item.title).join(" · ")}
        </p>

        <div className="rv-mini">
          <div>
            <small>Seller rating</small>
            <Stars value={sr?.rating || 0} size={16} />
          </div>
        </div>

        {sr?.status === "Hidden" && (
          <p className="rv-na">ReOrbit hid this review: {sr.hidden_reason || "it broke our review rules."}</p>
        )}
        {sr?.body && <p className="rv-quote">“{sr.body}”</p>}
        {sr?.reply && (
          <p className="rv-reply">
            <MessageSquareQuote size={13} /> <b>Seller reply:</b> {sr.reply}
          </p>
        )}
        {sr && !canEdit && <p className="rv-na">Reviews are locked after 30 days.</p>}

        <div className="rv-actions">
          {(!sr || canEdit) && (
            <button type="button" className={`rv-btn ${sr ? "ghost" : ""}`} onClick={() => onOpen(entry, "seller")}>
              {sr ? "Edit seller review" : "Rate seller"}
            </button>
          )}
          <Link to={orderPath(entry.order_id)} className="rv-link">
            View order
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------- page */
const FILTERS = [
  ["waiting", "Waiting for review"],
  ["done", "Reviewed"],
  ["all", "All"],
];
const KINDS = [
  ["product", "Product reviews"],
  ["seller", "Seller reviews"],
];

/* Tap-to-add sentences under the review box. They follow the star rating, so a 2-star review
   isn't offered "Perfect, would buy again". Tapping adds the sentence; tapping again removes it. */
const SUGGEST = {
  product: {
    high: ["Exactly as described.", "Great quality for the price.", "Looks even better in person.",
      "Well packed and arrived safely.", "Would buy again."],
    mid: ["Mostly as described.", "Good value, with small signs of use.", "Took a little longer to arrive.",
      "Does the job well."],
    low: ["Not as described in the listing.", "Arrived damaged.", "Quality was lower than expected.",
      "Photos didn't match the item."],
  },
  seller: {
    high: ["Quick to reply.", "Packed it with care.", "Shipped fast.", "Friendly and helpful seller."],
    mid: ["Replied, but slowly.", "Packing could be better.", "Dispatch took a few days."],
    low: ["Didn't reply to messages.", "Poorly packed.", "Shipped very late."],
  },
};
function SuggestChips({ kind, rating, value, onChange }) {
  if (!rating) return null;
  const level = rating >= 4 ? "high" : rating === 3 ? "mid" : "low";
  const text = value || "";
  const toggle = (line) =>
    onChange(
      text.includes(line)
        ? text.replace(line, "").replace(/\s{2,}/g, " ").trim()
        : `${text.trim()} ${line}`.trim().slice(0, 1000),
    );
  return (
    <div className="rv-suggest" aria-label="Suggested phrases">
      <small>Tap to add:</small>
      {SUGGEST[kind][level].map((line) => (
        <button key={line} type="button" className={text.includes(line) ? "on" : ""} onClick={() => toggle(line)}>
          {line}
        </button>
      ))}
    </div>
  );
}

export default function MyReviews({
  accent = "#2a4d3a",
  orderPath = (id) => `/user-orders/${id}`,
}) {
  const [state, setState] = useState({
    rows: [],
    counts: { waiting: 0, done: 0 },
    options: { edit_days: 30, seller_tags: [], max_photos: 3 },
    loading: true,
    error: "",
  });
  /* /user-reviews?q=ORD-… (from an order's "Rate order") opens with that order searched */
  const startText = useRef(
    new URLSearchParams(window.location.search).get("q") || "",
  ).current;
  const [filter, setFilter] = useState(startText ? "all" : "waiting");
  const [kind, setKind] = useState(
    new URLSearchParams(window.location.search).get("kind") === "seller" ? "seller" : "product",
  );
  const [text, setText] = useState(startText);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const first = useRef(true);

  const load = useCallback(async () => {
    try {
      const d = await reviewsApi.list();
      setState({
        rows: d.results,
        counts: d.counts,
        options: {
          edit_days: d.edit_days,
          seller_tags: d.seller_tags,
          max_photos: d.max_photos,
        },
        loading: false,
        error: "",
      });
      if (first.current) {
        first.current = false;
        if (!d.results.some((r) => !r.product_review) && d.results.length) setFilter("done");
      }
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e.message || "Could not load your reviews.",
      }));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  /* Seller reviews are one per order: group the delivered lines by order. */
  const sellerGroups = useMemo(() => {
    const by = new Map();
    state.rows.forEach((r) => {
      if (!r.can_review_seller) return;
      if (!by.has(r.order_id)) by.set(r.order_id, { order_id: r.order_id, entries: [] });
      by.get(r.order_id).entries.push(r);
    });
    return [...by.values()];
  }, [state.rows]);

  const counts = useMemo(
    () => ({
      product: {
        waiting: state.rows.filter((r) => !r.product_review).length,
        done: state.rows.filter((r) => r.product_review).length,
        all: state.rows.length,
      },
      seller: {
        waiting: sellerGroups.filter((g) => !g.entries[0].seller_review).length,
        done: sellerGroups.filter((g) => g.entries[0].seller_review).length,
        all: sellerGroups.length,
      },
    }),
    [state.rows, sellerGroups],
  );

  const rows = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (kind === "seller") {
      return sellerGroups.filter((g) => {
        const done = !!g.entries[0].seller_review;
        if (filter === "waiting" && done) return false;
        if (filter === "done" && !done) return false;
        return (
          !q ||
          g.order_id.toLowerCase().includes(q) ||
          g.entries[0].seller.name.toLowerCase().includes(q) ||
          g.entries.some((e) => e.item.title.toLowerCase().includes(q))
        );
      });
    }
    return state.rows.filter((r) => {
      if (filter === "waiting" && r.product_review) return false;
      if (filter === "done" && !r.product_review) return false;
      return (
        !q ||
        r.item.title.toLowerCase().includes(q) ||
        r.order_id.toLowerCase().includes(q) ||
        r.seller.name.toLowerCase().includes(q)
      );
    });
  }, [state.rows, sellerGroups, kind, filter, text]);

  const rated = state.rows
    .filter((r) => r.product_review)
    .map((r) => r.product_review.rating);
  const avg = rated.length
    ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1)
    : null;
  const written = state.rows.reduce(
    (n, r) => n + (r.product_review ? 1 : 0),
    0,
  );

  return (
    <div className="rv" style={{ "--rv-accent": accent }}>
      <header className="rv-head">
        <div>
          <p>
            Share how your orders and the sellers turned out. It helps others
            buy with confidence.
          </p>
        </div>
        <div className="rv-avg" aria-label="Your average rating">
          <b>
            {avg ? (
              <>
                {avg} <Star size={18} className="on" />
              </>
            ) : (
              "–"
            )}
          </b>
          <small>
            {written} {written === 1 ? "review" : "reviews"} written
          </small>
        </div>
      </header>

      {toast && (
        <p className="rv-toast" role="status">
          <Check size={16} /> {toast}
        </p>
      )}

      <div className="rv-kinds" role="tablist" aria-label="Review type">
        {KINDS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            className={kind === k ? "on" : ""}
            onClick={() => setKind(k)}
          >
            {label}
            {counts[k].waiting > 0 && <em>{counts[k].waiting} to write</em>}
          </button>
        ))}
      </div>

      <div className="rv-tools">
        <div className="rv-pills" role="tablist" aria-label="Filter reviews">
          {FILTERS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={filter === k}
              className={filter === k ? "on" : ""}
              onClick={() => setFilter(k)}
            >
              {label}
              <em>{counts[kind][k]}</em>
            </button>
          ))}
        </div>
        <label className="rv-search">
          <Search size={15} />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={kind === "seller" ? "Search seller, product or order" : "Search product, seller or order"}
            aria-label="Search reviews"
          />
        </label>
      </div>

      {state.error && (
        <p className="rv-error" role="alert">
          {state.error}{" "}
          <button
            type="button"
            onClick={() => {
              setState((s) => ({ ...s, loading: true, error: "" }));
              load();
            }}
          >
            Try again
          </button>
        </p>
      )}

      {state.loading ? (
        <PageLoader label="Loading your reviews…" />
      ) : rows.length === 0 && !state.error ? (
        <div className="rv-empty">
          <Star size={28} />
          <strong>
            {state.rows.length === 0
              ? "Nothing to review yet"
              : filter === "waiting"
                ? "You're all caught up"
                : kind === "seller" && sellerGroups.length === 0
                  ? "No sellers to rate"
                  : "No reviews match"}
          </strong>
          <span>
            {state.rows.length === 0
              ? "Once an order is delivered, you can review the product and its seller here."
              : kind === "seller" && sellerGroups.length === 0
                ? "Items ReOrbit sold itself have no separate seller review."
                : "Try another filter or search."}
          </span>
        </div>
      ) : (
        <div className="rv-grid">
          {kind === "seller"
            ? rows.map((g) => (
                <SellerTile
                  key={g.order_id}
                  group={g}
                  orderPath={orderPath}
                  onOpen={(entry, start) => setModal({ entry, start })}
                />
              ))
            : rows.map((r) => (
                <ProductTile
                  key={`${r.order_id}-${r.line_id}`}
                  entry={r}
                  orderPath={orderPath}
                  onOpen={(entry, start) => setModal({ entry, start })}
                />
              ))}
        </div>
      )}

      {modal && (
        <ReviewModal
          entry={modal.entry}
          start={modal.start}
          options={state.options}
          onClose={() => {
            setModal(null);
            load();
          }}
          onChanged={(msg) => {
            setModal(null);
            setToast(msg);
            load();
          }}
        />
      )}
    </div>
  );
}
