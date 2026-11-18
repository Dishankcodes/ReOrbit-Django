import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useLoading, SkeletonTable } from "../../../shared/components/Skeleton";
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
import { formatDate, timeAgo } from "../../utils/format";

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

/* The donation journey, left to right. Each stage is a tab with its count. */
const STAGES = [
  { key: "review", label: "Review", hint: "Accept or reject", statuses: ["Pending"], icon: Hourglass, tone: "wait" },
  { key: "pickup", label: "Pickup", hint: "Scheduled or to retry", statuses: ["Scheduled", "Failed_Pickup"], icon: CalendarClock, tone: "info" },
  { key: "picked", label: "Picked up", hint: "On the way in", statuses: ["Picked_Up"], icon: Truck, tone: "info" },
  { key: "warehouse", label: "At warehouse", hint: "Check and capture", statuses: ["Received"], icon: PackageCheck, tone: "info" },
  { key: "done", label: "Completed", hint: "Certificate sent", statuses: ["Completed"], icon: CircleCheck, tone: "good" },
];
const OTHER_TABS = [
  { key: "closed", label: "Closed", statuses: ["Rejected", "Cancelled"], icon: XCircle },
  { key: "all", label: "All", statuses: null, icon: Gift },
];
const TAB_OF = Object.fromEntries([...STAGES, ...OTHER_TABS].map((t) => [t.key, t]));

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
  all: "Any time",
  7: "7 days",
  30: "30 days",
  90: "90 days",
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
    "Kept in / given to",
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
      d.ngo || (d.status === "Completed" ? "ReOrbit warehouse" : ""),
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
  const loading = useLoading(450);
  const navigate = useNavigate();
  const donations = useDonations();
  const { toast, toastNode } = useToast();

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("review");
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
    const c = Object.fromEntries([...STAGES, ...OTHER_TABS].map((t) => [t.key, 0]));
    donations.forEach((d) => {
      c.all += 1;
      const t = [...STAGES, ...OTHER_TABS].find((x) => x.statuses && x.statuses.includes(d.status));
      if (t) c[t.key] += 1;
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
    const weekEnd = Date.now() + 7 * 86400000;
    const dayStart = new Date().setHours(0, 0, 0, 0);
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
      range === "all" ? 0 : Date.now() - Number(range) * 86400000;
    return donations
      .filter((d) => !TAB_OF[tab].statuses || TAB_OF[tab].statuses.includes(d.status))
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
  }, [donations, query, tab, category, range, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => {
    setPage(1);
  }, [query, tab, category, range, sort, pageSize]);

  const filtersActive = query || category !== "all" || range !== "all";
  const clearFilters = () => {
    setQuery("");
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
  const confirmAction = async (payload) => {
    const { action, ids } = pending;
    setPending(null);
    clearSelection();
    const results = await Promise.allSettled(
      ids.map((id) => runDonationAction(id, action.key, payload)),
    );
    const failed = results.filter((r) => r.status === "rejected");
    const done = ids.length - failed.length;
    if (failed.length) {
      toast(
        `${failed[0].reason?.message || "Could not update the donation."}${ids.length > 1 ? ` (${done} of ${ids.length} done)` : ""}`,
      );
    } else {
      toast(
        ids.length === 1
          ? `Donation ${ids[0]} ${action.toast}.`
          : `${ids.length} donations ${action.toast}.`,
      );
    }
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
  /* the one obvious next step for a row (the rest are in its menu) */
  const nextStep = (d) => getDonationActions(d)[0] || null;

  const current = TAB_OF[tab];
  /* open on "Review" when something is waiting, otherwise on everything (until the admin picks a tab) */
  const picked = React.useRef(false);
  useEffect(() => {
    if (!picked.current && donations.length && counts.review === 0 && tab === "review") setTab("all");
  }, [donations.length, counts.review, tab]);
  const chooseTab = (k) => {
    picked.current = true;
    setTab(k);
  };
  const stageIndex = STAGES.findIndex((x) => x.key === tab);

  return (
    <div className="au-page adn2">
      {/* ---------- summary ---------- */}
      <header className="adn2-top">
        <div>
          <p className="adn2-lead">
            {queue.length > 0
              ? `${queue.length} waiting for review${overdueCount ? `, ${overdueCount} past the ${SLA_DAYS}-day target` : ""}${queue[0] ? ` · oldest ${queue[0].waitingDays} day${queue[0].waitingDays === 1 ? "" : "s"}` : ""}.`
              : "Nothing is waiting for review."}
          </p>
        </div>
        <dl className="adn2-facts">
          <div>
            <dt>
              <CalendarDays size={14} /> Pickups this week
            </dt>
            <dd>{kpi.pickups}</dd>
          </div>
          <div>
            <dt>
              <Boxes size={14} /> Items received
            </dt>
            <dd>
              {kpi.units} <small>· {kpi.kg} kg</small>
            </dd>
          </div>
          <div>
            <dt>
              <Award size={14} /> Certificates
            </dt>
            <dd>{kpi.certs}</dd>
          </div>
        </dl>
      </header>

      {/* ---------- the journey ---------- */}
      <nav className="adn2-journey" aria-label="Donation stages">
        <ol>
          {STAGES.map((st, i) => {
            const Icon = st.icon;
            const on = tab === st.key;
            return (
              <li key={st.key} className={`${on ? "on" : ""} ${stageIndex > i ? "past" : ""} tone-${st.tone}`}>
                <button type="button" onClick={() => chooseTab(st.key)} aria-pressed={on}>
                  <span className="adn2-step-icon">
                    <Icon size={17} />
                  </span>
                  <span className="adn2-step-text">
                    <strong>
                      {st.label} <em>{counts[st.key]}</em>
                    </strong>
                    <small>{st.hint}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="adn2-other">
          {OTHER_TABS.map((t) => (
            <button key={t.key} type="button" className={tab === t.key ? "on" : ""} onClick={() => chooseTab(t.key)} aria-pressed={tab === t.key}>
              {t.label} <em>{counts[t.key]}</em>
            </button>
          ))}
        </div>
      </nav>

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
          <div className="adn2-filters">
            <label className="au-search adn2-search">
              <Search size={16} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${current.key === "all" ? "all donations" : current.label.toLowerCase()} by ID, item or donor`}
                aria-label="Search donations"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </label>
            <div className="adn2-seg" role="group" aria-label="Donated in">
              {Object.entries(RANGES).map(([k, label]) => (
                <button key={k} type="button" className={range === k ? "on" : ""} onClick={() => setRange(k)} aria-pressed={range === k}>
                  {label}
                </button>
              ))}
            </div>
            <label className="au-select">
              <span>Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
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
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort donations">
                {Object.entries(SORTS).map(([k, x]) => (
                  <option key={k} value={k}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="ad-btn ad-btn-ghost adn2-export"
              disabled={!filtered.length}
              onClick={() => {
                exportCsv(filtered);
                toast(`Exported ${filtered.length} donations to CSV.`);
              }}
            >
              <Download size={15} /> Export
            </button>
          </div>
        )}
        {selected.size === 0 && filtersActive && (
          <div className="adn2-chips">
            <span>
              {filtered.length} match{filtered.length === 1 ? "" : "es"}:
            </span>
            {query && (
              <button type="button" onClick={() => setQuery("")}>
                “{query}” <X size={12} />
              </button>
            )}
            {category !== "all" && (
              <button type="button" onClick={() => setCategory("all")}>
                {category} <X size={12} />
              </button>
            )}
            {range !== "all" && (
              <button type="button" onClick={() => setRange("all")}>
                Last {RANGES[range]} <X size={12} />
              </button>
            )}
            <button type="button" className="adn2-clear" onClick={clearFilters}>
              Clear all
            </button>
          </div>
        )}

        {loading && <SkeletonTable rows={8} cols={6} />}

        {!loading && rows.length > 0 && (
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
                  <th className="col-next">Next step</th>
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
                    <td className="col-next" onClick={(e) => e.stopPropagation()}>
                      {nextStep(d) ? (
                        <button
                          type="button"
                          className={`adn2-next tone-${nextStep(d).tone}`}
                          onClick={() => askAction(nextStep(d), [d.id])}
                        >
                          {nextStep(d).short}
                        </button>
                      ) : (
                        <span className="ap-muted">—</span>
                      )}
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

        {!loading && rows.length === 0 && (
          <EmptyState
            icon={SearchX}
            title={filtersActive ? "No donations match your filters" : `Nothing in ${current.label.toLowerCase()} right now`}
            text={
              filtersActive
                ? "Try a different search or clear the filters."
                : tab === "review"
                  ? "All caught up. New donations appear here for you to accept or reject."
                  : "Donations move here as they reach this stage."
            }
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
