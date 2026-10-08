import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  ImagePlus,
  Info,
  Minus,
  Plus,
  RefreshCw,
  Recycle,
  Star,
  Upload,
  X,
} from "lucide-react";

import {
  CATEGORIES,
  MATERIAL_SUGGESTIONS,
  ORIGIN_ITEMS,
  formatPrice,
} from "../data/remakerProducts";

import "../css/ReMakerProductForm.css";

const MAX_PHOTOS = 4;
const MIN_PHOTOS = 3;
const MAX_MB = 5;
const TITLE_MAX = 80;
const DESC_MIN = 40;
const DESC_MAX = 600;

/* ---------------------------------------------------------
   Build the starting form values
   --------------------------------------------------------- */

function buildInitial(product) {
  const photos = Array(MAX_PHOTOS).fill(null);

  (product?.images || []).slice(0, MAX_PHOTOS).forEach((url, index) => {
    photos[index] = { id: `existing-${index}`, url, file: null };
  });

  return {
    title: product?.title || "",
    category: product?.category || "",
    description: product?.description || "",
    price: product?.price ? String(product.price) : "",
    stock: product ? product.stock : 1,
    materials: product?.materials || [],
    originType: product?.originType || "own",
    originItemId: product?.originItemId || "",
    active: product ? product.status === "Listed" || product.status === "Sold_Out" : true,
    photos,
  };
}

function snapshot(values) {
  return JSON.stringify({
    ...values,
    photos: values.photos.map((photo) => (photo ? photo.url : null)),
  });
}

export default function ProductForm({ mode = "add", product = null }) {
  const navigate = useNavigate();
  const isEdit = mode === "edit";

  const initial = useMemo(() => buildInitial(product), [product]);
  const initialSnapshot = useMemo(() => snapshot(initial), [initial]);

  const [values, setValues] = useState(initial);
  const [attempted, setAttempted] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [dragSlot, setDragSlot] = useState(null);
  const [materialDraft, setMaterialDraft] = useState("");
  const [toast, setToast] = useState(null);

  const fileInputRef = useRef(null);
  const fileTarget = useRef({ index: null, replace: false });
  const toastTimer = useRef(null);

  const { photos } = values;
  const photoCount = photos.filter(Boolean).length;
  const dirty = snapshot(values) !== initialSnapshot;

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const setField = (field, value) =>
    setValues((current) => ({ ...current, [field]: value }));

  /* ---------------------------------------------------------
     Validation
     --------------------------------------------------------- */

  const errors = {
    photos:
      photoCount < MIN_PHOTOS
        ? `Add at least ${MIN_PHOTOS} photos so buyers can see every angle.`
        : "",
    title:
      values.title.trim().length < 5
        ? "Give your product a title of at least 5 characters."
        : "",
    category: values.category ? "" : "Choose the closest category.",
    description:
      values.description.trim().length < DESC_MIN
        ? `Write at least ${DESC_MIN} characters about how you made it.`
        : "",
    price: Number(values.price) > 0 ? "" : "Enter a price above ₹0.",
  };

  const checklist = [
    { key: "photos", label: `Add ${MIN_PHOTOS} to ${MAX_PHOTOS} photos`, note: `${photoCount}/${MAX_PHOTOS}` },
    { key: "title", label: "Name your product" },
    { key: "category", label: "Pick a category" },
    { key: "description", label: "Describe how you made it" },
    { key: "price", label: "Set a price" },
  ].map((item) => ({ ...item, done: !errors[item.key] }));

  const doneCount = checklist.filter((item) => item.done).length;
  const complete = doneCount === checklist.length;
  const show = (key) => (attempted && errors[key] ? errors[key] : "");

  /* ---------------------------------------------------------
     Photos
     --------------------------------------------------------- */

  const makePhoto = (file) => ({
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
    url: URL.createObjectURL(file),
    file,
  });

  const releasePhoto = (photo) => {
    if (photo?.file && photo.url.startsWith("blob:")) {
      URL.revokeObjectURL(photo.url);
    }
  };

  const addFiles = (fileList, startAt = null) => {
    const files = Array.from(fileList || []);
    const next = [...photos];
    let message = "";
    let preferred = startAt;

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        message = `${file.name} is not an image. Use JPG, PNG or WebP.`;
        continue;
      }

      if (file.size > MAX_MB * 1024 * 1024) {
        message = `${file.name} is larger than ${MAX_MB} MB.`;
        continue;
      }

      const slot =
        preferred !== null && next[preferred] === null
          ? preferred
          : next.findIndex((photo) => photo === null);

      if (slot === -1) {
        message = `All ${MAX_PHOTOS} photo slots are full. Remove one to add another.`;
        break;
      }

      next[slot] = makePhoto(file);
      preferred = null;
    }

    setPhotoError(message);
    setField("photos", next);
  };

  const replaceAt = (index, file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError(`${file.name} is not an image. Use JPG, PNG or WebP.`);
      return;
    }

    if (file.size > MAX_MB * 1024 * 1024) {
      setPhotoError(`${file.name} is larger than ${MAX_MB} MB.`);
      return;
    }

    const next = [...photos];
    releasePhoto(next[index]);
    next[index] = makePhoto(file);
    setPhotoError("");
    setField("photos", next);
  };

  const openPicker = (index, replace = false) => {
    fileTarget.current = { index, replace };
    fileInputRef.current?.click();
  };

  const handlePicked = (event) => {
    const { index, replace } = fileTarget.current;

    if (replace) {
      replaceAt(index, event.target.files?.[0]);
    } else {
      addFiles(event.target.files, index);
    }

    event.target.value = "";
  };

  const removePhoto = (index) => {
    const next = [...photos];
    releasePhoto(next[index]);
    next[index] = null;
    setPhotoError("");
    setField("photos", next);
  };

  const makeCover = (index) => {
    const next = [...photos];
    [next[0], next[index]] = [next[index], next[0]];
    setField("photos", next);
  };

  const handleDrop = (event, index) => {
    event.preventDefault();
    setDragSlot(null);
    addFiles(event.dataTransfer.files, index);
  };

  /* ---------------------------------------------------------
     Materials
     --------------------------------------------------------- */

  const addMaterial = (raw) => {
    const name = raw.trim().replace(/,$/, "").trim();

    if (!name || values.materials.length >= 8) return;

    const exists = values.materials.some(
      (material) => material.toLowerCase() === name.toLowerCase(),
    );

    if (!exists) {
      setField("materials", [...values.materials, name]);
    }

    setMaterialDraft("");
  };

  const handleMaterialKey = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addMaterial(materialDraft);
    }

    if (event.key === "Backspace" && !materialDraft && values.materials.length) {
      setField("materials", values.materials.slice(0, -1));
    }
  };

  const removeMaterial = (name) =>
    setField(
      "materials",
      values.materials.filter((material) => material !== name),
    );

  /* ---------------------------------------------------------
     Stock + price
     --------------------------------------------------------- */

  const changeStock = (delta) =>
    setField("stock", Math.max(0, Math.min(999, Number(values.stock || 0) + delta)));

  const handlePrice = (event) =>
    setField("price", event.target.value.replace(/[^0-9]/g, "").slice(0, 7));

  const handleStock = (event) => {
    const digits = event.target.value.replace(/[^0-9]/g, "").slice(0, 3);
    setField("stock", digits === "" ? 0 : Number(digits));
  };

  /* ---------------------------------------------------------
     Save
     --------------------------------------------------------- */

  const flash = (tone, text, goBack = false) => {
    clearTimeout(toastTimer.current);
    setToast({ tone, text });

    toastTimer.current = setTimeout(
      () => {
        setToast(null);
        if (goBack) navigate("/remaker-products");
      },
      goBack ? 1300 : 2800,
    );
  };

  const scrollToFirstProblem = () => {
    requestAnimationFrame(() => {
      document
        .querySelector('.rpf [data-invalid="true"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const handleSaveDraft = () => {
    flash("success", "Draft saved.", true);
  };

  const handlePublish = () => {
    setAttempted(true);

    if (!complete) {
      flash("error", "Finish the highlighted fields to publish.");
      scrollToFirstProblem();
      return;
    }

    flash("success", isEdit ? "Changes saved." : "Product published.", true);
  };

  const handleSaveEdit = () => {
    if (values.active && !complete) {
      setAttempted(true);
      flash("error", "Finish the highlighted fields before keeping this product active.");
      scrollToFirstProblem();
      return;
    }

    flash("success", "Changes saved.", true);
  };

  const handleDiscard = () => {
    setValues(initial);
    setAttempted(false);
    setPhotoError("");
  };

  /* ---------------------------------------------------------
     Preview
     --------------------------------------------------------- */

  const cover = photos[0] || photos.find(Boolean);
  const soldOut = Number(values.stock) === 0;
  const originItem = ORIGIN_ITEMS.find((item) => item.id === values.originItemId);

  const unusedSuggestions = MATERIAL_SUGGESTIONS.filter(
    (suggestion) =>
      !values.materials.some(
        (material) => material.toLowerCase() === suggestion.toLowerCase(),
      ),
  ).slice(0, 5);

  return (
    <section className="rpf">
      {/* TOP BAR */}
      <div className="rpf-topbar">
        <Link to="/remaker-products" className="rpf-back">
          <ArrowLeft size={16} />
          Back to products
        </Link>

        {isEdit && (
          <div className="rpf-topbar-meta">
            <span className="rpf-id">{product?.id}</span>
            {dirty && <span className="rpf-unsaved">Unsaved changes</span>}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handlePicked}
      />

      <div className="rpf-grid">
        {/* =================== FORM COLUMN =================== */}
        <div className="rpf-main">
          {/* PHOTOS */}
          <section
            className="rpf-card"
            data-invalid={attempted && errors.photos ? "true" : undefined}
          >
            <header className="rpf-card-head">
              <div>
                <h2>Photos</h2>
                <p>
                  Add {MIN_PHOTOS} to {MAX_PHOTOS} clear photos. The first one is
                  the cover buyers see in the marketplace.
                </p>
              </div>
              <span className={`rpf-count ${photoCount >= MIN_PHOTOS ? "ok" : ""}`}>
                {photoCount}/{MAX_PHOTOS}
              </span>
            </header>

            <div className="rpf-photos">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className={`rpf-slot ${index === 0 ? "is-cover" : ""} ${
                    photo ? "is-filled" : "is-empty"
                  } ${dragSlot === index ? "is-drag" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragSlot(index);
                  }}
                  onDragLeave={() => setDragSlot(null)}
                  onDrop={(event) => handleDrop(event, index)}
                >
                  {photo ? (
                    <>
                      <img src={photo.url} alt={`Product photo ${index + 1}`} />

                      {index === 0 && <span className="rpf-cover-tag">Cover</span>}

                      <div className="rpf-slot-actions">
                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => makeCover(index)}
                            aria-label={`Make photo ${index + 1} the cover`}
                            title="Make cover"
                          >
                            <Star size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openPicker(index, true)}
                          aria-label={`Replace photo ${index + 1}`}
                          title="Replace"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          aria-label={`Remove photo ${index + 1}`}
                          title="Remove"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="rpf-slot-empty"
                      onClick={() => openPicker(index)}
                    >
                      {index === 0 ? (
                        <>
                          <span className="rpf-slot-icon">
                            <Upload size={22} />
                          </span>
                          <strong>Drop your cover photo here</strong>
                          <span>or browse. JPG, PNG or WebP, up to {MAX_MB} MB.</span>
                        </>
                      ) : (
                        <>
                          <span className="rpf-slot-icon small">
                            <ImagePlus size={18} />
                          </span>
                          <strong>{index < MIN_PHOTOS ? "Add photo" : "Optional"}</strong>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {(photoError || show("photos")) && (
              <p className="rpf-error" role="alert">
                <CircleAlert size={14} />
                {photoError || show("photos")}
              </p>
            )}
          </section>

          {/* DETAILS */}
          <section className="rpf-card">
            <header className="rpf-card-head">
              <div>
                <h2>Product details</h2>
                <p>Tell buyers what it is and the story behind it.</p>
              </div>
            </header>

            <div className="rpf-fields">
              <div className="rpf-field rpf-span-2">
                <label htmlFor="rpf-title">Title</label>
                <input
                  id="rpf-title"
                  type="text"
                  value={values.title}
                  maxLength={TITLE_MAX}
                  placeholder="e.g. Teak door console table"
                  onChange={(event) => setField("title", event.target.value)}
                  aria-invalid={show("title") ? "true" : undefined}
                  data-invalid={show("title") ? "true" : undefined}
                />
                <div className="rpf-meta-row">
                  <span className="rpf-error-inline">{show("title")}</span>
                  <span className="rpf-hint">
                    {values.title.length}/{TITLE_MAX}
                  </span>
                </div>
              </div>

              <div className="rpf-field rpf-span-2">
                <label htmlFor="rpf-category">Category</label>
                <div className="rpf-select">
                  <select
                    id="rpf-category"
                    value={values.category}
                    onChange={(event) => setField("category", event.target.value)}
                    aria-invalid={show("category") ? "true" : undefined}
                    data-invalid={show("category") ? "true" : undefined}
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                {show("category") && (
                  <span className="rpf-error-inline">{show("category")}</span>
                )}
              </div>

              <div className="rpf-field rpf-span-2">
                <label htmlFor="rpf-description">Description</label>
                <textarea
                  id="rpf-description"
                  rows={6}
                  value={values.description}
                  maxLength={DESC_MAX}
                  placeholder="What did it start as? What did you change? Mention size, finish and how to care for it."
                  onChange={(event) => setField("description", event.target.value)}
                  aria-invalid={show("description") ? "true" : undefined}
                  data-invalid={show("description") ? "true" : undefined}
                />
                <div className="rpf-meta-row">
                  <span className="rpf-error-inline">{show("description")}</span>
                  <span className="rpf-hint">
                    {values.description.length}/{DESC_MAX}
                  </span>
                </div>
              </div>

              <div className="rpf-field rpf-span-2">
                <label htmlFor="rpf-materials">Materials</label>
                <div className="rpf-chips-input">
                  {values.materials.map((material) => (
                    <span className="rpf-chip" key={material}>
                      {material}
                      <button
                        type="button"
                        onClick={() => removeMaterial(material)}
                        aria-label={`Remove ${material}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    id="rpf-materials"
                    type="text"
                    value={materialDraft}
                    onChange={(event) => setMaterialDraft(event.target.value)}
                    onKeyDown={handleMaterialKey}
                    onBlur={() => addMaterial(materialDraft)}
                    placeholder={values.materials.length ? "Add another" : "Type a material and press Enter"}
                  />
                </div>
                {unusedSuggestions.length > 0 && (
                  <div className="rpf-suggest">
                    {unusedSuggestions.map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion}
                        onClick={() => addMaterial(suggestion)}
                      >
                        <Plus size={11} />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* PRICE + STOCK */}
          <section className="rpf-card">
            <header className="rpf-card-head">
              <div>
                <h2>Price and stock</h2>
                <p>Set what buyers pay and how many you can make.</p>
              </div>
            </header>

            <div className="rpf-fields">
              <div className="rpf-field">
                <label htmlFor="rpf-price">Price</label>
                <div
                  className={`rpf-prefix ${show("price") ? "has-error" : ""}`}
                  data-invalid={show("price") ? "true" : undefined}
                >
                  <span>₹</span>
                  <input
                    id="rpf-price"
                    type="text"
                    inputMode="numeric"
                    value={values.price}
                    placeholder="0"
                    onChange={handlePrice}
                    aria-invalid={show("price") ? "true" : undefined}
                  />
                </div>
                {show("price") && <span className="rpf-error-inline">{show("price")}</span>}
              </div>

              <div className="rpf-field">
                <label htmlFor="rpf-stock">Stock</label>
                <div className="rpf-stepper">
                  <button
                    type="button"
                    onClick={() => changeStock(-1)}
                    aria-label="Decrease stock"
                    disabled={Number(values.stock) <= 0}
                  >
                    <Minus size={15} />
                  </button>
                  <input
                    id="rpf-stock"
                    type="text"
                    inputMode="numeric"
                    value={values.stock}
                    onChange={handleStock}
                  />
                  <button
                    type="button"
                    onClick={() => changeStock(1)}
                    aria-label="Increase stock"
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <span className="rpf-hint">
                  {soldOut
                    ? "At 0, buyers see this as sold out."
                    : "Units you can ship right now."}
                </span>
              </div>
            </div>
          </section>

          {/* ORIGIN */}
          <section className="rpf-card">
            <header className="rpf-card-head">
              <div>
                <h2>Where did it come from?</h2>
                <p>
                  Link a ReOrbit item to show buyers the full journey of your
                  piece.
                </p>
              </div>
            </header>

            <div className="rpf-segment" role="radiogroup" aria-label="Product origin">
              {[
                { value: "item", label: "A ReOrbit item" },
                { value: "own", label: "My own materials" },
              ].map((option) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={values.originType === option.value}
                  className={values.originType === option.value ? "active" : ""}
                  key={option.value}
                  onClick={() => setField("originType", option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {values.originType === "item" ? (
              <div className="rpf-origin">
                <div className="rpf-field">
                  <label htmlFor="rpf-origin-item">Item you bought on ReOrbit</label>
                  <div className="rpf-select">
                    <select
                      id="rpf-origin-item"
                      value={values.originItemId}
                      onChange={(event) => setField("originItemId", event.target.value)}
                    >
                      <option value="">Choose an item</option>
                      {ORIGIN_ITEMS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title} (bought {item.bought})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {originItem && (
                  <ol className="rpf-trail" aria-label="Product journey">
                    <li>
                      <span className="dot" />
                      <div>
                        <strong>{originItem.title}</strong>
                        <small>Bought on ReOrbit, {originItem.bought}</small>
                      </div>
                    </li>
                    <li>
                      <span className="dot" />
                      <div>
                        <strong>Your workshop</strong>
                        <small>Cleaned, reshaped and finished</small>
                      </div>
                    </li>
                    <li>
                      <span className="dot final" />
                      <div>
                        <strong>{values.title.trim() || "This product"}</strong>
                        <small>Listed for buyers</small>
                      </div>
                    </li>
                  </ol>
                )}
              </div>
            ) : (
              <p className="rpf-note">
                <Info size={14} />
                Using your own materials is fine. Buyers will see that this piece
                was made in your studio.
              </p>
            )}
          </section>
        </div>

        {/* =================== SIDE COLUMN =================== */}
        <aside className="rpf-side">
          {/* PREVIEW */}
          <section className="rpf-preview-wrap">
            <h3>Marketplace preview</h3>

            <article className={`rpf-preview ${!values.active ? "is-off" : ""}`}>
              <div className="rpf-preview-media">
                {cover ? (
                  <img src={cover.url} alt="" />
                ) : (
                  <div className="rpf-preview-empty">
                    <ImagePlus size={26} />
                    <span>Your cover photo appears here</span>
                  </div>
                )}

                {soldOut && <span className="rpf-flag sold">Sold out</span>}
                {!values.active && !soldOut && <span className="rpf-flag off">Inactive</span>}
                {photoCount > 1 && (
                  <span className="rpf-flag count">{photoCount} photos</span>
                )}
              </div>

              <div className="rpf-preview-body">
                <span className="rpf-preview-cat">
                  {values.category || "Category"}
                </span>
                <h4 className={values.title.trim() ? "" : "placeholder"}>
                  {values.title.trim() || "Your product title"}
                </h4>

                {values.materials.length > 0 && (
                  <p className="rpf-preview-materials">
                    {values.materials.slice(0, 3).join(", ")}
                  </p>
                )}

                <div className="rpf-preview-foot">
                  <strong>{Number(values.price) > 0 ? formatPrice(values.price) : "₹ --"}</strong>
                  {originItem || values.originType === "item" ? (
                    <span className="rpf-origin-tag">
                      <Recycle size={12} />
                      From a ReOrbit item
                    </span>
                  ) : null}
                </div>
              </div>
            </article>
          </section>

          {/* VISIBILITY (EDIT) */}
          {isEdit && (
            <section className="rpf-card rpf-visibility">
              <div className="rpf-switch-row">
                <div>
                  <h3>{values.active ? "Active" : "Inactive"}</h3>
                  <p>
                    {values.active
                      ? "Buyers can find and buy this product."
                      : product?.status === "Draft"
                        ? "Still a draft. Turn this on to publish it."
                        : "Hidden from the marketplace. You can turn it back on anytime."}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={values.active}
                  aria-label="Product is active"
                  className={`rpf-switch ${values.active ? "on" : ""}`}
                  onClick={() => setField("active", !values.active)}
                >
                  <span />
                </button>
              </div>

              <p className="rpf-note subtle">
                <Info size={14} />
                Products can&apos;t be deleted. Deactivating keeps your order
                history and reviews intact.
              </p>
            </section>
          )}

          {/* CHECKLIST */}
          {(!isEdit || !complete) && (
            <section className="rpf-card rpf-checklist">
              <div className="rpf-checklist-head">
                <h3>{complete ? "Ready to publish" : "Before you publish"}</h3>
                <span>
                  {doneCount} of {checklist.length}
                </span>
              </div>

              <div
                className="rpf-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={checklist.length}
                aria-valuenow={doneCount}
              >
                <span style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
              </div>

              <ul>
                {checklist.map((item) => (
                  <li key={item.key} className={item.done ? "done" : ""}>
                    <span className="tick">{item.done && <Check size={12} strokeWidth={3} />}</span>
                    <span className="label">{item.label}</span>
                    {item.note && !item.done && <small>{item.note}</small>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ACTIONS */}
          <div className="rpf-actions">
            {isEdit ? (
              <>
                <button
                  type="button"
                  className="rpf-btn primary"
                  onClick={handleSaveEdit}
                  disabled={!dirty}
                >
                  Save changes
                </button>
                <button
                  type="button"
                  className="rpf-btn ghost"
                  onClick={handleDiscard}
                  disabled={!dirty}
                >
                  Discard changes
                </button>
              </>
            ) : (
              <>
                <button type="button" className="rpf-btn primary" onClick={handlePublish}>
                  Publish product
                </button>
                <button type="button" className="rpf-btn ghost" onClick={handleSaveDraft}>
                  Save as draft
                </button>
              </>
            )}
          </div>
        </aside>
      </div>

      {toast && (
        <div className={`rpf-toast ${toast.tone}`} role="status" aria-live="polite">
          {toast.tone === "success" ? <Check size={16} /> : <CircleAlert size={16} />}
          {toast.text}
        </div>
      )}
    </section>
  );
}
