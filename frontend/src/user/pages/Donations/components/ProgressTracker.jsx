import React from "react";
import {
  Check,
  Ban,
  ClipboardList,
  CalendarCheck,
  Truck,
  Warehouse,
  HandHeart,
} from "lucide-react";
import {
  TRACK_STEPS,
  CLOSED_STATUSES,
  stepIndex,
} from "../../../data/donationsStore";

const ICONS = [ClipboardList, CalendarCheck, Truck, Warehouse, HandHeart];

/* Five-step tracker. Rejected / cancelled donations stop at the step they reached. */
export default function ProgressTracker({ donation }) {
  const closed = CLOSED_STATUSES.includes(donation.status);
  const completed = donation.status === "Completed";
  const reached = closed
    ? donation.pickup.date
      ? 1
      : 0
    : stepIndex(donation.status);

  return (
    <ol className="dn-track" aria-label="Donation progress">
      {TRACK_STEPS.map((step, index) => {
        const Icon = ICONS[index];
        const done = index < reached || (completed && index === reached);
        const current = !closed && !completed && index === reached;
        const stopped = closed && index === reached;
        const state = stopped
          ? "is-stopped"
          : done
            ? "is-done"
            : current
              ? "is-current"
              : "";

        return (
          <li key={step.key} className={state}>
            <span className="dn-track-dot">
              {stopped ? (
                <Ban size={17} />
              ) : done ? (
                <Check size={18} />
              ) : (
                <Icon size={17} />
              )}
            </span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.sub}</small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
