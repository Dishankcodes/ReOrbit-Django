import React from "react";
import { UserPlus, Boxes, ShoppingBag, Gift } from "lucide-react";
import { formatDateTime } from "../../../utils/format";

const ICONS = { account: UserPlus, item: Boxes, order: ShoppingBag, donation: Gift };

export default function ActivityTab({ user }) {
  return (
    <section className="aup-card">
      <header className="aup-card-head">
        <div>
          <h3>Recent activity</h3>
          <p>A timeline of what this user has done on ReOrbit.</p>
        </div>
      </header>
      <ol className="aup-activity">
        {user.activity.map((event, index) => {
          const Icon = ICONS[event.type] || UserPlus;
          return (
            <li key={`${event.at}-${index}`}>
              <span className={`aup-activity-icon type-${event.type}`}><Icon size={15} /></span>
              <div>
                <strong>{event.text}</strong>
                <small>{formatDateTime(event.at)}</small>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
