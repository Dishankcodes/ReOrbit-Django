import React, { useEffect, useState } from "react";
import { X, Send, Users, Store, Globe } from "lucide-react";
import { AUDIENCE_LABEL, ANNOUNCE_TYPES } from "../../data/notificationsStore";

const AUD = [
  { key: "users", icon: Users },
  { key: "remakers", icon: Store },
  { key: "everyone", icon: Globe },
];

/* Compose a message that goes to the user / ReMaker apps. */
export default function AnnounceModal({
  open,
  prefill,
  reach,
  onSend,
  onClose,
}) {
  const [f, setF] = useState({
    title: "",
    message: "",
    audience: "users",
    type: "update",
    schedule: "",
  });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setF({
      title: prefill?.title || "",
      message: prefill?.message || "",
      audience: prefill?.audience || "users",
      type: prefill?.type || "update",
      schedule: "",
    });
    setTouched(false);
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, prefill, onClose]);

  if (!open) return null;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const tErr = f.title.trim().length < 5;
  const mErr = f.message.trim().length < 10;
  const count = reach[f.audience];

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (tErr || mErr) return;
    onSend({
      title: f.title.trim(),
      message: f.message.trim(),
      audience: f.audience,
      type: f.type,
      scheduleAt: f.schedule || "",
    });
  };

  return (
    <div
      className="ad-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className="ad-modal nt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nt-ann-title"
        onSubmit={submit}
      >
        <button
          type="button"
          className="ad-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <h3 id="nt-ann-title">Send an announcement</h3>
        <p className="nt-modal-sub">
          It shows up in the notification bell of everyone you choose.
        </p>

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
            About <strong>{count.toLocaleString("en-IN")}</strong> people will
            see this.
          </small>
        </div>

        <label className="ad-modal-field">
          <span>Title</span>
          <input
            value={f.title}
            maxLength={70}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Diwali Green Sale starts tomorrow"
            autoFocus
          />
          {touched && tErr && (
            <small className="ad-modal-error">
              Add a title (at least 5 characters).
            </small>
          )}
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
            <small className="ad-modal-error">
              Write a short message (at least 10 characters).
            </small>
          )}
        </label>

        <div className="nt-two">
          <label className="ad-modal-field">
            <span>Type</span>
            <select
              value={f.type}
              onChange={(e) => set("type", e.target.value)}
            >
              {Object.entries(ANNOUNCE_TYPES).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="ad-modal-field">
            <span>
              Schedule <em>(optional)</em>
            </span>
            <input
              type="datetime-local"
              value={f.schedule}
              onChange={(e) => set("schedule", e.target.value)}
            />
          </label>
        </div>

        <div className="ad-modal-actions">
          <button
            type="button"
            className="ad-btn ad-btn-ghost"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="ad-btn ad-btn-primary">
            <Send size={14} /> {f.schedule ? "Schedule" : "Send now"}
          </button>
        </div>
      </form>
    </div>
  );
}
