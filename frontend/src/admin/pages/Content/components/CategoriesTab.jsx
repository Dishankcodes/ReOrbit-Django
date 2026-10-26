import React, { useMemo, useState } from "react";
import { Plus, Pencil, Eye, EyeOff, Trash2, ChevronUp, ChevronDown, Lock, Search, X, Tags, SearchX } from "lucide-react";
import { useCategories, createCategory, updateCategory, setCategoryActive, removeCategory, moveCategory } from "../../../data/contentStore";
import StatusBadge from "../../../components/ui/StatusBadge";
import EmptyState from "../../../components/ui/EmptyState";
import RowActionMenu from "../../../components/ui/RowActionMenu";
import { CategoryModal, ConfirmModal } from "./ContentModals";
import { CategoryIcon } from "./contentBits";

export default function CategoriesTab({ canEdit, by, toast }) {
  const cats = useCategories();
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(null);       // {} create | { category } edit
  const [deleting, setDeleting] = useState(null);
  const [hiding, setHiding] = useState(null);

  const shown = useMemo(() => cats.filter((c) => !query.trim() || `${c.name} ${c.blurb}`.toLowerCase().includes(query.trim().toLowerCase())), [cats, query]);
  const visible = cats.filter((c) => c.active).length;

  const save = (values) => {
    if (form.category) { updateCategory(form.category.id, values, by); toast(`${form.category.name} was updated.`); }
    else { createCategory(values, by); toast(`${values.name.trim()} was added.`); }
    setForm(null);
  };
  const menu = (c) => [
    ...(canEdit ? [
      { key: "edit", label: "Edit category", icon: Pencil, onClick: () => setForm({ category: c }) },
      ...(!c.locked ? [c.active
        ? { key: "hide", label: "Hide from members", icon: EyeOff, onClick: () => (c.live > 0 || c.usage.live > 0 ? setHiding(c) : (setCategoryActive(c.id, false, by), toast(`${c.name} is hidden.`))) }
        : { key: "show", label: "Show to members", icon: Eye, onClick: () => { setCategoryActive(c.id, true, by); toast(`${c.name} is visible again.`); } }] : []),
      ...(!c.locked ? ["separator", { key: "delete", label: c.inUse ? "Cannot delete (in use)" : "Delete category", icon: Trash2, tone: "danger", onClick: () => (c.inUse ? toast(`${c.name} is used by ${c.total} records. Hide it instead.`) : setDeleting(c)) }] : []),
    ] : []),
  ];

  return (
    <>
      <section className="au-panel cm-panel">
        <div className="au-toolbar">
          <label className="au-search">
            <Search size={16} />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search categories" aria-label="Search categories" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
          </label>
          <div className="au-toolbar-right">
            <span className="cm-count">{visible} of {cats.length} visible</span>
            <button type="button" className="ad-btn ad-btn-primary" disabled={!canEdit} onClick={() => setForm({})}><Plus size={15} /> Add category</button>
          </div>
        </div>

        {shown.length > 0 ? (
          <ul className="cm-cats">
            {shown.map((c, i) => (
              <li key={c.id} className={c.active ? "" : "is-hidden"}>
                {canEdit && !query && (
                  <span className="cm-order">
                    <button type="button" aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => moveCategory(c.id, -1)}><ChevronUp size={14} /></button>
                    <button type="button" aria-label={`Move ${c.name} down`} disabled={c.locked || i >= cats.length - 1 || cats[i + 1]?.locked} onClick={() => moveCategory(c.id, 1)}><ChevronDown size={14} /></button>
                  </span>
                )}
                <span className="cm-cat-icon"><CategoryIcon name={c.icon} size={20} /></span>
                <div className="cm-cat-main">
                  <strong>{c.name}{c.locked && <em className="cm-lock"><Lock size={11} /> Always on</em>}</strong>
                  <span>{c.blurb || "No description."}</span>
                </div>
                <dl className="cm-usage">
                  <div><dt>Live</dt><dd>{c.usage.live}</dd></div>
                  <div><dt>Donations</dt><dd>{c.usage.donations}</dd></div>
                  <div><dt>In stock</dt><dd>{c.usage.stock}</dd></div>
                </dl>
                <StatusBadge status={c.active ? "Visible" : "Hidden"} />
                {canEdit ? <RowActionMenu label={`Actions for ${c.name}`} items={menu(c)} /> : <span className="cm-menu-gap" />}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={cats.length ? SearchX : Tags} title={cats.length ? "No category matches" : "No categories yet"} text={cats.length ? "Try a different search." : "Add one so members can list items."}
            action={cats.length ? <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setQuery("")}>Clear search</button> : null} />
        )}
        <p className="cm-foot">A category that is used by listings, donations or stock cannot be renamed or deleted. Hide it to stop new use, and everything already in it stays as it is.</p>
      </section>

      <CategoryModal open={!!form} category={form?.category || null} onSave={save} onClose={() => setForm(null)} />
      <ConfirmModal open={!!deleting} title={`Delete ${deleting?.name}?`} text="Nothing uses this category, so it can be removed safely. This cannot be undone." confirmLabel="Delete category"
        onConfirm={() => { removeCategory(deleting.id, by); toast(`${deleting.name} was deleted.`); setDeleting(null); }} onClose={() => setDeleting(null)} />
      <ConfirmModal open={!!hiding} tone="warning" icon={EyeOff} title={`Hide ${hiding?.name}?`} confirmLabel="Hide category"
        text={`${hiding?.usage.live} live listing${hiding?.usage.live === 1 ? "" : "s"} stay on the marketplace. Members just cannot choose this category for new items.`}
        onConfirm={() => { setCategoryActive(hiding.id, false, by); toast(`${hiding.name} is hidden.`); setHiding(null); }} onClose={() => setHiding(null)} />
    </>
  );
}
