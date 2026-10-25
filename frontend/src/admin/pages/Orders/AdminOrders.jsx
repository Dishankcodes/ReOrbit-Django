import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Download,
  Package,
  Hourglass,
  BadgeCheck,
  CircleCheck,
  XCircle,
  Undo2,
  X,
  ArrowUpDown,
  SearchX,
  Eye,
  UserRound,
  IndianRupee,
  Clock3,
  Banknote,
  Percent,
} from "lucide-react";

import { useOrders, runOrderAction } from "../../data/ordersStore";
import {
  ORDER_ACTION_LIST,
  getOrderActions,
  canApplyOrderAction,
} from "../../data/orderActions";
import { FLOW_LABELS } from "../../data/adminOrders";
import {
  formatDate,
  formatDateTime,
  formatINR,
  timeAgo,
  DEMO_TODAY,
} from "../../utils/format";

import StatusBadge from "../../components/ui/StatusBadge";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import RowActionMenu from "../../components/ui/RowActionMenu";
import { ACTION_ICONS } from "../../components/ui/actionIcons";
import useToast from "../../components/ui/useToast";
import PartyCell from "./components/PartyCell";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/products/AdminProducts.css";
import "../../css/orders/AdminOrders.css";

const STATUS_CARDS = [
  { key: "All", label: "All orders", icon: Package, tone: "all" },
  { key: "Pending", label: "Pending", icon: Hourglass, tone: "wait" },
  { key: "Confirmed", label: "Confirmed", icon: BadgeCheck, tone: "info" },
  { key: "Completed", label: "Completed", icon: CircleCheck, tone: "good" },
  { key: "Cancelled", label: "Cancelled", icon: XCircle, tone: "bad" },
  { key: "Returned", label: "Returned", icon: Undo2, tone: "neutral" },
];

const SORTS = {
  newest: {
    label: "Newest first",
    fn: (a, b) => new Date(b.order_date) - new Date(a.order_date),
  },
  oldest: {
    label: "Oldest first",
    fn: (a, b) => new Date(a.order_date) - new Date(b.order_date),
  },
  high: { label: "Amount: high to low", fn: (a, b) => b.amount - a.amount },
  low: { label: "Amount: low to high", fn: (a, b) => a.amount - b.amount },
};

const RANGES = {
  all: "All time",
  7: "Last 7 days",
  30: "Last 30 days",
  90: "Last 90 days",
};

const METHOD_LABEL = {
  UPI: "UPI",
  CARD: "Card",
  NET_BANKING: "Net banking",
  WALLET: "Wallet",
  COD: "Cash on delivery",
};

function exportCsv(rows) {
  const header = [
    "Order ID",
    "Item / product",
    "Seller",
    "Seller type",
    "Buyer",
    "Buyer type",
    "Amount",
    "Payment method",
    "Payment status",
    "Transaction ID",
    "Order status",
    "Order date",
  ];
  const lines = rows.map((o) =>
    [
      o.order_id,
      o.listing.title,
      o.seller.name,
      o.seller.type,
      o.buyer.name,
      o.buyer.type,
      o.amount,
      o.transaction.payment_method,
      o.transaction.payment_status,
      o.transaction.transaction_id,
      o.order_status,
      formatDateTime(o.order_date),
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reorbit-orders.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminOrders() {
  const navigate = useNavigate();
  const orders = useOrders();
  const { toast, toastNode } = useToast();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [payment, setPayment] = useState("all");
  const [method, setMethod] = useState("all");
  const [flow, setFlow] = useState("all");
  const [range, setRange] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(() => new Set());
  const [pending, setPending] = useState(null); // { action, ids }

  const open = (id) => navigate(`/admin-orders/${id}`);

  /* ---------- numbers ---------- */
  const counts = useMemo(() => {
    const c = {
      All: orders.length,
      Pending: 0,
      Confirmed: 0,
      Completed: 0,
      Cancelled: 0,
      Returned: 0,
    };
    orders.forEach((o) => {
      c[o.order_status] += 1;
    });
    return c;
  }, [orders]);

  const money = useMemo(() => {
    let collected = 0,
      awaiting = 0,
      awaitingCount = 0,
      refund = 0,
      refundCount = 0,
      fees = 0;
    orders.forEach((o) => {
      const pay = o.transaction.payment_status;
      if (
        pay === "Success" &&
        ["Confirmed", "Completed"].includes(o.order_status)
      )
        collected += o.amount;
      if (
        pay === "Pending" &&
        ["Pending", "Confirmed"].includes(o.order_status)
      ) {
        awaiting += o.amount;
        awaitingCount += 1;
      }
      if (o.refundDue) {
        refund += o.amount;
        refundCount += 1;
      }
      if (o.order_status === "Completed") fees += o.platform_fee;
    });
    return { collected, awaiting, awaitingCount, refund, refundCount, fees };
  }, [orders]);

  /* ---------- filter + sort ---------- */
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    const cutoff =
      range === "all" ? 0 : DEMO_TODAY.getTime() - Number(range) * 86400000;
    return orders
      .filter((o) => status === "All" || o.order_status === status)
      .filter(
        (o) =>
          payment === "all" ||
          (payment === "RefundDue"
            ? o.refundDue
            : o.transaction.payment_status === payment),
      )
      .filter(
        (o) => method === "all" || o.transaction.payment_method === method,
      )
      .filter((o) => flow === "all" || o.flow === flow)
      .filter((o) => !cutoff || new Date(o.order_date).getTime() >= cutoff)
      .filter(
        (o) =>
          !text ||
          o.order_id.toLowerCase().includes(text) ||
          o.listing.title.toLowerCase().includes(text) ||
          o.listing.id.toLowerCase().includes(text) ||
          o.seller.name.toLowerCase().includes(text) ||
          o.buyer.name.toLowerCase().includes(text) ||
          o.transaction.transaction_id.toLowerCase().includes(text),
      )
      .sort(SORTS[sort].fn);
  }, [orders, query, status, payment, method, flow, range, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => {
    setPage(1);
  }, [query, status, payment, method, flow, range, sort, pageSize]);

  const filtersActive =
    query ||
    status !== "All" ||
    payment !== "all" ||
    method !== "all" ||
    flow !== "all" ||
    range !== "all";
  const clearFilters = () => {
    setQuery("");
    setStatus("All");
    setPayment("all");
    setMethod("all");
    setFlow("all");
    setRange("all");
  };

  /* ---------- selection ---------- */
  const rowIds = rows.map((o) => o.order_id);
  const allOnPage = rowIds.length > 0 && rowIds.every((id) => selected.has(id));
  const someOnPage = rowIds.some((id) => selected.has(id));
  const toggleOne = (id) =>
    setSelected((cur) => {
      const n = new Set(cur);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const togglePage = () =>
    setSelected((cur) => {
      const n = new Set(cur);
      rowIds.forEach((id) => (allOnPage ? n.delete(id) : n.add(id)));
      return n;
    });
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const selectedRows = orders.filter((o) => selected.has(o.order_id));
  const bulkActions = Object.values(ORDER_ACTION_LIST).filter((a) =>
    selectedRows.some((o) => canApplyOrderAction(o, a.key)),
  );

  /* ---------- actions ---------- */
  const askAction = (action, ids) => {
    const eligible = ids.filter((id) => {
      const o = orders.find((x) => x.order_id === id);
      return o && canApplyOrderAction(o, action.key);
    });
    if (eligible.length) setPending({ action, ids: eligible });
  };

  const confirmAction = (reason) => {
    const { action, ids } = pending;
    ids.forEach((id) => runOrderAction(id, action.key, reason));
    toast(
      ids.length === 1
        ? `Order ${ids[0]} ${action.toast}.`
        : `${ids.length} orders ${action.toast}.`,
    );
    setPending(null);
    clearSelection();
  };

  const menuItems = (o) => [
    {
      key: "view",
      label: "View details",
      icon: Eye,
      onClick: () => open(o.order_id),
    },
    ...(o.seller.path
      ? [
          {
            key: "seller",
            label: "View seller",
            icon: UserRound,
            onClick: () => navigate(o.seller.path),
          },
        ]
      : []),
    ...(o.buyer.path
      ? [
          {
            key: "buyer",
            label: "View buyer",
            icon: UserRound,
            onClick: () => navigate(o.buyer.path),
          },
        ]
      : []),
    ...(getOrderActions(o).length ? ["separator"] : []),
    ...getOrderActions(o).map((a) => ({
      key: a.key,
      label: a.label,
      icon: ACTION_ICONS[a.icon],
      tone: a.tone,
      onClick: () => askAction(a, [o.order_id]),
    })),
  ];

  const onKey = (e, id) =>
    e.key === "Enter" && e.target === e.currentTarget && open(id);

  return (
    <div className="au-page">
      {/* ---------- status cards ---------- */}
      <section
        className="au-cards ao-cards"
        aria-label="Filter by order status"
      >
        {STATUS_CARDS.map((card) => {
          const Icon = card.icon;
          const active = status === card.key;
          return (
            <button
              key={card.key}
              type="button"
              className={`au-card tone-${card.tone} ${active ? "active" : ""}`}
              onClick={() => setStatus(card.key)}
              aria-pressed={active}
            >
              <span className="au-card-icon">
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <span className="au-card-text">
                <small>{card.label}</small>
                <strong>{counts[card.key]}</strong>
              </span>
            </button>
          );
        })}
      </section>

      {/* ---------- money strip ---------- */}
      <section className="ao-money" aria-label="Payments summary">
        <div className="ao-money-card">
          <span className="ao-money-icon good">
            <IndianRupee size={18} />
          </span>
          <div>
            <small>Payments received</small>
            <strong>{formatINR(money.collected)}</strong>
            <em>Confirmed and completed orders</em>
          </div>
        </div>
        <button
          type="button"
          className="ao-money-card is-link"
          onClick={() => {
            setStatus("All");
            setPayment("Pending");
          }}
        >
          <span className="ao-money-icon wait">
            <Clock3 size={18} />
          </span>
          <div>
            <small>Awaiting payment</small>
            <strong>{formatINR(money.awaiting)}</strong>
            <em>
              {money.awaitingCount} order{money.awaitingCount === 1 ? "" : "s"}{" "}
              · click to filter
            </em>
          </div>
        </button>
        <button
          type="button"
          className="ao-money-card is-link"
          onClick={() => {
            setStatus("All");
            setPayment("RefundDue");
          }}
        >
          <span className="ao-money-icon bad">
            <Banknote size={18} />
          </span>
          <div>
            <small>Refunds due</small>
            <strong>{formatINR(money.refund)}</strong>
            <em>
              {money.refundCount} order{money.refundCount === 1 ? "" : "s"} ·
              click to filter
            </em>
          </div>
        </button>
        <div className="ao-money-card">
          <span className="ao-money-icon info">
            <Percent size={18} />
          </span>
          <div>
            <small>Platform fees earned</small>
            <strong>{formatINR(money.fees)}</strong>
            <em>From completed orders</em>
          </div>
        </div>
      </section>

      {/* ---------- table panel ---------- */}
      <section className="au-panel">
        {selected.size > 0 ? (
          <div className="au-bulkbar" role="region" aria-label="Bulk actions">
            <strong>{selected.size} selected</strong>
            <div className="au-bulkbar-actions">
              {bulkActions.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  className={`ad-btn ad-btn-sm au-bulk-${a.tone}`}
                  onClick={() => askAction(a, [...selected])}
                >
                  {a.short}
                </button>
              ))}
              {bulkActions.length === 0 && (
                <span className="ap-muted">
                  No bulk action applies to this selection.
                </span>
              )}
            </div>
            <button
              type="button"
              className="au-bulk-clear"
              onClick={clearSelection}
            >
              <X size={14} /> Clear
            </button>
          </div>
        ) : (
          <div className="au-toolbar">
            <label className="au-search">
              <Search size={16} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search order ID, item, buyer, seller or transaction"
                aria-label="Search orders"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </label>
            <div className="au-toolbar-right ao-filters">
              <label className="au-select">
                <span>Between</span>
                <select value={flow} onChange={(e) => setFlow(e.target.value)}>
                  <option value="all">All parties</option>
                  {Object.entries(FLOW_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="au-select">
                <span>Payment</span>
                <select
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="Success">Success</option>
                  <option value="Pending">Pending</option>
                  <option value="Failed">Failed</option>
                  <option value="Refunded">Refunded</option>
                  <option value="RefundDue">Refund due</option>
                </select>
              </label>
              <label className="au-select">
                <span>Method</span>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="all">All</option>
                  {Object.entries(METHOD_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="au-select">
                <span>Date</span>
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                >
                  {Object.entries(RANGES).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="au-select">
                <ArrowUpDown size={14} />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="Sort orders"
                >
                  {Object.entries(SORTS).map(([k, s]) => (
                    <option key={k} value={k}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="ad-btn ad-btn-ghost"
                disabled={!filtered.length}
                onClick={() => {
                  exportCsv(filtered);
                  toast(`Exported ${filtered.length} orders to CSV.`);
                }}
              >
                <Download size={15} /> Export
              </button>
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div className="au-table-wrap">
            <table className="au-table ao-table">
              <thead>
                <tr>
                  <th className="col-check">
                    <input
                      type="checkbox"
                      checked={allOnPage}
                      ref={(el) => {
                        if (el) el.indeterminate = !allOnPage && someOnPage;
                      }}
                      onChange={togglePage}
                      aria-label="Select all orders on this page"
                    />
                  </th>
                  <th>Order</th>
                  <th className="col-seller">Seller</th>
                  <th className="col-buyer">Buyer</th>
                  <th>Amount</th>
                  <th className="col-pay">Payment</th>
                  <th>Status</th>
                  <th className="col-date">Placed</th>
                  <th className="col-menu">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr
                    key={o.order_id}
                    className={selected.has(o.order_id) ? "is-selected" : ""}
                    onClick={() => open(o.order_id)}
                    onKeyDown={(e) => onKey(e, o.order_id)}
                    tabIndex={0}
                    aria-label={`Open order ${o.order_id}`}
                  >
                    <td
                      className="col-check"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(o.order_id)}
                        onChange={() => toggleOne(o.order_id)}
                        aria-label={`Select order ${o.order_id}`}
                      />
                    </td>
                    <td>
                      <div className="au-person">
                        <img
                          src={o.listing.image}
                          alt=""
                          className="ap-thumb"
                        />
                        <div>
                          <strong>
                            {o.listing.title}
                            {o.listing.quantity > 1
                              ? ` ×${o.listing.quantity}`
                              : ""}
                          </strong>
                          <span>
                            <span className="aup-mono">{o.order_id}</span> ·{" "}
                            {o.listing.kind === "item" ? "Item" : "Product"}
                          </span>
                          <span className="ap-mobile-meta">
                            {o.seller.name} → {o.buyer.name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="col-seller">
                      <PartyCell party={o.seller} />
                    </td>
                    <td className="col-buyer">
                      <PartyCell party={o.buyer} />
                    </td>
                    <td>
                      <span className="au-muted-strong">
                        {formatINR(o.amount)}
                      </span>
                    </td>
                    <td className="col-pay">
                      <div className="ao-pay">
                        <StatusBadge status={o.transaction.payment_status} />
                        <span className="au-sub">
                          {METHOD_LABEL[o.transaction.payment_method]}
                        </span>
                        {o.refundDue && (
                          <span className="ao-refund-tag">Refund due</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={o.order_status} />
                    </td>
                    <td className="col-date">
                      <span className="au-muted-strong">
                        {formatDate(o.order_date)}
                      </span>
                      <span className="au-sub">{timeAgo(o.order_date)}</span>
                    </td>
                    <td
                      className="col-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActionMenu
                        label={`Actions for order ${o.order_id}`}
                        items={menuItems(o)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length === 0 && (
          <EmptyState
            icon={SearchX}
            title="No orders match your filters"
            text="Try a different search or clear the filters to see every order on the platform."
            action={
              filtersActive && (
                <button
                  type="button"
                  className="ad-btn ad-btn-ghost ad-btn-sm"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )
            }
          />
        )}

        {filtered.length > 0 && (
          <Pagination
            page={safePage}
            pageSize={pageSize}
            total={filtered.length}
            onPage={setPage}
            onPageSize={setPageSize}
            sizes={[10, 20, 50]}
          />
        )}
      </section>

      <ConfirmActionModal
        action={pending?.action}
        targets={pending ? pending.ids : []}
        onConfirm={confirmAction}
        onClose={() => setPending(null)}
      />
      {toastNode}
    </div>
  );
}
