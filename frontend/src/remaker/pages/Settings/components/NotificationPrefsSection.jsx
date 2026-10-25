import React from "react";

import { NOTIFICATION_ROWS, saveSection } from "../../../data/settingsStore";
import { Card, Row, SaveBar, Segmented, Toggle, useDraft } from "./Controls";

const CHANNELS = [
  { key: "app", label: "In app" },
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
];

export default function NotificationPrefsSection({ settings, onDirty, notify }) {
  const { draft, setDraft, set, dirty, reset } = useDraft(settings.notifications, "notifications", onDirty);

  const setChannel = (category, channel, value) =>
    setDraft((current) => ({
      ...current,
      channels: {
        ...current.channels,
        [category]: { ...current.channels[category], [channel]: value },
      },
    }));

  const setColumn = (channel, value) =>
    setDraft((current) => ({
      ...current,
      channels: Object.fromEntries(
        Object.entries(current.channels).map(([key, row]) => [key, { ...row, [channel]: value }]),
      ),
    }));

  const columnOn = (channel) => Object.values(draft.channels).every((row) => row[channel]);

  const ordersOff = !Object.values(draft.channels.orders).some(Boolean);

  const save = () => {
    saveSection("notifications", draft);
    notify("Notification settings saved.");
  };

  return (
    <div className="set-stack">
      <Card title="What we tell you" note="Choose where each kind of alert reaches you.">
        <div className="set-matrix" role="table" aria-label="Notification channels">
          <div className="set-matrix-head" role="row">
            <span role="columnheader">Alert</span>
            {CHANNELS.map((channel) => (
              <span role="columnheader" key={channel.key}>
                <button type="button" className="set-matrix-all" onClick={() => setColumn(channel.key, !columnOn(channel.key))}>
                  {channel.label}
                  <small>{columnOn(channel.key) ? "Turn off all" : "Turn on all"}</small>
                </button>
              </span>
            ))}
          </div>

          {NOTIFICATION_ROWS.map((row) => (
            <div className="set-matrix-row" role="row" key={row.key}>
              <div role="rowheader">
                <strong>{row.label}</strong>
                <small>{row.note}</small>
              </div>

              {CHANNELS.map((channel) => (
                <div className="set-matrix-cell" role="cell" key={channel.key} data-label={channel.label}>
                  <Toggle
                    checked={draft.channels[row.key][channel.key]}
                    onChange={(value) => setChannel(row.key, channel.key, value)}
                    label={`${row.label}, ${channel.label}`}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {ordersOff && (
          <p className="set-warn">
            Sales alerts are off everywhere. You might miss new orders, and orders not accepted within 24 hours are
            cancelled.
          </p>
        )}
      </Card>

      <Card title="How often" note="Email and SMS can arrive one by one, or as a summary.">
        <Segmented
          label="Delivery of alerts"
          value={draft.digest}
          onChange={(value) => set("digest", value)}
          options={[
            { value: "instant", label: "Instantly" },
            { value: "daily", label: "Daily summary" },
            { value: "weekly", label: "Weekly summary" },
          ]}
        />
        <p className="set-note">Sales alerts always arrive instantly, even with a summary on.</p>
      </Card>

      <Card title="Quiet hours" note="No sounds or SMS during these hours. In-app alerts still collect for you.">
        <Row title="Pause alerts at night">
          <Toggle checked={draft.quietOn} onChange={(value) => set("quietOn", value)} label="Quiet hours" />
        </Row>

        {draft.quietOn && (
          <div className="set-grid pad">
            <div className="set-field">
              <label htmlFor="set-quiet-from">From</label>
              <input id="set-quiet-from" type="time" value={draft.quietFrom} onChange={(e) => set("quietFrom", e.target.value)} />
            </div>
            <div className="set-field">
              <label htmlFor="set-quiet-to">Until</label>
              <input id="set-quiet-to" type="time" value={draft.quietTo} onChange={(e) => set("quietTo", e.target.value)} />
            </div>
          </div>
        )}
      </Card>

      <SaveBar dirty={dirty} onSave={save} onReset={reset} />
    </div>
  );
}
