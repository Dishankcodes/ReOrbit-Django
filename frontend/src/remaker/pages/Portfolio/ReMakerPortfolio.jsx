import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import BeforeAfter from "../../pages-components/BeforeAfter";
import PortfolioDeleteModal from "../../pages-components/PortfolioDeleteModal";
import {
  deleteWork,
  formatWorkDate,
  restoreWork,
  usePortfolio,
  usePortfolioStatus,
} from "../../data/portfolioStore";

import "../../css/ReMakerPortfolio.css";

export default function ReMakerPortfolio() {
  const works = usePortfolio();
  const status = usePortfolioStatus();
  const location = useLocation();
  const navigate = useNavigate();

  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [toDelete, setToDelete] = useState(null);
  const [undo, setUndo] = useState(location.state?.undo || null);
  const [problem, setProblem] = useState("");
  const timer = useRef(null);

  /* Clear router state so a refresh doesn't bring the toast back */
  useEffect(() => {
    if (location.state?.undo)
      navigate(location.pathname, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!undo) return undefined;

    timer.current = setTimeout(() => setUndo(null), 7000);
    return () => clearTimeout(timer.current);
  }, [undo]);

  const categories = useMemo(
    () => [...new Set(works.map((work) => work.category))].sort(),
    [works],
  );

  const visible = useMemo(() => {
    const filtered =
      category === "all"
        ? works
        : works.filter((work) => work.category === category);

    return sort === "oldest" ? [...filtered].reverse() : filtered;
  }, [works, category, sort]);

  /* Category chip can disappear after a delete */
  useEffect(() => {
    if (category !== "all" && !categories.includes(category))
      setCategory("all");
  }, [categories, category]);

  const linkedCount = works.filter((work) => work.linkedProductId).length;

  const confirmRemove = async () => {
    try {
      const removed = await deleteWork(toDelete.id);
      setProblem("");
      setToDelete(null);
      setUndo(removed);
    } catch (error) {
      setToDelete(null);
      setProblem(error.message || "We couldn't delete that work. Try again.");
    }
  };

  const handleUndo = async () => {
    const work = undo;

    setUndo(null);

    try {
      await restoreWork(work);
      setProblem("");
    } catch (error) {
      setProblem(error.message || "We couldn't bring that work back.");
    }
  };

  /* ---------- loading / error ---------- */
  if (!status.loaded) {
    return (
      <section className="rpt">
        <div className="rpt-empty" role="status" aria-live="polite">
          {status.error ? (
            <>
              <h2>We couldn&apos;t load your portfolio</h2>
              <p>{status.error}</p>
              <button
                type="button"
                className="rpt-btn primary"
                onClick={status.retry}
              >
                Try again
              </button>
            </>
          ) : (
            <p>Loading your portfolio...</p>
          )}
        </div>
      </section>
    );
  }

  /* ---------- empty ---------- */
  if (works.length === 0) {
    return (
      <section className="rpt">
        {problem && (
          <p className="rpt-error" role="alert">
            {problem}
          </p>
        )}

        <div className="rpt-empty">
          <div className="rpt-empty-art" aria-hidden="true">
            <img
              className="a"
              src="https://images.pexels.com/photos/34658646/pexels-photo-34658646.jpeg?auto=compress&cs=tinysrgb&w=1000"
              alt=""
            />
            <img
              className="b"
              src="https://images.pexels.com/photos/8251682/pexels-photo-8251682.jpeg?auto=compress&cs=tinysrgb&w=1000"
              alt=""
            />
          </div>
          <h2>Show the work behind your pieces</h2>
          <p>
            Add a before and an after photo and buyers can see exactly what you
            do with something people threw away.
          </p>
          <Link to="/remaker-portfolio/new" className="rpt-btn primary">
            Add your first work
          </Link>
        </div>

        {undo && (
          <div className="rpt-toast" role="status" aria-live="polite">
            <span>Deleted &ldquo;{undo.title}&rdquo;</span>
            <button type="button" onClick={handleUndo}>
              Undo
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rpt">
      {problem && (
        <p className="rpt-error" role="alert">
          {problem}
        </p>
      )}

      {/* SUMMARY */}
      <div className="rpt-summary">
        <div>
          <strong>{works.length}</strong>
          <span>{works.length === 1 ? "Work" : "Works"} in your portfolio</span>
        </div>
        <div>
          <strong>{linkedCount}</strong>
          <span>Linked to a product</span>
        </div>
        <div>
          <strong>{formatWorkDate(works[0].createdAt)}</strong>
          <span>Latest upload</span>
        </div>

        <Link to="/remaker-portfolio/new" className="rpt-btn primary rpt-add">
          Add work
        </Link>
      </div>

      {/* FILTERS */}
      <div className="rpt-filters">
        <div className="rpt-chips" role="group" aria-label="Category">
          {["all", ...categories].map((item) => (
            <button
              type="button"
              key={item}
              className={category === item ? "active" : ""}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item === "all" ? "All works" : item}
            </button>
          ))}
        </div>

        <label className="rpt-select inline">
          <span className="sr-only">Sort works</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      {/* GRID */}
      <div className="rpt-grid">
        {visible.map((work) => (
          <article className="rpt-work" key={work.id}>
            <BeforeAfter before={work.before} after={work.after} />

            <div className="rpt-work-body">
              <span className="rpt-work-cat">{work.category}</span>
              <h3>
                <Link
                  to={`/remaker-portfolio/${work.id}`}
                  className="rpt-work-link"
                >
                  {work.title}
                </Link>
              </h3>
              <p>{work.description}</p>

              <div className="rpt-work-foot">
                <small>{formatWorkDate(work.createdAt)}</small>

                <div className="rpt-work-actions">
                  <Link
                    to={`/remaker-portfolio/${work.id}/edit`}
                    aria-label={`Edit ${work.title}`}
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => setToDelete(work)}
                    aria-label={`Delete ${work.title}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {toDelete && (
        <PortfolioDeleteModal
          work={toDelete}
          onConfirm={confirmRemove}
          onCancel={() => setToDelete(null)}
        />
      )}

      {undo && (
        <div className="rpt-toast" role="status" aria-live="polite">
          <span>Deleted &ldquo;{undo.title}&rdquo;</span>
          <button type="button" onClick={handleUndo}>
            Undo
          </button>
        </div>
      )}
    </section>
  );
}
