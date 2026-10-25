import React from "react";
import { Link } from "react-router-dom";

import { CATEGORIES } from "../../../data/notificationsStore";
import { NOTIFICATION_ROWS } from "../../../data/settingsStore";

/* Right column: unread by type, how alerts reach you, a few tips */
export default function NotificationSide({ unreadByCategory, prefs, onPick }) {
  const channelLabel = (key) => {
    const row = prefs.channels[key];
    if (!row) return "Off";

    const on = [row.app && "App", row.email && "Email", row.sms && "SMS"].filter(Boolean);
    return on.length ? on.join(", ") : "Off";
  };

  return (
    <aside className="ntf-side">
      <section className="ntf-card">
        <h3>Unread by type</h3>

        <ul className="ntf-types">
          {CATEGORIES.map((item) => (
            <li key={item.key}>
              <button type="button" onClick={() => onPick(item.key)}>
                <span className={`ntf-swatch ${item.key}`} aria-hidden="true" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </span>
                <b className={unreadByCategory[item.key] ? "has" : ""}>{unreadByCategory[item.key] || 0}</b>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="ntf-card">
        <div className="ntf-card-head">
          <h3>How alerts reach you</h3>
          <Link to="/remaker-settings?section=notifications">Change</Link>
        </div>

        <dl className="ntf-channels">
          {NOTIFICATION_ROWS.slice(0, 5).map((row) => (
            <div key={row.key}>
              <dt>{row.label.split(" and ")[0].replace("New orders", "Sales")}</dt>
              <dd>{channelLabel(row.key)}</dd>
            </div>
          ))}
        </dl>

        <p className="ntf-quiet">
          {prefs.quietOn ? `Quiet hours: ${prefs.quietFrom} to ${prefs.quietTo}` : "Quiet hours are off"} ·{" "}
          {prefs.digest === "instant" ? "Instant alerts" : prefs.digest === "daily" ? "Daily summary" : "Weekly summary"}
        </p>
      </section>

      <section className="ntf-card tips">
        <h3>Never miss an order</h3>
        <p>
          New orders must be accepted within 24 hours. Turn on SMS for sales so you hear about them even when you are
          not on ReOrbit.
        </p>
        <Link to="/remaker-settings?section=notifications" className="ntf-btn light">
          Set up alerts
        </Link>
      </section>
    </aside>
  );
}
