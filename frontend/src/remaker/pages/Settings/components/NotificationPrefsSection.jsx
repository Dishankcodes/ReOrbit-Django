import React, { useEffect, useState } from "react";

import { REMAKER_TOPICS } from "../../../data/settingsStore";
import { Card, Row, Toggle } from "./Controls";

/* Each switch saves straight away to the server, which checks it before sending. */
export function usePrefSwitches(me, notify) {
  const server = me.profile?.notification_preferences || {};
  const [prefs, setPrefs] = useState(server);
  useEffect(() => setPrefs(me.profile?.notification_preferences || {}), [me.profile]);
  const set = async (key, value) => {
    const before = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const r = await me.save({ notification_preferences: next });
    if (!r.ok) {
      setPrefs(before);
      notify(r.message || "Not saved. Try again.");
    } else notify("Saved.");
  };
  return [prefs, set];
}

export default function NotificationPrefsSection({ me, notify }) {
  const [prefs, set] = usePrefSwitches(me, notify);
  const on = (k) => prefs[k] !== false;

  if (me.loading) return <p className="set-note">Loading…</p>;

  return (
    <div className="set-stack">
      <Card title="Tell me about" note="These show up in your notification bell.">
        {REMAKER_TOPICS.map(([key, label, note]) => (
          <Row key={key} title={label} note={note}>
            <Toggle checked={on(key)} onChange={(v) => set(key, v)} label={label} disabled={me.busy} />
          </Row>
        ))}
        <Row title="Account, support and safety" note="Always on, so you never miss something important.">
          <Toggle checked onChange={() => {}} label="Account notices" disabled />
        </Row>
      </Card>

      <Card title="Email">
        <ul className="set-list">
          <li>Email is only used for sign-in codes, account and security messages.</li>
          <li>Everything else stays in the bell inside ReOrbit. There are no SMS alerts.</li>
          <li>
            Want an email whenever someone signs in? Turn on sign-in alerts under <b>Sign-in and security</b>.
          </li>
        </ul>
      </Card>
    </div>
  );
}
