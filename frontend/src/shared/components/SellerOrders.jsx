import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
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
  const tabs = [
    ...TABS,
    { key: "__returns", label: "Returns" },
    ...(role === "admin" ? [{ key: "__cod", label: "COD cash" }] : []),
  ];

  return (
    <div className="so" style={{ "--so-accent": accent }}>
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
              {t.label}{" "}
              <em>
                {SPECIAL[t.key]
                  ? state.counts[SPECIAL[t.key][2]] || 0
                  : t.key
                    ? state.counts[t.key] || 0
                    : total}
              </em>
            </button>
          ))}
        </div>
        <div className="so-filters">
          {role === "admin" && !fixedType && (
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Seller type"
            >
              <option value="">All sellers</option>
              <option value="platform">ReOrbit store</option>
              <option value="remaker">ReMakers</option>
              <option value="user">Members</option>
            </select>
          )}
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              role === "admin" ? "Order, product or buyer" : "Order or product"
            }
            aria-label="Search orders"
          />
        </div>
      </div>

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
            <OrderRow key={o.id} order={o} role={role} to={detailPath(o.id)} />
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
function OrderRow({ order: o, role, to }) {
  const navigate = useNavigate();
  const isAdmin = role === "admin";
  const ret = o.return;
  const a = o.address || {};
  const platform = o.seller.type === "platform";
  const nextLabel = {
    Confirmed: "Pack it",
    Packed: "Ship it",
    Shipped: "Mark delivered",
  }[o.status];
  const needsYou =
    nextLabel ||
    ret?.status === "Requested" ||
    ret?.status === "Approved" ||
    o.status === "Delivery_Failed";

  return (
    <article className="so-card so-click" role="link" tabIndex={0}
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
        <span>
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
              · {a.city} {a.pincode}
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
