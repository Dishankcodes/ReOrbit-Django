import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Download,
  Gift,
  Hourglass,
  CalendarClock,
  Truck,
  PackageCheck,
  CircleCheck,
  XCircle,
  X,
  ArrowUpDown,
  SearchX,
  Eye,
  UserRound,
  BellRing,
  ArrowRight,
  Boxes,
  Award,
  CalendarDays,
} from "lucide-react";

import {
  useDonations,
  runDonationAction,
  SLA_DAYS,
} from "../../data/donationsStore";
import {
  DONATION_ACTION_LIST,
  getDonationActions,
  canApplyDonationAction,
} from "../../data/donationActions";
import { formatDate, timeAgo, DEMO_TODAY } from "../../utils/format";

import StatusBadge from "../../components/ui/StatusBadge";
import UserAvatar from "../../components/ui/UserAvatar";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import RowActionMenu from "../../components/ui/RowActionMenu";
import { ACTION_ICONS } from "../../components/ui/actionIcons";
import useToast from "../../components/ui/useToast";
import DonationActionModal from "./components/DonationActionModal";
import { WaitChip } from "./components/DonationBadges";

import "../../css/AdminUI.css";
import "../../css/users/AdminUsers.css";
import "../../css/products/AdminProducts.css";
import "../../css/orders/AdminOrders.css";
import "../../css/donations/AdminDonations.css";

const STATUS_CARDS = [
  { key: "All", label: "All donations", icon: Gift, tone: "all" },
  { key: "Pending", label: "Pending review", icon: Hourglass, tone: "wait" },
  { key: "Scheduled", label: "Scheduled", icon: CalendarClock, tone: "info" },
  { key: "Picked_Up", label: "Picked up", icon: Truck, tone: "info" },
  { key: "Received", label: "Received", icon: PackageCheck, tone: "info" },
  { key: "Completed", label: "Completed", icon: CircleCheck, tone: "good" },
  { key: "Rejected", label: "Rejected", icon: XCircle, tone: "bad" },
];

const SORTS = {
  newest: {
    label: "Newest first",
    fn: (a, b) => new Date(b.donation_date) - new Date(a.donation_date),
  },
  oldest: {
    label: "Oldest first",
    fn: (a, b) => new Date(a.donation_date) - new Date(b.donation_date),
  },
  qty: { label: "Most items", fn: (a, b) => b.quantity - a.quantity },
};
const RANGES = {
  all: "All time",
  7: "Last 7 days",
  30: "Last 30 days",
  90: "Last 90 days",
};

function exportCsv(rows) {
  const header = [
    "Donation ID",
    "Item",
    "Category",
    "Quantity",
    "Donor",
    "Donor email",
    "Status",
    "Donated on",
    "Pickup date",
    "Pickup slot",
    "Pickup team",
    "Given to",
  ];
  const lines = rows.map((d) =>
    [
      d.id,
      d.title,
      d.category,
      d.quantity,
      d.donor.name,
      d.donor.email,
      d.status,
      formatDate(d.donation_date),
      d.pickup_date ? formatDate(d.pickup_date) : "",
      d.pickup_slot || "",
      d.partner || "",
      d.ngo || "",
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
  a.download = "reorbit-donations.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminDonations() {
  const navigate = useNavigate();
  const donations = useDonations();
  const { toast, toastNode } = useToast();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("all");
  const [range, setRange] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(() => new Set());
  const [pending, setPending] = useState(null);

  const open = (id) => navigate(`/admin-donations/${id}`);
  const categories = useMemo(
    () => [...new Set(donations.map((d) => d.category))].sort(),
    [donations],
  );

  /* ---------- numbers ---------- */
  const counts = useMemo(() => {
    const c = {
      All: donations.length,
      Pending: 0,
      Scheduled: 0,
      Picked_Up: 0,
      Received: 0,
      Completed: 0,
      Rejected: 0,
    };
    donations.forEach((d) => {
      c[d.status] += 1;
    });
    return c;
  }, [donations]);

  const queue = useMemo(
    () =>
      donations
        .filter((d) => d.status === "Pending")
        .sort((a, b) => b.waitingDays - a.waitingDays),
    [donations],
  );
  const overdueCount = queue.filter((d) => d.overdue).length;

  const kpi = useMemo(() => {
    const weekEnd = DEMO_TODAY.getTime() + 7 * 86400000;
    const dayStart = new Date(DEMO_TODAY).setHours(0, 0, 0, 0);
    const pickups = donations.filter(
      (d) =>
        d.status === "Scheduled" &&
        d.pickup_date &&
        new Date(d.pickup_date).getTime() >= dayStart &&
        new Date(d.pickup_date).getTime() <= weekEnd,
    ).length;
    const done = donations.filter((d) =>
      ["Received", "Completed"].includes(d.status),
    );
    return {
      pickups,
      units: done.reduce((n, d) => n + d.quantity, 0),
      kg: Math.round(done.reduce((n, d) => n + d.weight_kg, 0)),
      certs: donations.filter((d) => d.certificate).length,
    };
  }, [donations]);

  /* ---------- filter + sort ---------- */
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    const cutoff =
      range === "all" ? 0 : DEMO_TODAY.getTime() - Number(range) * 86400000;
    return donations
      .filter((d) => status === "All" || d.status === status)
      .filter((d) => category === "all" || d.category === category)
      .filter((d) => !cutoff || new Date(d.donation_date).getTime() >= cutoff)
      .filter(
        (d) =>
          !text ||
          [d.id, d.title, d.category, d.donor.name, d.donor.email].some((v) =>
            v.toLowerCase().includes(text),
          ),
      )
      .sort(SORTS[sort].fn);
  }, [donations, query, status, category, range, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => {
    setPage(1);
  }, [query, status, category, range, sort, pageSize]);

  const filtersActive =
    query || status !== "All" || category !== "all" || range !== "all";
  const clearFilters = () => {
    setQuery("");
    setStatus("All");
    setCategory("all");
    setRange("all");
  };

  /* ---------- selection ---------- */
  const rowIds = rows.map((d) => d.id);
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

  const selectedRows = donations.filter((d) => selected.has(d.id));
  const bulkActions = Object.values(DONATION_ACTION_LIST).filter(
    (a) =>
      a.key !== "cancelPickup" &&
      selectedRows.some((d) => canApplyDonationAction(d, a.key)),
  );

  /* ---------- actions ---------- */
  const askAction = (action, ids) => {
    const eligible = ids.filter((id) => {
      const d = donations.find((x) => x.id === id);
      return d && canApplyDonationAction(d, action.key);
    });
    if (eligible.length) setPending({ action, ids: eligible });
  };
  const confirmAction = (payload) => {
    const { action, ids } = pending;
    ids.forEach((id) => runDonationAction(id, action.key, payload));
    toast(
      ids.length === 1
        ? `Donation ${ids[0]} ${action.toast}.`
        : `${ids.length} donations ${action.toast}.`,
    );
    setPending(null);
    clearSelection();
  };

  const menuItems = (d) => [
    {
      key: "view",
      label: "View details",
      icon: Eye,
      onClick: () => open(d.id),
    },
    {
      key: "donor",
      label: "View donor",
      icon: UserRound,
      onClick: () => navigate(d.donor.path),
    },
    ...(getDonationActions(d).length ? ["separator"] : []),
    ...getDonationActions(d).map((a) => ({
      key: a.key,
      label: a.label,
      icon: ACTION_ICONS[a.icon],
      tone: a.tone,
      onClick: () => askAction(a, [d.id]),
    })),
  ];
  const onKey = (e, id) =>
    e.key === "Enter" && e.target === e.currentTarget && open(id);
  const showQueue = () => {
    setStatus("Pending");
    setCategory("all");
    setRange("all");
    setQuery("");
    document
      .getElementById("dn-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="au-page">
      {/* ---------- review queue banner ---------- */}
      {queue.length > 0 ? (
        <section className="dn-queue" aria-label="Donations waiting for review">
          <header className="dn-queue-head">
            <span className="dn-queue-icon">
              <BellRing size={22} />
            </span>
            <div>
              <h3>
                {queue.length} donation{queue.length === 1 ? " is" : "s are"}{" "}
                waiting for your decision
              </h3>
              <p>
                {overdueCount > 0
                  ? `${overdueCount} ${overdueCount === 1 ? "has" : "have"} waited ${SLA_DAYS}+ days. `
                  : ""}
                Accept to schedule a free pickup, or reject with a reason so the
                donor knows.
              </p>
            </div>
          </header>
          <ul className="dn-queue-list">
            {queue.slice(0, 3).map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className="dn-queue-main"
                  onClick={() => open(d.id)}
                >
                  <img src={d.image} alt="" />
                  <span>
                    <strong>
                      {d.title}
                      {d.quantity > 1 ? ` ×${d.quantity}` : ""}
                    </strong>
                    <small>
                      {d.id} · {d.donor.name} · {d.donor.city}
                    </small>
                  </span>
                </button>
                <WaitChip donation={d} />
                <div className="dn-queue-actions">
                  <button
                    type="button"
                    className="ad-btn ad-btn-sm dn-btn-accept"
                    onClick={() =>
                      askAction(DONATION_ACTION_LIST.accept, [d.id])
                    }
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="ad-btn ad-btn-sm dn-btn-reject"
                    onClick={() =>
                      askAction(DONATION_ACTION_LIST.reject, [d.id])
                    }
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <footer className="dn-queue-foot">
            <button type="button" className="dn-link" onClick={showQueue}>
              Review all {queue.length} pending donations{" "}
              <ArrowRight size={14} />
            </button>
          </footer>
        </section>
      ) : (
        <section className="dn-allclear" role="status">
          <CircleCheck size={20} /> <strong>All caught up.</strong> No donation
          is waiting for review.
        </section>
      )}

      {/* ---------- KPIs ---------- */}
      <section className="ao-money" aria-label="Donation summary">
        <button
          type="button"
          className="ao-money-card is-link"
          onClick={showQueue}
        >
          <span className="ao-money-icon wait">
            <Hourglass size={18} />
          </span>
          <div>
            <small>Awaiting review</small>
            <strong>{queue.length}</strong>
            <em>
              {queue[0]
                ? `Oldest waiting ${queue[0].waitingDays} days`
                : "Nothing waiting"}
            </em>
          </div>
        </button>
        <button
          type="button"
          className="ao-money-card is-link"
          onClick={() => setStatus("Scheduled")}
        >
          <span className="ao-money-icon info">
            <CalendarDays size={18} />
          </span>
          <div>
            <small>Pickups this week</small>
            <strong>{kpi.pickups}</strong>
            <em>Free pickups scheduled</em>
          </div>
        </button>
        <div className="ao-money-card">
          <span className="ao-money-icon good">
            <Boxes size={18} />
          </span>
          <div>
            <small>Items donated</small>
            <strong>{kpi.units}</strong>
            <em>{kpi.kg} kg kept out of landfill</em>
          </div>
        </div>
        <div className="ao-money-card">
          <span className="ao-money-icon good">
            <Award size={18} />
          </span>
          <div>
            <small>Certificates issued</small>
            <strong>{kpi.certs}</strong>
            <em>Sent to donors on completion</em>
          </div>
        </div>
      </section>

      {/* ---------- status cards ---------- */}
      <section
        className="au-cards ao-cards dn-cards"
        aria-label="Filter by donation status"
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

      {/* ---------- table ---------- */}
      <section className="au-panel" id="dn-panel">
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
                placeholder="Search donation ID, item or donor"
                aria-label="Search donations"
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
                  aria-label="Sort donations"
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
                  toast(`Exported ${filtered.length} donations to CSV.`);
                }}
              >
                <Download size={15} /> Export
              </button>
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div className="au-table-wrap">
            <table className="au-table dn-table">
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
                      aria-label="Select all donations on this page"
                    />
                  </th>
                  <th>Donation</th>
                  <th className="col-donor">Donor</th>
                  <th className="col-pickup">Free pickup</th>
                  <th>Status</th>
                  <th className="col-date">Donated</th>
                  <th className="col-menu">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr
                    key={d.id}
                    className={`${selected.has(d.id) ? "is-selected" : ""} ${d.overdue ? "dn-row-late" : ""}`}
                    onClick={() => open(d.id)}
                    onKeyDown={(e) => onKey(e, d.id)}
                    tabIndex={0}
                    aria-label={`Open donation ${d.id}`}
                  >
                    <td
                      className="col-check"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(d.id)}
                        onChange={() => toggleOne(d.id)}
                        aria-label={`Select donation ${d.id}`}
                      />
                    </td>
                    <td>
                      <div className="au-person">
                        <img src={d.image} alt="" className="ap-thumb" />
                        <div>
                          <strong>
                            {d.title}
                            {d.quantity > 1 ? ` ×${d.quantity}` : ""}
                          </strong>
                          <span>
                            <span className="aup-mono">{d.id}</span> ·{" "}
                            {d.category}
                          </span>
                          <span className="ap-mobile-meta">
                            {d.donor.name} · {timeAgo(d.donation_date)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="col-donor">
                      <div className="ap-owner">
                        <UserAvatar
                          name={d.donor.name}
                          src={d.donor.image}
                          size={30}
                          rounded="9px"
                        />
                        <div>
                          <span className="ap-owner-name plain">
                            {d.donor.name}
                          </span>
                          <span className="au-sub" style={{ margin: 0 }}>
                            {d.donor.city}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="col-pickup">
                      {d.pickup_date ? (
                        <>
                          <span className="au-muted-strong">
                            {formatDate(d.pickup_date)}
                          </span>
                          <span className="au-sub">{d.pickup_slot}</span>
                        </>
                      ) : (
                        <span className="ap-muted">
                          {d.status === "Rejected"
                            ? "Not applicable"
                            : "Not scheduled"}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="dn-status">
                        <StatusBadge status={d.status} />
                        <WaitChip donation={d} />
                      </div>
                    </td>
                    <td className="col-date">
                      <span className="au-muted-strong">
                        {formatDate(d.donation_date)}
                      </span>
                      <span className="au-sub">{timeAgo(d.donation_date)}</span>
                    </td>
                    <td
                      className="col-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActionMenu
                        label={`Actions for donation ${d.id}`}
                        items={menuItems(d)}
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
            title="No donations match your filters"
            text="Try a different search or clear the filters to see every donation."
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

      <DonationActionModal
        action={pending?.action}
        targets={pending ? pending.ids : []}
        onConfirm={confirmAction}
        onClose={() => setPending(null)}
      />
      {toastNode}
    </div>
  );
}
