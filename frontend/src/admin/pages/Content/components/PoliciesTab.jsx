import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, History, Rocket, Save, Undo2, FileEdit, Eye, Check } from "lucide-react";
import { usePolicies, saveDraft, discardDraft, publishPolicy, restoreVersion, fillTokens, POLICY_TOKENS } from "../../../data/contentStore";
import { useSettings } from "../../../data/settingsStore";
import StatusBadge from "../../../components/ui/StatusBadge";
import { PublishModal, HistoryModal, ConfirmModal } from "./ContentModals";
import { PolicyIcon, Prose } from "./contentBits";
import { formatDate } from "../../../utils/format";

export default function PoliciesTab({ canEdit, by, toast }) {
  const policies = usePolicies();
  const { commerce, warehouse } = useSettings();
  const [key, setKey] = useState(policies[0].key);
  const policy = policies.find((p) => p.key === key) || policies[0];
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [history, setHistory] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const area = useRef(null);

  /* opening another document closes the editor */
  useEffect(() => { setEditing(false); }, [key]);
  const startEdit = () => { setText(policy.draft ? policy.draft.body : policy.body); setNote(policy.draft?.note || ""); setEditing(true); };
  const dirty = editing && text !== (policy.draft ? policy.draft.body : policy.body);
  const changedFromLive = editing && text !== policy.body;
  const tooShort = text.trim().length < 80;

  const preview = useMemo(() => fillTokens(editing ? text : policy.draft && false ? policy.draft.body : policy.body, commerce, warehouse), [editing, text, policy, commerce, warehouse]);
  const words = (editing ? text : policy.body).trim().split(/\s+/).filter(Boolean).length;

  const insert = (token) => {
    const el = area.current;
    if (!el) { setText((t) => t + token); return; }
    const s = el.selectionStart; const e = el.selectionEnd;
    const next = text.slice(0, s) + token + text.slice(e);
    setText(next);
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = s + token.length; });
  };
  const addHeading = () => insert((text && !text.endsWith("\n\n") ? "\n\n" : "") + "## Heading\n");
  const addBullet = () => insert((text && !text.endsWith("\n") ? "\n" : "") + "- ");

  const doSaveDraft = () => { saveDraft(policy.key, text, note, by); toast("Draft saved. Members still see the published version."); setEditing(false); };
  const doPublish = ({ note: n, major }) => {
    const v = publishPolicy(policy.key, text, n, major, by);
    toast(`${policy.title} version ${v} is now live.`);
    setPublishing(false); setEditing(false);
  };

  return (
    <div className="cm-pol">
      <aside className="cm-pol-list" aria-label="Policies">
        {policies.map((p) => (
          <button key={p.key} type="button" className={p.key === key ? "on" : ""} onClick={() => setKey(p.key)} aria-current={p.key === key}>
            <span className="cm-pol-ic"><PolicyIcon name={p.icon} /></span>
            <span className="cm-pol-t"><strong>{p.title}</strong><small>{p.neverPublished ? "Not published yet" : `Version ${p.version} · ${formatDate(p.updatedAt)}`}</small></span>
            {p.draft ? <em className="cm-tag wait">Draft</em> : p.neverPublished ? <em className="cm-tag">Unpublished</em> : null}
          </button>
        ))}
      </aside>

      <section className="au-panel cm-pol-main">
        <header className="cm-pol-head">
          <div>
            <h3>{policy.title}</h3>
            <p>{policy.summary}</p>
            <div className="cm-pol-meta">
              <StatusBadge status={policy.neverPublished ? "Draft" : "Published"} />
              {!policy.neverPublished && <span>Version {policy.version}</span>}
              <span>Updated {formatDate(policy.updatedAt)} by {policy.updatedBy}</span>
              <span>{words} words</span>
            </div>
          </div>
          {!editing && (
            <div className="cm-pol-actions">
              <button type="button" className="ad-btn ad-btn-ghost" onClick={() => setHistory(true)} disabled={policy.versions.length === 0}><History size={15} /> History</button>
              <button type="button" className="ad-btn ad-btn-primary" disabled={!canEdit} onClick={startEdit}><Pencil size={15} /> {policy.draft ? "Continue draft" : "Edit"}</button>
            </div>
          )}
        </header>

        {!editing && policy.draft && (
          <div className="cm-draftbar" role="status">
            <FileEdit size={16} />
            <div><strong>There is an unpublished draft.</strong><span>Saved by {policy.draft.by} on {formatDate(policy.draft.at)}{policy.draft.note ? `: “${policy.draft.note}”` : ""}. Members still see version {policy.version}.</span></div>
            {canEdit && (
              <span className="cm-draftbar-actions">
                <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setDiscarding(true)}><Undo2 size={13} /> Discard</button>
                <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={startEdit}>Review draft</button>
              </span>
            )}
          </div>
        )}
        {!editing && policy.neverPublished && (
          <div className="cm-draftbar" role="status">
            <FileEdit size={16} />
            <div><strong>This policy has not been published.</strong><span>Members cannot see it yet. Read it through, edit what you need and publish it.</span></div>
            {canEdit && <button type="button" className="ad-btn ad-btn-primary ad-btn-sm" onClick={startEdit}>Edit and publish</button>}
          </div>
        )}

        {editing ? (
          <div className="cm-editor">
            <div className="cm-edit-col">
              <div className="cm-toolbar">
                <button type="button" onClick={addHeading}>## Heading</button>
                <button type="button" onClick={addBullet}>- Bullet</button>
                <span>Insert a live value:</span>
                {POLICY_TOKENS.map((t) => <button key={t.token} type="button" title={t.hint} onClick={() => insert(t.token)}>{t.label}</button>)}
              </div>
              <textarea ref={area} className="cm-textarea" value={text} onChange={(e) => setText(e.target.value)} aria-label={`${policy.title} text`} spellCheck />
              <p className="cm-hint">Use ## for a heading, - for a bullet and a blank line between paragraphs. Values in {"{braces}"} are filled from Settings.</p>
              <label className="ad-modal-field"><span>Note for the team <em>(optional, saved with the draft)</em></span>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Waiting for legal review" /></label>
            </div>
            <div className="cm-edit-col">
              <div className="cm-preview-head"><Eye size={14} /> What members will read</div>
              <div className="cm-preview"><Prose text={preview} /></div>
            </div>
            <div className="cm-edit-actions">
              <span className="cm-dirty">{changedFromLive ? (dirty ? "Unsaved changes" : "Draft saved") : "No changes from the live version"}</span>
              <button type="button" className="ad-btn ad-btn-ghost" onClick={() => setEditing(false)}>Close editor</button>
              <button type="button" className="ad-btn ad-btn-ghost" disabled={!dirty || tooShort} onClick={doSaveDraft}><Save size={15} /> Save draft</button>
              <button type="button" className="ad-btn ad-btn-primary" disabled={(!changedFromLive && !policy.neverPublished) || tooShort} onClick={() => setPublishing(true)}><Rocket size={15} /> Publish…</button>
            </div>
            {tooShort && <p className="cm-warn cm-warn-inline">A policy needs at least 80 characters before it can be saved.</p>}
          </div>
        ) : (
          <div className="cm-reader"><Prose text={fillTokens(policy.body, commerce, warehouse)} /></div>
        )}
      </section>

      <PublishModal open={publishing} policy={policy} onPublish={doPublish} onClose={() => setPublishing(false)} />
      <HistoryModal open={history} policy={policy} canEdit={canEdit} onRestore={(v) => { const nv = restoreVersion(policy.key, v, by); toast(`Version ${v} was restored as version ${nv}.`); setHistory(false); }} onClose={() => setHistory(false)} />
      <ConfirmModal open={discarding} tone="warning" icon={Undo2} title="Discard this draft?" text="The unpublished changes are removed. The published version stays as it is." confirmLabel="Discard draft"
        onConfirm={() => { discardDraft(policy.key, by); toast("The draft was discarded."); setDiscarding(false); }} onClose={() => setDiscarding(false)} />
    </div>
  );
}
