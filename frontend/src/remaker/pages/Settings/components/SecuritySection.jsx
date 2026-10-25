import React, { useEffect, useRef, useState } from "react";

import { Avatar } from "../../../pages-components/ReviewBlocks";
import {
  blockedLabel,
  endOtherSessions,
  endSession,
  lastActiveLabel,
  restoreBlocked,
  saveSection,
  unblock,
} from "../../../data/settingsStore";
import { Card, Field, Row, SaveBar, Toggle, useDraft } from "./Controls";
import ConfirmModal from "./ConfirmModal";

export default function SecuritySection({ settings, onDirty, notify }) {
  const { draft, set, dirty, reset } = useDraft(
    settings.privacy,
    "security",
    onDirty,
  );
  const [confirmOthers, setConfirmOthers] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const save = () => {
    saveSection("privacy", draft);
    notify("Privacy settings saved.");
  };

  const handleUnblock = (person) => {
    const removed = unblock(person.id);
    if (removed)
      notify(`Unblocked ${removed.name}.`, () => restoreBlocked(removed));
  };

  const handleEnd = (session) => {
    endSession(session.id);
    notify(`Signed out of ${session.device}.`);
  };

  const others = settings.sessions.filter((session) => !session.current);

  const downloadData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      account: settings.account,
      studio: settings.studio,
      notifications: settings.notifications,
      payouts: settings.payouts,
      privacy: settings.privacy,
    };

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");

    link.href = url;
    link.download = "reorbit-my-data.json";
    link.click();
    URL.revokeObjectURL(url);
    notify("Your data file was downloaded.");
  };

  return (
    <div className="set-stack">
      <Card
        title="Who can see what"
        note="Control how visible your studio is to other people on ReOrbit."
      >
        <Row
          title="Show my followers"
          note="Visitors can see how many people follow you."
        >
          <Toggle
            checked={draft.showFollowers}
            onChange={(value) => set("showFollowers", value)}
            label="Show followers"
          />
        </Row>
        <Row
          title="Show how many pieces I have sold"
          note="Builds trust with new buyers."
        >
          <Toggle
            checked={draft.showSoldCount}
            onChange={(value) => set("showSoldCount", value)}
            label="Show sales count"
          />
        </Row>
        <Row
          title="Appear in marketplace search"
          note="Turn off to hide your studio from search. Your products stay for people with the link."
        >
          <Toggle
            checked={draft.searchable}
            onChange={(value) => set("searchable", value)}
            label="Appear in search"
          />
        </Row>

        <div className="set-grid pad">
          <Field label="Who can message me" htmlFor="set-msg">
            <div className="set-select">
              <select
                id="set-msg"
                value={draft.messages}
                onChange={(e) => set("messages", e.target.value)}
              >
                <option value="everyone">Everyone on ReOrbit</option>
                <option value="customers">
                  Only people who bought from me
                </option>
                <option value="none">No one</option>
              </select>
            </div>
          </Field>
        </div>
      </Card>

      <Card
        title="Blocked people"
        note="They cannot message you or buy from you."
      >
        {settings.blocked.length === 0 ? (
          <p className="set-empty">You have not blocked anyone.</p>
        ) : (
          <ul className="set-people">
            {settings.blocked.map((person) => (
              <li key={person.id}>
                <span className="set-avatar">
                  <Avatar src="" name={person.name} />
                </span>
                <div>
                  <strong>{person.name}</strong>
                  <small>
                    {person.city} · {person.reason} ·{" "}
                    {blockedLabel(person.blockedAt)}
                  </small>
                </div>
                <button
                  type="button"
                  className="set-btn ghost small"
                  onClick={() => handleUnblock(person)}
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Where you are signed in"
        note="Sign out of anything you do not recognise."
      >
        <ul className="set-sessions">
          {settings.sessions.map((session) => (
            <li key={session.id}>
              <div>
                <strong>
                  {session.device}
                  {session.current && <em>This device</em>}
                </strong>
                <small>
                  {session.place} ·{" "}
                  {session.current
                    ? "Active now"
                    : lastActiveLabel(session.lastActive)}
                </small>
              </div>

              {!session.current && (
                <button
                  type="button"
                  className="set-textbtn"
                  onClick={() => handleEnd(session)}
                >
                  Sign out
                </button>
              )}
            </li>
          ))}
        </ul>

        {others.length > 0 && (
          <button
            type="button"
            className="set-btn danger-ghost"
            onClick={() => setConfirmOthers(true)}
          >
            Sign out of all other devices
          </button>
        )}
      </Card>

      <Card
        title="Your data"
        note="Download a copy of your settings and preferences."
      >
        <button type="button" className="set-btn ghost" onClick={downloadData}>
          Download my data
        </button>
      </Card>

      <SaveBar dirty={dirty} onSave={save} onReset={reset} />

      {confirmOthers && (
        <ConfirmModal
          title="Sign out of other devices?"
          confirmLabel="Sign them out"
          tone="danger"
          onConfirm={() => {
            endOtherSessions();
            setConfirmOthers(false);
            notify("Signed out of all other devices.");
          }}
          onClose={() => setConfirmOthers(false)}
        >
          <p>
            You stay signed in here. Everyone else will need to sign in again.
          </p>
        </ConfirmModal>
      )}
    </div>
  );
}
