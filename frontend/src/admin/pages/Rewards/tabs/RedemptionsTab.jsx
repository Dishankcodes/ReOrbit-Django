import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, CheckCheck, Undo2, UserRound, SearchX, Copy } from "lucide-react";
import { useRedemptions, setRedemptionStatus } from "../../../data/rewardsStore";
import { formatDate, timeAgo } from "../../../utils/format";
import UserAvatar from "../../../components/ui/UserAvatar";
import StatusBadge from "../../../components/ui/StatusBadge";
import RowActionMenu from "../../../components/ui/RowActionMenu";
import ConfirmActionModal from "../../../components/ui/ConfirmActionModal";
import EmptyState from "../../../components/ui/EmptyState";
import Pagination from "../../../components/ui/Pagination";

const CANCEL = { key: "cancel", title: "Cancel this redemption?", body: "The voucher can no longer be used and the points go back to the user.", tone: "danger", icon: "ban", needsReason: true, reasonHint: "kept in the points history", placeholder: "e.g. Redeemed by mistake", confirmLabel: "Cancel & refund points", toast: "cancelled and points refunded" };
const USED = { key: "used", title: "Mark this voucher as used?", body: "The user has applied the code on an order.", tone: "positive", icon: "check", needsReason: false, confirmLabel: "Mark as used", toast: "marked as used" };
const TONE = { Issued: "Scheduled", Used: "Completed", Expired: "Inactive", Cancelled: "Cancelled" };

export default function RedemptionsTab({ toast }) {
  const rows = useRedemptions();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pending, setPending] = useState(null);

  const counts = useMemo(() => { const c = { All: rows.length, Issued: 0, Used: 0, Expired: 0, Cancelled: 0 }; rows.forEach((r) => { c[r.status] += 1; }); return c; }, [rows]);
  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return rows.filter((r) => status === "All" || r.status === status).filter((r) => !t || [r.user.full_name, r.title, r.issued_code, r.voucher_code].some((x) => x.toLowerCase().includes(t)));
  }, [rows, query, status]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safe = Math.min(page, pageCount);
  const shown = filtered.slice((safe - 1) * pageSize, safe * pageSize);

  const confirm = () => {
    const { action, r } = pending;
    if (action.key === "used") setRedemptionStatus(r.id, "Used");
    else setRedemptionStatus(r.id, "Cancelled");
    toast(`${r.issued_code} ${action.toast}.`);
    setPending(null);
  };

  return (
    <div className="rw-pane">
      <div className="rw-chips" role="tablist" aria-label="Redemption status">
        {Object.keys(counts).map((f) => <button key={f} type="button" role="tab" aria-selected={status === f} className={status === f ? "on" : ""} onClick={() => { setStatus(f); setPage(1); }}>{f} <em>{counts[f]}</em></button>)}
      </div>
      <section className="au-panel">
        <div className="au-toolbar">
          <label className="au-search"><Search size={16} />
            <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search user, voucher or issued code" aria-label="Search redemptions" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
          </label>
        </div>
        {shown.length === 0 ? <EmptyState icon={SearchX} title="No redemptions" text="Nothing matches this filter." /> : (
          <div className="au-table-wrap">
            <table className="au-table rw-table">
              <thead><tr><th>Voucher</th><th className="col-donor">User</th><th>Points</th><th>Status</th><th className="col-date">Redeemed</th><th className="col-menu"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td><div className="rw-redeem"><strong>{r.title}</strong><span><code>{r.issued_code}</code><button type="button" aria-label={`Copy ${r.issued_code}`} onClick={() => { try { navigator.clipboard?.writeText(r.issued_code); } catch { /* ignore */ } toast(`Code ${r.issued_code} copied.`); }}><Copy size={12} /></button></span></div></td>
                    <td className="col-donor"><div className="ap-owner"><UserAvatar name={r.user.full_name} src={r.user.profile.profile_image} size={30} rounded="9px" /><div><span className="ap-owner-name plain">{r.user.full_name}</span><span className="au-sub" style={{ margin: 0 }}>{r.user.profile.city}</span></div></div></td>
                    <td><span className="rw-pts spent">−{r.points}</span></td>
                    <td><StatusBadge status={TONE[r.status]} dot /><span className="sr-only">{r.status}</span><span className="au-sub">{r.status}</span></td>
                    <td className="col-date"><span className="au-muted-strong">{formatDate(r.at)}</span><span className="au-sub">{timeAgo(r.at)}</span></td>
                    <td className="col-menu">
                      <RowActionMenu label={`Actions for ${r.issued_code}`} items={[
                        { key: "u", label: "View user", icon: UserRound, onClick: () => navigate(`/admin-users/${r.user_id}`) },
                        ...(r.status === "Issued" ? ["separator", { key: "used", label: "Mark as used", icon: CheckCheck, tone: "positive", onClick: () => setPending({ action: USED, r }) }, { key: "cancel", label: "Cancel & refund points", icon: Undo2, tone: "danger", onClick: () => setPending({ action: CANCEL, r }) }] : []),
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
      <ConfirmActionModal action={pending?.action} targets={pending ? [pending.r.issued_code] : []} onConfirm={confirm} onClose={() => setPending(null)} />
    </div>
  );
}
