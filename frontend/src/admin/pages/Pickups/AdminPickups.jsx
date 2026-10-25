import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Download, Truck, Inbox, CalendarClock, PackageCheck, CircleCheck, XCircle, X, ArrowUpDown,
  SearchX, Eye, UserRound, BellRing, ArrowRight, MapPin, CalendarCheck2, AlarmClock, Route, ExternalLink,
} from "lucide-react";

import { usePickups, runPickupAction, AGENTS, TODAY_START } from "../../data/pickupsStore";
import { PICKUP_ACTION_LIST, getPickupActions, canApplyPickupAction } from "../../data/pickupActions";
import { formatDate, timeAgo } from "../../utils/format";

import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import RowActionMenu from "../../components/ui/RowActionMenu";
import { ACTION_ICONS } from "../../components/ui/actionIcons";
import useToast from "../../components/ui/useToast";
import DonationActionModal from "../Donations/components/DonationActionModal";
import { TypeChip, DueChip } from "./components/PickupBadges";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/products/AdminProducts.css";
import "../../css/orders/AdminOrders.css";
import "../../css/donations/AdminDonations.css";
import "../../css/pickups/AdminPickups.css";

const STATUS_CARDS = [
  { key: "All", label: "All pickups", icon: Truck, tone: "all" },
  { key: "Requested", label: "Requested", icon: Inbox, tone: "wait" },
  { key: "Scheduled", label: "Scheduled", icon: CalendarClock, tone: "info" },
  { key: "Picked_Up", label: "Picked up", icon: PackageCheck, tone: "info" },
  { key: "Completed", label: "Completed", icon: CircleCheck, tone: "good" },
  { key: "Cancelled", label: "Cancelled", icon: XCircle, tone: "bad" },
];

const WHEN = { all: "Any date", overdue: "Overdue", today: "Today", tomorrow: "Tomorrow", week: "Next 7 days" };
const SLOT_ORDER = { "9:00 AM – 12:00 PM": 1, "12:00 PM – 3:00 PM": 2, "3:00 PM – 6:00 PM": 3 };

const RANK = { Scheduled: 0, Picked_Up: 1, Requested: 2, Completed: 3, Cancelled: 4 };
const rank = (p) => (p.due?.key === "overdue" ? -1 : RANK[p.status]);

const SORTS = {
  soonest: { label: "Needs action first", fn: (a, b) => rank(a) - rank(b) || (a.date && b.date ? new Date(a.date) - new Date(b.date) : 0) || new Date(b.requested_at) - new Date(a.requested_at) },
  newest: { label: "Newest request", fn: (a, b) => new Date(b.requested_at) - new Date(a.requested_at) },
  oldest: { label: "Oldest request", fn: (a, b) => new Date(a.requested_at) - new Date(b.requested_at) },
};

function exportCsv(rows) {
  const header = ["Pickup ID", "Type", "Linked record", "Item", "Qty", "Customer", "Phone", "Address", "Pincode", "Status", "Pickup date", "Slot", "Pickup team"];
  const lines = rows.map((p) =>
    [p.id, p.type, p.ref_id, p.title, p.quantity, p.customer.name, p.customer.phone, `${p.address}, ${p.city}`, p.pincode, p.status, p.date ? formatDate(p.date) : "", p.slot || "", p.agent || ""]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "reorbit-pickups.csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPickups() {
  const navigate = useNavigate();
  const pickups = usePickups();
  const { toast, toastNode } = useToast();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("all");
  const [agent, setAgent] = useState("all");
  const [when, setWhen] = useState("all");
  const [sort, setSort] = useState("soonest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(() => new Set());
  const [pending, setPending] = useState(null);

  const open = (id) => navigate(`/admin-pickups/${id}`);

  /* ---------- numbers ---------- */
  const counts = useMemo(() => {
    const c = { All: pickups.length, Requested: 0, Scheduled: 0, Picked_Up: 0, Completed: 0, Cancelled: 0 };
    pickups.forEach((p) => { c[p.status] += 1; });
    return c;
  }, [pickups]);

  const overdue = useMemo(() => pickups.filter((p) => p.due?.key === "overdue").sort((a, b) => a.due.diff - b.due.diff), [pickups]);
  const todays = useMemo(() => pickups.filter((p) => p.due?.key === "today"), [pickups]);
  const tomorrows = pickups.filter((p) => p.due?.key === "tomorrow");
  const requested = pickups.filter((p) => p.status === "Requested");

  const agentBoard = useMemo(() => AGENTS.map((name) => {
    const mine = pickups.filter((p) => p.agent === name && p.status === "Scheduled" && p.due && p.due.diff >= 0);
    const stops = mine.filter((p) => p.due.key === "today").sort((a, b) => (SLOT_ORDER[a.slot] || 9) - (SLOT_ORDER[b.slot] || 9));
    const late = pickups.filter((p) => p.agent === name && p.due?.key === "overdue").length;
    return { name, stops, upcoming: mine.length - stops.length, late };
  }), [pickups]);

  /* ---------- filter + sort ---------- */
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return pickups
      .filter((p) => status === "All" || p.status === status)
      .filter((p) => type === "all" || p.type === type)
      .filter((p) => agent === "all" || (agent === "none" ? !p.agent : p.agent === agent))
      .filter((p) => {
        if (when === "all") return true;
        if (!p.date || p.status === "Cancelled") return false;
        const diff = Math.round((new Date(p.date).setHours(0, 0, 0, 0) - TODAY_START) / 86400000);
        if (when === "overdue") return p.due?.key === "overdue";
        if (when === "today") return diff === 0;
        if (when === "tomorrow") return diff === 1;
        return diff >= 0 && diff <= 7;
      })
      .filter((p) => !text || [p.id, p.ref_id, p.title, p.customer.name, p.city, p.pincode].some((v) => String(v).toLowerCase().includes(text)))
      .sort(SORTS[sort].fn);
  }, [pickups, query, status, type, agent, when, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => { setPage(1); }, [query, status, type, agent, when, sort, pageSize]);

  const filtersActive = query || status !== "All" || type !== "all" || agent !== "all" || when !== "all";
  const clearFilters = () => { setQuery(""); setStatus("All"); setType("all"); setAgent("all"); setWhen("all"); };
  const jump = (patch) => {
    setStatus(patch.status || "All"); setWhen(patch.when || "all"); setAgent(patch.agent || "all"); setType("all"); setQuery("");
    document.getElementById("pk-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ---------- selection ---------- */
  const rowIds = rows.map((p) => p.id);
  const allOnPage = rowIds.length > 0 && rowIds.every((id) => selected.has(id));
  const someOnPage = rowIds.some((id) => selected.has(id));
  const toggleOne = (id) => setSelected((cur) => { const n = new Set(cur); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const togglePage = () => setSelected((cur) => { const n = new Set(cur); rowIds.forEach((id) => (allOnPage ? n.delete(id) : n.add(id))); return n; });
  const clearSelection = useCallback(() => setSelected(new Set()), []);
  const selectedRows = pickups.filter((p) => selected.has(p.id));
  const bulkActions = Object.values(PICKUP_ACTION_LIST).filter((a) => selectedRows.some((p) => canApplyPickupAction(p, a.key)));

  /* ---------- actions ---------- */
  const askAction = (action, ids) => {
    const eligible = ids.filter((id) => { const p = pickups.find((x) => x.id === id); return p && canApplyPickupAction(p, action.key); });
    if (eligible.length) setPending({ action, ids: eligible });
  };
  const confirmAction = (payload) => {
    const { action, ids } = pending;
    ids.forEach((id) => { const p = pickups.find((x) => x.id === id); if (p) runPickupAction(p, action.key, payload); });
    toast(ids.length === 1 ? `Pickup ${ids[0]} ${action.toast}.` : `${ids.length} pickups ${action.toast}.`);
    setPending(null);
    clearSelection();
  };

  const menuItems = (p) => [
    { key: "view", label: "View details", icon: Eye, onClick: () => open(p.id) },
    { key: "cust", label: p.type === "Donation" ? "View donor" : "View user", icon: UserRound, onClick: () => navigate(p.customer.path) },
    { key: "ref", label: `View ${p.type === "Donation" ? "donation" : "item"}`, icon: ExternalLink, onClick: () => navigate(p.ref_path) },
    ...(getPickupActions(p).length ? ["separator"] : []),
    ...getPickupActions(p).map((a) => ({ key: a.key, label: a.label, icon: ACTION_ICONS[a.icon], tone: a.tone, onClick: () => askAction(a, [p.id]) })),
  ];
  const onKey = (e, id) => e.key === "Enter" && e.target === e.currentTarget && open(id);

  return (
    <div className="au-page">
      {/* ---------- attention banner ---------- */}
      {overdue.length > 0 ? (
        <section className="pk-alert" aria-label="Overdue pickups">
          <header className="pk-alert-head">
            <span className="pk-alert-icon"><BellRing size={22} /></span>
            <div>
              <h3>{overdue.length} pickup{overdue.length === 1 ? " is" : "s are"} overdue</h3>
              <p>The pickup date has passed and the item is still with the customer. Mark it picked up, or reschedule so the customer is not left waiting.</p>
            </div>
          </header>
          <ul className="pk-alert-list">
            {overdue.slice(0, 3).map((p) => (
              <li key={p.id}>
                <button type="button" className="pk-alert-main" onClick={() => open(p.id)}>
                  <img src={p.image} alt="" />
                  <span><strong>{p.title}{p.quantity > 1 ? ` ×${p.quantity}` : ""}</strong><small>{p.id} · {p.customer.name} · {p.city} {p.pincode} · was due {formatDate(p.date)}</small></span>
                </button>
                <DueChip pickup={p} />
                <div className="pk-alert-actions">
                  <button type="button" className="ad-btn ad-btn-sm dn-btn-accept" onClick={() => askAction(PICKUP_ACTION_LIST.pickedUp, [p.id])}>Picked up</button>
                  <button type="button" className="ad-btn ad-btn-sm dn-btn-reject pk-btn-neutral" onClick={() => askAction(PICKUP_ACTION_LIST.reschedule, [p.id])}>Reschedule</button>
                </div>
              </li>
            ))}
          </ul>
          <footer className="pk-alert-foot">
            <button type="button" className="dn-link" onClick={() => jump({ status: "Scheduled", when: "overdue" })}>See all {overdue.length} overdue pickups <ArrowRight size={14} /></button>
          </footer>
        </section>
      ) : (
        <section className="dn-allclear" role="status"><CircleCheck size={20} /> <strong>On schedule.</strong> No pickup is overdue.</section>
      )}

      {/* ---------- KPIs ---------- */}
      <section className="ao-money" aria-label="Pickup summary">
        <button type="button" className="ao-money-card is-link" onClick={() => jump({ status: "Requested" })}>
          <span className="ao-money-icon wait"><Inbox size={18} /></span>
          <div><small>Need scheduling</small><strong>{requested.length}</strong><em>Requests with no date yet</em></div>
        </button>
        <button type="button" className="ao-money-card is-link" onClick={() => jump({ status: "Scheduled", when: "today" })}>
          <span className="ao-money-icon info"><CalendarCheck2 size={18} /></span>
          <div><small>Pickups today</small><strong>{todays.length}</strong><em>Across {AGENTS.length} pickup teams</em></div>
        </button>
        <button type="button" className="ao-money-card is-link" onClick={() => jump({ status: "Scheduled", when: "tomorrow" })}>
          <span className="ao-money-icon info"><CalendarClock size={18} /></span>
          <div><small>Pickups tomorrow</small><strong>{tomorrows.length}</strong><em>Ready to dispatch</em></div>
        </button>
        <button type="button" className="ao-money-card is-link" onClick={() => jump({ status: "Scheduled", when: "overdue" })}>
          <span className="ao-money-icon bad"><AlarmClock size={18} /></span>
          <div><small>Overdue</small><strong>{overdue.length}</strong><em>Past the scheduled date</em></div>
        </button>
      </section>

      {/* ---------- today's route board ---------- */}
      <section className="pk-board" aria-label="Today's route by pickup team">
        <header className="pk-board-head">
          <div><h3><Route size={18} /> Today’s route</h3><p>Who is collecting what today, in time-slot order.</p></div>
        </header>
        <div className="pk-columns">
          {agentBoard.map((col) => (
            <div key={col.name} className="pk-col">
              <div className="pk-col-head">
                <span className="pk-col-avatar">{col.name.split("·")[0].trim().replace("Pickup team ", "")}</span>
                <div>
                  <strong>{col.name.split("·")[1]?.trim()}</strong>
                  <small>{col.name.split("·")[0].trim()}</small>
                </div>
                <button type="button" className="pk-col-count" onClick={() => jump({ status: "Scheduled", agent: col.name })} title="See all scheduled pickups for this team">{col.stops.length} today</button>
              </div>
              {col.stops.length > 0 ? (
                <ol className="pk-stops">
                  {col.stops.map((p, i) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => open(p.id)}>
                        <span className="pk-stop-n">{i + 1}</span>
                        <span className="pk-stop-body">
                          <strong>{p.title}</strong>
                          <small><MapPin size={11} /> {p.city} {p.pincode}</small>
                          <em>{p.slot}</em>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="pk-col-empty">No stops today.</p>
              )}
              <div className="pk-col-foot">
                <span>{col.upcoming} upcoming</span>
                {col.late > 0 && <span className="late">{col.late} overdue</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- status cards ---------- */}
      <section className="au-cards ao-cards" aria-label="Filter by pickup status">
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

      {/* ---------- table ---------- */}
      <section className="au-panel" id="pk-panel">
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
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pickup ID, item, customer, city or pincode" aria-label="Search pickups" />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
            </label>
            <div className="au-toolbar-right ao-filters">
              <label className="au-select">
                <span>Type</span>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="all">All</option><option value="Donation">Donation</option><option value="Item">Item</option>
                </select>
              </label>
              <label className="au-select">
                <span>Team</span>
                <select value={agent} onChange={(e) => setAgent(e.target.value)}>
                  <option value="all">All teams</option>
                  {AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                  <option value="none">Not assigned</option>
                </select>
              </label>
              <label className="au-select">
                <span>When</span>
                <select value={when} onChange={(e) => setWhen(e.target.value)}>
                  {Object.entries(WHEN).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </label>
              <label className="au-select">
                <ArrowUpDown size={14} />
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort pickups">
                  {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                </select>
              </label>
              <button type="button" className="ad-btn ad-btn-ghost" disabled={!filtered.length} onClick={() => { exportCsv(filtered); toast(`Exported ${filtered.length} pickups to CSV.`); }}>
                <Download size={15} /> Export
              </button>
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div className="au-table-wrap">
            <table className="au-table pk-table">
              <thead>
                <tr>
                  <th className="col-check">
                    <input type="checkbox" checked={allOnPage} ref={(el) => { if (el) el.indeterminate = !allOnPage && someOnPage; }} onChange={togglePage} aria-label="Select all pickups on this page" />
                  </th>
                  <th>Pickup</th>
                  <th className="col-cust">Customer</th>
                  <th className="col-addr">Pickup address</th>
                  <th>Schedule</th>
                  <th className="col-team">Team</th>
                  <th>Status</th>
                  <th className="col-menu"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className={`${selected.has(p.id) ? "is-selected" : ""} ${p.due?.key === "overdue" ? "dn-row-late" : ""}`} onClick={() => open(p.id)} onKeyDown={(e) => onKey(e, p.id)} tabIndex={0} aria-label={`Open pickup ${p.id}`}>
                    <td className="col-check" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} aria-label={`Select pickup ${p.id}`} />
                    </td>
                    <td>
                      <div className="au-person">
                        <img src={p.image} alt="" className="ap-thumb" />
                        <div>
                          <strong>{p.title}{p.quantity > 1 ? ` ×${p.quantity}` : ""}</strong>
                          <span><span className="aup-mono">{p.id}</span> · <TypeChip type={p.type} /></span>
                          <span className="ap-mobile-meta">{p.customer.name} · {p.city}</span>
                        </div>
                      </div>
                    </td>
                    <td className="col-cust">
                      <div className="ap-owner">
                        <UserAvatar name={p.customer.name} src={p.customer.image} size={30} rounded="9px" />
                        <div><span className="ap-owner-name plain">{p.customer.name}</span><span className="au-sub" style={{ margin: 0 }}>{p.customer.phone}</span></div>
                      </div>
                    </td>
                    <td className="col-addr">
                      <span className="au-muted-strong pk-addr">{p.city}</span>
                      <span className="au-sub">{p.pincode}</span>
                    </td>
                    <td>
                      {p.date ? (
                        <div className="pk-when">
                          <span className="au-muted-strong">{formatDate(p.date)}</span>
                          <span className="au-sub">{p.slot}</span>
                          <DueChip pickup={p} />
                        </div>
                      ) : (
                        <span className="ap-muted">{p.status === "Cancelled" ? "Cancelled" : "Not scheduled"}</span>
                      )}
                    </td>
                    <td className="col-team">
                      {p.agent ? <span className="au-muted-strong pk-agent">{p.agent.split("·")[1]?.trim()}<small>{p.agent.split("·")[0].trim()}</small></span> : <span className="ap-muted">Not assigned</span>}
                    </td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="col-menu" onClick={(e) => e.stopPropagation()}>
                      <RowActionMenu label={`Actions for pickup ${p.id}`} items={menuItems(p)} />
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
            title="No pickups match your filters"
            text="Try a different search or clear the filters to see every pickup."
            action={filtersActive && <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={clearFilters}>Clear filters</button>}
          />
        )}

        {filtered.length > 0 && (
          <Pagination page={safePage} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={setPageSize} sizes={[10, 20, 50]} />
        )}
      </section>

      <DonationActionModal action={pending?.action} targets={pending ? pending.ids : []} onConfirm={confirmAction} onClose={() => setPending(null)} />
      {toastNode}
    </div>
  );
}
