import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Download,
  ShoppingBag,
  CircleCheck,
  Hourglass,
  XCircle,
  Archive,
  X,
  ArrowUpDown,
  SearchX,
  LayoutGrid,
  List,
  Eye,
  Heart,
  Boxes,
  Palette,
} from "lucide-react";

import { useProducts, runProductAction } from "../../data/productsStore";
import {
  PRODUCT_ACTION_LIST,
  canApplyProductAction,
} from "../../data/productActions";
import {
  formatDate,
  formatDateTime,
  formatINR,
  timeAgo,
} from "../../utils/format";

import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import useToast from "../../components/ui/useToast";
import ProductActionMenu from "./components/ProductActionMenu";
import OwnerCell from "./components/OwnerCell";
import ProductStatus from "./components/ProductStatus";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/remakers/AdminRemakers.css";
import "../../css/products/AdminProducts.css";

const STATE_CARDS = [
  { key: "all", label: "All listings", icon: ShoppingBag, tone: "all" },
  { key: "live", label: "Live", icon: CircleCheck, tone: "good" },
  { key: "pending", label: "Pending review", icon: Hourglass, tone: "wait" },
  { key: "rejected", label: "Rejected", icon: XCircle, tone: "bad" },
  { key: "off", label: "Off market", icon: Archive, tone: "neutral" },
];

const SORTS = {
  newest: {
    label: "Newest posted",
    fn: (a, b) => new Date(b.posted_at) - new Date(a.posted_at),
  },
  oldest: {
    label: "Oldest posted",
    fn: (a, b) => new Date(a.posted_at) - new Date(b.posted_at),
  },
  priceHigh: { label: "Price: high to low", fn: (a, b) => b.price - a.price },
  priceLow: { label: "Price: low to high", fn: (a, b) => a.price - b.price },
  views: { label: "Most viewed", fn: (a, b) => b.views - a.views },
};

function exportCsv(rows) {
  const header = [
    "Listing ID",
    "Title",
    "Type",
    "Category",
    "Posted by",
    "Role",
    "Posted on",
    "Price",
    "Qty/Stock",
    "Status",
  ];
  const lines = rows.map((p) =>
    [
      p.id,
      p.title,
      p.typeLabel,
      p.category,
      p.owner.name,
      p.owner.role,
      formatDate(p.posted_at),
      p.price,
      p.quantity,
      p.type === "item" && ["Pending", "Rejected"].includes(p.verification)
        ? p.verification
        : p.rawStatus,
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
  a.download = "reorbit-products.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminProducts() {
  const navigate = useNavigate();
  const products = useProducts();
  const { toast, toastNode } = useToast();

  const [view, setView] = useState("table");
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [selected, setSelected] = useState(() => new Set());
  const [pending, setPending] = useState(null); // { action, ids }

  const open = (id) => navigate(`/admin-products/${id}`);

  const counts = useMemo(() => {
    const c = {
      all: products.length,
      live: 0,
      pending: 0,
      rejected: 0,
      off: 0,
    };
    products.forEach((p) => {
      c[p.state] += 1;
    });
    return c;
  }, [products]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products],
  );

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return products
      .filter((p) => state === "all" || p.state === state)
      .filter((p) => type === "all" || p.type === type)
      .filter((p) => category === "all" || p.category === category)
      .filter(
        (p) =>
          !text ||
          p.title.toLowerCase().includes(text) ||
          p.id.toLowerCase().includes(text) ||
          p.owner.name.toLowerCase().includes(text) ||
          (p.owner.handle || "").toLowerCase().includes(text),
      )
      .sort(SORTS[sort].fn);
  }, [products, query, state, type, category, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => {
    setPage(1);
  }, [query, state, type, category, sort, pageSize]);

  /* selection */
  const rowIds = rows.map((p) => p.id);
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

  const selectedRows = products.filter((p) => selected.has(p.id));
  const bulkActions = Object.values(PRODUCT_ACTION_LIST).filter((a) =>
    selectedRows.some((p) => canApplyProductAction(p, a.key)),
  );

  const askAction = (action, ids) => {
    const eligible = ids.filter((id) => {
      const p = products.find((x) => x.id === id);
      return p && canApplyProductAction(p, action.key);
    });
    if (eligible.length) setPending({ action, ids: eligible });
  };

  const confirmAction = (reason) => {
    const { action, ids } = pending;
    ids.forEach((id) =>
      runProductAction(
        products.find((p) => p.id === id),
        action,
        reason,
      ),
    );
    toast(
      ids.length === 1
        ? `“${products.find((p) => p.id === ids[0]).title}” ${action.toast}.`
        : `${ids.length} listings ${action.toast}.`,
    );
    setPending(null);
    clearSelection();
  };

  const pendingNames = pending
    ? pending.ids.map((id) => products.find((p) => p.id === id)?.title)
    : [];
  const filtersActive =
    query || state !== "all" || type !== "all" || category !== "all";
  const onKey = (e, id) =>
    e.key === "Enter" && e.target === e.currentTarget && open(id);
  const menu = (p) => (
    <ProductActionMenu
      product={p}
      onView={() => open(p.id)}
      onOwner={() => navigate(p.owner.path)}
      onAction={(a) => askAction(a, [p.id])}
    />
  );

  return (
    <div className="au-page">
      <section className="au-cards" aria-label="Filter by listing state">
        {STATE_CARDS.map((card) => {
          const Icon = card.icon;
          const active = state === card.key;
          return (
            <button
              key={card.key}
              type="button"
              className={`au-card tone-${card.tone} ${active ? "active" : ""}`}
              onClick={() => setState(card.key)}
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
                placeholder="Search title, ID or who posted it"
                aria-label="Search products"
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
            <div className="au-toolbar-right">
              <label className="au-select">
                <span>Type</span>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="all">All</option>
                  <option value="item">Community items</option>
                  <option value="product">ReMaker products</option>
                </select>
              </label>
              <label className="au-select">
                <span>Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="all">All</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="au-select">
                <ArrowUpDown size={14} />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="Sort products"
                >
                  {Object.entries(SORTS).map(([k, s]) => (
                    <option key={k} value={k}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rm-view" role="group" aria-label="Layout">
                <button
                  type="button"
                  className={view === "table" ? "active" : ""}
                  onClick={() => setView("table")}
                  aria-label="Table view"
                  aria-pressed={view === "table"}
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  className={view === "grid" ? "active" : ""}
                  onClick={() => setView("grid")}
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
              <button
                type="button"
                className="ad-btn ad-btn-ghost"
                disabled={!filtered.length}
                onClick={() => {
                  exportCsv(filtered);
                  toast(`Exported ${filtered.length} listings to CSV.`);
                }}
              >
                <Download size={15} /> Export
              </button>
            </div>
          </div>
        )}

        {view === "table" && rows.length > 0 && (
          <div className="au-table-wrap">
            <table className="au-table ap-table">
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
                      aria-label="Select all listings on this page"
                    />
                  </th>
                  <th>Product</th>
                  <th className="col-method">Type</th>
                  <th className="col-owner">Posted by</th>
                  <th className="col-posted">Posted on</th>
                  <th className="col-loc">Price</th>
                  <th className="col-activity">Qty</th>
                  <th>Status</th>
                  <th className="col-menu">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    className={selected.has(p.id) ? "is-selected" : ""}
                    onClick={() => open(p.id)}
                    onKeyDown={(e) => onKey(e, p.id)}
                    tabIndex={0}
                    aria-label={`Open details of ${p.title}`}
                  >
                    <td
                      className="col-check"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleOne(p.id)}
                        aria-label={`Select ${p.title}`}
                      />
                    </td>
                    <td>
                      <div className="au-person">
                        <img src={p.image} alt="" className="ap-thumb" />
                        <div>
                          <strong>{p.title}</strong>
                          <span>
                            {p.id} · {p.category}
                          </span>
                          <span className="ap-mobile-meta">
                            By {p.owner.name} · {timeAgo(p.posted_at)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="col-method">
                      <span className={`ap-type ${p.type}`}>
                        {p.type === "item" ? (
                          <Boxes size={13} />
                        ) : (
                          <Palette size={13} />
                        )}
                        {p.type === "item" ? "Item" : "Product"}
                      </span>
                    </td>
                    <td className="col-owner">
                      <OwnerCell owner={p.owner} />
                    </td>
                    <td className="col-posted">
                      <span className="au-muted-strong">
                        {formatDate(p.posted_at)}
                      </span>
                      <span className="au-sub">{timeAgo(p.posted_at)}</span>
                    </td>
                    <td className="col-loc">
                      <span className="au-muted-strong">
                        {formatINR(p.price)}
                      </span>
                    </td>
                    <td className="col-activity">
                      <span className="au-muted-strong">{p.quantity}</span>
                    </td>
                    <td>
                      <ProductStatus product={p} />
                    </td>
                    <td
                      className="col-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {menu(p)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === "grid" && rows.length > 0 && (
          <div className="ap-grid">
            {rows.map((p) => (
              <article
                key={p.id}
                className={`ap-card ${selected.has(p.id) ? "is-selected" : ""}`}
                onClick={() => open(p.id)}
                onKeyDown={(e) => onKey(e, p.id)}
                tabIndex={0}
                aria-label={`Open details of ${p.title}`}
              >
                <div className="ap-card-image">
                  <img src={p.image} alt={p.title} />
                  <div
                    className="ap-card-overlay"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      aria-label={`Select ${p.title}`}
                    />
                    {menu(p)}
                  </div>
                  <span className="ap-card-status">
                    <ProductStatus product={p} />
                  </span>
                </div>
                <div className="ap-card-body">
                  <span className={`ap-type ${p.type}`}>{p.typeLabel}</span>
                  <h4>{p.title}</h4>
                  <div className="ap-card-price">
                    <strong>{formatINR(p.price)}</strong>
                    <span>Qty {p.quantity}</span>
                  </div>
                  <OwnerCell owner={p.owner} size={30} />
                  <div className="ap-card-foot">
                    <span title={formatDateTime(p.posted_at)}>
                      Posted {timeAgo(p.posted_at)}
                    </span>
                    <span>
                      <Eye size={13} /> {p.views}
                    </span>
                    <span>
                      <Heart size={13} /> {p.wishlisted}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {rows.length === 0 && (
          <EmptyState
            icon={SearchX}
            title="No listings match your filters"
            text="Try a different search or clear the filters to see everything on the marketplace."
            action={
              filtersActive && (
                <button
                  type="button"
                  className="ad-btn ad-btn-ghost ad-btn-sm"
                  onClick={() => {
                    setQuery("");
                    setState("all");
                    setType("all");
                    setCategory("all");
                  }}
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
            sizes={[8, 12, 24]}
          />
        )}
      </section>

      <ConfirmActionModal
        action={pending?.action}
        targets={pendingNames}
        onConfirm={confirmAction}
        onClose={() => setPending(null)}
      />
      {toastNode}
    </div>
  );
}
