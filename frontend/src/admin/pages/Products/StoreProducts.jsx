import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";

import { adminStoreApi as api, fetchProductCategories, syncPhotos } from "../../../api/products";
import { useAccess } from "../../data/teamStore";
import { formatINR } from "../../utils/format";
import Pagination from "../../components/ui/Pagination";
import ErrorState from "../../components/ui/ErrorState";
import { SkeletonRows } from "../../../shared/components/Skeleton";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/products/ProductsReal.css";

const LABEL = { Draft: "Draft", Listed: "Live", Sold_Out: "Sold out", Inactive: "Paused" };
const MAX_PHOTOS = 8;

const blank = { title: "", sku: "", category: "", price: "", stock: "", description: "", photos: [] };
const toForm = (p) => ({
  title: p.title, sku: p.sku, category: p.category.id, price: String(Number(p.price) || ""),
  stock: String(p.stock), description: p.description,
  photos: p.images.map((i) => ({ key: `s${i.id}`, serverId: i.id, url: i.url })),
});

function checkForm(f) {
  const e = {};
  if (f.title.trim().length < 3) e.title = "Enter a title (at least 3 characters).";
  if (!f.category) e.category = "Choose a category.";
  if (!(Number(f.price) >= 1) || !Number.isInteger(Number(f.price))) e.price = "Enter a whole-rupee price.";
  if (f.stock === "" || !(Number(f.stock) >= 0) || !Number.isInteger(Number(f.stock))) e.stock = "Enter the stock (0 or more).";
  return e;
}

/* The product form. Saves as a draft; "Save and publish" also lists it. */
function ProductModal({ product, categories, onClose, onSaved }) {
  const [f, setF] = useState(product ? toForm(product) : blank);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const fileRef = useRef(null);
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }));

  const addFiles = (list) => {
    const room = MAX_PHOTOS - f.photos.length;
    const next = [...list].filter((x) => x.type.startsWith("image/") && x.size <= 5 * 1024 * 1024).slice(0, room)
      .map((file) => ({ key: `${file.name}-${Math.random()}`, file, url: URL.createObjectURL(file) }));
    set("photos", [...f.photos, ...next]);
  };

  const save = async (publish) => {
    const e = checkForm(f);
    if (publish) {
      if (f.description.trim().length < 10) e.description = "Describe the product (at least 10 characters).";
      if (Number(f.stock) < 1) e.stock = "Add at least 1 in stock to publish.";
      if (!f.photos.length) e.photos = "Add at least one photo to publish.";
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setProblem("");
    try {
      const body = { title: f.title, category: f.category, description: f.description, price: Number(f.price), stock: Number(f.stock) };
      if (f.sku.trim()) body.sku = f.sku.trim();
      let row = product ? await api.update(product.id, body) : await api.create(body);
      await syncPhotos(api, row.id, f.photos, product ? product.images : row.images);
      row = await api.get(row.id);
      if (publish && row.status !== "Listed" && row.status !== "Sold_Out") row = await api.publish(row.id);
      onSaved(row, publish ? "Product published." : "Product saved.");
    } catch (err) {
      const first = err.errors && Object.entries(err.errors)[0];
      if (first) setErrors({ [first[0]]: Array.isArray(first[1]) ? first[1][0] : first[1] });
      setProblem(err.message || "Could not save the product.");
      setBusy(false);
    }
  };

  const field = (name, label, input) => (
    <label className={`apr-field ${errors[name] ? "bad" : ""}`}>{label}{input}{errors[name] && <small>{errors[name]}</small>}</label>
  );

  return (
    <div className="ad-modal-backdrop apr-form" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="ad-modal" role="dialog" aria-modal="true" aria-label={product ? "Edit product" : "Add product"}>
        <h3>{product ? "Edit product" : "Add a ReOrbit product"}</h3>
        <div className="apr-grid">
          <div className="wide">{field("title", "Title", <input value={f.title} maxLength={150} onChange={(e) => set("title", e.target.value)} />)}</div>
          {field("sku", "SKU (optional)", <input value={f.sku} placeholder="Created for you if left empty" onChange={(e) => set("sku", e.target.value)} />)}
          {field("category", "Category", (
            <select value={f.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Choose…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ))}
          {field("price", "Price (₹)", <input inputMode="numeric" value={f.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, "").slice(0, 8))} />)}
          {field("stock", "Stock", <input inputMode="numeric" value={f.stock} onChange={(e) => set("stock", e.target.value.replace(/\D/g, "").slice(0, 5))} />)}
          <div className="wide">{field("description", "Description", <textarea rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} />)}</div>
          <div className="wide apr-field">
            Photos (first is the cover)
            <div className="apr-photos">
              {f.photos.map((p, i) => (
                <span className="apr-photo" key={p.key}>
                  <img src={p.url} alt="" />
                  {i === 0 && <em>Cover</em>}
                  <button type="button" aria-label="Remove photo" onClick={() => set("photos", f.photos.filter((x) => x !== p))}><X size={12} /></button>
                </span>
              ))}
              {f.photos.length < MAX_PHOTOS && (
                <button type="button" className="apr-add" onClick={() => fileRef.current?.click()} aria-label="Add photos"><Plus size={18} /></button>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </div>
            {errors.photos && <small style={{ color: "#c0392b" }}>{errors.photos}</small>}
          </div>
        </div>
        {problem && <p className="apr-note" role="alert">{problem}</p>}
        <div className="ad-modal-actions">
          <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="ad-btn ad-btn-ghost" onClick={() => save(false)} disabled={busy}>Save as draft</button>
          <button type="button" className="ad-btn ad-btn-primary" onClick={() => save(true)} disabled={busy}>
            {busy ? "Saving…" : product && ["Listed", "Sold_Out"].includes(product.status) ? "Save changes" : "Save and publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StoreProducts({ toast }) {
  const { can } = useAccess();
  const canEdit = can("products", "edit");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | product

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page, page_size: pageSize });
    if (query.trim()) qs.set("q", query.trim());
    if (status) qs.set("status", status);
    setError("");
    api.list(`?${qs}`).then(setData).catch((e) => setError(e.message || "Could not load products."));
  }, [page, pageSize, query, status]);

  useEffect(() => {
    const t = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, query]);
  useEffect(() => { fetchProductCategories().then(setCategories).catch(() => {}); }, []);

  const swap = (row) => setData((d) => ({ ...d, results: d.results.map((r) => (r.id === row.id ? row : r)) }));
  const act = async (job, okText) => {
    try { swap(await job()); toast(okText); } catch (e) { toast(e.message || "Something went wrong."); }
  };
  const remove = async (p) => {
    try { await api.remove(p.id); toast("Product deleted."); load(); } catch (e) { toast(e.message || "Could not delete."); }
  };

  return (
    <section className="au-panel">
      <div className="au-toolbar">
        <label className="au-search">
          <Search size={16} />
          <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search title" aria-label="Search store products" />
        </label>
        <div className="au-toolbar-right">
          <label className="au-select">
            <span>Status</span>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All</option><option value="Listed">Live</option><option value="Sold_Out">Sold out</option>
              <option value="Inactive">Paused</option><option value="Draft">Draft</option>
            </select>
          </label>
          {canEdit && <button type="button" className="ad-btn ad-btn-primary" onClick={() => setEditing("new")}><Plus size={16} /> Add product</button>}
        </div>
      </div>

      {error ? <ErrorState text={error} onRetry={load} /> : !data ? <SkeletonRows count={6} /> : data.results.length === 0 ? (
        <p className="apr-empty">{query || status ? "No products match." : "ReOrbit isn't selling any products yet. Add the first one."}</p>
      ) : (
        <table className="apr-table">
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr></thead>
          <tbody>
            {data.results.map((p) => (
              <tr key={p.id}>
                <td><div className="apr-prod">
                  {p.cover ? <img src={p.cover} alt="" loading="lazy" /> : <span className="apr-noimg" />}
                  <span><b>{p.title}</b><small>{p.sku}</small></span></div></td>
                <td>{p.category.name}</td>
                <td>{formatINR(Number(p.price))}</td>
                <td>{p.stock}</td>
                <td><span className={`apr-badge ${p.status}`}>{LABEL[p.status]}</span></td>
                <td><div className="apr-actions">
                  {canEdit && <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setEditing(p)}>Edit</button>}
                  {canEdit && ["Listed", "Sold_Out"].includes(p.status) && (
                    <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => act(() => api.pause(p.id), "Product paused.")}>Pause</button>)}
                  {canEdit && ["Inactive", "Draft"].includes(p.status) && (
                    <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => act(() => api.publish(p.id), "Product is live.")}>Publish</button>)}
                  {canEdit && ["Inactive", "Draft"].includes(p.status) && (
                    <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => remove(p)}>Delete</button>)}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data && data.count > 0 && (
        <Pagination page={data.page} pageSize={pageSize} total={data.count} onPage={setPage}
          onPageSize={(n) => { setPageSize(n); setPage(1); }} />
      )}

      {editing && (
        <ProductModal
          product={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={(row, msg) => { setEditing(null); toast(msg); load(); }}
        />
      )}
    </section>
  );
}
