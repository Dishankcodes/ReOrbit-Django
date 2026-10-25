import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Download, Warehouse, PackageOpen, PackageCheck, ShoppingCart, Wrench, Truck, X, ArrowUpDown,
  SearchX, Eye, UserRound, BellRing, Boxes, IndianRupee, TrendingUp, Timer, ArrowRight, Snowflake,
} from "lucide-react";

import { useStock, runWarehouseAction, ALERT_LEVELS } from "../../data/warehouseStore";
import { WAREHOUSE_ACTION_LIST, getWarehouseActions, canApplyWarehouseAction } from "../../data/warehouseActions";
import { useSettings } from "../../data/settingsStore";
import { ZONES, WAREHOUSE_ADDRESS } from "../../data/adminWarehouse";
import { formatDate, formatDateTime, formatINR } from "../../utils/format";

import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import RowActionMenu from "../../components/ui/RowActionMenu";
import { ACTION_ICONS } from "../../components/ui/actionIcons";
import useToast from "../../components/ui/useToast";
import { AlertChip, SaleChip, AgeBar } from "./components/StockBadges";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/products/AdminProducts.css";
import "../../css/orders/AdminOrders.css";
import "../../css/warehouse/AdminWarehouse.css";

const STATUS_CARDS = [
  { key: "All", label: "In warehouse", icon: Warehouse, tone: "all" },
  { key: "Received", label: "At dock", icon: PackageOpen, tone: "info" },
  { key: "Stored", label: "Stored", icon: PackageCheck, tone: "good" },
  { key: "Assigned", label: "Sold · to dispatch", icon: ShoppingCart, tone: "wait" },
  { key: "Refurbishment", label: "Refurbishment", icon: Wrench, tone: "info" },
  { key: "Released", label: "Released", icon: Truck, tone: "neutral" },
];

const AGEING = {
  all: "All ageing",
  alert: "Unsold too long (alerts)",
  slow: "Slow moving (14+ days)",
  dead: "Dead stock (30+ days)",
  fresh: "Fresh (under 7 days)",
  unlisted: "Not listed yet",
};

const SORTS = {
  oldest: { label: "Longest on shelf", fn: (a, b) => b.daysInStock - a.daysInStock },
  newest: { label: "Newest received", fn: (a, b) => new Date(b.received_at) - new Date(a.received_at) },
  valueHigh: { label: "Value: high to low", fn: (a, b) => b.cost_price - a.cost_price },
  location: { label: "Location (A → Z)", fn: (a, b) => a.locationLabel.localeCompare(b.locationLabel) },
};

function exportCsv(rows) {
  const header = ["Inventory ID", "SKU", "Item", "Category", "Qty", "Source", "Location", "Cost", "Price", "Warehouse status", "Sale status", "Days in stock", "Days listed", "Alert"];
  const lines = rows.map((s) =>
    [s.inventory_id, s.sku, s.title, s.category, s.quantity, s.source.name, s.locationLabel, s.cost_price, s.list_price, s.warehouse_status, s.sale_status, s.daysInStock, s.daysListed, s.alert ? s.alert.label : ""]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reorbit-warehouse-stock.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminWarehouse() {
  const UNSOLD_DAYS = useSettings().warehouse.unsoldDays;
  const navigate = useNavigate();
  const stock = useStock();
  const { toast, toastNode } = useToast();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [ageing, setAgeing] = useState("all");
  const [zone, setZone] = useState("all");
  const [sort, setSort] = useState("oldest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(() => new Set());
  const [pending, setPending] = useState(null);

  const open = (id) => navigate(`/admin-warehouse/${id}`);
  const alerts = useMemo(() => stock.filter((s) => s.alert).sort((a, b) => b.daysListed - a.daysListed), [stock]);
  const snoozedCount = stock.filter((s) => s.snoozed && s.rawAlert).length;

  /* ---------- numbers ---------- */
  const counts = useMemo(() => {
    const c = { All: 0, Received: 0, Stored: 0, Assigned: 0, Refurbishment: 0, Released: 0 };
    stock.forEach((s) => { c[s.warehouse_status] += 1; if (s.inside) c.All += 1; });
    return c;
  }, [stock]);

  const kpi = useMemo(() => {
    const inside = stock.filter((s) => s.inside);
    const units = inside.reduce((n, s) => n + s.quantity, 0);
    const cost = inside.reduce((n, s) => n + s.cost_price, 0);
    const retail = inside.filter((s) => s.sale_status !== "Donated").reduce((n, s) => n + s.list_price, 0);
    const onShelf = inside.filter((s) => s.warehouse_status === "Stored" && s.sale_status === "Listed");
    const avg = onShelf.length ? Math.round(onShelf.reduce((n, s) => n + s.daysListed, 0) / onShelf.length) : 0;
    const stuck = alerts.reduce((n, s) => n + s.cost_price, 0);
    return { units, lines: inside.length, cost, retail, avg, stuck };
  }, [stock, alerts]);

  const levelCounts = useMemo(() => {
    const c = { watch: 0, slow: 0, dead: 0 };
    alerts.forEach((s) => { c[s.alert.key] += 1; });
    return c;
  }, [alerts]);

  const zoneUse = useMemo(() => ZONES.map((z) => {
    const used = stock.filter((s) => s.location?.zone === z.key).length;
    const flagged = stock.filter((s) => s.location?.zone === z.key && s.alert).length;
    return { ...z, used, flagged, pct: Math.min(100, Math.round((used / z.capacity) * 100)) };
  }), [stock]);
  const dockCount = stock.filter((s) => s.location?.zone === "DOCK").length;
  const qcCount = stock.filter((s) => s.location?.zone === "QC").length;

  /* ---------- filter + sort ---------- */
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return stock
      .filter((s) => (status === "All" ? s.inside : s.warehouse_status === status))
      .filter((s) => zone === "all" || s.location?.zone === zone)
      .filter((s) => {
        if (ageing === "all") return true;
        if (ageing === "alert") return !!s.alert;
        if (ageing === "slow") return s.alert && ["slow", "dead"].includes(s.alert.key);
        if (ageing === "dead") return s.alert?.key === "dead";
        if (ageing === "fresh") return s.sale_status === "Listed" && s.warehouse_status === "Stored" && s.daysListed < UNSOLD_DAYS;
        return s.sale_status === "Not listed";
      })
      .filter((s) => !text || [s.inventory_id, s.sku, s.title, s.category, s.source.name, s.locationLabel].some((v) => v.toLowerCase().includes(text)))
      .sort(SORTS[sort].fn);
  }, [stock, query, status, ageing, zone, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => { setPage(1); }, [query, status, ageing, zone, sort, pageSize]);

  const filtersActive = query || status !== "All" || ageing !== "all" || zone !== "all";
  const clearFilters = () => { setQuery(""); setStatus("All"); setAgeing("all"); setZone("all"); };

  const showAlerts = (level) => {
    setStatus("All"); setZone("all"); setQuery("");
    setAgeing(level === "all" ? "alert" : level === "dead" ? "dead" : level === "slow" ? "slow" : "alert");
    document.getElementById("aw-stock-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ---------- selection ---------- */
  const rowIds = rows.map((s) => s.inventory_id);
  const allOnPage = rowIds.length > 0 && rowIds.every((id) => selected.has(id));
  const someOnPage = rowIds.some((id) => selected.has(id));
  const toggleOne = (id) => setSelected((cur) => { const n = new Set(cur); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const togglePage = () => setSelected((cur) => { const n = new Set(cur); rowIds.forEach((id) => (allOnPage ? n.delete(id) : n.add(id))); return n; });
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const selectedRows = stock.filter((s) => selected.has(s.inventory_id));
  const bulkActions = Object.values(WAREHOUSE_ACTION_LIST).filter((a) => selectedRows.some((s) => canApplyWarehouseAction(s, a.key)));

  /* ---------- actions ---------- */
  const askAction = (action, ids) => {
    const eligible = ids.filter((id) => {
      const s = stock.find((x) => x.inventory_id === id);
      return s && canApplyWarehouseAction(s, action.key);
    });
    if (eligible.length) setPending({ action, ids: eligible });
  };
  const confirmAction = (note) => {
    const { action, ids } = pending;
    ids.forEach((id) => runWarehouseAction(id, action.key, note));
    toast(ids.length === 1 ? `${ids[0]} ${action.toast}.` : `${ids.length} items ${action.toast}.`);
    setPending(null);
    clearSelection();
  };

  const menuItems = (s) => [
    { key: "view", label: "View details", icon: Eye, onClick: () => open(s.inventory_id) },
    { key: "src", label: `View ${s.source.type === "ReMaker" ? "ReMaker" : "seller"}`, icon: UserRound, onClick: () => navigate(s.source.path) },
    ...(getWarehouseActions(s).length ? ["separator"] : []),
    ...getWarehouseActions(s).map((a) => ({ key: a.key, label: a.label, icon: ACTION_ICONS[a.icon], tone: a.tone, onClick: () => askAction(a, [s.inventory_id]) })),
  ];

  const onKey = (e, id) => e.key === "Enter" && e.target === e.currentTarget && open(id);
  const quickCut = (s) => askAction(WAREHOUSE_ACTION_LIST.discount, [s.inventory_id]);

  return (
    <div className="au-page">
      {/* ---------- alert banner ---------- */}
      {alerts.length > 0 ? (
        <section className="aw-alerts" aria-label="Unsold stock alerts">
          <header className="aw-alerts-head">
            <span className="aw-alerts-icon"><BellRing size={22} /></span>
            <div>
              <h3>{alerts.length} product{alerts.length === 1 ? " has" : "s have"} not sold in {UNSOLD_DAYS}+ days</h3>
              <p>{formatINR(kpi.stuck)} of stock (at cost) is sitting on the shelf. Reduce the price, promote it, refurbish it or donate it.</p>
            </div>
            <div className="aw-levels">
              {Object.values(ALERT_LEVELS).map((l) => (
                <button key={l.key} type="button" className={`aw-level lvl-${l.key}`} onClick={() => showAlerts(l.key)} disabled={!levelCounts[l.key]}>
                  <strong>{levelCounts[l.key]}</strong><span>{l.label}</span>
                </button>
              ))}
            </div>
          </header>

          <ul className="aw-alert-list">
            {alerts.slice(0, 4).map((s) => (
              <li key={s.inventory_id}>
                <button type="button" className="aw-alert-main" onClick={() => open(s.inventory_id)}>
                  <img src={s.image} alt="" />
                  <span className="aw-alert-text">
                    <strong>{s.title}</strong>
                    <small>{s.inventory_id} · {s.locationLabel} · Listed {s.daysListed} days ago · {s.views} views</small>
                  </span>
                </button>
                <AlertChip stock={s} />
                <div className="aw-alert-actions">
                  <button type="button" className="ad-btn ad-btn-sm aw-btn-light" onClick={() => quickCut(s)}>Cut price 15%</button>
                  <button type="button" className="ad-btn ad-btn-sm aw-btn-ghost" onClick={() => open(s.inventory_id)}>Review <ArrowRight size={13} /></button>
                </div>
              </li>
            ))}
          </ul>
          <footer className="aw-alerts-foot">
            <button type="button" className="aw-link" onClick={() => showAlerts("all")}>See all {alerts.length} alerts in the stock list <ArrowRight size={14} /></button>
            {snoozedCount > 0 && <span><Snowflake size={13} /> {snoozedCount} snoozed</span>}
          </footer>
        </section>
      ) : (
        <section className="aw-allclear" role="status">
          <PackageCheck size={20} /> <strong>All clear.</strong> Nothing has sat unsold for {UNSOLD_DAYS}+ days.
          {snoozedCount > 0 && <span> · {snoozedCount} alert{snoozedCount === 1 ? "" : "s"} snoozed</span>}
        </section>
      )}

      {/* ---------- KPIs ---------- */}
      <section className="ao-money" aria-label="Stock summary">
        <div className="ao-money-card">
          <span className="ao-money-icon info"><Boxes size={18} /></span>
          <div><small>Units in warehouse</small><strong>{kpi.units}</strong><em>{kpi.lines} stock lines on site</em></div>
        </div>
        <div className="ao-money-card">
          <span className="ao-money-icon good"><IndianRupee size={18} /></span>
          <div><small>Stock value (cost)</small><strong>{formatINR(kpi.cost)}</strong><em>What ReOrbit paid for it</em></div>
        </div>
        <div className="ao-money-card">
          <span className="ao-money-icon good"><TrendingUp size={18} /></span>
          <div><small>Potential sales value</small><strong>{formatINR(kpi.retail)}</strong><em>At current marketplace prices</em></div>
        </div>
        <button type="button" className="ao-money-card is-link" onClick={() => showAlerts("all")}>
          <span className="ao-money-icon wait"><Timer size={18} /></span>
          <div><small>Avg. days on sale</small><strong>{kpi.avg} days</strong><em>Target: under {UNSOLD_DAYS} · click for alerts</em></div>
        </button>
      </section>

      {/* ---------- floor plan ---------- */}
      <section className="aw-floor" aria-label="Warehouse floor plan">
        <header className="aw-floor-head">
          <div><h3>Floor plan</h3><p>{WAREHOUSE_ADDRESS}</p></div>
          {zone !== "all" && <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setZone("all")}><X size={14} /> Show all zones</button>}
        </header>
        <div className="aw-zones">
          {zoneUse.map((z) => (
            <button key={z.key} type="button" className={`aw-zone ${zone === z.key ? "active" : ""}`} onClick={() => { setStatus("All"); setZone(zone === z.key ? "all" : z.key); }} aria-pressed={zone === z.key}>
              <span className="aw-zone-key">{z.key}</span>
              <span className="aw-zone-body">
                <strong>{z.name}</strong>
                <small>{z.used} of {z.capacity} bins{z.flagged ? ` · ${z.flagged} unsold` : ""}</small>
                <span className="aw-bar"><i className={z.pct >= 85 ? "full" : z.pct >= 60 ? "busy" : ""} style={{ width: `${z.pct}%` }} /></span>
              </span>
              <em>{z.pct}%</em>
            </button>
          ))}
          <button type="button" className={`aw-zone aw-zone-aux ${zone === "DOCK" ? "active" : ""}`} onClick={() => { setStatus("All"); setZone(zone === "DOCK" ? "all" : "DOCK"); }}>
            <span className="aw-zone-key aux"><PackageOpen size={16} /></span>
            <span className="aw-zone-body"><strong>Receiving dock</strong><small>{dockCount} waiting to be put away</small></span>
          </button>
          <button type="button" className={`aw-zone aw-zone-aux ${zone === "QC" ? "active" : ""}`} onClick={() => { setStatus("All"); setZone(zone === "QC" ? "all" : "QC"); }}>
            <span className="aw-zone-key aux"><Wrench size={16} /></span>
            <span className="aw-zone-body"><strong>QC &amp; refurbishment bay</strong><small>{qcCount} with ReMakers</small></span>
          </button>
        </div>
      </section>

      {/* ---------- status cards ---------- */}
      <section className="au-cards ao-cards" aria-label="Filter by warehouse status">
        {STATUS_CARDS.map((card) => {
          const Icon = card.icon;
          const active = status === card.key;
          return (
            <button key={card.key} type="button" className={`au-card tone-${card.tone} ${active ? "active" : ""}`} onClick={() => setStatus(card.key)} aria-pressed={active}>
              <span className="au-card-icon"><Icon size={18} strokeWidth={1.8} /></span>
              <span className="au-card-text"><small>{card.label}</small><strong>{counts[card.key]}</strong></span>
            </button>
          );
        })}
      </section>

      {/* ---------- stock table ---------- */}
      <section className="au-panel" id="aw-stock-panel">
        {selected.size > 0 ? (
          <div className="au-bulkbar" role="region" aria-label="Bulk actions">
            <strong>{selected.size} selected</strong>
            <div className="au-bulkbar-actions">
              {bulkActions.map((a) => (
                <button key={a.key} type="button" className={`ad-btn ad-btn-sm au-bulk-${a.tone}`} onClick={() => askAction(a, [...selected])}>{a.short}</button>
              ))}
              {bulkActions.length === 0 && <span className="ap-muted">No bulk action applies to this selection.</span>}
            </div>
            <button type="button" className="au-bulk-clear" onClick={clearSelection}><X size={14} /> Clear</button>
          </div>
        ) : (
          <div className="au-toolbar">
            <label className="au-search">
              <Search size={16} />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search item, SKU, inventory ID, seller or rack" aria-label="Search stock" />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
            </label>
            <div className="au-toolbar-right ao-filters">
              <label className="au-select">
                <span>Ageing</span>
                <select value={ageing} onChange={(e) => setAgeing(e.target.value)}>
                  {Object.entries(AGEING).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </label>
              <label className="au-select">
                <span>Zone</span>
                <select value={zone} onChange={(e) => setZone(e.target.value)}>
                  <option value="all">All zones</option>
                  {ZONES.map((z) => <option key={z.key} value={z.key}>{z.key} · {z.name}</option>)}
                  <option value="DOCK">Receiving dock</option>
                  <option value="QC">QC bay</option>
                </select>
              </label>
              <label className="au-select">
                <ArrowUpDown size={14} />
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort stock">
                  {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                </select>
              </label>
              <button type="button" className="ad-btn ad-btn-ghost" disabled={!filtered.length} onClick={() => { exportCsv(filtered); toast(`Exported ${filtered.length} stock lines to CSV.`); }}>
                <Download size={15} /> Export
              </button>
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div className="au-table-wrap">
            <table className="au-table aw-table">
              <thead>
                <tr>
                  <th className="col-check">
                    <input type="checkbox" checked={allOnPage} ref={(el) => { if (el) el.indeterminate = !allOnPage && someOnPage; }} onChange={togglePage} aria-label="Select all stock on this page" />
                  </th>
                  <th>Item</th>
                  <th className="col-source">Bought from</th>
                  <th>Location</th>
                  <th className="col-value">Value</th>
                  <th>Status</th>
                  <th>On shelf</th>
                  <th className="col-menu"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.inventory_id} className={`${selected.has(s.inventory_id) ? "is-selected" : ""} ${s.alert ? `aw-row-${s.alert.key}` : ""}`} onClick={() => open(s.inventory_id)} onKeyDown={(e) => onKey(e, s.inventory_id)} tabIndex={0} aria-label={`Open stock ${s.inventory_id}`}>
                    <td className="col-check" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(s.inventory_id)} onChange={() => toggleOne(s.inventory_id)} aria-label={`Select ${s.inventory_id}`} />
                    </td>
                    <td>
                      <div className="au-person">
                        <img src={s.image} alt="" className="ap-thumb" />
                        <div>
                          <strong>{s.title}{s.quantity > 1 ? ` ×${s.quantity}` : ""}</strong>
                          <span><span className="aup-mono">{s.inventory_id}</span> · {s.category}</span>
                          <span className="ap-mobile-meta">{s.locationLabel} · {s.daysInStock}d in stock</span>
                        </div>
                      </div>
                    </td>
                    <td className="col-source">
                      <div className="ap-owner">
                        <UserAvatar name={s.source.name} src={s.source.image} size={30} rounded="9px" />
                        <div>
                          <span className="ap-owner-name plain">{s.source.name}</span>
                          <span className={`ap-role ${s.source.type === "ReMaker" ? "rm" : ""}`}>{s.source.type}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`aw-loc ${s.location ? "" : "none"}`}>{s.locationLabel}</span>
                      <span className="au-sub">{s.zone ? s.zone.name : s.location?.zone === "DOCK" ? "Receiving dock" : s.location?.zone === "QC" ? "QC bay" : "Left site"}</span>
                    </td>
                    <td className="col-value">
                      <span className="au-muted-strong">{formatINR(s.list_price)}</span>
                      <span className="au-sub">Cost {formatINR(s.cost_price)}</span>
                    </td>
                    <td>
                      <div className="aw-status">
                        <StatusBadge status={s.warehouse_status} />
                        <SaleChip stock={s} />
                      </div>
                    </td>
                    <td>
                      <div className="aw-shelf">
                        <AgeBar stock={s} />
                        <AlertChip stock={s} compact />
                        {s.snoozed && s.rawAlert && <span className="aw-snoozed"><Snowflake size={11} /> Snoozed</span>}
                      </div>
                    </td>
                    <td className="col-menu" onClick={(e) => e.stopPropagation()}>
                      <RowActionMenu label={`Actions for ${s.inventory_id}`} items={menuItems(s)} />
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
            title="No stock matches your filters"
            text="Try a different search or clear the filters to see everything in the warehouse."
            action={filtersActive && <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={clearFilters}>Clear filters</button>}
          />
        )}

        {filtered.length > 0 && (
          <Pagination page={safePage} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={setPageSize} sizes={[10, 20, 50]} />
        )}
      </section>

      <ConfirmActionModal action={pending?.action} targets={pending ? pending.ids : []} onConfirm={confirmAction} onClose={() => setPending(null)} />
      {toastNode}
    </div>
  );
}
