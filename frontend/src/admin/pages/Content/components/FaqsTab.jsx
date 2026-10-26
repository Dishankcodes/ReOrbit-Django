import React, { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search, X, ThumbsUp, CircleHelp, SearchX, Eye, EyeOff } from "lucide-react";
import { useFaqs, saveFaq, setFaqPublished, removeFaq, moveFaq, FAQ_TOPICS, fillTokens } from "../../../data/contentStore";
import { useSettings } from "../../../data/settingsStore";
import StatusBadge from "../../../components/ui/StatusBadge";
import EmptyState from "../../../components/ui/EmptyState";
import RowActionMenu from "../../../components/ui/RowActionMenu";
import { FaqModal, ConfirmModal } from "./ContentModals";

export default function FaqsTab({ canEdit, by, toast }) {
  const faqs = useFaqs();
  const { commerce, warehouse } = useSettings();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("All");
  const [open, setOpen] = useState(() => new Set());
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const counts = useMemo(() => Object.fromEntries(["All", ...FAQ_TOPICS].map((t) => [t, t === "All" ? faqs.length : faqs.filter((f) => f.topic === t).length])), [faqs]);
  const q = query.trim().toLowerCase();
  const shown = faqs.filter((f) => (topic === "All" || f.topic === topic) && (!q || `${f.q} ${f.a}`.toLowerCase().includes(q)));
  const groups = FAQ_TOPICS.map((t) => ({ topic: t, items: shown.filter((f) => f.topic === t) })).filter((g) => g.items.length);
  const toggle = (id) => setOpen((cur) => { const n = new Set(cur); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const unpublished = faqs.filter((f) => !f.published).length;

  const save = (values) => {
    saveFaq(form.faq?.id, values, by);
    toast(form.faq ? "The question was saved." : "The question was added and is published.");
    setForm(null);
  };
  const menu = (f) => (!canEdit ? [] : [
    { key: "edit", label: "Edit question", icon: Pencil, onClick: () => setForm({ faq: f }) },
    f.published
      ? { key: "unpub", label: "Unpublish", icon: EyeOff, onClick: () => { setFaqPublished(f.id, false, by); toast("The question is hidden from members."); } }
      : { key: "pub", label: "Publish", icon: Eye, onClick: () => { setFaqPublished(f.id, true, by); toast("The question is now visible to members."); } },
    "separator",
    { key: "del", label: "Delete question", icon: Trash2, tone: "danger", onClick: () => setDeleting(f) },
  ]);

  return (
    <>
      <section className="au-panel cm-panel">
        <div className="au-toolbar">
          <label className="au-search">
            <Search size={16} />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions and answers" aria-label="Search FAQs" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
          </label>
          <div className="au-toolbar-right">
            {unpublished > 0 && <span className="cm-count">{unpublished} hidden</span>}
            <button type="button" className="ad-btn ad-btn-primary" disabled={!canEdit} onClick={() => setForm({ topic: topic === "All" ? undefined : topic })}><Plus size={15} /> Add question</button>
          </div>
        </div>
        <div className="cm-pills cm-pills-wrap" role="group" aria-label="Filter by topic">
          {["All", ...FAQ_TOPICS].map((t) => <button key={t} type="button" className={topic === t ? "on" : ""} aria-pressed={topic === t} onClick={() => setTopic(t)}>{t} <em>{counts[t]}</em></button>)}
        </div>

        {groups.length > 0 ? groups.map((g) => (
          <div key={g.topic} className="cm-faq-group">
            <h4>{g.topic} <em>{g.items.length}</em></h4>
            <ul className="cm-faqs">
              {g.items.map((f, i) => {
                const isOpen = open.has(f.id) || !!q;
                const total = f.helpful + f.notHelpful;
                const pct = total ? Math.round((f.helpful / total) * 100) : null;
                return (
                  <li key={f.id} className={`${f.published ? "" : "is-off"} ${isOpen ? "is-open" : ""}`}>
                    <div className="cm-faq-row">
                      <button type="button" className="cm-faq-q" aria-expanded={isOpen} onClick={() => toggle(f.id)}>
                        <ChevronDown size={16} /> <span>{f.q}</span>
                      </button>
                      {pct !== null && <span className={`cm-helpful ${pct < 75 ? "low" : ""}`} title={`${f.helpful} found this helpful, ${f.notHelpful} did not`}><ThumbsUp size={12} /> {pct}%</span>}
                      <StatusBadge status={f.published ? "Published" : "Hidden"} />
                      {canEdit && (
                        <span className="cm-move">
                          <button type="button" aria-label="Move up" disabled={i === 0 || !!q || topic !== "All" && false} onClick={() => moveFaq(f.id, -1)}><ChevronUp size={14} /></button>
                          <button type="button" aria-label="Move down" disabled={i === g.items.length - 1 || !!q} onClick={() => moveFaq(f.id, 1)}><ChevronDown size={14} /></button>
                        </span>
                      )}
                      {canEdit ? <RowActionMenu label={`Actions for ${f.q}`} items={menu(f)} /> : <span className="cm-menu-gap" />}
                    </div>
                    {isOpen && <p className="cm-faq-a">{fillTokens(f.a, commerce, warehouse)}</p>}
                  </li>
                );
              })}
            </ul>
          </div>
        )) : (
          <EmptyState icon={faqs.length ? SearchX : CircleHelp} title={faqs.length ? "No question matches" : "No questions yet"} text={faqs.length ? "Try a different search or topic." : "Add the first question members ask."}
            action={faqs.length ? <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => { setQuery(""); setTopic("All"); }}>Clear filters</button> : null} />
        )}
        <p className="cm-foot">Answers can use values such as {"{platform_fee}"} or {"{cod_limit}"}. They are filled from Settings, so a change there updates every answer. “Helpful” is how many members found the answer useful. Low scores mean the answer needs work.</p>
      </section>

      <FaqModal open={!!form} faq={form?.faq || null} defaultTopic={form?.topic} onSave={save} onClose={() => setForm(null)} />
      <ConfirmModal open={!!deleting} title="Delete this question?" text={deleting ? `“${deleting.q}” will be removed. If you only want to hide it, unpublish it instead.` : ""} confirmLabel="Delete question"
        onConfirm={() => { removeFaq(deleting.id, by); toast("The question was deleted."); setDeleting(null); }} onClose={() => setDeleting(null)} />
    </>
  );
}
