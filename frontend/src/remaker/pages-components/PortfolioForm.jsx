import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import BeforeAfter from "./BeforeAfter";
import PortfolioDeleteModal from "./PortfolioDeleteModal";
import { useMyProducts, useProductCategories } from "../data/productsStore";
import {
  PORTFOLIO_PHOTO_MB,
  addWork,
  deleteWork,
  updateWork,
} from "../data/portfolioStore";

import "../css/ReMakerPortfolio.css";

const DESC_MIN = 20;
const DESC_MAX = 500;
const TITLE_MAX = 70;

/* The server accepts exactly these (JPEG, PNG, WebP up to 5 MB). The file picker, the drop
   zone and the checks below all use the same list. */
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
const isPhoto = (file) =>
  PHOTO_TYPES.includes(file.type) ||
  (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name));

/* form field -> the name the server uses for it in error messages */
const SERVER_KEY = { categoryId: "category", linkedProductId: "linked_product" };

/* Real sample photos shown in empty upload slots */
const SAMPLE = {
  before: "https://images.pexels.com/photos/12277213/pexels-photo-12277213.jpeg?auto=compress&cs=tinysrgb&w=1000",
  after: "https://images.pexels.com/photos/34658646/pexels-photo-34658646.jpeg?auto=compress&cs=tinysrgb&w=1000",
};

function buildInitial(work) {
  return {
    title: work?.title || "",
    categoryId: work?.categoryId || "",
    description: work?.description || "",
    linkedProductId: work?.linkedProductId || "",
    /* before / after hold what the slot shows: the saved photo, or a preview
       of the file just picked. beforeFile / afterFile are the new uploads. */
    before: work?.before || "",
    after: work?.after || "",
    beforeFile: null,
    afterFile: null,
  };
}

function Slot({
  kind,
  label,
  hint,
  value,
  error,
  busy,
  onPick,
  onRemove,
  onBroken,
  invalid,
}) {
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
        <img
          src={value || SAMPLE[kind]}
          alt={value ? `${label} photo` : ""}
          onError={() => value && onBroken(kind)}
        />

        {!value && (
          <button
            type="button"
            className="rpt-slot-add"
            onClick={() => inputRef.current?.click()}
          >
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

        <span className={`rpt-slot-tag ${kind}`}>
          {kind === "before" ? "Before" : "After"}
        </span>

        <input
          ref={inputRef}
          type="file"
          accept={PHOTO_ACCEPT}
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

  const categories = useProductCategories();
  const { products } = useMyProducts();

  const categoryOptions = useMemo(() => {
    const known = categories.some((item) => item.id === work?.categoryId);

    return work?.categoryId && !known
      ? [{ id: work.categoryId, name: work.category }, ...categories]
      : categories;
  }, [categories, work]);

  const productOptions = useMemo(() => {
    const known = products.some((item) => item.id === work?.linkedProductId);

    return work?.linkedProduct && !known
      ? [{ id: work.linkedProduct.id, title: work.linkedProduct.title }, ...products]
      : products;
  }, [products, work]);

  const initial = useMemo(() => buildInitial(work), [work]);

  const [values, setValues] = useState(initial);
  const [attempted, setAttempted] = useState(false);
  const [photoError, setPhotoError] = useState({ before: "", after: "" });
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  /* preview URLs made for picked files are released when the form closes */
  const previews = useRef(new Set());

  useEffect(() => {
    const made = previews.current;

    return () => made.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const set = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => ({
      ...current,
      [SERVER_KEY[field] || field]: undefined,
    }));
  };

  const errors = {
    before: values.before ? "" : "Add the photo from before you started.",
    after: values.after ? "" : "Add the photo of the finished piece.",
    title:
      values.title.trim().length >= 3
        ? ""
        : "Give this work a title of at least 3 characters.",
    category: values.categoryId ? "" : "Choose the closest category.",
    description:
      values.description.trim().length >= DESC_MIN
        ? ""
        : `Tell the story in at least ${DESC_MIN} characters.`,
  };

  const hasErrors = Object.values(errors).some(Boolean);
  const show = (key) =>
    serverErrors[key] || (attempted ? errors[key] : "");

  /* free the browser memory behind a preview we made ourselves */
  const release = (url) => {
    if (url && previews.current.has(url)) {
      URL.revokeObjectURL(url);
      previews.current.delete(url);
    }
  };

  const pick = (kind, file) => {
    setPhotoError((current) => ({ ...current, [kind]: "" }));

    if (!isPhoto(file)) {
      setPhotoError((current) => ({
        ...current,
        [kind]: "Choose a JPG, PNG or WebP photo.",
      }));
      return;
    }

    if (file.size > PORTFOLIO_PHOTO_MB * 1024 * 1024) {
      setPhotoError((current) => ({
        ...current,
        [kind]: `That photo is over ${PORTFOLIO_PHOTO_MB} MB.`,
      }));
      return;
    }

    const url = URL.createObjectURL(file);

    release(values[kind]);
    previews.current.add(url);
    setValues((current) => ({
      ...current,
      [kind]: url,
      [`${kind}File`]: file,
    }));
    setServerErrors((current) => ({ ...current, [kind]: undefined }));
  };

  const removePhoto = (kind) => {
    release(values[kind]);
    setValues((current) => ({ ...current, [kind]: "", [`${kind}File`]: null }));
  };

  /* a picked file the browser can't draw (corrupt, or not really a photo) */
  const brokenPhoto = (kind) => {
    if (!previews.current.has(values[kind])) return;

    removePhoto(kind);
    setPhotoError((current) => ({
      ...current,
      [kind]: "We couldn't read that photo. Try another one.",
    }));
  };

  const fail = (error) => {
    const fields = error.errors || {};
    const next = {};

    Object.entries(fields).forEach(([key, messages]) => {
      next[key] = Array.isArray(messages) ? messages[0] : String(messages);
    });

    setServerErrors(next);
    setFormError(
      Object.keys(next).length
        ? "Please fix the highlighted fields."
        : error.message || "We couldn't save this work. Try again.",
    );
    setSaving(false);
    requestAnimationFrame(() =>
      document
        .querySelector(
          '.rpt [data-invalid="true"], .rpt [aria-invalid="true"], .rpt-form-error',
        )
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };

  const save = async () => {
    setAttempted(true);
    setFormError("");

    if (hasErrors) {
      requestAnimationFrame(() =>
        document
          .querySelector(
            '.rpt [data-invalid="true"], .rpt [aria-invalid="true"]',
          )
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return;
    }

    setSaving(true);

    const data = {
      title: values.title.trim(),
      categoryId: values.categoryId,
      description: values.description.trim(),
      linkedProductId: values.linkedProductId,
      beforeFile: values.beforeFile,
      afterFile: values.afterFile,
    };

    try {
      if (isEdit) {
        await updateWork(work.id, data);
        navigate(`/remaker-portfolio/${work.id}`, {
          state: { notice: "Changes saved." },
        });
      } else {
        const { id } = await addWork(data);
        navigate(`/remaker-portfolio/${id}`, {
          state: { notice: "Work added to your portfolio." },
        });
      }
    } catch (error) {
      fail(error);
    }
  };

  const confirmRemove = async () => {
    try {
      const removed = await deleteWork(work.id);
      navigate("/remaker-portfolio", { state: { undo: removed } });
    } catch (error) {
      setConfirmDelete(false);
      setFormError(error.message || "We couldn't delete this work. Try again.");
    }
  };

  const backTo = isEdit
    ? `/remaker-portfolio/${work.id}`
    : "/remaker-portfolio";
  const ready = values.before && values.after;

  return (
    <section className="rpt rpt-form">
      <div className="rpt-topbar">
        <Link to={backTo} className="rpt-back">
          &larr; {isEdit ? "Back to work" : "Back to portfolio"}
        </Link>

        {isEdit && dirty && (
          <span className="rpt-unsaved">Unsaved changes</span>
        )}
      </div>

      <div className="rpt-form-grid">
        <div className="rpt-form-main">
          {/* PHOTOS */}
          <section className="rpt-card">
            <header className="rpt-card-head">
              <h2>Before and after photos</h2>
              <p>
                Show the piece as you found it, then as you finished it. Use the
                same angle and light for both so the change is easy to see.
              </p>
            </header>

            <div className="rpt-slots">
              <Slot
                kind="before"
                label="Before"
                hint="As you bought it"
                value={values.before}
                busy={false}
                error={photoError.before || show("before")}
                invalid={Boolean(show("before"))}
                onPick={pick}
                onRemove={removePhoto}
                onBroken={brokenPhoto}
              />
              <Slot
                kind="after"
                label="After"
                hint="Finished work"
                value={values.after}
                busy={false}
                error={photoError.after || show("after")}
                invalid={Boolean(show("after"))}
                onPick={pick}
                onRemove={removePhoto}
                onBroken={brokenPhoto}
              />
            </div>
          </section>

          {/* DETAILS */}
          <section className="rpt-card">
            <header className="rpt-card-head">
              <h2>Details</h2>
              <p>
                Buyers read this on your profile, so tell the story of the
                transformation.
              </p>
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
                    value={values.categoryId}
                    onChange={(event) => set("categoryId", event.target.value)}
                    aria-invalid={show("category") ? "true" : undefined}
                  >
                    <option value="">Select a category</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                {show("category") && (
                  <span className="rpt-error-inline">{show("category")}</span>
                )}
              </div>

              <div className="rpt-field">
                <label htmlFor="rpt-product">
                  Linked product <em>optional</em>
                </label>
                <div className="rpt-select">
                  <select
                    id="rpt-product"
                    value={values.linkedProductId}
                    onChange={(event) =>
                      set("linkedProductId", event.target.value)
                    }
                  >
                    <option value="">Not linked to a product</option>
                    {productOptions.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title}
                      </option>
                    ))}
                  </select>
                </div>
                {serverErrors.linked_product && (
                  <span className="rpt-error-inline">
                    {serverErrors.linked_product}
                  </span>
                )}
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
                  <span className="rpt-error-inline">
                    {show("description")}
                  </span>
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
                <small>
                  {categoryOptions.find((item) => item.id === values.categoryId)
                    ?.name || "Category"}
                </small>
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
            {formError && (
              <p className="rpt-error rpt-form-error" role="alert">
                {formError}
              </p>
            )}

            <button
              type="button"
              className="rpt-btn primary"
              onClick={save}
              disabled={saving || (isEdit && !dirty)}
            >
              {saving
                ? "Saving..."
                : isEdit
                  ? "Save changes"
                  : "Add to portfolio"}
            </button>

            <Link to={backTo} className="rpt-btn ghost">
              Cancel
            </Link>

            {isEdit && (
              <button
                type="button"
                className="rpt-btn danger-ghost"
                disabled={saving}
                onClick={() => setConfirmDelete(true)}
              >
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
