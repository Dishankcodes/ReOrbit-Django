import React, { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import BeforeAfter from "./BeforeAfter";
import PortfolioDeleteModal from "./PortfolioDeleteModal";
import { CATEGORIES, REMAKER_PRODUCTS } from "../data/remakerProducts";
import { addWork, deleteWork, fileToDataUrl, updateWork } from "../data/portfolioStore";

import "../css/ReMakerPortfolio.css";

const DESC_MIN = 20;
const DESC_MAX = 500;
const TITLE_MAX = 70;

/* Real sample photos shown in empty upload slots */
const SAMPLE = {
  before: "/images/portfolio/before-tara-console.jpg",
  after: "/images/portfolio/tara-console.jpg",
};

function buildInitial(work) {
  return {
    title: work?.title || "",
    category: work?.category || "",
    description: work?.description || "",
    linkedProductId: work?.linkedProductId || "",
    before: work?.before || "",
    after: work?.after || "",
  };
}

function Slot({ kind, label, hint, value, error, busy, onPick, onRemove, invalid }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (file) onPick(kind, file);
  };

  return (
    <div className="rpt-slot-wrap" data-invalid={invalid ? "true" : undefined}>
      <div className="rpt-slot-head">
        <strong>{label}</strong>
        <small>{hint}</small>
      </div>

      <div
        className={`rpt-slot ${value ? "filled" : "empty"} ${drag ? "drag" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDrag(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <img src={value || SAMPLE[kind]} alt={value ? `${label} photo` : ""} />

        {!value && (
          <button type="button" className="rpt-slot-add" onClick={() => inputRef.current?.click()}>
            <b>{busy ? "Preparing photo..." : `Add ${kind} photo`}</b>
            <span>Drop a file here or browse. JPG, PNG or WebP.</span>
          </button>
        )}

        {value && (
          <div className="rpt-slot-actions">
            <button type="button" onClick={() => inputRef.current?.click()}>
              Replace
            </button>
            <button type="button" onClick={() => onRemove(kind)}>
              Remove
            </button>
          </div>
        )}

        <span className={`rpt-slot-tag ${kind}`}>{kind === "before" ? "Before" : "After"}</span>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="rpt-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function PortfolioForm({ mode = "add", work = null }) {
  const navigate = useNavigate();
  const isEdit = mode === "edit";

  const initial = useMemo(() => buildInitial(work), [work]);

  const [values, setValues] = useState(initial);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState({ before: false, after: false });
  const [photoError, setPhotoError] = useState({ before: "", after: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const set = (field, value) => setValues((current) => ({ ...current, [field]: value }));

  const errors = {
    before: values.before ? "" : "Add the photo from before you started.",
    after: values.after ? "" : "Add the photo of the finished piece.",
    title: values.title.trim().length >= 3 ? "" : "Give this work a title of at least 3 characters.",
    category: values.category ? "" : "Choose the closest category.",
    description:
      values.description.trim().length >= DESC_MIN
        ? ""
        : `Tell the story in at least ${DESC_MIN} characters.`,
  };

  const hasErrors = Object.values(errors).some(Boolean);
  const show = (key) => (attempted ? errors[key] : "");

  const pick = async (kind, file) => {
    setBusy((current) => ({ ...current, [kind]: true }));
    setPhotoError((current) => ({ ...current, [kind]: "" }));

    try {
      const dataUrl = await fileToDataUrl(file);
      set(kind, dataUrl);
    } catch (error) {
      setPhotoError((current) => ({ ...current, [kind]: error.message }));
    } finally {
      setBusy((current) => ({ ...current, [kind]: false }));
    }
  };

  const removePhoto = (kind) => set(kind, "");

  const save = () => {
    setAttempted(true);

    if (hasErrors) {
      requestAnimationFrame(() =>
        document
          .querySelector('.rpt [data-invalid="true"], .rpt [aria-invalid="true"]')
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return;
    }

    setSaving(true);

    const data = {
      title: values.title.trim(),
      category: values.category,
      description: values.description.trim(),
      linkedProductId: values.linkedProductId,
      before: values.before,
      after: values.after,
    };

    if (isEdit) {
      updateWork(work.id, data);
      navigate(`/remaker-portfolio/${work.id}`, { state: { notice: "Changes saved." } });
    } else {
      const { id } = addWork(data);
      navigate(`/remaker-portfolio/${id}`, { state: { notice: "Work added to your portfolio." } });
    }
  };

  const confirmRemove = () => {
    const removed = deleteWork(work.id);
    navigate("/remaker-portfolio", { state: { undo: removed } });
  };

  const backTo = isEdit ? `/remaker-portfolio/${work.id}` : "/remaker-portfolio";
  const ready = values.before && values.after;

  return (
    <section className="rpt rpt-form">
      <div className="rpt-topbar">
        <Link to={backTo} className="rpt-back">
          &larr; {isEdit ? "Back to work" : "Back to portfolio"}
        </Link>

        {isEdit && dirty && <span className="rpt-unsaved">Unsaved changes</span>}
      </div>

      <div className="rpt-form-grid">
        <div className="rpt-form-main">
          {/* PHOTOS */}
          <section className="rpt-card">
            <header className="rpt-card-head">
              <h2>Before and after photos</h2>
              <p>
                Show the piece as you found it, then as you finished it. Use the same angle and
                light for both so the change is easy to see.
              </p>
            </header>

            <div className="rpt-slots">
              <Slot
                kind="before"
                label="Before"
                hint="As you bought it"
                value={values.before}
                busy={busy.before}
                error={photoError.before || show("before")}
                invalid={Boolean(show("before"))}
                onPick={pick}
                onRemove={removePhoto}
              />
              <Slot
                kind="after"
                label="After"
                hint="Finished work"
                value={values.after}
                busy={busy.after}
                error={photoError.after || show("after")}
                invalid={Boolean(show("after"))}
                onPick={pick}
                onRemove={removePhoto}
              />
            </div>
          </section>

          {/* DETAILS */}
          <section className="rpt-card">
            <header className="rpt-card-head">
              <h2>Details</h2>
              <p>Buyers read this on your profile, so tell the story of the transformation.</p>
            </header>

            <div className="rpt-fields">
              <div className="rpt-field span-2">
                <label htmlFor="rpt-title">Title</label>
                <input
                  id="rpt-title"
                  type="text"
                  value={values.title}
                  maxLength={TITLE_MAX}
                  placeholder="e.g. Teak door console table"
                  onChange={(event) => set("title", event.target.value)}
                  aria-invalid={show("title") ? "true" : undefined}
                />
                <div className="rpt-meta">
                  <span className="rpt-error-inline">{show("title")}</span>
                  <small>
                    {values.title.length}/{TITLE_MAX}
                  </small>
                </div>
              </div>

              <div className="rpt-field">
                <label htmlFor="rpt-category">Category</label>
                <div className="rpt-select">
                  <select
                    id="rpt-category"
                    value={values.category}
                    onChange={(event) => set("category", event.target.value)}
                    aria-invalid={show("category") ? "true" : undefined}
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                {show("category") && <span className="rpt-error-inline">{show("category")}</span>}
              </div>

              <div className="rpt-field">
                <label htmlFor="rpt-product">
                  Linked product <em>optional</em>
                </label>
                <div className="rpt-select">
                  <select
                    id="rpt-product"
                    value={values.linkedProductId}
                    onChange={(event) => set("linkedProductId", event.target.value)}
                  >
                    <option value="">Not linked to a product</option>
                    {REMAKER_PRODUCTS.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rpt-field span-2">
                <label htmlFor="rpt-description">The story</label>
                <textarea
                  id="rpt-description"
                  rows={6}
                  value={values.description}
                  maxLength={DESC_MAX}
                  placeholder="What was it? What did you change? Which materials and techniques did you use?"
                  onChange={(event) => set("description", event.target.value)}
                  aria-invalid={show("description") ? "true" : undefined}
                />
                <div className="rpt-meta">
                  <span className="rpt-error-inline">{show("description")}</span>
                  <small>
                    {values.description.length}/{DESC_MAX}
                  </small>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* SIDE */}
        <aside className="rpt-form-side">
          <section className="rpt-preview">
            <h3>Preview</h3>

            <div className="rpt-preview-card">
              <BeforeAfter
                before={values.before || SAMPLE.before}
                after={values.after || SAMPLE.after}
                title={values.title || "your work"}
                interactive={Boolean(ready)}
                className={ready ? "" : "dim"}
              />

              <div className="rpt-preview-body">
                <small>{values.category || "Category"}</small>
                <strong className={values.title.trim() ? "" : "placeholder"}>
                  {values.title.trim() || "Your work title"}
                </strong>
              </div>
            </div>

            <p className="rpt-preview-note">
              {ready
                ? "Drag the line to see how buyers will compare the two photos."
                : "Add both photos to try the comparison slider."}
            </p>
          </section>

          <div className="rpt-actions">
            <button type="button" className="rpt-btn primary" onClick={save} disabled={saving || (isEdit && !dirty)}>
              {isEdit ? "Save changes" : "Add to portfolio"}
            </button>

            <Link to={backTo} className="rpt-btn ghost">
              Cancel
            </Link>

            {isEdit && (
              <button type="button" className="rpt-btn danger-ghost" onClick={() => setConfirmDelete(true)}>
                Delete this work
              </button>
            )}
          </div>
        </aside>
      </div>

      {confirmDelete && work && (
        <PortfolioDeleteModal
          work={work}
          onConfirm={confirmRemove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </section>
  );
}
