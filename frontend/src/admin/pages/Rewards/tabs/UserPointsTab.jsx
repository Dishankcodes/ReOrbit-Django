import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowUpDown, SlidersHorizontal, UserRound, SearchX } from "lucide-react";
import { useUserPoints, adjustPoints, LEVELS } from "../../../data/rewardsStore";
import UserAvatar from "../../../components/ui/UserAvatar";
import RowActionMenu from "../../../components/ui/RowActionMenu";
import EmptyState from "../../../components/ui/EmptyState";
import Pagination from "../../../components/ui/Pagination";
import AdjustPointsModal from "../components/AdjustPointsModal";

const SORTS = {
  balance: { label: "Highest balance", fn: (a, b) => b.balance - a.balance },
  lifetime: { label: "Most earned", fn: (a, b) => b.lifetime - a.lifetime },
  spent: { label: "Most redeemed", fn: (a, b) => b.spent - a.spent },
};
const fmt = (n) => n.toLocaleString("en-IN");

export default function UserPointsTab({ toast }) {
  const rows = useUserPoints();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState("balance");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [adjust, setAdjust] = useState(null);

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return rows.filter((r) => level === "all" || r.level.key === level).filter((r) => !t || [r.user.full_name, r.user.email].some((x) => x.toLowerCase().includes(t))).sort(SORTS[sort].fn);
  }, [rows, query, level, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safe = Math.min(page, pageCount);
  const shown = filtered.slice((safe - 1) * pageSize, safe * pageSize);

  const save = (id, amount, reason) => {
    adjustPoints(id, amount, reason);
    toast(`${amount > 0 ? "Added" : "Deducted"} ${Math.abs(amount)} points ${amount > 0 ? "to" : "from"} ${adjust.user.full_name}.`);
    setAdjust(null);
  };

  return (
    <div className="rw-pane">
      <div className="rw-levels" aria-label="Level ladder">
        {LEVELS.map((l, i) => (
          <button key={l.key} type="button" className={level === l.key ? "on" : ""} onClick={() => { setLevel(level === l.key ? "all" : l.key); setPage(1); }}>
            <b>{rows.filter((r) => r.level.key === l.key).length}</b><span>{l.name}</span><small>{i === LEVELS.length - 1 ? `${fmt(l.min)}+ pts` : `${fmt(l.min)} – ${fmt(LEVELS[i + 1].min - 1)}`}</small>
          </button>
        ))}
      </div>

      <section className="au-panel">
        <div className="au-toolbar">
          <label className="au-search"><Search size={16} />
            <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search by name or email" aria-label="Search users" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
          </label>
          <div className="au-toolbar-right">
            <label className="au-select"><ArrowUpDown size={14} />
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort users">{Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select></label>
          </div>
        </div>
        {shown.length === 0 ? <EmptyState icon={SearchX} title="No users match" text="Try a different search or level." /> : (
          <div className="au-table-wrap">
            <table className="au-table rw-table">
              <thead><tr><th>User</th><th>Level</th><th>Balance</th><th className="col-earned">Earned</th><th className="col-spent">Redeemed</th><th className="col-pend">Donation points due</th><th className="col-menu"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.user.user_id} onClick={() => navigate(r.user.path || `/admin-users/${r.user.user_id}`)} tabIndex={0}>
                    <td><div className="ap-owner"><UserAvatar name={r.user.full_name} src={r.user.profile.profile_image} size={34} rounded="10px" /><div><span className="ap-owner-name plain">{r.user.full_name}</span><span className="au-sub" style={{ margin: 0 }}>{r.user.email}</span></div></div></td>
                    <td><span className={`rw-level lvl-${r.level.key}`}>{r.level.name}</span></td>
                    <td><span className="rw-pts big">{fmt(r.balance)}</span></td>
                    <td className="col-earned"><span className="au-muted-strong">{fmt(r.lifetime)}</span><span className="au-sub">{r.donated ? `${fmt(r.donated)} from donations` : "No donation points"}</span></td>
                    <td className="col-spent"><span className="au-muted-strong">{fmt(r.spent + r.deducted)}</span></td>
                    <td className="col-pend">{r.pendingDonation ? <span className="rw-pts wait">+{fmt(r.pendingDonation)}</span> : <span className="ap-muted">—</span>}</td>
                    <td className="col-menu" onClick={(e) => e.stopPropagation()}>
                      <RowActionMenu label={`Actions for ${r.user.full_name}`} items={[
                        { key: "adj", label: "Adjust points", icon: SlidersHorizontal, onClick: () => setAdjust(r) },
                        { key: "u", label: "View user", icon: UserRound, onClick: () => navigate(`/admin-users/${r.user.user_id}`) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && <Pagination page={safe} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={setPageSize} sizes={[10, 20, 50]} />}
      </section>
      <AdjustPointsModal row={adjust} onSave={save} onClose={() => setAdjust(null)} />
    </div>
  );
}
