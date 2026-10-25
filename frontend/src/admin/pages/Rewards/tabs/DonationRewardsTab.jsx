import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Gift, BadgeCheck, Hourglass, Undo2, ExternalLink, Eye, UserRound, SearchX, Search, X } from "lucide-react";
import { useDonationRewards, revokeDonationReward, restoreDonationReward } from "../../../data/rewardsStore";
import { formatDate } from "../../../utils/format";
import UserAvatar from "../../../components/ui/UserAvatar";
import StatusBadge from "../../../components/ui/StatusBadge";
import RowActionMenu from "../../../components/ui/RowActionMenu";
import ConfirmActionModal from "../../../components/ui/ConfirmActionModal";
import EmptyState from "../../../components/ui/EmptyState";

const REVOKE = { key: "revoke", title: "Take back these points?", body: "The donor loses the points for this donation. The donation itself is not changed.", tone: "danger", icon: "ban", needsReason: true, reasonHint: "kept in the points history", placeholder: "e.g. Donation turned out to be a duplicate", confirmLabel: "Revoke points", toast: "points revoked" };
const RESTORE = { key: "restore", title: "Give the points back?", body: "The donor gets the points for this donation again.", tone: "positive", icon: "restore", needsReason: false, confirmLabel: "Restore points", toast: "points restored" };
const TONE = { Credited: "good", Pending: "wait", Revoked: "bad" };

export default function DonationRewardsTab({ toast }) {
  const rows = useDonationRewards();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(null);

  const sum = (s) => rows.filter((r) => r.status === s).reduce((n, r) => n + r.points, 0);
  const shown = useMemo(() => {
    const t = query.trim().toLowerCase();
    return rows.filter((r) => filter === "All" || r.status === filter).filter((r) => !t || [r.id, r.donor.name, r.donation.title].some((x) => x.toLowerCase().includes(t)));
  }, [rows, filter, query]);

  const confirm = (reason) => {
    const { action, r } = pending;
    if (action.key === "revoke") revokeDonationReward(r.id, reason); else restoreDonationReward(r.id);
    toast(`${r.id}: ${action.toast}.`);
    setPending(null);
  };

  return (
    <div className="rw-pane">
      <div className="rw-link-banner">
        <span><Gift size={20} /></span>
        <div><strong>Connected to the Donations module</strong><p>When a donation is marked Completed there, the donor is credited automatically using the donation rules. Donations that are picked up or received are shown as pending.</p></div>
        <Link to="/admin-donations" className="ad-btn ad-btn-ghost ad-btn-sm"><ExternalLink size={14} /> Donations</Link>
      </div>

      <section className="ao-money rw-mini" aria-label="Donation points summary">
        <button type="button" className="ao-money-card is-link" onClick={() => setFilter("Credited")}><span className="ao-money-icon good"><BadgeCheck size={18} /></span><div><small>Points credited</small><strong>{sum("Credited").toLocaleString("en-IN")}</strong><em>{rows.filter((r) => r.status === "Credited").length} donations</em></div></button>
        <button type="button" className="ao-money-card is-link" onClick={() => setFilter("Pending")}><span className="ao-money-icon wait"><Hourglass size={18} /></span><div><small>Points on the way</small><strong>{sum("Pending").toLocaleString("en-IN")}</strong><em>Credited when completed</em></div></button>
        <button type="button" className="ao-money-card is-link" onClick={() => setFilter("Revoked")}><span className="ao-money-icon bad"><Undo2 size={18} /></span><div><small>Points revoked</small><strong>{sum("Revoked").toLocaleString("en-IN")}</strong><em>Taken back by an admin</em></div></button>
      </section>

      <section className="au-panel">
        <div className="au-toolbar">
          <label className="au-search"><Search size={16} />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search donation ID, donor or item" aria-label="Search donation rewards" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
          </label>
          <div className="rw-chips inline" role="tablist" aria-label="Points status">
            {["All", "Credited", "Pending", "Revoked"].map((f) => <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f}</button>)}
          </div>
        </div>
        {shown.length === 0 ? <EmptyState icon={SearchX} title="Nothing to show" text="No donation rewards match this filter." /> : (
          <div className="au-table-wrap">
            <table className="au-table rw-table">
              <thead><tr><th>Donation</th><th className="col-donor">Donor</th><th>Points</th><th>Status</th><th className="col-date">Date</th><th className="col-menu"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`/admin-donations/${r.id}`)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && navigate(`/admin-donations/${r.id}`)}>
                    <td><div className="au-person"><img src={r.donation.image} alt="" className="ap-thumb" /><div><strong>{r.donation.title}{r.donation.quantity > 1 ? ` ×${r.donation.quantity}` : ""}</strong><span className="aup-mono">{r.id}</span></div></div></td>
                    <td className="col-donor"><div className="ap-owner"><UserAvatar name={r.donor.name} src={r.donor.image} size={30} rounded="9px" /><div><span className="ap-owner-name plain">{r.donor.name}</span><span className="au-sub" style={{ margin: 0 }}>{r.donor.city}</span></div></div></td>
                    <td><span className={`rw-pts ${r.status === "Revoked" ? "struck" : ""}`}>+{r.points}</span></td>
                    <td><div className="dn-status"><StatusBadge status={r.status === "Credited" ? "Success" : r.status === "Pending" ? "Pending" : "Failed"} dot />{r.status === "Revoked" && <span className="au-sub" style={{ margin: 0 }}>{r.revoke_reason}</span>}</div></td>
                    <td className="col-date"><span className="au-muted-strong">{formatDate(r.at)}</span></td>
                    <td className="col-menu" onClick={(e) => e.stopPropagation()}>
                      <RowActionMenu label={`Actions for ${r.id}`} items={[
                        { key: "v", label: "View donation", icon: Eye, onClick: () => navigate(`/admin-donations/${r.id}`) },
                        { key: "u", label: "View donor", icon: UserRound, onClick: () => navigate(r.donor.path) },
                        "separator",
                        r.status === "Revoked" ? { key: "res", label: "Restore points", icon: Undo2, tone: "positive", onClick: () => setPending({ action: RESTORE, r }) } : { key: "rev", label: "Revoke points", icon: Undo2, tone: "danger", onClick: () => setPending({ action: REVOKE, r }) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ConfirmActionModal action={pending?.action} targets={pending ? [pending.r.id] : []} onConfirm={confirm} onClose={() => setPending(null)} />
    </div>
  );
}
