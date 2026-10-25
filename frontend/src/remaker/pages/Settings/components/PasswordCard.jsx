import React, { useState } from "react";

import { passwordChecks } from "../../../data/settingsStore";
import { Card, Field } from "./Controls";

/* Change password. UI only: nothing is stored, we only check the rules. */
export default function PasswordCard({ provider, onChanged }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [attempted, setAttempted] = useState(false);

  if (provider === "google") {
    return (
      <Card title="Password" note="You sign in with Google, so there is no ReOrbit password to change.">
        <p className="set-note">To change how you sign in, manage your Google account security settings.</p>
      </Card>
    );
  }

  const checks = passwordChecks(next);
  const passed = checks.filter((item) => item.ok).length;
  const strength = passed <= 1 ? "weak" : passed === 2 ? "fair" : passed === 3 ? "good" : "strong";

  const errors = {
    current: current ? "" : "Enter your current password.",
    next: checks.slice(0, 3).every((item) => item.ok) ? "" : "Use 8 or more characters with a letter and a number.",
    confirm: confirm && confirm === next ? "" : "The two passwords do not match.",
  };

  const submit = (event) => {
    event.preventDefault();
    setAttempted(true);

    if (Object.values(errors).some(Boolean)) return;

    setCurrent("");
    setNext("");
    setConfirm("");
    setAttempted(false);
    onChanged();
  };

  const type = show ? "text" : "password";

  return (
    <Card title="Change password" note="Pick something you do not use anywhere else.">
      <form className="set-form" onSubmit={submit} noValidate>
        <Field label="Current password" htmlFor="set-pw-current" error={attempted ? errors.current : ""}>
          <input id="set-pw-current" type={type} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} aria-invalid={attempted && errors.current ? "true" : undefined} />
        </Field>

        <Field label="New password" htmlFor="set-pw-new" error={attempted ? errors.next : ""}>
          <input id="set-pw-new" type={type} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} aria-invalid={attempted && errors.next ? "true" : undefined} />
        </Field>

        {next && (
          <div className="set-strength" aria-live="polite">
            <div className={`bar ${strength}`}>
              <i style={{ width: `${(passed / 4) * 100}%` }} />
            </div>
            <span>Strength: {strength}</span>
            <ul>
              {checks.map((item) => (
                <li className={item.ok ? "ok" : ""} key={item.key}>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Field label="Confirm new password" htmlFor="set-pw-confirm" error={attempted ? errors.confirm : ""}>
          <input id="set-pw-confirm" type={type} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={attempted && errors.confirm ? "true" : undefined} />
        </Field>

        <div className="set-form-actions">
          <label className="set-check">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            <span>Show passwords</span>
          </label>

          <button type="submit" className="set-btn primary">
            Update password
          </button>
        </div>
      </form>
    </Card>
  );
}
