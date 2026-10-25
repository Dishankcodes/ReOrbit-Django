import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  FileText,
  Images,
  IndianRupee,
  ClipboardCheck,
  Warehouse,
  RefreshCw,
  Package,
  Info,
  PackageX,
} from "lucide-react";

import {
  useSellListing,
  useListableStock,
  saveListing,
} from "../../data/sellStore";
import {
  SELL_CATEGORIES,
  SELL_CONDITIONS,
  SELL_SOURCES,
} from "../../data/adminSell";
import { formatINR } from "../../utils/format";
import SellNav from "./components/SellNav";
import PhotoUploader, {
  MIN_PHOTOS,
  MAX_PHOTOS,
} from "./components/PhotoUploader";
import ListingPreview from "./components/ListingPreview";
import EmptyState from "../../components/ui/EmptyState";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/shop/AdminShop.css";
import "../../css/sell/AdminSell.css";

const STEPS = [
  { key: "basics", label: "Details", icon: FileText },
  { key: "photos", label: "Photos", icon: Images },
  { key: "pricing", label: "Price & stock", icon: IndianRupee },
  { key: "review", label: "Review", icon: ClipboardCheck },
];
const SRC_ICON = {
  warehouse: Warehouse,
  refurbished: RefreshCw,
  other: Package,
};
const EMPTY = {
  source: "warehouse",
  inventory_id: null,
  title: "",
  category: "",
  condition: "",
  description: "",
  images: [],
  price: "",
  mrp: "",
  quantity: "1",
  delivery: "flat",
  returnable: true,
  specs: { material: "", dimensions: "", weight: "", warranty: "None" },
};

function errorsFor(step, f) {
  const e = {};
  if (step === "basics") {
    if (f.title.trim().length < 5)
      e.title = "Add a clear title (at least 5 characters).";
    if (!f.category) e.category = "Choose a category.";
    if (!f.condition) e.condition = "Choose the condition.";
    if (f.description.trim().length < 30)
      e.description = "Describe the product in at least 30 characters.";
  }
  if (step === "photos" && f.images.length < MIN_PHOTOS)
    e.images = `Add at least ${MIN_PHOTOS} photos (you have ${f.images.length}).`;
  if (step === "pricing") {
    if (!(Number(f.price) > 0)) e.price = "Enter the selling price.";
    if (f.mrp !== "" && Number(f.mrp) < Number(f.price))
      e.mrp = "The original price should not be lower than the selling price.";
    if (!(
      Number.isInteger(Number(f.quantity)) &&
      Number(f.quantity) >= 1 &&
      Number(f.quantity) <= 999
    ))
      e.quantity = "Quantity must be a whole number from 1 to 999.";
    if (f.specs.weight !== "" && !(Number(f.specs.weight) > 0))
      e.weight = "Weight must be a number in kg.";
  }
  return e;
}

export default function AdminSellForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = useSellListing(id);
  const stock = useListableStock();

  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState("basics");
  const [touched, setTouched] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (editing && !loaded) {
      setForm({
        ...EMPTY,
        ...editing,
        price: String(editing.price),
        mrp: editing.mrp ? String(editing.mrp) : "",
        quantity: String(editing.quantity),
        specs: { ...EMPTY.specs, ...editing.specs },
      });
      setLoaded(true);
    }
  }, [editing, loaded]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setSpec = (k, v) =>
    setForm((f) => ({ ...f, specs: { ...f.specs, [k]: v } }));
  const idx = STEPS.findIndex((s) => s.key === step);
  const errs = useMemo(() => errorsFor(step, form), [step, form]);
  const show = (k) => touched[step] && errs[k];

  if (id && !editing) {
    return (
      <div className="au-page sh-page">
        <SellNav />
        <section className="au-panel">
          <EmptyState
            icon={PackageX}
            title="Listing not found"
            text="This listing does not exist or was deleted."
            action={
              <button
                type="button"
                className="ad-btn ad-btn-primary ad-btn-sm"
                onClick={() => navigate("/admin-sell")}
              >
                <ArrowLeft size={14} /> My listings
              </button>
            }
          />
        </section>
      </div>
    );
  }

  const next = () => {
    setTouched((t) => ({ ...t, [step]: true }));
    if (Object.keys(errs).length === 0) setStep(STEPS[idx + 1].key);
  };
  const goTo = (key) => {
    const target = STEPS.findIndex((s) => s.key === key);
    if (target <= idx) {
      setStep(key);
      return;
    }
    /* moving forward needs every earlier step to be valid */
    for (let i = 0; i < target; i += 1) {
      if (Object.keys(errorsFor(STEPS[i].key, form)).length) {
        setStep(STEPS[i].key);
        setTouched((t) => ({ ...t, [STEPS[i].key]: true }));
        return;
      }
    }
    setStep(key);
  };

  const pick = (item) => {
    const cat = SELL_CATEGORIES.includes(item.category)
      ? item.category
      : "Other";
    setForm((f) => ({
      ...f,
      inventory_id: item.inventory_id,
      title: item.title,
      category: cat,
      condition:
        f.source === "refurbished"
          ? "Refurbished"
          : SELL_CONDITIONS.includes(item.condition)
            ? item.condition
            : "Good",
      price: String(item.list_price),
      mrp: String(
        item.original_price > item.list_price
          ? item.original_price
          : Math.round((item.list_price * 1.25) / 10) * 10,
      ),
      quantity: String(item.quantity),
      images: f.images.length ? f.images : [item.image],
    }));
  };

  const payload = () => ({
    ...(editing ? { id: editing.id } : {}),
    source: form.source,
    inventory_id: form.inventory_id,
    title: form.title.trim(),
    category: form.category,
    condition: form.condition,
    description: form.description.trim(),
    images: form.images,
    price: Number(form.price),
    mrp: form.mrp === "" ? 0 : Number(form.mrp),
    quantity: Number(form.quantity),
    delivery: form.delivery,
    returnable: form.returnable,
    specs: {
      ...form.specs,
      weight: form.specs.weight === "" ? "" : String(form.specs.weight),
    },
  });
  const publish = (live) => {
    const all = ["basics", "photos", "pricing"];
    for (const s of all) {
      if (Object.keys(errorsFor(s, form)).length) {
        setStep(s);
        setTouched((t) => ({ ...t, [s]: true }));
        return;
      }
    }
    const lid = saveListing(payload(), { publish: live });
    navigate(`/admin-sell/listing/${lid}`, {
      state: { saved: live ? (editing ? "updated" : "published") : "draft" },
    });
  };

  const field = (label, k, props = {}) => (
    <label className={`sh-field ${props.wide ? "wide" : ""}`}>
      <span>
        {label}
        {props.opt && <em> (optional)</em>}
      </span>
      {props.children || (
        <input
          value={form[k]}
          onChange={(e) => set(k, e.target.value)}
          aria-invalid={!!show(k)}
          {...props.input}
        />
      )}
      {show(k) && <small>{errs[k]}</small>}
    </label>
  );

  return (
    <div className="au-page sh-page">
      <SellNav />
      <header className="sh-pagehead">
        <div>
          <h2>{editing ? "Edit product" : "Add a product to sell"}</h2>
          <p>
            {editing
              ? `Editing ${editing.id}`
              : "Fill in the details, add 3 to 4 photos and publish."}
          </p>
        </div>
        <Link to="/admin-sell" className="sh-link">
          <ArrowLeft size={14} /> Back to listings
        </Link>
      </header>

      <ol className="sh-steps sl-steps" aria-label="Progress">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < idx;
          return (
            <li
              key={s.key}
              className={`${i === idx ? "now" : ""} ${done ? "done" : ""}`}
              aria-current={i === idx ? "step" : undefined}
            >
              <button
                type="button"
                onClick={() => goTo(s.key)}
                style={{ cursor: "pointer" }}
              >
                <span>{done ? <Check size={15} /> : <Icon size={15} />}</span>
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="sh-cartgrid sl-formgrid">
        <div className="sh-checkout-main">
          {/* ---------- 1. details ---------- */}
          {step === "basics" && (
            <section className="sh-panel">
              <header className="sh-sec-head">
                <div>
                  <h3>What are you selling?</h3>
                  <p>Pick where it comes from, then describe it.</p>
                </div>
              </header>
              <div
                className="sl-sources"
                role="radiogroup"
                aria-label="Where the product comes from"
              >
                {Object.entries(SELL_SOURCES).map(([k, v]) => {
                  const Icon = SRC_ICON[k];
                  return (
                    <label
                      key={k}
                      className={`sl-source ${form.source === k ? "on" : ""} ${editing ? "locked" : ""}`}
                    >
                      <input
                        type="radio"
                        name="source"
                        checked={form.source === k}
                        disabled={!!editing}
                        onChange={() => {
                          set("source", k);
                          if (k === "other") set("inventory_id", null);
                        }}
                      />
                      <span className="sl-source-ico">
                        <Icon size={18} />
                      </span>
                      <div>
                        <strong>{v.label}</strong>
                        <small>{v.hint}</small>
                      </div>
                    </label>
                  );
                })}
              </div>

              {form.source !== "other" && !editing && (
                <div className="sl-stockpick">
                  <h4>
                    <Warehouse size={14} /> Start from warehouse stock{" "}
                    <em>(optional)</em>
                  </h4>
                  {stock.length === 0 ? (
                    <p className="sh-muted">
                      No unlisted stock on the shelves right now. You can still
                      fill in the details by hand.
                    </p>
                  ) : (
                    <ul>
                      {stock.map((i) => (
                        <li key={i.inventory_id}>
                          <button
                            type="button"
                            className={
                              form.inventory_id === i.inventory_id ? "on" : ""
                            }
                            onClick={() =>
                              form.inventory_id === i.inventory_id
                                ? set("inventory_id", null)
                                : pick(i)
                            }
                          >
                            <img src={i.image} alt="" />
                            <div>
                              <strong>{i.title}</strong>
                              <span>
                                {i.inventory_id} · {i.condition} ·{" "}
                                {formatINR(i.list_price)}
                              </span>
                            </div>
                            {form.inventory_id === i.inventory_id && (
                              <Check size={16} />
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {form.inventory_id && (
                    <p className="sl-linknote">
                      <Info size={13} /> Publishing will also mark{" "}
                      {form.inventory_id} as listed in the warehouse.
                    </p>
                  )}
                </div>
              )}

              <div className="sh-form-grid">
                {field("Product title", "title", {
                  wide: true,
                  input: {
                    placeholder: "e.g. Restored Teak Drawer Chest",
                    maxLength: 80,
                  },
                })}
                {field("Category", "category", {
                  children: (
                    <select
                      value={form.category}
                      onChange={(e) => set("category", e.target.value)}
                      aria-invalid={!!show("category")}
                    >
                      <option value="">Choose a category</option>
                      {SELL_CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  ),
                })}
                {field("Condition", "condition", {
                  children: (
                    <select
                      value={form.condition}
                      onChange={(e) => set("condition", e.target.value)}
                      aria-invalid={!!show("condition")}
                    >
                      <option value="">Choose condition</option>
                      {SELL_CONDITIONS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  ),
                })}
                {field(
                  `Description (${form.description.length}/600)`,
                  "description",
                  {
                    wide: true,
                    children: (
                      <textarea
                        rows={5}
                        maxLength={600}
                        value={form.description}
                        onChange={(e) => set("description", e.target.value)}
                        placeholder="What it is, its history, what was repaired or restored, and any marks buyers should know about."
                        aria-invalid={!!show("description")}
                      />
                    ),
                  },
                )}
              </div>
              <div className="sh-step-actions">
                <button
                  type="button"
                  className="ad-btn ad-btn-primary"
                  onClick={next}
                >
                  Continue to photos
                </button>
              </div>
            </section>
          )}

          {/* ---------- 2. photos ---------- */}
          {step === "photos" && (
            <section className="sh-panel">
              <header className="sh-sec-head">
                <div>
                  <h3>Add photos</h3>
                  <p>
                    {MIN_PHOTOS} to {MAX_PHOTOS} clear photos sell faster. The
                    first one is the cover.
                  </p>
                </div>
              </header>
              <PhotoUploader
                images={form.images}
                onChange={(imgs) => set("images", imgs)}
              />
              {show("images") && (
                <p className="sl-photo-error" role="alert">
                  {errs.images}
                </p>
              )}
              <ul className="sl-tips">
                <li>Use daylight and a plain background.</li>
                <li>Show every side and any marks or repairs.</li>
                <li>Keep the cover photo square or 4:3.</li>
              </ul>
              <div className="sh-step-actions split">
                <button
                  type="button"
                  className="ad-btn ad-btn-ghost"
                  onClick={() => setStep("basics")}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="ad-btn ad-btn-primary"
                  onClick={next}
                >
                  Continue to price & stock
                </button>
              </div>
            </section>
          )}

          {/* ---------- 3. pricing ---------- */}
          {step === "pricing" && (
            <section className="sh-panel">
              <header className="sh-sec-head">
                <div>
                  <h3>Price, stock and delivery</h3>
                  <p>Set what buyers pay and how many you have.</p>
                </div>
              </header>
              <div className="sh-form-grid">
                {field("Selling price (₹)", "price", {
                  input: {
                    type: "number",
                    min: 1,
                    inputMode: "numeric",
                    placeholder: "e.g. 7499",
                  },
                })}
                {field("Original price (₹)", "mrp", {
                  opt: true,
                  input: {
                    type: "number",
                    min: 0,
                    inputMode: "numeric",
                    placeholder: "Shown crossed out",
                  },
                })}
                {field("Units available", "quantity", {
                  input: {
                    type: "number",
                    min: 1,
                    max: 999,
                    inputMode: "numeric",
                  },
                })}
                <label className="sh-field">
                  <span>Delivery</span>
                  <select
                    value={form.delivery}
                    onChange={(e) => set("delivery", e.target.value)}
                  >
                    <option value="free">Free delivery</option>
                    <option value="flat">₹149, free above ₹5,000</option>
                  </select>
                </label>
                <label className="sh-field">
                  <span>
                    Material <em>(optional)</em>
                  </span>
                  <input
                    value={form.specs.material}
                    onChange={(e) => setSpec("material", e.target.value)}
                    placeholder="e.g. Solid teak"
                  />
                </label>
                <label className="sh-field">
                  <span>
                    Dimensions <em>(optional)</em>
                  </span>
                  <input
                    value={form.specs.dimensions}
                    onChange={(e) => setSpec("dimensions", e.target.value)}
                    placeholder="e.g. 90 × 45 × 100 cm"
                  />
                </label>
                <label className="sh-field">
                  <span>
                    Weight, kg <em>(optional)</em>
                  </span>
                  <input
                    value={form.specs.weight}
                    onChange={(e) => setSpec("weight", e.target.value)}
                    inputMode="decimal"
                    aria-invalid={!!show("weight")}
                  />
                  {show("weight") && <small>{errs.weight}</small>}
                </label>
                <label className="sh-field">
                  <span>Warranty</span>
                  <select
                    value={form.specs.warranty}
                    onChange={(e) => setSpec("warranty", e.target.value)}
                  >
                    {["None", "3 months", "6 months", "1 year"].map((w) => (
                      <option key={w}>{w}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="sl-check">
                <input
                  type="checkbox"
                  checked={form.returnable}
                  onChange={(e) => set("returnable", e.target.checked)}
                />
                <span>
                  <strong>Accept returns within 7 days</strong>
                  <small>
                    Buyers can send it back if it is not as described.
                  </small>
                </span>
              </label>
              <div className="sh-step-actions split">
                <button
                  type="button"
                  className="ad-btn ad-btn-ghost"
                  onClick={() => setStep("photos")}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="ad-btn ad-btn-primary"
                  onClick={next}
                >
                  Review listing
                </button>
              </div>
            </section>
          )}

          {/* ---------- 4. review ---------- */}
          {step === "review" && (
            <section className="sh-panel">
              <header className="sh-sec-head">
                <div>
                  <h3>Review and publish</h3>
                  <p>Check everything. You can edit it later.</p>
                </div>
              </header>
              <div className="sl-review">
                <div className="sl-review-photos">
                  {form.images.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Photo ${i + 1}`}
                      className={i === 0 ? "cover" : ""}
                    />
                  ))}
                </div>
                <dl className="sl-review-list">
                  {[
                    ["Title", form.title],
                    [
                      "Source",
                      SELL_SOURCES[form.source].label +
                        (form.inventory_id ? ` · ${form.inventory_id}` : ""),
                    ],
                    ["Category", form.category],
                    ["Condition", form.condition],
                    [
                      "Price",
                      formatINR(Number(form.price)) +
                        (Number(form.mrp) > Number(form.price)
                          ? ` (was ${formatINR(Number(form.mrp))})`
                          : ""),
                    ],
                    ["Units", form.quantity],
                    [
                      "Delivery",
                      form.delivery === "free"
                        ? "Free"
                        : "₹149, free above ₹5,000",
                    ],
                    ["Returns", form.returnable ? "7 days" : "Not accepted"],
                    ["Warranty", form.specs.warranty],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="sl-review-desc">{form.description}</p>
              </div>
              <div className="sh-step-actions split">
                <button
                  type="button"
                  className="ad-btn ad-btn-ghost"
                  onClick={() => setStep("pricing")}
                >
                  Back
                </button>
                <div className="sl-final">
                  {(!editing || editing.rawStatus === "Draft") && (
                    <button
                      type="button"
                      className="ad-btn ad-btn-ghost"
                      onClick={() => publish(false)}
                    >
                      Save as draft
                    </button>
                  )}
                  <button
                    type="button"
                    className="ad-btn ad-btn-primary sh-big"
                    onClick={() => publish(true)}
                  >
                    {editing && editing.rawStatus !== "Draft"
                      ? "Save changes"
                      : "Publish listing"}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
        <aside className="sl-aside">
          <ListingPreview form={form} />
        </aside>
      </div>
    </div>
  );
}
