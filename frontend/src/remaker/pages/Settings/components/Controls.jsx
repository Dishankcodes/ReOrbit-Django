import React, { useEffect, useState } from "react";

/* Shared building blocks for every settings section */

export function Toggle({ id, checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`set-toggle ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

/* A label, the control and an optional hint or error */
export function Field({ label, htmlFor, hint, error, children }) {
  return (
    <div className="set-field">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <span className="set-error">{error}</span> : hint ? <small>{hint}</small> : null}
    </div>
  );
}

export function Card({ title, note, children, tone = "" }) {
  return (
    <section className={`set-card ${tone}`}>
      {(title || note) && (
        <header>
          {title && <h3>{title}</h3>}
          {note && <p>{note}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

/* One row with text on the left and a switch (or other control) on the right */
export function Row({ title, note, children }) {
  return (
    <div className="set-row">
      <div>
        <strong>{title}</strong>
        {note && <small>{note}</small>}
      </div>
      <div className="set-row-control">{children}</div>
    </div>
  );
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div className="set-segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? "active" : ""}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* A working copy of a section. Reports "unsaved changes" to the page. */
export function useDraft(saved, sectionKey, onDirty) {
  const [draft, setDraft] = useState(saved);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => {
    onDirty?.(sectionKey, dirty);
  }, [dirty, sectionKey, onDirty]);

  /* If the saved values change from outside, start from them again */
  useEffect(() => {
    setDraft(saved);
  }, [saved]);

  const set = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const reset = () => setDraft(saved);

  return { draft, setDraft, set, dirty, reset };
}

export function SaveBar({ dirty, onSave, onReset, disabled = false }) {
  if (!dirty) return null;

  return (
    <div className="set-savebar" role="region" aria-label="Save changes">
      <p>You have unsaved changes.</p>
      <div>
        <button type="button" className="set-btn ghost-light" onClick={onReset}>
          Discard
        </button>
        <button type="button" className="set-btn light" onClick={onSave} disabled={disabled}>
          Save changes
        </button>
      </div>
    </div>
  );
}
