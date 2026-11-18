import React from "react";

import { Card, Row, Toggle } from "./Controls";
import { usePrefSwitches } from "./NotificationPrefsSection";

/* ReMakers sign in with an emailed code (or Google), so there is no password to manage. */
export default function SecuritySection({ me, notify }) {
  const [prefs, set] = usePrefSwitches(me, notify);
  const google = me.account?.auth_provider === "google";

  if (me.loading) return <p className="set-note">Loading…</p>;

  return (
    <div className="set-stack">
      <Card title="How you sign in">
        <dl className="set-facts">
          <div>
            <dt>Method</dt>
            <dd>{google ? "Google, or a code sent to your email" : "A one-time code sent to your email"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{me.account?.email}</dd>
          </div>
        </dl>
        <p className="set-note">
          There is no ReOrbit password for ReMakers. Each sign-in code works once and expires in a few minutes, so
          only someone with access to your email can get in. Keep that email account safe.
        </p>
      </Card>

      <Card title="Sign-in alerts" note="Know straight away if someone else gets into your account.">
        <Row title="Email me when someone signs in" note={`Sent to ${me.account?.email || "your email"}`}>
          <Toggle
            checked={prefs.loginAlerts === true}
            onChange={(v) => set("loginAlerts", v)}
            label="Sign-in alerts"
            disabled={me.busy}
          />
        </Row>
      </Card>
    </div>
  );
}
