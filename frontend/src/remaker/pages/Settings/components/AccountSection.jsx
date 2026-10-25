import React from "react";
import { Link } from "react-router-dom";

import { LANGUAGES, TIMEZONES, saveSection } from "../../../data/settingsStore";
import { Card, Field, Row, SaveBar, Toggle, useDraft } from "./Controls";
import PasswordCard from "./PasswordCard";

export default function AccountSection({ settings, onDirty, notify }) {
  const { draft, set, dirty, reset } = useDraft(settings.account, "account", onDirty);
  const [attempted, setAttempted] = React.useState(false);

  const errors = {
    fullName: draft.fullName.trim().length >= 3 ? "" : "Enter your full name.",
    studioName: draft.studioName.trim().length >= 2 ? "" : "Enter the name buyers know you by.",
    phone: /^[0-9 ]{10,13}$/.test(draft.phone.trim()) ? "" : "Enter a valid 10 digit phone number.",
  };

  const save = () => {
    setAttempted(true);
    if (Object.values(errors).some(Boolean)) return;

    saveSection("account", { ...draft, fullName: draft.fullName.trim(), studioName: draft.studioName.trim(), phone: draft.phone.trim() });
    setAttempted(false);
    notify("Account settings saved.");
  };

  return (
    <div className="set-stack">
      <Card title="Your details" note="This is how you appear to customers and to ReOrbit.">
        <div className="set-grid">
          <Field label="Full name" htmlFor="set-name" error={attempted ? errors.fullName : ""}>
            <input id="set-name" type="text" value={draft.fullName} maxLength={60} onChange={(e) => set("fullName", e.target.value)} aria-invalid={attempted && errors.fullName ? "true" : undefined} />
          </Field>

          <Field label="Studio name" htmlFor="set-studio" hint="The art name shown on your products, like Messy Mirror." error={attempted ? errors.studioName : ""}>
            <input id="set-studio" type="text" value={draft.studioName} maxLength={40} onChange={(e) => set("studioName", e.target.value)} aria-invalid={attempted && errors.studioName ? "true" : undefined} />
          </Field>

          <Field label="Email" htmlFor="set-email" hint={draft.authProvider === "google" ? "Managed by your Google account." : "To change your email, contact support. We verify the new address first."}>
            <input id="set-email" type="text" value={draft.email} readOnly className="readonly" />
          </Field>

          <Field label="Phone" htmlFor="set-phone" hint="Used for order alerts and delivery calls." error={attempted ? errors.phone : ""}>
            <input id="set-phone" type="text" inputMode="tel" value={draft.phone} maxLength={13} onChange={(e) => set("phone", e.target.value)} aria-invalid={attempted && errors.phone ? "true" : undefined} />
          </Field>
        </div>

        <p className="set-note">
          Photo, bio, skills and address live on your <Link to="/remaker-profile">studio profile</Link>.
        </p>
      </Card>

      <Card title="Language and time">
        <div className="set-grid">
          <Field label="Language" htmlFor="set-lang">
            <div className="set-select">
              <select id="set-lang" value={draft.language} onChange={(e) => set("language", e.target.value)}>
                {LANGUAGES.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field label="Time zone" htmlFor="set-tz" hint="Used for order times and quiet hours.">
            <div className="set-select">
              <select id="set-tz" value={draft.timezone} onChange={(e) => set("timezone", e.target.value)}>
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

      <Card title="Sign-in" note={`You signed up with ${draft.authProvider === "google" ? "Google" : "email"}.`}>
        <Row title="Two-step verification" note="We send a one-time code by SMS or email each time you sign in on a new device.">
          <Toggle checked={draft.twoStep} onChange={(value) => set("twoStep", value)} label="Two-step verification" />
        </Row>
      </Card>

      <PasswordCard provider={draft.authProvider} onChanged={() => notify("Password updated.")} />

      <SaveBar dirty={dirty} onSave={save} onReset={reset} />
    </div>
  );
}
