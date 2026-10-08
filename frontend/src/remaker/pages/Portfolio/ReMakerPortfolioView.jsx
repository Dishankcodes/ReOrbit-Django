import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import BeforeAfter from "../../pages-components/BeforeAfter";
import PortfolioDeleteModal from "../../pages-components/PortfolioDeleteModal";
import { REMAKER_PRODUCTS, formatPrice } from "../../data/remakerProducts";
import {
  deleteWork,
  formatWorkDate,
  useWork,
  usePortfolio,
} from "../../data/portfolioStore";

import "../../css/ReMakerPortfolio.css";

export default function ReMakerPortfolioView() {
  const { workId } = useParams();
  const work = useWork(workId);

  if (!work) {
    return (
      <section className="rpt">
        <div className="rpt-missing">
          <img src="/images/portfolio/before-tara-chair.jpg" alt="" />
          <h2>We couldn&apos;t find that work</h2>
          <p>It may have been deleted, or the link is out of date.</p>
          <Link to="/remaker-portfolio" className="rpt-btn primary">
            Back to portfolio
          </Link>
        </div>
      </section>
    );
  }

  return <View key={work.id} work={work} />;
}

function View({ work }) {
  const navigate = useNavigate();
  const location = useLocation();
  const all = usePortfolio();

  const [mode, setMode] = useState("slider");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState(location.state?.notice || "");
  const timer = useRef(null);

  useEffect(() => {
    if (!notice) return undefined;

    timer.current = setTimeout(() => setNotice(""), 2800);
    return () => clearTimeout(timer.current);
  }, [notice]);

  const index = all.findIndex((item) => item.id === work.id);
  const newer = index > 0 ? all[index - 1] : null;
  const older = index < all.length - 1 ? all[index + 1] : null;

  const product = work.linkedProductId
    ? REMAKER_PRODUCTS.find((item) => item.id === work.linkedProductId)
    : null;

  const confirmRemove = () => {
    const removed = deleteWork(work.id);
    navigate("/remaker-portfolio", { state: { undo: removed } });
  };

  return (
    <section className="rpt rpt-view">
      <div className="rpt-topbar">
        <Link to="/remaker-portfolio" className="rpt-back">
          &larr; Back to portfolio
        </Link>

        <div className="rpt-topbar-actions">
          <Link to={`/remaker-portfolio/${work.id}/edit`} className="rpt-btn ghost small">
            Edit
          </Link>
          <button type="button" className="rpt-btn danger-ghost small" onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        </div>
      </div>

      <div className="rpt-view-grid">
        {/* COMPARISON */}
        <div className="rpt-stage">
          <div className="rpt-modes" role="tablist" aria-label="How to compare">
            {[
              { key: "slider", label: "Slider" },
              { key: "side", label: "Side by side" },
            ].map((item) => (
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
            <BeforeAfter before={work.before} after={work.after} title={work.title} interactive className="rpt-ba-lg" />
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
            <p className="rpt-stage-hint">Drag the line, or use the arrow keys, to compare.</p>
          )}
        </div>

        {/* DETAILS */}
        <div className="rpt-view-info">
          <span className="rpt-pill">{work.category}</span>
          <h2>{work.title}</h2>
          <p className="rpt-date">Added {formatWorkDate(work.createdAt)}</p>

          <h3>The story</h3>
          <p className="rpt-story">{work.description}</p>

          {product ? (
            <div className="rpt-linked">
              <small>Linked product</small>
              <Link to={`/remaker-products/${product.id}/edit`} className="rpt-linked-card">
                {product.images[0] && <img src={product.images[0]} alt="" />}
                <span>
                  <strong>{product.title}</strong>
                  <em>
                    {product.price ? formatPrice(product.price) : "No price yet"}
                    {" · "}
                    {product.status === "Listed" ? "Active" : product.status.replace("_", " ")}
                  </em>
                </span>
              </Link>
            </div>
          ) : (
            <div className="rpt-linked none">
              <small>Linked product</small>
              <p>Not linked to a product. Link one from Edit to show buyers where to find it.</p>
            </div>
          )}

          <nav className="rpt-pager" aria-label="Other works">
            {newer ? (
              <Link to={`/remaker-portfolio/${newer.id}`}>
                <img src={newer.after} alt="" />
                <span>
                  <small>Newer</small>
                  <strong>{newer.title}</strong>
                </span>
              </Link>
            ) : (
              <span />
            )}

            {older ? (
              <Link to={`/remaker-portfolio/${older.id}`} className="next">
                <span>
                  <small>Older</small>
                  <strong>{older.title}</strong>
                </span>
                <img src={older.after} alt="" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </div>
      </div>

      {confirmDelete && (
        <PortfolioDeleteModal work={work} onConfirm={confirmRemove} onCancel={() => setConfirmDelete(false)} />
      )}

      {notice && (
        <div className="rpt-toast" role="status" aria-live="polite">
          {notice}
        </div>
      )}
    </section>
  );
}
