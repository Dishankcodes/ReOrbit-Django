import React, { useEffect, useState } from "react";
import { X, Send, Users, Store, Globe, Bell, Save, Link2, Sparkles } from "lucide-react";
import {
  AUDIENCE_LABEL,
  ANNOUNCE_LINKS,
  ANNOUNCE_TEMPLATES,
  ANNOUNCE_TYPES,
} from "../../data/notificationsStore";

const AUD = [
  { key: "users", icon: Users },
  { key: "remakers", icon: Store },
  { key: "everyone", icon: Globe },
];

/* "2026-11-20T09:30" for <input type="datetime-local"> in the admin's own time zone */
const localInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/* Compose (or edit a scheduled) message for the member / ReMaker apps.
   `editing`: a scheduled announcement to change; otherwise `prefill` starts a new one (also used to duplicate). */
export default function AnnounceModal({ open, prefill, editing, reach, onSend, onClose }) {
  const [f, setF] = useState({ title: "", message: "", audience: "users", type: "update", link: "", schedule: "" });
  const [customLink, setCustomLink] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const src = editing || prefill || {};
    const link = src.link || "";
    setF({
      title: src.title || "",
      message: src.message || "",
      audience: src.audience || "users",
      type: src.type || "update",
      link,
      schedule: editing ? localInput(editing.scheduled_at || editing.at) : "",
    });
    setCustomLink(Boolean(link) && !ANNOUNCE_LINKS.some(([v]) => v === link));
    setTouched(false);
    setBusy(false);
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, prefill, editing, onClose]);

  if (!open) return null;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const tErr = f.title.trim().length < 5;
  const mErr = f.message.trim().length < 10;
  const lErr = Boolean(f.link) && (!f.link.startsWith("/") || f.link.startsWith("//"));
  const sErr = editing && !f.schedule;
  const count = reach[f.audience] || 0;
  const templates = ANNOUNCE_TEMPLATES[f.type] || [];

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (tErr || mErr || lErr || sErr) return;
    setBusy(true);
    await onSend({
      title: f.title.trim(),
      message: f.message.trim(),
      audience: f.audience,
      type: f.type,
      link: f.link.trim(),
      scheduleAt: f.schedule || "",
    });
    setBusy(false);
  };

  return (
    <div className="ad-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="ad-modal nt-modal nt-modal-wide" role="dialog" aria-modal="true" aria-labelledby="nt-ann-title" onSubmit={submit}>
        <button type="button" className="ad-modal-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <h3 id="nt-ann-title">{editing ? "Edit scheduled announcement" : "Send an announcement"}</h3>
        <p className="nt-modal-sub">It shows up in the notification bell of everyone you choose.</p>

        <div className="nt-compose">
          <div className="nt-compose-form">
            <div className="ad-modal-field">
              <span>Send to</span>
              <div className="nt-aud" role="radiogroup" aria-label="Audience">
                {AUD.map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={f.audience === key}
                    className={f.audience === key ? "on" : ""}
                    onClick={() => set("audience", key)}
                  >
                    <Icon size={15} /> {AUDIENCE_LABEL[key]}
                  </button>
                ))}
              </div>
              <small className="nt-reach">
                About <strong>{count.toLocaleString("en-IN")}</strong> active{" "}
                {count === 1 ? "person" : "people"} will get it.
              </small>
            </div>

            <label className="ad-modal-field">
              <span>Type</span>
              <select value={f.type} onChange={(e) => set("type", e.target.value)}>
                {Object.entries(ANNOUNCE_TYPES).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>

            {!editing && templates.length > 0 && (
              <div className="nt-templates" aria-label="Start from a template">
                <small>
                  <Sparkles size={12} /> Start from:
                </small>
                {templates.map((t) => (
                  <button
                    key={t.title}
                    type="button"
                    onClick={() => setF((x) => ({ ...x, title: t.title, message: t.message }))}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            )}

            <label className="ad-modal-field">
              <span>
                Title <em>({f.title.length}/70)</em>
              </span>
              <input
                value={f.title}
                maxLength={70}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Diwali Green Sale starts tomorrow"
                autoFocus
              />
              {touched && tErr && <small className="ad-modal-error">Add a title (at least 5 characters).</small>}
            </label>
            <label className="ad-modal-field">
              <span>
                Message <em>({f.message.length}/240)</em>
              </span>
              <textarea
                rows={4}
                maxLength={240}
                value={f.message}
                onChange={(e) => set("message", e.target.value)}
                placeholder="Keep it short and clear."
              />
              {touched && mErr && (
                <small className="ad-modal-error">Write a short message (at least 10 characters).</small>
              )}
            </label>

            <div className="nt-two">
              <label className="ad-modal-field">
                <span>
                  <Link2 size={12} /> Opens <em>(optional)</em>
                </span>
                {customLink ? (
                  <input
                    value={f.link}
                    onChange={(e) => set("link", e.target.value)}
                    placeholder="/user-marketplace"
                  />
                ) : (
                  <select
                    value={f.link}
                    onChange={(e) => (e.target.value === "__custom" ? setCustomLink(true) : set("link", e.target.value))}
                  >
                    {ANNOUNCE_LINKS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                    <option value="__custom">Another page…</option>
                  </select>
                )}
                {touched && lErr && (
                  <small className="ad-modal-error">Use a ReOrbit page that starts with “/”.</small>
                )}
              </label>
              <label className="ad-modal-field">
                <span>
                  Schedule <em>{editing ? "(required)" : "(optional)"}</em>
                </span>
                <input type="datetime-local" value={f.schedule} onChange={(e) => set("schedule", e.target.value)} />
                {touched && sErr && <small className="ad-modal-error">Pick when to send it.</small>}
              </label>
            </div>
          </div>

          <aside className="nt-preview" aria-label="Preview">
            <small>Preview</small>
            <div className="nt-preview-phone">
              <div className="nt-preview-bar">
                <Bell size={13} /> Notifications
              </div>
              <div className={`nt-preview-card t-${f.type}`}>
                <span className="nt-preview-type">{ANNOUNCE_TYPES[f.type]}</span>
                <strong>{f.title.trim() || "Your title"}</strong>
                <p>{f.message.trim() || "Your message shows here."}</p>
                <em>
                  {f.schedule
                    ? new Date(f.schedule).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "Just now"}
                  {f.link ? " · Tap to open" : ""}
                </em>
              </div>
            </div>
          </aside>
        </div>

        <div className="ad-modal-actions">
          <button type="button" className="ad-btn ad-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="ad-btn ad-btn-primary" disabled={busy}>
            {editing ? <Save size={14} /> : <Send size={14} />}{" "}
            {busy ? "Saving…" : editing ? "Save changes" : f.schedule ? "Schedule" : "Send now"}
          </button>
        </div>
      </form>
    </div>
  );
}
