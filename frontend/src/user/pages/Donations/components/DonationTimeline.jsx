import React from "react";
import { CheckCircle2, Clock3, Truck, Ban, CircleDot } from "lucide-react";
import { formatDateTime } from "../../../utils/format";

const TONE_ICON = {
  good: CheckCircle2,
  info: Truck,
  wait: Clock3,
  bad: Ban,
  neutral: CircleDot,
};

export default function DonationTimeline({ events }) {
  const list = [...events].reverse(); // newest first

  return (
    <ol className="dn-tl">
      {list.map((event) => {
        const Icon = TONE_ICON[event.tone] || CircleDot;
        return (
          <li key={event.id}>
            <span className={`dn-tl-dot dn-tl-dot--${event.tone}`}>
              <Icon size={16} />
            </span>
            <div>
              <strong>{event.label}</strong>
              {event.detail && <p>{event.detail}</p>}
              <time>{formatDateTime(event.at)}</time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
