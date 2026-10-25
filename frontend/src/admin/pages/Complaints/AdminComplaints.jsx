import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Download, ShieldAlert, Inbox, Eye, CircleCheck, CircleSlash2, X, ArrowUpDown, SearchX, BellRing,
  ArrowRight, AlarmClock, Flag, FilePlus2, Repeat2, Timer, ExternalLink, UserRound,
} from "lucide-react";

import { useComplaints, isActive, logComplaint, runComplaintAction, CATEGORIES, TARGET_TYPES } from "../../data/complaintsStore";
import { COMPLAINT_ACTIONS, BULK_ACTIONS, getComplaintActions, canApplyComplaintAction } from "../../data/complaintActions";
import { useTeam, useAccess } from "../../data/teamStore";
import { formatDate, timeAgo } from "../../utils/format";

import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import RowActionMenu from "../../components/ui/RowActionMenu";
import { ACTION_ICONS } from "../../components/ui/actionIcons";
import useToast from "../../components/ui/useToast";
import ComplaintActionModal from "./components/ComplaintActionModal";
import LogComplaintModal from "./components/LogComplaintModal";
import { TypeChip, PriorityChip, SlaChip, TargetCell, hoursText } from "./components/ComplaintBadges";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/products/AdminProducts.css";
import "../../css/orders/AdminOrders.css";
import "../../css/donations/AdminDonations.css";
import "../../css/pickups/AdminPickups.css";
import "../../css/complaints/AdminComplaints.css";

const STATUS_CARDS = [
  { key: "All", label: "All complaints", icon: ShieldAlert, tone: "all" },
  { key: "Open", label: "Open", icon: Inbox, tone: "wait" },
  { key: "Under_Review", label: "Under review", icon: Eye, tone: "info" },
  { key: "Resolved", label: "Resolved", icon: CircleCheck, tone: "good" },
  { key: "Dismissed", label: "Dismissed", icon: CircleSlash2, tone: "neutral" },
];

const PRI_RANK = { High: 0, Medium: 1, Low: 2 };
const rank = (c) => (isActive(c) ? (c.sla?.overdue ? 0 : 1) : 3) * 3 + PRI_RANK[c.priority];
const SORTS = {
  action: { label: "Needs action first", fn: (a, b) => rank(a) - rank(b) || new Date(a.createdAt) - new Date(b.createdAt) },
  newest: { label: "Newest first", fn: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) },
  oldest: { label: "Oldest first", fn: (a, b) => new Date(a.createdAt) - new Date(b.createdAt) },
  priority: { label: "Highest priority", fn: (a, b) => PRI_RANK[a.priority] - PRI_RANK[b.priority] || new Date(a.createdAt) - new Date(b.createdAt) },
};

function exportCsv(rows) {
  const header = ["Complaint", "Type", "Reported", "Reason", "Reporter", "Priority", "Status", "Assigned to", "Filed", "Decision"];
  const lines = rows.map((c) =>
    [c.id, c.type, c.target.name, c.category, c.reporter.name, c.priority, c.status.replace("_", " "), c.assignee?.name || "", formatDate(c.createdAt), c.resolution?.note || ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "reorbit-complaints.csv"; a.click();
  URL.revokeObjectURL(url);
}

const ALL_CATEGORIES = [...new Set(TARGET_TYPES.flatMap((t) => CATEGORIES[t]))].sort();

export default function AdminComplaints() {
  const navigate = useNavigate();
  const all = useComplaints();
  const { members } = useTeam();
  const access = useAccess();
  const { toast, toastNode } = useToast();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [who, setWho] = useState("all");
  const [sort, setSort] = useState("action");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(() => new Set());
  const [pending, setPending] = useState(null);
  const [logging, setLogging] = useState(false);

  const open = (id) => navigate(`/admin-complaints/${id}`);
  const assignable = useMemo(() => members.filter((m) => m.status === "Active" && (m.role === "super" || ["view", "edit"].includes(m.permissions?.complaints))), [members]);
  const myName = access.me?.name || "Admin";

  /* ---------- numbers ---------- */
  const counts = useMemo(() => {
    const c = { All: all.length, Open: 0, Under_Review: 0, Resolved: 0, Dismissed: 0 };
    all.forEach((x) => { c[x.status] += 1; });
    return c;
  }, [all]);
  const active = useMemo(() => all.filter(isActive), [all]);
  const urgent = useMemo(() => active.filter((c) => c.priority === "High" || c.sla?.overdue).sort(SORTS.action.fn), [active]);
  const high = active.filter((c) => c.priority === "High");
  const overdue = active.filter((c) => c.sla?.overdue);
  const closed = all.filter((c) => c.tookH);
  const avgH = closed.length ? Math.round(closed.reduce((n, c) => n + c.tookH, 0) / closed.length) : 0;

  const repeat = useMemo(() => {
    const map = new Map();
    active.forEach((c) => map.set(c.target.key, [...(map.get(c.target.key) || []), c]));
    return [...map.values()].filter((l) => l.length >= 2).sort((a, b) => b.length - a.length).slice(0, 3);
  }, [active]);

  /* ---------- filter + sort ---------- */
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return all
      .filter((c) => status === "All" || c.status === status)
      .filter((c) => type === "all" || c.type === type)
      .filter((c) => category === "all" || c.category === category)
      .filter((c) => priority === "all" || c.priority === priority)
      .filter((c) => who === "all" || (who === "none" ? !c.assigneeId : who === "me" ? c.assigneeId === access.me?.id : c.assigneeId === who))
      .filter((c) => !text || [c.id, c.target.name, c.category, c.reporter.name, c.description].some((v) => String(v).toLowerCase().includes(text)))
      .sort(SORTS[sort].fn);
  }, [all, query, status, type, category, priority, who, sort, access.me]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => { setPage(1); }, [query, status, type, category, priority, who, sort, pageSize]);

  const filtersActive = query || status !== "All" || type !== "all" || category !== "all" || priority !== "all" || who !== "all";
  const clearFilters = () => { setQuery(""); setStatus("All"); setType("all"); setCategory("all"); setPriority("all"); setWho("all"); };
  const jump = (patch) => {
    setStatus(patch.status || "All"); setPriority(patch.priority || "all"); setType("all"); setCategory("all"); setWho("all"); setQuery("");
    if (patch.sort) setSort(patch.sort);
    document.getElementById("cp-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ---------- selection ---------- */
  const rowIds = rows.map((c) => c.id);
  const allOnPage = rowIds.length > 0 && rowIds.every((id) => selected.has(id));
  const someOnPage = rowIds.some((id) => selected.has(id));
  const toggleOne = (id) => setSelected((cur) => { const n = new Set(cur); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const togglePage = () => setSelected((cur) => { const n = new Set(cur); rowIds.forEach((id) => (allOnPage ? n.delete(id) : n.add(id))); return n; });
  const clearSelection = useCallback(() => setSelected(new Set()), []);
  const selectedRows = all.filter((c) => selected.has(c.id));
  const bulkActions = BULK_ACTIONS.filter((a) => selectedRows.some((c) => canApplyComplaintAction(c, a.key)));

  /* ---------- actions ---------- */
  const askAction = (action, ids) => {
    const eligible = all.filter((c) => ids.includes(c.id) && canApplyComplaintAction(c, action.key));
    if (!eligible.length) return;
    if (action.fields === "none") {
      eligible.forEach((c) => runComplaintAction(c, action.key, { by: myName, assigneeId: access.me?.id }, all));
      toast(eligible.length === 1 ? `${eligible[0].id} ${action.toast}.` : `${eligible.length} complaints ${action.toast.replace(/^was /, "were ")}.`);
      clearSelection();
      return;
    }
    setPending({ action, complaints: eligible });
  };
  const confirmAction = (payload) => {
    const { action, complaints } = pending;
    complaints.forEach((c) => runComplaintAction(c, action.key, { ...payload, by: myName, alsoResolve: complaints.length === 1 && payload.alsoResolve }, all));
    toast(complaints.length === 1 ? `${complaints[0].id} ${action.toast}.` : `${complaints.length} complaints ${action.toast.replace(/^was /, "were ")}.`);
    setPending(null);
    clearSelection();
  };
  const saveLog = (values) => {
    const id = logComplaint({ ...values, by: myName });
    setLogging(false);
    toast(`${id} was logged.`);
    open(id);
  };

  const menuItems = (c) => [
    { key: "view", label: "View details", icon: Eye, onClick: () => open(c.id) },
    { key: "target", label: `Open ${c.type === "Product" ? "listing" : c.type === "Review" ? "ReMaker" : c.type.toLowerCase()}`, icon: ExternalLink, onClick: () => navigate(c.target.path) },
    ...(getComplaintActions(c).length ? ["separator"] : []),
    ...getComplaintActions(c).map((a) => ({ key: a.key, label: a.label, icon: ACTION_ICONS[a.icon], tone: a.tone === "positive" ? undefined : a.tone, onClick: () => askAction(a, [c.id]) })),
  ];
  const onKey = (e, id) => e.key === "Enter" && e.target === e.currentTarget && open(id);

  return (
    <div className="au-page">
      {/* ---------- attention banner ---------- */}
      {urgent.length > 0 ? (
        <section className="pk-alert cp-alert" aria-label="Complaints that need attention">
          <header className="pk-alert-head">
            <span className="pk-alert-icon"><BellRing size={22} /></span>
            <div>
              <h3>{urgent.length} complaint{urgent.length === 1 ? " needs" : "s need"} attention now</h3>
              <p>These are high priority or have waited longer than the response time. Serious reports such as scams or unsafe items should be looked at first.</p>
            </div>
          </header>
          <ul className="pk-alert-list">
            {urgent.slice(0, 3).map((c) => (
              <li key={c.id}>
                <button type="button" className="pk-alert-main" onClick={() => open(c.id)}>
                  <span className="cp-alert-thumb"><TargetThumbMini c={c} /></span>
                  <span><strong>{c.category} · {c.target.name}</strong><small>{c.id} · {c.type} · reported by {c.reporter.name} · {timeAgo(c.createdAt)}</small></span>
                </button>
                <PriorityChip priority={c.priority} />
                <SlaChip c={c} />
                <div className="pk-alert-actions">
                  {c.status === "Open"
                    ? <button type="button" className="ad-btn ad-btn-sm dn-btn-accept" onClick={() => askAction(COMPLAINT_ACTIONS.start, [c.id])}>Start review</button>
                    : <button type="button" className="ad-btn ad-btn-sm dn-btn-accept" onClick={() => open(c.id)}>Decide</button>}
                </div>
              </li>
            ))}
          </ul>
          {urgent.length > 3 && (
            <footer className="pk-alert-foot">
              <button type="button" className="dn-link" onClick={() => jump({ sort: "action" })}>See all {urgent.length} <ArrowRight size={14} /></button>
            </footer>
          )}
        </section>
      ) : (
        <section className="dn-allclear" role="status"><CircleCheck size={20} /> <strong>All caught up.</strong> No complaint is high priority or past its response time.</section>
      )}

      {/* ---------- KPIs ---------- */}
      <section className="ao-money" aria-label="Complaint summary">
        <button type="button" className="ao-money-card is-link" onClick={() => jump({ status: "Open" })}>
          <span className="ao-money-icon wait"><Inbox size={18} /></span>
          <div><small>Waiting for a reviewer</small><strong>{counts.Open}</strong><em>Not picked up yet</em></div>
        </button>
        <button type="button" className="ao-money-card is-link" onClick={() => jump({ priority: "High", sort: "action" })}>
          <span className="ao-money-icon bad"><Flag size={18} /></span>
          <div><small>High priority</small><strong>{high.length}</strong><em>Scams, unsafe items, repeat reports</em></div>
        </button>
        <button type="button" className="ao-money-card is-link" onClick={() => jump({ sort: "action" })}>
          <span className="ao-money-icon bad"><AlarmClock size={18} /></span>
          <div><small>Past response time</small><strong>{overdue.length}</strong><em>24 h high · 48 h medium · 96 h low</em></div>
        </button>
        <div className="ao-money-card">
          <span className="ao-money-icon good"><Timer size={18} /></span>
          <div><small>Average time to decide</small><strong>{closed.length ? hoursText(avgH) : "—"}</strong><em>From {closed.length} closed complaints</em></div>
        </div>
      </section>

      {/* ---------- repeat reports ---------- */}
      {repeat.length > 0 && (
        <section className="cp-repeat" aria-label="Reported more than once">
          <header>
            <h3><Repeat2 size={17} /> Reported more than once</h3>
            <p>Several people have complained about the same thing. These are the best place to start.</p>
          </header>
          <div className="cp-repeat-grid">
            {repeat.map((list) => (
              <button type="button" key={list[0].target.key} className="cp-repeat-card" onClick={() => { setQuery(list[0].target.name); setStatus("All"); document.getElementById("cp-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                <TargetCell t={list[0].target} />
                <div className="cp-repeat-meta">
                  <TypeChip type={list[0].type} />
                  <strong>{list.length} open complaints</strong>
                  <small>{[...new Set(list.map((c) => c.category))].slice(0, 2).join(", ")}</small>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ---------- status cards ---------- */}
      <section className="au-cards ao-cards cp-cards" aria-label="Filter by status">
        {STATUS_CARDS.map((card) => {
          const Icon = card.icon;
          const on = status === card.key;
          return (
            <button key={card.key} type="button" className={`au-card tone-${card.tone} ${on ? "active" : ""}`} onClick={() => setStatus(card.key)} aria-pressed={on}>
              <span className="au-card-icon"><Icon size={18} strokeWidth={1.8} /></span>
              <span className="au-card-text"><small>{card.label}</small><strong>{counts[card.key]}</strong></span>
            </button>
          );
        })}
      </section>

      {/* ---------- table ---------- */}
      <section className="au-panel" id="cp-panel">
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
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search complaint ID, who or what was reported, reporter or reason" aria-label="Search complaints" />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
            </label>
            <div className="au-toolbar-right ao-filters">
              <label className="au-select"><span>Type</span>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="all">All</option>{TARGET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="au-select"><span>Reason</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="all">All reasons</option>{ALL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="au-select"><span>Priority</span>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="all">Any</option><option>High</option><option>Medium</option><option>Low</option>
                </select>
              </label>
              <label className="au-select"><UserRound size={14} />
                <select value={who} onChange={(e) => setWho(e.target.value)} aria-label="Assigned to">
                  <option value="all">Anyone</option><option value="me">Assigned to me</option><option value="none">Unassigned</option>
                  {assignable.filter((m) => m.id !== access.me?.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <label className="au-select"><ArrowUpDown size={14} />
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort complaints">
                  {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                </select>
              </label>
              <button type="button" className="ad-btn ad-btn-ghost" disabled={!filtered.length} onClick={() => { exportCsv(filtered); toast(`Exported ${filtered.length} complaints to CSV.`); }}>
                <Download size={15} /> Export
              </button>
              <button type="button" className="ad-btn ad-btn-primary" onClick={() => setLogging(true)}><FilePlus2 size={15} /> Log complaint</button>
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div className="au-table-wrap">
            <table className="au-table cp-table">
              <thead>
                <tr>
                  <th className="col-check">
                    <input type="checkbox" checked={allOnPage} ref={(el) => { if (el) el.indeterminate = !allOnPage && someOnPage; }} onChange={togglePage} aria-label="Select all complaints on this page" />
                  </th>
                  <th>Complaint</th>
                  <th>Reported</th>
                  <th className="col-cust">Reported by</th>
                  <th>Priority</th>
                  <th className="col-team">Assigned to</th>
                  <th>Status</th>
                  <th className="col-menu"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className={`${selected.has(c.id) ? "is-selected" : ""} ${c.sla?.overdue ? "dn-row-late" : ""}`} onClick={() => open(c.id)} onKeyDown={(e) => onKey(e, c.id)} tabIndex={0} aria-label={`Open complaint ${c.id}`}>
                    <td className="col-check" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} aria-label={`Select complaint ${c.id}`} />
                    </td>
                    <td>
                      <div className="cp-main">
                        <strong>{c.category}</strong>
                        <span><span className="aup-mono">{c.id}</span> · {timeAgo(c.createdAt)}</span>
                        {c.repeat > 0 && isActive(c) && <span className="cp-repeat-tag"><Repeat2 size={11} /> {c.repeat + 1} reports</span>}
                      </div>
                    </td>
                    <td>
                      <div className="cp-reported"><TypeChip type={c.type} /><TargetCell t={c.target} /></div>
                    </td>
                    <td className="col-cust">
                      <div className="ap-owner">
                        <UserAvatar name={c.reporter.name} size={30} rounded="9px" />
                        <div><span className="ap-owner-name plain">{c.reporter.name}</span><span className="au-sub" style={{ margin: 0 }}>{c.reporter.role}</span></div>
                      </div>
                    </td>
                    <td>
                      <div className="cp-pri-cell"><PriorityChip priority={c.priority} /><SlaChip c={c} /></div>
                    </td>
                    <td className="col-team">
                      {c.assignee ? <span className="au-muted-strong pk-agent">{c.assignee.name}<small>{c.assignee.roleLabel}</small></span> : <span className="ap-muted">Unassigned</span>}
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="col-menu" onClick={(e) => e.stopPropagation()}>
                      <RowActionMenu label={`Actions for complaint ${c.id}`} items={menuItems(c)} />
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
            title="No complaints match your filters"
            text="Try a different search or clear the filters to see every complaint."
            action={filtersActive && <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={clearFilters}>Clear filters</button>}
          />
        )}

        {filtered.length > 0 && (
          <Pagination page={safePage} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={setPageSize} sizes={[10, 20, 50]} />
        )}
      </section>

      <ComplaintActionModal action={pending?.action} complaints={pending?.complaints || []} members={assignable} onConfirm={confirmAction} onClose={() => setPending(null)} />
      <LogComplaintModal open={logging} onSave={saveLog} onClose={() => setLogging(false)} />
      {toastNode}
    </div>
  );
}

/* small square picture for the attention banner */
function TargetThumbMini({ c }) {
  const t = c.target;
  if (t.type === "Product") return <img src={t.image} alt="" />;
  return <UserAvatar name={t.name} src={t.image} size={44} rounded="11px" />;
}
