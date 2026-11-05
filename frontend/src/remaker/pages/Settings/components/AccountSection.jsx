import React from "react";
import { Link } from "react-router-dom";

import { LANGUAGES, TIMEZONES, saveSection } from "../../../data/settingsStore";
import { Card, Field, Row, SaveBar, Toggle, useDraft } from "./Controls";
import PasswordCard from "./PasswordCard";

export default function AccountSection({ settings, onDirty, notify }) {
  const { draft, set, dirty, reset } = useDraft(
    settings.account,
    "account",
    onDirty,
  );

  const save = () => {
    saveSection("account", draft);
    notify("Account settings saved.");
  };

  return (
    <div className="set-stack">
      <p className="set-note">
        Your name, photo, phone, address and email are on your{" "}
        <Link to="/remaker-profile">studio profile</Link>.
      </p>

      <Card title="Language and time">
        <div className="set-grid">
          <Field label="Language" htmlFor="set-lang">
            <div className="set-select">
              <select
                id="set-lang"
                value={draft.language}
                onChange={(e) => set("language", e.target.value)}
              >
                {LANGUAGES.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field
            label="Time zone"
            htmlFor="set-tz"
            hint="Used for order times and quiet hours."
          >
            <div className="set-select">
              <select
                id="set-tz"
                value={draft.timezone}
                onChange={(e) => set("timezone", e.target.value)}
              >
                {TIMEZONES.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </Field>
        </div>
      </Card>

      <Card
        title="Sign-in"
        note={`You signed up with ${draft.authProvider === "google" ? "Google" : "email"}.`}
      >
        <Row
          title="Two-step verification"
          note="We send a one-time code by SMS or email each time you sign in on a new device."
        >
          <Toggle
            checked={draft.twoStep}
            onChange={(value) => set("twoStep", value)}
            label="Two-step verification"
          />
        </Row>
      </Card>

      <PasswordCard
        provider={draft.authProvider}
        onChanged={() => notify("Password updated.")}
      />

      <SaveBar dirty={dirty} onSave={save} onReset={reset} />
    </div>
  );
}
