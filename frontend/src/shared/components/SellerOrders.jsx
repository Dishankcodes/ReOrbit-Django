import React, { useCallback, useEffect, useRef, useState } from "react";
import { orderOptionsApi } from "../../api/orders";
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
  { key: "Delivery_Failed", label: "Not delivered" },
  { key: "Cancelled", label: "Cancelled" },
];
/* tabs that filter on something other than the status */
const SPECIAL = { __returns: ["returns", "open", "returns_open", "Returns"], __cod: ["cod", "pending", "cod_pending", "COD cash"] };
const STATUS_KEYS = new Set(["Confirmed", "Packed", "Shipped", "Delivered", "Delivery_Failed", "Returned_To_Origin", "Cancelled", "Pending_Payment"]);
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
    if (SPECIAL[tab]) params.set(SPECIAL[tab][0], SPECIAL[tab][1]);
    else if (tab) params.set("status", tab);
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
      const rows = s.rows.flatMap((r) => (r.id !== order.id ? [r] : tab && !SPECIAL[tab] && order.status !== tab ? [] : [order]));
      return { ...s, rows, counts };
    });
  /* counters like "Returns" depend on more than the status, so re-read them after a change */
  const refreshCounts = useCallback(() => {
    api.list("?page=1&page_size=1").then((d) => setState((s) => ({ ...s, counts: d.counts || s.counts }))).catch(() => {});
  }, [api]);

  const total = Object.entries(state.counts).reduce((n, [k, c]) => (STATUS_KEYS.has(k) ? n + c : n), 0);
  const tabs = [...TABS, { key: "__returns", label: "Returns" }, ...(role === "admin" ? [{ key: "__cod", label: "COD cash" }] : [])];

  return (
    <div className="so" style={{ "--so-accent": accent }}>
      <div className="so-tools">
        <div className="so-tabs" role="tablist" aria-label="Order status">
          {tabs.map((t) => (
            <button key={t.key || "all"} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
              {t.label} <em>{SPECIAL[t.key] ? state.counts[SPECIAL[t.key][2]] || 0 : t.key ? state.counts[t.key] || 0 : total}</em>
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
            <OrderRow key={o.id} order={o} role={role} api={api} onChange={(x) => { replace(x); refreshCounts(); }} onToast={say} />
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

const PAY_TEXT = {
  Pending: "Waiting for payment", COD_Due: "Pay on delivery", COD_Collected: "Cash with the courier",
  Refund_Pending: "Refund on its way", Refunded: "Refunded", Refund_Failed: "Refund needs attention", Void: "Not charged",
};
const STATUS_TEXT = { Delivery_Failed: "Not delivered", Returned_To_Origin: "Returned to seller", Pending_Payment: "Waiting for payment" };
const RETURN_TEXT = {
  Requested: "Waiting for the seller", Approved: "Approved, item on its way back", Rejected: "Rejected by the seller",
  Escalated: "With ReOrbit", Refunded: "Refunded", Closed: "Closed, no refund",
};
const payLabel = (o) => {
  const p = o.payment;
  if (p.status === "Paid") return p.method === "COD" ? "Cash received by ReOrbit" : "Paid online";
  return PAY_TEXT[p.status] || p.status;
};
const FIELD_ERR = (errs, k) => (errs[k] ? <small>{errs[k][0]}</small> : null);

function OrderRow({ order: o, role, api, onChange, onToast }) {
  const isAdmin = role === "admin";
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(null); /* null | ship | cancel | update | fail | cod | reject | decide */
  const [vals, setVals] = useState({ courier_name: "", other: "", tracking_no: "", reason: "", text: "", note: "", reference: "", approve: "true", fault: "" });
  const [busy, setBusy] = useState("");
  const [errs, setErrs] = useState({});
  const [msg, setMsg] = useState("");
  const [opts, setOpts] = useState(null);

  const view = detail && detail.id === o.id ? { ...o, ...detail } : o;
  const set = (k) => (e) => setVals((v) => ({ ...v, [k]: e.target.value }));

  useEffect(() => {
    if (form === "ship" || form === "fail" || form === "decide") orderOptionsApi.get().then(setOpts).catch(() => {});
  }, [form]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !detail) {
      try { setDetail(await api.get(o.id)); } catch (e) { setMsg(e.message || "Could not load details."); }
    }
  };

  const act = async (action, body = {}, done = "") => {
    if (busy) return;
    setBusy(action); setErrs({}); setMsg("");
    try {
      const updated = await api.act(o.id, action, body);
      setDetail(updated);
      setForm(null);
      onChange(updated);
      onToast?.(done || `${o.id} updated.`);
    } catch (e) {
      setErrs(e.errors || {});
      setMsg(e.errors ? "" : e.message || "Something went wrong. Please try again.");
    } finally {
      setBusy("");
    }
  };
  const open_ = (name, extra = {}) => { setForm(name); setErrs({}); setMsg(""); setVals((v) => ({ ...v, ...extra })); };

  const next = { Confirmed: ["pack", "Mark as packed"], Packed: ["ship", "Mark as shipped"], Shipped: ["deliver", "Mark as delivered"] }[o.status];
  const online = o.payment.method !== "COD";
  const a = view.address || {};
  const ret = view.return;
  const mine = !isAdmin; /* a seller acts on the return; admin settles it */
  const platform = o.seller.type === "platform";
  const courierValue = vals.courier_name === "Other" ? vals.other : vals.courier_name;
  const failFault = opts?.fail_reasons?.find((r) => r.code === vals.reason)?.fault;
  const codWaiting = isAdmin && o.payment.method === "COD" && o.status === "Delivered" && !o.cod_received_at && o.payment.status !== "Paid";
  const returnOpen = ret && ["Requested", "Approved", "Escalated"].includes(ret.status);
  const canDecide = isAdmin && ret && ["Requested", "Rejected", "Escalated", "Approved"].includes(ret.status);

  return (
    <article className="so-card">
      <header>
        <b>{o.id}</b>
        <span className={`so-badge s-${o.status}`}>{STATUS_TEXT[o.status] || o.status}</span>
        <span className="so-badge pay">{payLabel(o)}</span>
        {ret && <span className="so-badge ret">Return: {RETURN_TEXT[ret.status] || ret.status}</span>}
        {isAdmin && <span className="so-badge who">{platform ? "ReOrbit" : o.seller.name}</span>}
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
        <span>{o.buyer ? <>Buyer: <b>{o.buyer.name}</b>{o.buyer.type !== "user" ? ` (${o.buyer.type === "remaker" ? "ReMaker" : "admin"})` : ""}</> : null}{a.city ? <> · {a.city} {a.pincode}</> : null}</span>
        <span className="so-money">
          {isAdmin
            ? <>Buyer pays <b>{inr(o.total)}</b></>
            : <>You earn <b>{inr(o.seller_earning)}</b>{o.payment.method === "COD" && !o.cod_received_at && o.status !== "Delivered" ? <> · collect {inr(o.total)} on delivery</> : null}</>}
        </span>
      </div>

      {o.courier && <p className="so-courier">{o.courier.name} · {o.courier.tracking_no}</p>}
      {o.status === "Cancelled" && <p className="so-courier bad">Cancelled{o.cancel_reason ? `: ${o.cancel_reason}` : ""}</p>}
      {o.failed && <p className="so-courier bad">Not delivered: {o.failed.label}{o.failed.note ? ` · ${o.failed.note}` : ""} ({o.failed.fault === "seller" ? "seller or courier at fault" : "buyer at fault"})</p>}
      {o.payment.status === "Refund_Failed" && <p className="so-courier bad">The refund needs attention. ReOrbit has been told.</p>}
      {codWaiting && <p className="so-courier">Cash of {inr(o.total)} is with the courier. Confirm it once it reaches ReOrbit.</p>}
      {!isAdmin && o.payment.method === "COD" && o.status === "Delivered" && !o.cod_received_at && o.payment.status !== "Paid" && (
        <p className="so-courier">Your earning starts clearing once ReOrbit receives the cash from the courier.</p>
      )}
      {msg && <p className="so-error" role="alert">{msg}</p>}

      {ret && (
        <div className="so-return">
          <b>{ret.reason.label}</b>
          <p>{ret.details}</p>
          {ret.photos.length > 0 && (
            <div className="so-photos">{ret.photos.map((p) => <a key={p} href={p} target="_blank" rel="noreferrer"><img src={p} alt="Photo from the buyer" loading="lazy" /></a>)}</div>
          )}
          <small>
            {ret.fault === "seller" ? "Seller pays return shipping and the delivery fee is refunded." : "Buyer pays return shipping. The delivery fee is not refunded."}
            {returnOpen ? ` Refund will be ${inr(ret.expected_refund)}.` : ret.status === "Refunded" ? ` Refunded ${inr(ret.refund_amount)}.` : ""}
          </small>
          {ret.seller_note && <small>Seller: {ret.seller_note}</small>}
          {ret.admin_note && <small>ReOrbit: {ret.admin_note}</small>}
        </div>
      )}

      {form === "ship" && (
        <div className="so-form">
          <p className="so-hint">You arrange the courier and pay for shipping. The delivery fee the buyer paid is added to your earning.</p>
          <label>Courier
            <select value={vals.courier_name} onChange={set("courier_name")}>
              <option value="">Choose a courier</option>
              {(opts?.couriers || []).map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="Other">Other</option>
            </select>
            {FIELD_ERR(errs, "courier_name")}
          </label>
          {vals.courier_name === "Other" && <label>Courier name<input value={vals.other} onChange={set("other")} maxLength={40} placeholder="Courier name" /></label>}
          <label>Tracking number<input value={vals.tracking_no} onChange={set("tracking_no")} maxLength={40} placeholder="Exactly as the courier gave it" />{FIELD_ERR(errs, "tracking_no")}</label>
          <div className="so-actions">
            <button type="button" className="so-btn ghost" onClick={() => setForm(null)} disabled={!!busy}>Back</button>
            <button type="button" className="so-btn" onClick={() => act("ship", { courier_name: courierValue, tracking_no: vals.tracking_no }, `${o.id} shipped.`)} disabled={!!busy}>{busy === "ship" ? <Spinner label="Saving…" /> : "Confirm shipped"}</button>
          </div>
        </div>
      )}
      {form === "cancel" && (
        <div className="so-form">
          <label>Reason (the buyer is told)<input value={vals.reason} onChange={set("reason")} maxLength={200} placeholder="e.g. Item damaged, out of material" />{FIELD_ERR(errs, "reason")}</label>
          <div className="so-actions">
            <button type="button" className="so-btn ghost" onClick={() => setForm(null)} disabled={!!busy}>Keep order</button>
            <button type="button" className="so-btn danger" onClick={() => act("cancel", { reason: vals.reason }, `${o.id} cancelled.`)} disabled={!!busy}>{busy === "cancel" ? <Spinner label="Cancelling…" /> : "Cancel order"}</button>
          </div>
        </div>
      )}
      {form === "update" && (
        <div className="so-form">
          <label>Message to the buyer<input value={vals.text} onChange={set("text")} maxLength={120} placeholder="e.g. Out for delivery today" />{FIELD_ERR(errs, "text")}</label>
          <div className="so-actions">
            <button type="button" className="so-btn ghost" onClick={() => setForm(null)} disabled={!!busy}>Back</button>
            <button type="button" className="so-btn" onClick={() => act("update", { text: vals.text }, "The buyer was told.")} disabled={!!busy}>{busy === "update" ? <Spinner label="Sending…" /> : "Send update"}</button>
          </div>
        </div>
      )}
      {form === "fail" && (
        <div className="so-form">
          <label>Why was it not delivered?
            <select value={vals.reason} onChange={set("reason")}>
              <option value="">Choose a reason</option>
              {(opts?.fail_reasons || []).map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
            {FIELD_ERR(errs, "reason")}
          </label>
          {failFault && <p className="so-hint">{failFault === "seller" ? "The buyer will be refunded in full if the parcel comes back." : "If the parcel comes back the buyer is refunded without the delivery fee, and you earn nothing."}</p>}
          <label>Note (optional)<input value={vals.note} onChange={set("note")} maxLength={200} /></label>
          <div className="so-actions">
            <button type="button" className="so-btn ghost" onClick={() => setForm(null)} disabled={!!busy}>Back</button>
            <button type="button" className="so-btn danger" onClick={() => act("fail", { reason: vals.reason, note: vals.note }, "Marked as not delivered.")} disabled={!!busy}>{busy === "fail" ? <Spinner label="Saving…" /> : "Mark not delivered"}</button>
          </div>
        </div>
      )}
      {form === "cod" && (
        <div className="so-form">
          <label>Reference (optional)<input value={vals.reference} onChange={set("reference")} maxLength={60} placeholder="Courier remittance / UTR" /></label>
          <div className="so-actions">
            <button type="button" className="so-btn ghost" onClick={() => setForm(null)} disabled={!!busy}>Back</button>
            <button type="button" className="so-btn" onClick={() => act("cod-received", { reference: vals.reference }, "Cash recorded. The seller's clearing days have started.")} disabled={!!busy}>{busy === "cod-received" ? <Spinner label="Saving…" /> : `Cash of ${inr(o.total)} received`}</button>
          </div>
        </div>
      )}
      {form === "reject" && (
        <div className="so-form">
          <label>Why are you rejecting it? (the buyer sees this)<input value={vals.note} onChange={set("note")} maxLength={300} />{FIELD_ERR(errs, "note")}</label>
          <div className="so-actions">
            <button type="button" className="so-btn ghost" onClick={() => setForm(null)} disabled={!!busy}>Back</button>
            <button type="button" className="so-btn danger" onClick={() => act("return-reject", { note: vals.note }, "Return rejected.")} disabled={!!busy}>{busy === "return-reject" ? <Spinner label="Saving…" /> : "Reject return"}</button>
          </div>
        </div>
      )}
      {form === "decide" && (
        <div className="so-form">
          <label>Decision
            <select value={vals.approve} onChange={set("approve")}>
              <option value="true">Approve the return</option>
              <option value="false">Close it, no refund</option>
            </select>
          </label>
          {vals.approve === "true" && (
            <label>Who is at fault?
              <select value={vals.fault} onChange={set("fault")}>
                <option value="">As the buyer's reason says ({ret?.fault === "seller" ? "seller" : "buyer"})</option>
                <option value="seller">Seller (delivery fee refunded, seller pays return shipping)</option>
                <option value="buyer">Buyer (delivery fee kept, buyer pays return shipping)</option>
              </select>
            </label>
          )}
          <label>Reason for your decision (both sides see it)<input value={vals.note} onChange={set("note")} maxLength={300} />{FIELD_ERR(errs, "note")}</label>
          <div className="so-actions">
            <button type="button" className="so-btn ghost" onClick={() => setForm(null)} disabled={!!busy}>Back</button>
            <button type="button" className="so-btn" onClick={() => act("return-decide", { approve: vals.approve === "true", fault: vals.fault, note: vals.note }, "Decision saved.")} disabled={!!busy}>{busy === "return-decide" ? <Spinner label="Saving…" /> : "Save decision"}</button>
          </div>
        </div>
      )}

      {!form && (
        <div className="so-actions">
          <button type="button" className="so-btn ghost" onClick={toggle} aria-expanded={open}>{open ? "Hide details" : "Details"}</button>
          {(o.status === "Confirmed" || o.status === "Packed") && (
            <button type="button" className="so-btn ghost danger" onClick={() => open_("cancel")} disabled={!!busy}>Cancel</button>
          )}
          {o.status === "Shipped" && (
            <>
              <button type="button" className="so-btn ghost" onClick={() => open_("update", { text: "" })} disabled={!!busy}>Update buyer</button>
              <button type="button" className="so-btn ghost danger" onClick={() => open_("fail", { reason: "", note: "" })} disabled={!!busy}>Not delivered</button>
            </>
          )}
          {o.status === "Delivery_Failed" && (
            <>
              <button type="button" className="so-btn ghost" onClick={() => act("retry", {}, "Back on its way.")} disabled={!!busy}>{busy === "retry" ? <Spinner label="Saving…" /> : "Try delivery again"}</button>
              <button type="button" className="so-btn" onClick={() => act("returned", {}, "Parcel marked as back with the seller.")} disabled={!!busy}>{busy === "returned" ? <Spinner label="Saving…" /> : "Parcel is back with the seller"}</button>
            </>
          )}
          {codWaiting && <button type="button" className="so-btn" onClick={() => open_("cod", { reference: "" })} disabled={!!busy}>Cash received</button>}
          {mine && ret?.status === "Requested" && (
            <>
              <button type="button" className="so-btn ghost danger" onClick={() => open_("reject", { note: "" })} disabled={!!busy}>Reject return</button>
              <button type="button" className="so-btn" onClick={() => act("return-approve", {}, "Return approved. The buyer sends the item back.")} disabled={!!busy}>{busy === "return-approve" ? <Spinner label="Saving…" /> : "Approve return"}</button>
            </>
          )}
          {(mine || (isAdmin && ret?.status === "Approved")) && ret?.status === "Approved" && (
            <button type="button" className="so-btn" onClick={() => act("return-received", {}, "Item received. The refund is being made.")} disabled={!!busy}>{busy === "return-received" ? <Spinner label="Saving…" /> : "Item received, refund buyer"}</button>
          )}
          {canDecide && <button type="button" className={`so-btn${ret.status === "Escalated" ? "" : " ghost"}`} onClick={() => open_("decide", { approve: ret.status === "Approved" ? "false" : "true", fault: "", note: "" })} disabled={!!busy}>{ret.status === "Approved" ? "Close return" : "Decide return"}</button>}
          {next && (
            <button type="button" className="so-btn" disabled={!!busy} onClick={() => (next[0] === "ship" ? open_("ship") : act(next[0], {}, `${o.id} updated.`))}>
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
                {(view.refunds || []).length > 0 && (
                  <>
                    <h4 style={{ marginTop: 10 }}>Refunds</h4>
                    <p>{view.refunds.map((r) => `${inr(r.amount)} · ${r.status === "Done" ? "sent" : r.status === "Failed" ? "needs attention" : "on its way"}`).join(" / ")}</p>
                  </>
                )}
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
