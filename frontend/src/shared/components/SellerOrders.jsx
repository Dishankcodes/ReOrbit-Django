import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Search, X, MapPin, Truck, User, Check } from "lucide-react";
import Spinner, { PageLoader } from "./Spinner";
import "./Spinner.css";
import "./SellerOrders.css";

/* Orders a seller has to fulfil. One component for members, ReMakers and admins.
     <SellerOrders api={salesApi} role="remaker" accent="#7a5230" />
   `api` comes from api/orders.js (sellerOrdersApi). `detailPath(id)` is the page one order opens on.
   Lists are paged by the server and nothing polls. */

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
const SPECIAL = {
  __returns: ["returns", "open", "returns_open", "Returns"],
  __cod: ["cod", "pending", "cod_pending", "COD cash"],
};
const STATUS_KEYS = new Set([
  "Confirmed",
  "Packed",
  "Shipped",
  "Delivered",
  "Delivery_Failed",
  "Returned_To_Origin",
  "Cancelled",
  "Pending_Payment",
]);
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const when = (v) =>
  v
    ? new Date(v).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
/* the four steps an order moves through, shown as a progress track on admin cards */
const STEPS = [
  ["Confirmed", "Placed"],
  ["Packed", "Packed"],
  ["Shipped", "Shipped"],
  ["Delivered", "Delivered"],
];
const NEXT = {
  Confirmed: ["pack", "Mark as packed"],
  Packed: ["ship", "Mark as shipped"],
  Shipped: ["deliver", "Mark as delivered"],
};

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function SellerOrders({
  api,
  role = "user",
  accent = "#2a4d3a",
  fixedType = "",
  detailPath,
  variant = "",
}) {
  const [tab, setTab] = useState("");
  const [type, setType] = useState(fixedType);
  const [text, setText] = useState("");
  const q = useDebounced(text.trim());
  const [state, setState] = useState({
    rows: [],
    counts: {},
    page: 0,
    pages: 1,
    loading: true,
    more: false,
    error: "",
  });
  const seq = useRef(0);

  const load = useCallback(
    async (page = 1) => {
      const mine = ++seq.current;
      setState((s) => ({
        ...s,
        loading: page === 1,
        more: page > 1,
        error: "",
      }));
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
          counts: d.counts || {},
          page: d.page,
          pages: d.total_pages,
          loading: false,
          more: false,
          error: "",
        }));
      } catch (e) {
        if (mine === seq.current)
          setState((s) => ({
            ...s,
            loading: false,
            more: false,
            error: e.message || "Could not load orders.",
          }));
      }
    },
    [api, tab, q, type],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const total = Object.entries(state.counts).reduce(
    (n, [k, c]) => (STATUS_KEYS.has(k) ? n + c : n),
    0,
  );
  const adm = variant === "admin";
  const tabs = [
    ...TABS,
    { key: "__returns", label: "Returns" },
    ...(role === "admin" ? [{ key: "__cod", label: "COD cash" }] : []),
  ];
  const countOf = (key) =>
    SPECIAL[key] ? state.counts[SPECIAL[key][2]] || 0 : key ? state.counts[key] || 0 : total;
  const MAIN_TABS = tabs.slice(0, 5); // All, To pack, To ship, On the way, Delivered
  const MORE_TABS = tabs.slice(5); // Not delivered, Cancelled, Returns

  return (
    <div className={`so${adm ? " so-admin" : ""}`} style={{ "--so-accent": accent }}>
      {adm ? (
        <div className="so-tools">
          <div className="so-tabs" role="tablist" aria-label="Order status">
            {tabs.map((t) => (
              <button
                key={t.key || "all"}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={tab === t.key ? "on" : ""}
                onClick={() => setTab(t.key)}
              >
                <i className={`so-dot d-${t.key || "all"}`} />
                {t.label} <em>{countOf(t.key)}</em>
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
            <label className="so-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Search order, product or buyer"
                aria-label="Search orders"
              />
              {text && (
                <button type="button" aria-label="Clear search" onClick={() => setText("")}>
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
        </div>
      ) : (
        /* Members and ReMakers: the everyday stages as one segmented control, the rarer ones under "More". */
        <div className="so-bar">
          <div className="so-seg" role="tablist" aria-label="Order status">
            {MAIN_TABS.map((t) => (
              <button
                key={t.key || "all"}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={tab === t.key ? "on" : ""}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                <em>{countOf(t.key)}</em>
              </button>
            ))}
          </div>
          <div className="so-bar-right">
            <select
              className={`so-more-select ${MORE_TABS.some((t) => t.key === tab) ? "on" : ""}`}
              value={MORE_TABS.some((t) => t.key === tab) ? tab : ""}
              onChange={(e) => setTab(e.target.value)}
              aria-label="More order states"
            >
              <option value="">More…</option>
              {MORE_TABS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label} ({countOf(t.key)})
                </option>
              ))}
            </select>
            <label className="so-search so-search-member">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Search order or product"
                aria-label="Search orders"
              />
              {text && (
                <button type="button" aria-label="Clear search" onClick={() => setText("")}>
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
        </div>
      )}

      {state.error && (
        <p className="so-error" role="alert">
          {state.error}{" "}
          <button type="button" onClick={() => load(1)}>
            Try again
          </button>
        </p>
      )}

      {state.loading ? (
        <PageLoader label="Loading orders…" />
      ) : state.rows.length === 0 && !state.error ? (
        <div className="so-empty">
          <strong>
            {q || tab || type ? "No orders match this view." : "No orders yet."}
          </strong>
          <span>
            {q || tab || type
              ? "Try another tab or search."
              : "When someone buys from you, the order shows up here to pack and ship."}
          </span>
        </div>
      ) : (
        <div className="so-list" aria-busy={state.more}>
          {state.rows.map((o) => (
            <OrderRow key={o.id} order={o} role={role} adm={adm} to={detailPath(o.id)} />
          ))}
          {state.page < state.pages && (
            <button
              type="button"
              className="so-btn ghost so-more"
              onClick={() => load(state.page + 1)}
              disabled={state.more}
            >
              {state.more ? <Spinner label="Loading…" /> : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const PAY_TEXT = {
  Pending: "Waiting for payment",
  COD_Due: "Pay on delivery",
  COD_Collected: "Cash with the courier",
  Refund_Pending: "Refund on its way",
  Refunded: "Refunded",
  Refund_Failed: "Refund needs attention",
  Void: "Not charged",
};
const STATUS_TEXT = {
  Delivery_Failed: "Not delivered",
  Returned_To_Origin: "Returned to seller",
  Pending_Payment: "Waiting for payment",
};
const RETURN_TEXT = {
  Requested: "Waiting for the seller",
  Approved: "Approved, item on its way back",
  Rejected: "Rejected by the seller",
  Escalated: "With ReOrbit",
  Refunded: "Refunded",
  Closed: "Closed, no refund",
};
const payLabel = (o) => {
  const p = o.payment;
  if (p.status === "Paid")
    return p.method === "COD" ? "Cash received by ReOrbit" : "Paid online";
  return PAY_TEXT[p.status] || p.status;
};

/* A summary card. Everything you can do with the order (pack, ship, cancel, returns...) is on its own page. */
function OrderRow({ order: o, role, to, adm }) {
  const navigate = useNavigate();
  const isAdmin = role === "admin";
  const ret = o.return;
  const a = o.address || {};
  const platform = o.seller.type === "platform";
  /* "Managed by ReOrbit": the seller packs and asks for a pickup; ReOrbit does the rest */
  const reorbitHands = o.managed_delivery && !isAdmin;
  const nextLabel = reorbitHands
    ? { Confirmed: "Pack it", Packed: o.pickup?.requested ? null : "Ask for pickup" }[o.status]
    : {
        Confirmed: "Pack it",
        Packed: "Ship it",
        Shipped: "Mark delivered",
      }[o.status];
  const needsYou =
    nextLabel ||
    ret?.status === "Requested" ||
    ret?.status === "Approved" ||
    (o.status === "Delivery_Failed" && !reorbitHands);

  return (
    <article className={`so-card so-click${adm ? ` so-c-${o.status}` : ""}`} role="link" tabIndex={0}
      aria-label={`Open order ${o.id}`} onClick={() => navigate(to)}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault(); navigate(to);
        }
      }}>
      <header>
        <b>{o.id}</b>
        <span className={`so-badge s-${o.status}`}>
          {STATUS_TEXT[o.status] || o.status}
        </span>
        <span className="so-badge pay">{payLabel(o)}</span>
        {o.managed_delivery && (
          <span className="so-badge managed">
            {o.status === "Packed" && o.pickup?.requested ? "Waiting for ReOrbit pickup" : "Managed by ReOrbit"}
          </span>
        )}
        {ret && (
          <span className="so-badge ret">
            Return: {RETURN_TEXT[ret.status] || ret.status}
          </span>
        )}
        {isAdmin && (
          <span className="so-badge who">
            {platform ? "ReOrbit" : o.seller.name}
          </span>
        )}
        <time>{when(o.created_at)}</time>
      </header>

      {adm && <Track status={o.status} />}

      <ul className="so-lines">
        {o.items.slice(0, 2).map((ln) => (
          <li key={ln.id}>
            {ln.cover ? (
              <img src={ln.cover} alt="" loading="lazy" />
            ) : (
              <span className="so-noimg" />
            )}
            <div>
              <b>{ln.title}</b>
              <small>
                {ln.qty} × {inr(ln.unit_price)}
              </small>
            </div>
            <span>{inr(ln.line_total)}</span>
          </li>
        ))}
        {o.items.length > 2 && (
          <li className="so-more-items">
            + {o.items.length - 2} more{" "}
            {o.items.length - 2 === 1 ? "item" : "items"}
          </li>
        )}
      </ul>

      <div className="so-meta">
        <span className="so-who">
          {adm && <User size={14} aria-hidden="true" />}
          {o.buyer ? (
            <>
              Buyer: <b>{o.buyer.name}</b>
              {o.buyer.type !== "user"
                ? ` (${o.buyer.type === "remaker" ? "ReMaker" : "admin"})`
                : ""}
            </>
          ) : null}
          {a.city ? (
            <>
              {" "}
              {adm ? <MapPin size={14} aria-hidden="true" /> : "·"} {a.city} {a.pincode}
            </>
          ) : null}
        </span>
        <span className="so-money">
          {isAdmin ? (
            <>
              Buyer pays <b>{inr(o.total)}</b>
            </>
          ) : (
            <>
              You earn <b>{inr(o.seller_earning)}</b>
            </>
          )}
        </span>
      </div>

      {o.courier && (
        <p className="so-courier">
          {adm && <Truck size={14} aria-hidden="true" />}{" "}
          {o.courier.name} · {o.courier.tracking_no}
        </p>
      )}
      {o.status === "Cancelled" && (
        <p className="so-courier bad">
          Cancelled{o.cancel_reason ? `: ${o.cancel_reason}` : ""}
        </p>
      )}
      {o.failed && (
        <p className="so-courier bad">Not delivered: {o.failed.label}</p>
      )}

      <div className="so-actions">
        <Link
          to={to}
          className={`so-btn${needsYou ? "" : " ghost"}`}
          aria-label={`Open order ${o.id}`}
          onClick={(event) => event.stopPropagation()}
        >
          {needsYou ? nextLabel || "Needs your attention" : "View order"}{" "}
          <ChevronRight size={15} />
        </Link>
      </div>
    </article>
  );
}

/* Placed → Packed → Shipped → Delivered. Cancelled and failed orders show a note instead. */
function Track({ status }) {
  const at = STEPS.findIndex(([k]) => k === status);
  if (at < 0) return null;
  return (
    <ol className="so-track" aria-label="Order progress">
      {STEPS.map(([k, label], i) => (
        <li key={k} className={i < at ? "done" : i === at ? "now" : ""}>
          <span>{i < at || status === "Delivered" ? <Check size={11} /> : i + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}
