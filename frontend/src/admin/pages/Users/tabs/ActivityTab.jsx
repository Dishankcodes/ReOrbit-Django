import React from "react";
import { UserPlus, Boxes, ShoppingBag, Gift, Star, LogIn, Wifi, WifiOff, Trash2, RotateCcw, ShieldAlert } from "lucide-react";
import { formatDateTime } from "../../../utils/format";
import Presence from "../../../components/ui/Presence";

const ICONS = {
  account: UserPlus,
  item: Boxes,
  listing: Boxes,
  order: ShoppingBag,
  donation: Gift,
  review: Star,
  signin: LogIn,
  online: Wifi,
  offline: WifiOff,
  deleted: Trash2,
  restored: RotateCcw,
  status: ShieldAlert,
};

export default function ActivityTab({ user }) {
  return (
    <section className="aup-card">
      <header className="aup-card-head">
        <div>
          <h3>Recent activity</h3>
          <p>Sign-ins, online or offline, deleting and coming back, and everything they did on ReOrbit.</p>
        </div>
        <Presence account={user} />
      </header>
      <ol className="aup-activity">
        {user.activity.map((event, index) => {
          const Icon = ICONS[event.type] || UserPlus;
          return (
            <li key={`${event.at}-${index}`}>
              <span className={`aup-activity-icon type-${event.type}`}>
                <Icon size={15} />
              </span>
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
