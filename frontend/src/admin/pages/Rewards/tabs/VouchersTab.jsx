import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, X, Copy, Pencil, PauseCircle, PlayCircle, Trash2, Megaphone, Coins, Ticket, CalendarRange, Users2, Files, SearchX, TimerOff } from "lucide-react";
import { useVouchers, saveVoucher, patchVoucher, removeVoucher } from "../../../data/rewardsStore";
import { DEMO_TODAY, formatDate } from "../../../utils/format";
import StatusBadge from "../../../components/ui/StatusBadge";
import RowActionMenu from "../../../components/ui/RowActionMenu";
import ConfirmActionModal from "../../../components/ui/ConfirmActionModal";
import EmptyState from "../../../components/ui/EmptyState";
import VoucherFormModal from "../components/VoucherFormModal";

const FILTERS = ["All", "Active", "Scheduled", "Paused", "Expired", "Used_Up", "Draft"];
const LABEL = { All: "All", Used_Up: "Used up" };

const ACTIONS = {
  pause: { key: "pause", title: "Pause this voucher?", body: "Nobody can use it until you resume it. Vouchers already issued are kept.", tone: "warning", icon: "pause", needsReason: false, confirmLabel: "Pause voucher", toast: "paused" },
  resume: { key: "resume", title: "Resume this voucher?", body: "It becomes usable again, within its dates.", tone: "positive", icon: "restore", needsReason: false, confirmLabel: "Resume voucher", toast: "resumed" },
  end: { key: "end", title: "End this voucher now?", body: "It expires today and can no longer be used. This cannot be undone.", tone: "danger", icon: "ban", needsReason: false, confirmLabel: "End voucher", toast: "ended" },
  delete: { key: "delete", title: "Delete this voucher?", body: "The voucher is removed for good. Only unused vouchers can be deleted.", tone: "danger", icon: "trash", needsReason: false, confirmLabel: "Delete voucher", toast: "deleted" },
};

function valueText(v) {
  if (v.kind === "points" && v.value === 0) return "Perk";
  return v.discount_type === "percent" ? `${v.value}%` : `₹${v.value}`;
}

export default function VouchersTab({ toast }) {
  const vouchers = useVouchers();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [kind, setKind] = useState("all");
  const [form, setForm] = useState({ open: false, voucher: null });
  const [pending, setPending] = useState(null);

  const counts = useMemo(() => { const c = { All: vouchers.length }; FILTERS.slice(1).forEach((f) => { c[f] = vouchers.filter((v) => v.status === f).length; }); return c; }, [vouchers]);
  const rows = useMemo(() => {
    const t = query.trim().toLowerCase();
    return vouchers.filter((v) => filter === "All" || v.status === filter).filter((v) => kind === "all" || v.kind === kind)
      .filter((v) => !t || [v.code, v.title, v.audience].some((x) => x.toLowerCase().includes(t)));
  }, [vouchers, query, filter, kind]);

  const copy = (code) => { try { navigator.clipboard?.writeText(code); } catch { /* ignore */ } toast(`Code ${code} copied.`); };
  const onSave = (data, isEdit) => { saveVoucher(data); setForm({ open: false, voucher: null }); toast(data.draft ? `Draft ${data.code} saved.` : isEdit ? `${data.code} updated.` : `${data.code} created.`); };
  const confirm = () => {
    const { action, v } = pending;
    if (action.key === "pause") patchVoucher(v.id, { paused: true });
    if (action.key === "resume") patchVoucher(v.id, { paused: false });
    if (action.key === "end") patchVoucher(v.id, { valid_to: new Date(DEMO_TODAY.getTime() - 86400000).toISOString().slice(0, 10), paused: false });
    if (action.key === "delete") removeVoucher(v.id);
    toast(`${v.code} ${action.toast}.`);
    setPending(null);
  };

  const menu = (v) => [
    { key: "edit", label: "Edit", icon: Pencil, onClick: () => setForm({ open: true, voucher: v }) },
    { key: "dup", label: "Duplicate", icon: Files, onClick: () => { saveVoucher({ ...v, id: undefined, code: `${v.code.slice(0, 11)}COPY`, title: `${v.title} (copy)`, used: 0, draft: true, paused: false }); toast(`Draft copy of ${v.code} created.`); } },
    { key: "ann", label: "Announce to users", icon: Megaphone, onClick: () => navigate("/admin-notifications", { state: { compose: { title: v.title, message: `${v.description} Use code ${v.code}${v.min_order ? ` on orders above ₹${v.min_order}` : ""}. Valid until ${formatDate(v.valid_to)}.`, audience: v.audience === "ReMakers" ? "remakers" : "users" } } }) },
    "separator",
    ...(v.status === "Active" || v.status === "Scheduled" ? [{ key: "pause", label: "Pause", icon: PauseCircle, tone: "warning", onClick: () => setPending({ action: ACTIONS.pause, v }) }] : []),
    ...(v.status === "Paused" ? [{ key: "resume", label: "Resume", icon: PlayCircle, tone: "positive", onClick: () => setPending({ action: ACTIONS.resume, v }) }] : []),
    ...(["Active", "Scheduled", "Paused"].includes(v.status) ? [{ key: "end", label: "End now", icon: TimerOff, tone: "danger", onClick: () => setPending({ action: ACTIONS.end, v }) }] : []),
    ...(v.used === 0 ? [{ key: "del", label: "Delete", icon: Trash2, tone: "danger", onClick: () => setPending({ action: ACTIONS.delete, v }) }] : []),
  ];

  return (
    <div className="rw-pane">
      <div className="rw-pane-toolbar">
        <label className="au-search"><Search size={16} />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search code, name or audience" aria-label="Search vouchers" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
        </label>
        <label className="au-select"><span>Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)}><option value="all">All</option><option value="code">Coupon codes</option><option value="points">Points rewards</option></select></label>
        <button type="button" className="ad-btn ad-btn-primary" onClick={() => setForm({ open: true, voucher: null })}><Plus size={15} /> Create voucher</button>
      </div>

      <div className="rw-chips" role="tablist" aria-label="Voucher status">
        {FILTERS.map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
            {LABEL[f] || f} <em>{counts[f]}</em>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <section className="aup-card"><EmptyState icon={SearchX} title="No vouchers match" text="Try another search or filter, or create a new voucher."
          action={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => setForm({ open: true, voucher: null })}><Plus size={14} /> Create voucher</button>} /></section>
      ) : (
        <div className="rw-tickets">
          {rows.map((v) => (
            <article key={v.id} className={`rw-ticket ${v.status.toLowerCase()}`}>
              <div className="rw-ticket-value"><strong>{valueText(v)}</strong><small>{v.kind === "points" ? "Reward" : v.discount_type === "percent" ? "off" : "off"}</small></div>
              <div className="rw-ticket-body">
                <header>
                  <div><h4>{v.title}</h4><p>{v.description}</p></div>
                  <RowActionMenu label={`Actions for ${v.code}`} items={menu(v)} />
                </header>
                <div className="rw-ticket-code">
                  <code>{v.code}</code>
                  <button type="button" onClick={() => copy(v.code)} aria-label={`Copy code ${v.code}`}><Copy size={13} /></button>
                  <StatusBadge status={v.status} />
                  <span className={`rw-kind-tag ${v.kind}`}>{v.kind === "points" ? <><Coins size={11} /> {v.points_cost} pts</> : <><Ticket size={11} /> Code</>}</span>
                </div>
                <ul className="rw-ticket-meta">
                  <li><CalendarRange size={13} /> {formatDate(v.valid_from)} – {formatDate(v.valid_to)}{v.expiringSoon && <b className="rw-soon">Ends in {v.daysLeft} day{v.daysLeft === 1 ? "" : "s"}</b>}</li>
                  <li><Users2 size={13} /> {v.audience}{v.min_order ? ` · min ₹${v.min_order}` : ""}</li>
                </ul>
                <div className="rw-usage">
                  <div className="rw-usage-top"><span>{v.used.toLocaleString("en-IN")} of {v.usage_limit.toLocaleString("en-IN")} used</span><b>{v.usagePct}%</b></div>
                  <span className="rw-bar"><i className={v.usagePct >= 90 ? "full" : v.usagePct >= 60 ? "busy" : ""} style={{ width: `${v.usagePct}%` }} /></span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <VoucherFormModal open={form.open} voucher={form.voucher} onSave={onSave} onClose={() => setForm({ open: false, voucher: null })} />
      <ConfirmActionModal action={pending?.action} targets={pending ? [pending.v.code] : []} onConfirm={confirm} onClose={() => setPending(null)} />
    </div>
  );
}
