import React, { useMemo, useState } from "react";
import { Plus, Pencil, Rocket, EyeOff, Copy, Trash2, ChevronLeft, ChevronRight, CalendarRange, MousePointerClick, Eye, AlertTriangle, ImageOff } from "lucide-react";
import { useBanners, saveBanner, setBannerActive, duplicateBanner, removeBanner, moveBanner, BANNER_PLACEMENTS } from "../../../data/contentStore";
import StatusBadge from "../../../components/ui/StatusBadge";
import EmptyState from "../../../components/ui/EmptyState";
import RowActionMenu from "../../../components/ui/RowActionMenu";
import { BannerModal, ConfirmModal } from "./ContentModals";
import { formatDate } from "../../../utils/format";

const FILTERS = ["All", "Live", "Scheduled", "Draft", "Ended"];
const num = (n) => Number(n).toLocaleString("en-IN");

function when(b) {
  if (b.status === "Scheduled") return `Starts ${formatDate(b.start)}${b.startsIn === 1 ? " (tomorrow)" : ` (in ${b.startsIn} days)`}`;
  if (b.status === "Ended") return `Ended ${formatDate(b.end)}`;
  if (b.status === "Live") return b.end ? `Until ${formatDate(b.end)}${b.endsIn <= 7 ? ` · ${b.endsIn === 0 ? "ends today" : `${b.endsIn} day${b.endsIn === 1 ? "" : "s"} left`}` : ""}` : "No end date";
  return b.start || b.end ? `${b.start ? formatDate(b.start) : "Any time"} to ${b.end ? formatDate(b.end) : "no end"}` : "No dates set";
}

export default function BannersTab({ canEdit, by, toast }) {
  const banners = useBanners();
  const [filter, setFilter] = useState("All");
  const [place, setPlace] = useState("all");
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [pulling, setPulling] = useState(null);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f, f === "All" ? banners.length : banners.filter((b) => b.status === f).length])), [banners]);
  const shown = banners.filter((b) => (filter === "All" || b.status === filter) && (place === "all" || b.placement === place));
  const liveBy = useMemo(() => { const m = {}; banners.filter((b) => b.status === "Live").forEach((b) => { m[b.placement] = (m[b.placement] || 0) + 1; }); return m; }, [banners]);
  const over = BANNER_PLACEMENTS.filter((p) => (liveBy[p.key] || 0) > p.max);
  const withViews = banners.filter((b) => b.views > 0);
  const avgCtr = withViews.length ? withViews.reduce((n, b) => n + b.ctr, 0) / withViews.length : 0;
  const best = [...withViews].sort((a, b) => b.ctr - a.ctr)[0];

  const save = (values) => {
    const id = saveBanner(form.banner?.id, values, by);
    toast(form.banner ? `${values.title.trim()} was saved.` : `${values.title.trim()} was created as a draft.`);
    setForm(null);
    return id;
  };
  const publish = (b) => {
    setBannerActive(b.id, true, by);
    toast(b.status === "Draft" && b.start > new Date().toISOString().slice(0, 10) ? `${b.title} is scheduled.` : `${b.title} was published.`);
  };
  const menu = (b) => (!canEdit ? [] : [
    { key: "edit", label: "Edit banner", icon: Pencil, onClick: () => setForm({ banner: b }) },
    b.active
      ? { key: "unpub", label: "Unpublish", icon: EyeOff, onClick: () => (b.status === "Live" ? setPulling(b) : (setBannerActive(b.id, false, by), toast(`${b.title} is now a draft.`))) }
      : { key: "pub", label: "Publish", icon: Rocket, onClick: () => publish(b) },
    { key: "copy", label: "Duplicate", icon: Copy, onClick: () => { duplicateBanner(b.id, by); toast(`A copy of ${b.title} was added as a draft.`); } },
    "separator",
    { key: "del", label: "Delete banner", icon: Trash2, tone: "danger", onClick: () => setDeleting(b) },
  ]);

  return (
    <>
      <section className="cm-tiles" aria-label="Banner summary">
        <div className="cm-tile"><span className="cm-tile-n good">{counts.Live}</span><div><strong>Live now</strong><small>Visible to members</small></div></div>
        <div className="cm-tile"><span className="cm-tile-n wait">{counts.Scheduled}</span><div><strong>Scheduled</strong><small>Will start on their own</small></div></div>
        <div className="cm-tile"><span className="cm-tile-n">{counts.Draft}</span><div><strong>Drafts</strong><small>Not published yet</small></div></div>
        <div className="cm-tile"><span className="cm-tile-n info">{avgCtr ? `${avgCtr.toFixed(1)}%` : "—"}</span><div><strong>Average click rate</strong><small>{best ? `Best: ${best.title}` : "No views yet"}</small></div></div>
      </section>

      {over.map((p) => (
        <p key={p.key} className="cm-warn"><AlertTriangle size={15} /> {liveBy[p.key]} banners are live in “{p.key}”, but it is designed for {p.max}. Unpublish one so each gets a fair share of views.</p>
      ))}

      <section className="au-panel cm-panel">
        <div className="au-toolbar">
          <div className="cm-pills" role="group" aria-label="Filter banners">
            {FILTERS.map((f) => <button key={f} type="button" className={filter === f ? "on" : ""} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f} <em>{counts[f]}</em></button>)}
          </div>
          <div className="au-toolbar-right">
            <label className="au-select"><span>Where</span>
              <select value={place} onChange={(e) => setPlace(e.target.value)}>
                <option value="all">All places</option>{BANNER_PLACEMENTS.map((p) => <option key={p.key}>{p.key}</option>)}
              </select>
            </label>
            <button type="button" className="ad-btn ad-btn-primary" disabled={!canEdit} onClick={() => setForm({})}><Plus size={15} /> Create banner</button>
          </div>
        </div>

        {shown.length > 0 ? (
          <div className="cm-bn-grid">
            {shown.map((b) => {
              const same = banners.filter((x) => x.placement === b.placement);
              const pos = same.findIndex((x) => x.id === b.id);
              return (
                <article key={b.id} className={`cm-bn-card st-${b.status.toLowerCase()}`} aria-label={b.title}>
                  <div className="cm-bn-art" style={{ backgroundImage: b.image ? `url(${b.image})` : undefined }}>
                    {!b.image && <ImageOff size={22} />}
                    <div className="cm-bn-shade" />
                    <span className="cm-bn-place">{b.placement}</span>
                    <div className="cm-bn-copy"><strong>{b.title}</strong>{b.subtitle && <span>{b.subtitle}</span>}<em>{b.cta}</em></div>
                  </div>
                  <div className="cm-bn-body">
                    <div className="cm-bn-head">
                      <StatusBadge status={b.status} />
                      <span className="cm-aud">{b.audience}</span>
                      {canEdit ? <RowActionMenu label={`Actions for ${b.title}`} items={menu(b)} /> : null}
                    </div>
                    <p className="cm-bn-when"><CalendarRange size={13} /> {when(b)}</p>
                    <p className="cm-bn-link">Button goes to <code>{b.link}</code></p>
                    <dl className="cm-bn-stats">
                      <div><dt><Eye size={12} /> Views</dt><dd>{num(b.views)}</dd></div>
                      <div><dt><MousePointerClick size={12} /> Clicks</dt><dd>{num(b.clicks)}</dd></div>
                      <div><dt>Click rate</dt><dd>{b.views ? `${b.ctr.toFixed(1)}%` : "—"}</dd></div>
                    </dl>
                    {canEdit && (
                      <div className="cm-bn-foot">
                        {b.active
                          ? <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => (b.status === "Live" ? setPulling(b) : (setBannerActive(b.id, false, by), toast(`${b.title} is now a draft.`)))}>Unpublish</button>
                          : <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => publish(b)}><Rocket size={13} /> Publish</button>}
                        <span className="cm-move">
                          <button type="button" aria-label={`Move ${b.title} earlier`} disabled={pos === 0} onClick={() => moveBanner(b.id, -1)}><ChevronLeft size={15} /></button>
                          <button type="button" aria-label={`Move ${b.title} later`} disabled={pos === same.length - 1} onClick={() => moveBanner(b.id, 1)}><ChevronRight size={15} /></button>
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={ImageOff} title="No banners here" text={filter === "All" && place === "all" ? "Create the first banner for the Home page." : "Nothing matches these filters."}
            action={filter === "All" && place === "all" ? null : <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => { setFilter("All"); setPlace("all"); }}>Clear filters</button>} />
        )}
        <p className="cm-foot">Banners in the same place appear in the order shown here. A banner with dates goes live and ends on its own, so there is nothing to switch off by hand.</p>
      </section>

      <BannerModal open={!!form} banner={form?.banner || null} onSave={save} onClose={() => setForm(null)} />
      <ConfirmModal open={!!deleting} title={`Delete “${deleting?.title}”?`} text="The banner and its view and click numbers are removed. This cannot be undone." confirmLabel="Delete banner"
        onConfirm={() => { removeBanner(deleting.id, by); toast(`${deleting.title} was deleted.`); setDeleting(null); }} onClose={() => setDeleting(null)} />
      <ConfirmModal open={!!pulling} tone="warning" icon={EyeOff} title={`Unpublish “${pulling?.title}”?`} text="It disappears from the site right away and goes back to drafts. You can publish it again any time." confirmLabel="Unpublish"
        onConfirm={() => { setBannerActive(pulling.id, false, by); toast(`${pulling.title} is now a draft.`); setPulling(null); }} onClose={() => setPulling(null)} />
    </>
  );
}
