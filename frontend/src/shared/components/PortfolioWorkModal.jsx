import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Link } from "../portalRouter";
import BeforeAfter from "../../remaker/pages-components/BeforeAfter";

import "../../remaker/css/ReMakerPortfolio.css";
import "./PortfolioWorkModal.css";

/* The same work viewer the ReMaker sees on their own portfolio page: a Slider and a
   Side by side view of the before and after photos, with the story next to it.
   Used when a buyer or an admin opens a card on a ReMaker's profile.

   work:        { id, title, description, category, before, after, createdAt,
                  linkedProduct?: { id, title, price, status, image }, visibility? }
   onClose:     called on Esc, the close button, or a click outside
   productHref: optional (product) => path. Without it the linked product is shown
                but is not a link. */

const MODES = [
  { key: "slider", label: "Slider" },
  { key: "side", label: "Side by side" },
];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function formatDate(iso) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const price = (value) => {
  const amount = Number(value);

  return amount ? `₹${amount.toLocaleString("en-IN")}` : "";
};

export default function PortfolioWorkModal({ work, onClose, productHref }) {
  const [mode, setMode] = useState("slider");
  const card = useRef(null);
  const closeButton = useRef(null);

  /* keep the page behind from scrolling, put focus inside, give it back on close */
  useEffect(() => {
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    return () => {
      document.body.style.overflow = overflow;
      if (opener && typeof opener.focus === "function") opener.focus();
    };
  }, []);

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab" || !card.current) return;

    const items = [...card.current.querySelectorAll(FOCUSABLE)].filter(
      (node) => node.offsetParent !== null,
    );

    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const hasBoth = Boolean(work.before && work.after);
  const single = work.after || work.before || work.image || "";
  const product = work.linkedProduct;
  const href = product && productHref ? productHref(product) : null;
  const productStatus =
    product?.status === "Listed"
      ? "Active"
      : String(product?.status || "").replace("_", " ");

  const productBody = product && (
    <>
      {product.image && <img src={product.image} alt="" />}
      <span>
        <strong>{product.title}</strong>
        <em>
          {[price(product.price), productStatus].filter(Boolean).join(" · ")}
        </em>
      </span>
    </>
  );

  return createPortal(
    <div
      className="pwm-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
    >
      <div
        className="pwm-card rpt"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwm-title"
        ref={card}
      >
        <button
          type="button"
          className="pwm-close"
          onClick={onClose}
          ref={closeButton}
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>

        <div className="rpt-view-grid">
          {/* COMPARISON */}
          <div className="rpt-stage">
            {hasBoth ? (
              <>
                <div
                  className="rpt-modes"
                  role="tablist"
                  aria-label="How to compare"
                >
                  {MODES.map((item) => (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === item.key}
                      className={mode === item.key ? "active" : ""}
                      key={item.key}
                      onClick={() => setMode(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {mode === "slider" ? (
                  <BeforeAfter
                    before={work.before}
                    after={work.after}
                    title={work.title}
                    interactive
                    className="rpt-ba-lg"
                  />
                ) : (
                  <div className="rpt-side-by-side">
                    <figure>
                      <img src={work.before} alt={`${work.title}, before`} />
                      <figcaption>Before</figcaption>
                    </figure>
                    <figure>
                      <img src={work.after} alt={`${work.title}, after`} />
                      <figcaption>After</figcaption>
                    </figure>
                  </div>
                )}

                {mode === "slider" && (
                  <p className="rpt-stage-hint">
                    Drag the line, or use the arrow keys, to compare.
                  </p>
                )}
              </>
            ) : (
              single && (
                <img className="pwm-single" src={single} alt={work.title} />
              )
            )}
          </div>

          {/* DETAILS */}
          <div className="rpt-view-info">
            {work.category && <span className="rpt-pill">{work.category}</span>}
            <h2 id="pwm-title">{work.title}</h2>
            {work.createdAt && (
              <p className="rpt-date">Added {formatDate(work.createdAt)}</p>
            )}

            {work.visibility === "Private" && (
              <p className="pwm-private">
                Private: only this ReMaker and ReOrbit can see this work.
              </p>
            )}

            {work.description && (
              <>
                <h3>The story</h3>
                <p className="rpt-story">{work.description}</p>
              </>
            )}

            {product && (
              <div className="rpt-linked">
                <small>Linked product</small>
                {href ? (
                  <Link to={href} className="rpt-linked-card" onClick={onClose}>
                    {productBody}
                  </Link>
                ) : (
                  <div className="rpt-linked-card pwm-static">{productBody}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
