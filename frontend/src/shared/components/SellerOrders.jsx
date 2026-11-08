import React, { useCallback, useEffect, useRef, useState } from "react";
import Spinner, { PageLoader } from "./Spinner";
import "./Spinner.css";
import "./SellerOrders.css";

/* Orders a seller has to fulfil. One component for members, ReMakers and admins.
     <SellerOrders api={salesApi} role="remaker" accent="#7a5230" />
   `api` comes from api/orders.js (sellerOrdersApi). Lists are paged by the server,
   a change updates just that row, and nothing polls. */

const TABS = [
  { key: "", label: "All" },
  { key: "Confirmed", label: "To pack" },
  { key: "Packed", label: "To ship" },
  { key: "Shipped", label: "On the way" },
  { key: "Delivered", label: "Delivered" },
  { key: "Cancelled", label: "Cancelled" },
];
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const when = (v) => (v ? new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
const NEXT = { Confirmed: ["pack", "Mark as packed"], Packed: ["ship", "Mark as shipped"], Shipped: ["deliver", "Mark as delivered"] };

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export default function SellerOrders({ api, role = "user", accent = "#2a4d3a", onToast, fixedType = "" }) {
  const [tab, setTab] = useState("");
  const [type, setType] = useState(fixedType);
  const [note, setNote] = useState("");
  const noteTimer = useRef(null);
  const say = useCallback((m) => {
    setNote(m);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(""), 3000);
    onToast?.(m);
  }, [onToast]);
  useEffect(() => () => clearTimeout(noteTimer.current), []);
  const [text, setText] = useState("");
  const q = useDebounced(text.trim());
  const [state, setState] = useState({ rows: [], counts: {}, page: 0, pages: 1, loading: true, more: false, error: "" });
  const seq = useRef(0);

  const load = useCallback(async (page = 1) => {
    const mine = ++seq.current;
    setState((s) => ({ ...s, loading: page === 1, more: page > 1, error: "" }));
    const params = new URLSearchParams({ page, page_size: 20 });
    if (tab) params.set("status", tab);
    if (q) params.set("q", q);
    if (type) params.set("seller_type", type);
    try {
      const d = await api.list(`?${params}`);
      if (mine !== seq.current) return;
      setState((s) => ({
        rows: page === 1 ? d.results : [...s.rows, ...d.results],
        counts: d.counts || {}, page: d.page, pages: d.total_pages, loading: false, more: false, error: "",
      }));
    } catch (e) {
      if (mine === seq.current) setState((s) => ({ ...s, loading: false, more: false, error: e.message || "Could not load orders." }));
    }
  }, [api, tab, q, type]);

  useEffect(() => { load(1); }, [load]);

  const replace = (order) =>
    setState((s) => {
      const old = s.rows.find((r) => r.id === order.id);
      const counts = { ...s.counts };
      if (old && old.status !== order.status) {
        counts[old.status] = Math.max(0, (counts[old.status] || 1) - 1);
        counts[order.status] = (counts[order.status] || 0) + 1;
      }
      /* a row that no longer matches the open tab leaves the list */
      const rows = s.rows.flatMap((r) => (r.id !== order.id ? [r] : tab && order.status !== tab ? [] : [order]));
      return { ...s, rows, counts };
    });

  const total = Object.values(state.counts).reduce((n, c) => n + c, 0);

  return (
    <div className="so" style={{ "--so-accent": accent }}>
      <div className="so-tools">
        <div className="so-tabs" role="tablist" aria-label="Order status">
          {TABS.map((t) => (
            <button key={t.key || "all"} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
              {t.label} <em>{t.key ? state.counts[t.key] || 0 : total}</em>
            </button>
          ))}
        </div>
        <div className="so-filters">
          {role === "admin" && !fixedType && (
            <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Seller type">
              <option value="">All sellers</option>
              <option value="platform">ReOrbit store</option>
              <option value="remaker">ReMakers</option>
              <option value="user">Members</option>
            </select>
          )}
          <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={role === "admin" ? "Order, product or buyer" : "Order or product"} aria-label="Search orders" />
        </div>
      </div>

      {note && <p className="so-note-bar" role="status">{note}</p>}

      {state.error && (
        <p className="so-error" role="alert">{state.error} <button type="button" onClick={() => load(1)}>Try again</button></p>
      )}

      {state.loading ? (
        <PageLoader label="Loading orders…" />
      ) : state.rows.length === 0 && !state.error ? (
        <div className="so-empty">
          <strong>{q || tab || type ? "No orders match this view." : "No orders yet."}</strong>
          <span>{q || tab || type ? "Try another tab or search." : "When someone buys from you, the order shows up here to pack and ship."}</span>
        </div>
      ) : (
        <div className="so-list" aria-busy={state.more}>
          {state.rows.map((o) => (
            <OrderRow key={o.id} order={o} role={role} api={api} onChange={replace} onToast={say} />
          ))}
          {state.page < state.pages && (
            <button type="button" className="so-btn ghost so-more" onClick={() => load(state.page + 1)} disabled={state.more}>
              {state.more ? <Spinner label="Loading…" /> : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function OrderRow({ order: o, role, api, onChange, onToast }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(null); /* null | "ship" | "cancel" */
  const [vals, setVals] = useState({ courier_name: "", tracking_no: "", reason: "" });
  const [busy, setBusy] = useState("");
  const [errs, setErrs] = useState({});
  const [msg, setMsg] = useState("");

  const view = detail && detail.id === o.id ? { ...o, ...detail } : o;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !detail) {
      try { setDetail(await api.get(o.id)); } catch (e) { setMsg(e.message || "Could not load details."); }
    }
  };

  const act = async (action, body = {}) => {
    if (busy) return;
    setBusy(action); setErrs({}); setMsg("");
    try {
      const updated = await api.act(o.id, action, body);
      setDetail(updated);
      setForm(null);
      onChange(updated);
      onToast?.(action === "cancel" ? `${o.id} cancelled.` : `${o.id} updated.`);
    } catch (e) {
      setErrs(e.errors || {});
      setMsg(e.errors ? "" : e.message || "Something went wrong. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const next = NEXT[o.status];
  const online = o.payment.method !== "COD";
  const a = view.address || {};

  return (
    <article className="so-card">
      <header>
        <b>{o.id}</b>
        <span className={`so-badge s-${o.status}`}>{o.status.replace("_", " ")}</span>
        <span className="so-badge pay">{online ? (o.payment.status === "Paid" ? "Paid online" : o.payment.status) : o.payment.status === "Paid" ? "Cash collected" : "Pay on delivery"}</span>
        {role === "admin" && <span className="so-badge who">{o.seller.type === "platform" ? "ReOrbit" : o.seller.name}</span>}
        <time>{when(o.created_at)}</time>
      </header>

      <ul className="so-lines">
        {o.items.map((ln) => (
          <li key={ln.id}>
            {ln.cover ? <img src={ln.cover} alt="" loading="lazy" /> : <span className="so-noimg" />}
            <div><b>{ln.title}</b><small>{ln.qty} × {inr(ln.unit_price)}</small></div>
            <span>{inr(ln.line_total)}</span>
          </li>
        ))}
      </ul>

      <div className="so-meta">
        <span>{o.buyer ? <>Buyer: <b>{o.buyer.name}</b></> : null}{a.city ? <> · {a.city} {a.pincode}</> : null}</span>
        <span className="so-money">
          {role === "admin" ? <>Buyer pays <b>{inr(o.total)}</b></> : <>Items <b>{inr(o.subtotal)}</b>{!online && o.payment.status !== "Paid" ? <> · collect {inr(o.total)} on delivery</> : null}</>}
        </span>
      </div>

      {o.courier && <p className="so-courier">{o.courier.name} · {o.courier.tracking_no}</p>}
      {o.status === "Cancelled" && <p className="so-courier bad">Cancelled{o.cancel_reason ? `: ${o.cancel_reason}` : ""}</p>}
      {o.payment.status === "Refund_Failed" && <p className="so-courier bad">The refund needs attention. ReOrbit has been told.</p>}
      {msg && <p className="so-error" role="alert">{msg}</p>}

      {form === "ship" && (
        <div className="so-form">
          <label>Courier<input value={vals.courier_name} onChange={(e) => setVals({ ...vals, courier_name: e.target.value })} maxLength={60} placeholder="e.g. Delhivery" />{errs.courier_name && <small>{errs.courier_name[0]}</small>}</label>
          <label>Tracking number<input value={vals.tracking_no} onChange={(e) => setVals({ ...vals, tracking_no: e.target.value })} maxLength={60} placeholder="AWB / tracking number" />{errs.tracking_no && <small>{errs.tracking_no[0]}</small>}</label>
          <div className="so-actions">
            <button type="button" className="so-btn ghost" onClick={() => setForm(null)} disabled={!!busy}>Back</button>
            <button type="button" className="so-btn" onClick={() => act("ship", vals)} disabled={!!busy}>{busy === "ship" ? <Spinner label="Saving…" /> : "Confirm shipped"}</button>
          </div>
        </div>
      )}
      {form === "cancel" && (
        <div className="so-form">
          <label>Reason (the buyer is told)<input value={vals.reason} onChange={(e) => setVals({ ...vals, reason: e.target.value })} maxLength={200} placeholder="e.g. Item damaged, out of material" />{errs.reason && <small>{errs.reason[0]}</small>}</label>
          <div className="so-actions">
            <button type="button" className="so-btn ghost" onClick={() => setForm(null)} disabled={!!busy}>Keep order</button>
            <button type="button" className="so-btn danger" onClick={() => act("cancel", { reason: vals.reason })} disabled={!!busy}>{busy === "cancel" ? <Spinner label="Cancelling…" /> : "Cancel order"}</button>
          </div>
        </div>
      )}

      {!form && (
        <div className="so-actions">
          <button type="button" className="so-btn ghost" onClick={toggle} aria-expanded={open}>{open ? "Hide details" : "Details"}</button>
          {(o.status === "Confirmed" || o.status === "Packed") && (
            <button type="button" className="so-btn ghost danger" onClick={() => setForm("cancel")} disabled={!!busy}>Cancel</button>
          )}
          {next && (
            <button type="button" className="so-btn" disabled={!!busy} onClick={() => (next[0] === "ship" ? setForm("ship") : act(next[0]))}>
              {busy === next[0] ? <Spinner label="Saving…" /> : next[1]}
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="so-detail">
          {!detail ? <Spinner label="Loading…" /> : (
            <>
              <div>
                <h4>Deliver to</h4>
                <p>{a.name}<br />{[a.line1, a.line2].filter(Boolean).join(", ")}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
                {view.note && <p className="so-note">Note: {view.note}</p>}
              </div>
              <div>
                <h4>History</h4>
                <ol>{(view.events || []).map((e, i) => <li key={`${e.label}-${i}`}><b>{e.label}</b>{e.detail ? ` · ${e.detail}` : ""}<time>{when(e.at)}</time></li>)}</ol>
              </div>
            </>
          )}
        </div>
      )}
    </article>
  );
}
