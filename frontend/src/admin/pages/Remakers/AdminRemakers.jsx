import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Download,
  Palette,
  UserCheck,
  PauseCircle,
  Ban,
  UserX,
  X,
  ArrowUpDown,
  SearchX,
  LayoutGrid,
  List,
  Star,
  MapPin,
  Package,
  ShoppingBag,
  Users,
} from "lucide-react";

import { useRemakers, changeRemakerStatus } from "../../data/remakersStore";
import { ACTION_LIST, canApply } from "../../data/userActions";
import { formatDate } from "../../utils/format";

import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import useToast from "../../components/ui/useToast";
import UserActionMenu from "../Users/components/UserActionMenu";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/remakers/AdminRemakers.css";

const STATUS_CARDS = [
  { key: "All", label: "Total ReMakers", icon: Palette, tone: "all" },
  { key: "Active", label: "Active", icon: UserCheck, tone: "good" },
  { key: "Suspended", label: "Suspended", icon: PauseCircle, tone: "wait" },
  { key: "Blocked", label: "Blocked", icon: Ban, tone: "bad" },
  { key: "Deleted", label: "Deleted", icon: UserX, tone: "neutral" },
];

const SORTS = {
  newest: {
    label: "Newest first",
    fn: (a, b) => new Date(b.created_at) - new Date(a.created_at),
  },
  rating: { label: "Top rated", fn: (a, b) => b.rating - a.rating },
  sales: {
    label: "Most sales",
    fn: (a, b) => b.profile.total_sales - a.profile.total_sales,
  },
  followers: {
    label: "Most followers",
    fn: (a, b) => b.followers - a.followers,
  },
  name: {
    label: "Name A–Z",
    fn: (a, b) => a.full_name.localeCompare(b.full_name),
  },
};

function appliesTo(actionKey, status) {
  if (actionKey === "activate") return status !== "Active";
  return canApply(status, actionKey);
}

function exportCsv(rows) {
  const header = [
    "ReMaker ID",
    "Name",
    "Art name",
    "Email",
    "City",
    "State",
    "Status",
    "Products",
    "Sales",
    "Rating",
    "Followers",
    "Joined",
  ];
  const lines = rows.map((r) =>
    [
      r.remaker_id,
      r.full_name,
      r.username,
      r.email,
      r.profile.city,
      r.profile.state,
      r.status,
      r.profile.total_uploads,
      r.profile.total_sales,
      r.rating,
      r.followers,
      formatDate(r.created_at),
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
  a.download = "reorbit-remakers.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminRemakers() {
  const navigate = useNavigate();
  const remakers = useRemakers();
  const { toast, toastNode } = useToast();

  const [view, setView] = useState("cards");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [skill, setSkill] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [selected, setSelected] = useState(() => new Set());
  const [pending, setPending] = useState(null);

  const open = (id) => navigate(`/admin-remakers/${id}`);

  const counts = useMemo(() => {
    const result = {
      All: remakers.length,
      Active: 0,
      Suspended: 0,
      Blocked: 0,
      Deleted: 0,
    };
    remakers.forEach((r) => {
      result[r.status] += 1;
    });
    return result;
  }, [remakers]);

  const allSkills = useMemo(
    () => [...new Set(remakers.flatMap((r) => r.profile.skills))].sort(),
    [remakers],
  );

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return remakers
      .filter((r) => status === "All" || r.status === status)
      .filter((r) => skill === "all" || r.profile.skills.includes(skill))
      .filter(
        (r) =>
          !text ||
          r.full_name.toLowerCase().includes(text) ||
          r.username.toLowerCase().includes(text) ||
          r.email.toLowerCase().includes(text) ||
          r.remaker_id.toLowerCase().includes(text) ||
          r.profile.city.toLowerCase().includes(text),
      )
      .sort(SORTS[sort].fn);
  }, [remakers, query, status, skill, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [query, status, skill, sort, pageSize]);

  const rowIds = rows.map((r) => r.remaker_id);
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

  const selectedRows = remakers.filter((r) => selected.has(r.remaker_id));
  const bulkActions = ["activate", "suspend", "block", "delete"]
    .map((k) => ACTION_LIST[k])
    .filter((a) => selectedRows.some((r) => appliesTo(a.key, r.status)));

  const askAction = (action, ids) => {
    const eligible = ids.filter((id) => {
      const r = remakers.find((x) => x.remaker_id === id);
      return r && appliesTo(action.key, r.status);
    });
    if (eligible.length) setPending({ action, ids: eligible });
  };

  const confirmAction = (reason) => {
    const { action, ids } = pending;
    changeRemakerStatus(ids, action.newStatus, reason);
    toast(
      ids.length === 1
        ? `${remakers.find((r) => r.remaker_id === ids[0]).full_name} is now ${action.newStatus.toLowerCase()}.`
        : `${ids.length} ReMakers set to ${action.newStatus.toLowerCase()}.`,
    );
    setPending(null);
    clearSelection();
  };

  const pendingNames = pending
    ? pending.ids.map(
        (id) => remakers.find((r) => r.remaker_id === id)?.full_name,
      )
    : [];
  const filtersActive = query || status !== "All" || skill !== "all";
  const onRowKey = (e, id) =>
    e.key === "Enter" && e.target === e.currentTarget && open(id);

  return (
    <div className="au-page">
      <section className="au-cards" aria-label="Filter by account status">
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
                placeholder="Search name, art name, email, ID or city"
                aria-label="Search ReMakers"
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
                <span>Skill</span>
                <select
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                >
                  <option value="all">All skills</option>
                  {allSkills.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="au-select">
                <ArrowUpDown size={14} />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="Sort ReMakers"
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
                  className={view === "cards" ? "active" : ""}
                  onClick={() => setView("cards")}
                  aria-label="Card view"
                  aria-pressed={view === "cards"}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  className={view === "table" ? "active" : ""}
                  onClick={() => setView("table")}
                  aria-label="Table view"
                  aria-pressed={view === "table"}
                >
                  <List size={16} />
                </button>
              </div>
              <button
                type="button"
                className="ad-btn ad-btn-ghost"
                disabled={!filtered.length}
                onClick={() => {
                  exportCsv(filtered);
                  toast(`Exported ${filtered.length} ReMakers to CSV.`);
                }}
              >
                <Download size={15} /> Export
              </button>
            </div>
          </div>
        )}

        {view === "cards" && rows.length > 0 && (
          <div className="rm-grid">
            {rows.map((r) => (
              <article
                key={r.remaker_id}
                className={`rm-card ${r.status === "Deleted" ? "is-deleted" : ""} ${selected.has(r.remaker_id) ? "is-selected" : ""}`}
                onClick={() => open(r.remaker_id)}
                onKeyDown={(e) => onRowKey(e, r.remaker_id)}
                tabIndex={0}
                aria-label={`Open profile of ${r.full_name}`}
              >
                <div
                  className="rm-card-top"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(r.remaker_id)}
                    onChange={() => toggleOne(r.remaker_id)}
                    aria-label={`Select ${r.full_name}`}
                  />
                  <UserActionMenu
                    user={r}
                    onView={() => open(r.remaker_id)}
                    onAction={(a) => askAction(a, [r.remaker_id])}
                  />
                </div>
                <div className="rm-card-head">
                  <UserAvatar
                    name={r.full_name}
                    src={r.profile.profile_image}
                    size={72}
                    rounded="22px"
                  />
                  <h3>{r.full_name}</h3>
                  <span className="rm-art">“{r.username}”</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="rm-card-meta">
                  <span>
                    <MapPin size={13} /> {r.profile.city}
                  </span>
                  <span className="rm-rating">
                    <Star size={13} fill="currentColor" />{" "}
                    {r.rating ? r.rating.toFixed(1) : "New"}
                  </span>
                </div>
                <div className="rm-skills">
                  {r.profile.skills.slice(0, 2).map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                  {r.profile.skills.length > 2 && (
                    <span>+{r.profile.skills.length - 2}</span>
                  )}
                </div>
                <dl className="rm-card-stats">
                  <div>
                    <dt>
                      <Package size={13} /> Products
                    </dt>
                    <dd>{r.profile.total_uploads}</dd>
                  </div>
                  <div>
                    <dt>
                      <ShoppingBag size={13} /> Sales
                    </dt>
                    <dd>{r.profile.total_sales}</dd>
                  </div>
                  <div>
                    <dt>
                      <Users size={13} /> Followers
                    </dt>
                    <dd>{r.followers}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}

        {view === "table" && rows.length > 0 && (
          <div className="au-table-wrap">
            <table className="au-table">
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
                      aria-label="Select all ReMakers on this page"
                    />
                  </th>
                  <th>ReMaker</th>
                  <th className="col-loc">Location</th>
                  <th className="col-method">Rating</th>
                  <th className="col-activity">Products · Sales</th>
                  <th className="col-joined">Joined</th>
                  <th className="col-seen">Followers</th>
                  <th>Status</th>
                  <th className="col-menu">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.remaker_id}
                    className={`${r.status === "Deleted" ? "is-deleted" : ""} ${selected.has(r.remaker_id) ? "is-selected" : ""}`}
                    onClick={() => open(r.remaker_id)}
                    onKeyDown={(e) => onRowKey(e, r.remaker_id)}
                    tabIndex={0}
                    aria-label={`Open profile of ${r.full_name}`}
                  >
                    <td
                      className="col-check"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(r.remaker_id)}
                        onChange={() => toggleOne(r.remaker_id)}
                        aria-label={`Select ${r.full_name}`}
                      />
                    </td>
                    <td>
                      <div className="au-person">
                        <UserAvatar
                          name={r.full_name}
                          src={r.profile.profile_image}
                          size={40}
                        />
                        <div>
                          <strong>{r.full_name}</strong>
                          <span>
                            “{r.username}” · {r.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="col-loc">
                      <span className="au-muted-strong">{r.profile.city}</span>
                      <span className="au-sub">{r.profile.state}</span>
                    </td>
                    <td className="col-method">
                      <span className="rm-rating">
                        <Star size={14} fill="currentColor" />{" "}
                        {r.rating ? r.rating.toFixed(1) : "New"}
                      </span>
                    </td>
                    <td className="col-activity">
                      <div className="au-activity">
                        <span>
                          <b>{r.profile.total_uploads}</b>
                        </span>
                        <i />
                        <span>
                          <b>{r.profile.total_sales}</b>
                        </span>
                      </div>
                    </td>
                    <td className="col-joined">
                      <span className="au-muted-strong">
                        {formatDate(r.created_at)}
                      </span>
                    </td>
                    <td className="col-seen">
                      <span className="au-muted-strong">{r.followers}</span>
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td
                      className="col-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <UserActionMenu
                        user={r}
                        onView={() => open(r.remaker_id)}
                        onAction={(a) => askAction(a, [r.remaker_id])}
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
            title="No ReMakers match your filters"
            text="Try a different search term or clear the filters to see everyone."
            action={
              filtersActive && (
                <button
                  type="button"
                  className="ad-btn ad-btn-ghost ad-btn-sm"
                  onClick={() => {
                    setQuery("");
                    setStatus("All");
                    setSkill("all");
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
