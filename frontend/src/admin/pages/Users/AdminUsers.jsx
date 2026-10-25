import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Download,
  Users,
  UserCheck,
  PauseCircle,
  Ban,
  UserX,
  X,
  ArrowUpDown,
  SearchX,
} from "lucide-react";

import { useUsers, changeUserStatus } from "../../data/usersStore";
import { ACTION_LIST, canApply } from "../../data/userActions";
import { formatDate, timeAgo } from "../../utils/format";

import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmActionModal from "../../components/ui/ConfirmActionModal";
import useToast from "../../components/ui/useToast";
import ProviderBadge from "./components/ProviderBadge";
import UserActionMenu from "./components/UserActionMenu";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";

const STATUS_CARDS = [
  { key: "All", label: "Total users", icon: Users, tone: "all" },
  { key: "Active", label: "Active", icon: UserCheck, tone: "good" },
  { key: "Suspended", label: "Suspended", icon: PauseCircle, tone: "wait" },
  { key: "Blocked", label: "Blocked", icon: Ban, tone: "bad" },
  { key: "Deleted", label: "Deleted", icon: UserX, tone: "neutral" },
];

const SORTS = {
  newest: { label: "Newest first", fn: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
  oldest: { label: "Oldest first", fn: (a, b) => new Date(a.created_at) - new Date(b.created_at) },
  name: { label: "Name A–Z", fn: (a, b) => a.full_name.localeCompare(b.full_name) },
  active: { label: "Recently active", fn: (a, b) => new Date(b.last_active) - new Date(a.last_active) },
  busiest: {
    label: "Most activity",
    fn: (a, b) =>
      b.profile.total_uploads + b.profile.total_purchases + b.profile.total_sales -
      (a.profile.total_uploads + a.profile.total_purchases + a.profile.total_sales),
  },
};

/* In bulk, "Reactivate" means: bring any non-active account back to Active. */
function appliesTo(actionKey, status) {
  if (actionKey === "activate") return status !== "Active";
  return canApply(status, actionKey);
}

function exportCsv(rows) {
  const header = ["User ID", "Name", "Email", "Sign-up method", "City", "State", "Status", "Uploads", "Purchases", "Sales", "Joined"];
  const lines = rows.map((u) =>
    [
      u.user_id, u.full_name, u.email, u.auth_provider, u.profile.city, u.profile.state, u.status,
      u.profile.total_uploads, u.profile.total_purchases, u.profile.total_sales, formatDate(u.created_at),
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "reorbit-users.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const users = useUsers();
  const { toast, toastNode } = useToast();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [provider, setProvider] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [selected, setSelected] = useState(() => new Set());
  const [pending, setPending] = useState(null); // { action, ids }

  /* ---------- numbers for the top cards ---------- */
  const counts = useMemo(() => {
    const result = { All: users.length, Active: 0, Suspended: 0, Blocked: 0, Deleted: 0 };
    users.forEach((user) => { result[user.status] += 1; });
    return result;
  }, [users]);

  /* ---------- filter + sort ---------- */
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return users
      .filter((user) => status === "All" || user.status === status)
      .filter((user) => provider === "all" || user.auth_provider === provider)
      .filter(
        (user) =>
          !text ||
          user.full_name.toLowerCase().includes(text) ||
          user.email.toLowerCase().includes(text) ||
          user.user_id.toLowerCase().includes(text) ||
          user.profile.city.toLowerCase().includes(text),
      )
      .sort(SORTS[sort].fn);
  }, [users, query, status, provider, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  /* back to page 1 whenever the filters change */
  useEffect(() => { setPage(1); }, [query, status, provider, sort, pageSize]);

  /* ---------- selection ---------- */
  const rowIds = rows.map((user) => user.user_id);
  const allOnPageSelected = rowIds.length > 0 && rowIds.every((id) => selected.has(id));
  const someOnPageSelected = rowIds.some((id) => selected.has(id));

  const toggleOne = (id) =>
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const togglePage = () =>
    setSelected((current) => {
      const next = new Set(current);
      rowIds.forEach((id) => (allOnPageSelected ? next.delete(id) : next.add(id)));
      return next;
    });

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const selectedUsers = users.filter((user) => selected.has(user.user_id));
  const bulkActions = ["activate", "suspend", "block", "delete"]
    .map((key) => ACTION_LIST[key])
    .filter((action) => selectedUsers.some((user) => appliesTo(action.key, user.status)));

  /* ---------- actions ---------- */
  const askAction = (action, ids) => {
    /* only keep people this action really applies to */
    const eligible = ids.filter((id) => {
      const user = users.find((u) => u.user_id === id);
      if (!user) return false;
      return appliesTo(action.key, user.status);
    });
    if (!eligible.length) return;
    setPending({ action, ids: eligible });
  };

  const confirmAction = (reason) => {
    const { action, ids } = pending;
    changeUserStatus(ids, action.newStatus, reason);
    toast(
      ids.length === 1
        ? `${users.find((u) => u.user_id === ids[0]).full_name} is now ${action.newStatus.toLowerCase()}.`
        : `${ids.length} accounts set to ${action.newStatus.toLowerCase()}.`,
    );
    setPending(null);
    clearSelection();
  };

  const pendingNames = pending ? pending.ids.map((id) => users.find((u) => u.user_id === id)?.full_name) : [];
  const filtersActive = query || status !== "All" || provider !== "all";

  return (
    <div className="au-page">
      {/* ---------- summary cards (click = filter) ---------- */}
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
              <span className="au-card-icon"><Icon size={18} strokeWidth={1.8} /></span>
              <span className="au-card-text">
                <small>{card.label}</small>
                <strong>{counts[card.key]}</strong>
              </span>
            </button>
          );
        })}
      </section>

      {/* ---------- table panel ---------- */}
      <section className="au-panel">
        {selected.size > 0 ? (
          <div className="au-bulkbar" role="region" aria-label="Bulk actions">
            <strong>{selected.size} selected</strong>
            <div className="au-bulkbar-actions">
              {bulkActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className={`ad-btn ad-btn-sm au-bulk-${action.tone}`}
                  onClick={() => askAction(action, [...selected])}
                >
                  {action.short}
                </button>
              ))}
            </div>
            <button type="button" className="au-bulk-clear" onClick={clearSelection}>
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
                placeholder="Search name, email, user ID or city"
                aria-label="Search users"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </label>

            <div className="au-toolbar-right">
              <label className="au-select">
                <span>Sign-up</span>
                <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="all">All methods</option>
                  <option value="email">Email</option>
                  <option value="google">Google</option>
                </select>
              </label>

              <label className="au-select">
                <ArrowUpDown size={14} />
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort users">
                  {Object.entries(SORTS).map(([key, item]) => (
                    <option key={key} value={key}>{item.label}</option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="ad-btn ad-btn-ghost"
                onClick={() => { exportCsv(filtered); toast(`Exported ${filtered.length} users to CSV.`); }}
                disabled={!filtered.length}
              >
                <Download size={15} /> Export
              </button>
            </div>
          </div>
        )}

        <div className="au-table-wrap">
          <table className="au-table">
            <thead>
              <tr>
                <th className="col-check">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={(el) => { if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected; }}
                    onChange={togglePage}
                    aria-label="Select all users on this page"
                  />
                </th>
                <th>User</th>
                <th className="col-loc">Location</th>
                <th className="col-method">Sign-up</th>
                <th className="col-activity">Uploads · Bought · Sold</th>
                <th className="col-joined">Joined</th>
                <th className="col-seen">Last active</th>
                <th>Status</th>
                <th className="col-menu"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <tr
                  key={user.user_id}
                  className={`${user.status === "Deleted" ? "is-deleted" : ""} ${selected.has(user.user_id) ? "is-selected" : ""}`}
                  onClick={() => navigate(`/admin-users/${user.user_id}`)}
                  onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && navigate(`/admin-users/${user.user_id}`)}
                  tabIndex={0}
                  aria-label={`Open profile of ${user.full_name}`}
                >
                  <td className="col-check" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(user.user_id)}
                      onChange={() => toggleOne(user.user_id)}
                      aria-label={`Select ${user.full_name}`}
                    />
                  </td>
                  <td>
                    <div className="au-person">
                      <UserAvatar name={user.full_name} src={user.profile.profile_image} size={40} />
                      <div>
                        <strong>{user.full_name}</strong>
                        <span>{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="col-loc">
                    <span className="au-muted-strong">{user.profile.city}</span>
                    <span className="au-sub">{user.profile.state}</span>
                  </td>
                  <td className="col-method"><ProviderBadge provider={user.auth_provider} /></td>
                  <td className="col-activity">
                    <div className="au-activity">
                      <span title="Items uploaded"><b>{user.profile.total_uploads}</b></span>
                      <i />
                      <span title="Purchases"><b>{user.profile.total_purchases}</b></span>
                      <i />
                      <span title="Sales"><b>{user.profile.total_sales}</b></span>
                    </div>
                  </td>
                  <td className="col-joined">
                    <span className="au-muted-strong">{formatDate(user.created_at)}</span>
                  </td>
                  <td className="col-seen">
                    <span className="au-muted-strong">{timeAgo(user.last_active)}</span>
                  </td>
                  <td><StatusBadge status={user.status} /></td>
                  <td className="col-menu" onClick={(e) => e.stopPropagation()}>
                    <UserActionMenu
                      user={user}
                      onView={() => navigate(`/admin-users/${user.user_id}`)}
                      onAction={(action) => askAction(action, [user.user_id])}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 && (
            <EmptyState
              icon={SearchX}
              title="No users match your filters"
              text="Try a different search term or clear the filters to see every account."
              action={
                filtersActive && (
                  <button
                    type="button"
                    className="ad-btn ad-btn-ghost ad-btn-sm"
                    onClick={() => { setQuery(""); setStatus("All"); setProvider("all"); }}
                  >
                    Clear filters
                  </button>
                )
              }
            />
          )}
        </div>

        {filtered.length > 0 && (
          <Pagination
            page={safePage}
            pageSize={pageSize}
            total={filtered.length}
            onPage={setPage}
            onPageSize={setPageSize}
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
