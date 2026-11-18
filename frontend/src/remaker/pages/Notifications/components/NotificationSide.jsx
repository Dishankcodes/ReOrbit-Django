import React from "react";
import { Link } from "react-router-dom";

import { CATEGORIES } from "../../../data/notificationsStore";
import { REMAKER_TOPICS } from "../../../data/settingsStore";

/* Right column: unread by type, how alerts reach you, a few tips */
export default function NotificationSide({ unreadByCategory, prefs, onPick }) {
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
                <b className={unreadByCategory[item.key] ? "has" : ""}>
                  {unreadByCategory[item.key] || 0}
                </b>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="ntf-card">
        <div className="ntf-card-head">
          <h3>What shows in your bell</h3>
          <Link to="/remaker-settings?section=notifications">Change</Link>
        </div>

        <dl className="ntf-channels">
          {REMAKER_TOPICS.map(([key, label]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{prefs[key] === false ? "Off" : "On"}</dd>
            </div>
          ))}
        </dl>

        <p className="ntf-quiet">
          Email is only used for sign-in codes, account and security messages.
        </p>
      </section>

      <section className="ntf-card tips">
        <h3>Never miss an order</h3>
        <p>
          Keep "Sales and orders" on so new orders show up in your bell straight
          away. Pack and hand them over quickly to keep your rating high.
        </p>
        <Link
          to="/remaker-settings?section=notifications"
          className="ntf-btn light"
        >
          Set up alerts
        </Link>
      </section>
    </aside>
  );
}
