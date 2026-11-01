import React from "react";
import { Check, Circle, Ban } from "lucide-react";
import { STAGES } from "../../../data/ordersStore";
import { formatDateTime, formatDate } from "../../../utils/format";

/* Done events (newest first), then the steps still to come. */
export default function TrackTimeline({ order }) {
  const done = [...order.events].reverse();
  const upcoming = order.cancelled ? [] : STAGES.slice(order.stage + 1);

  return (
    <ol className="ob-tl">
      {upcoming
        .slice()
        .reverse()
        .map((stage, index, arr) => {
          const last = index === 0 && stage.key === "delivered";
          return (
            <li key={stage.key} className="is-upcoming">
              <span className="ob-tl-dot">
                <Circle size={10} />
              </span>
              <div>
                <strong>{stage.label}</strong>
                <p>{stage.text}</p>
                <time>
                  {last && order.eta
                    ? `Expected by ${formatDate(order.eta)}`
                    : arr.length
                      ? "Upcoming"
                      : ""}
                </time>
              </div>
            </li>
          );
        })}

      {done.map((event, index) => {
        const isCancel = event.id === "cancel";
        const latest = index === 0;
        return (
          <li
            key={event.id}
            className={`${isCancel ? "is-bad" : "is-done"} ${latest ? "is-latest" : ""}`}
          >
            <span className="ob-tl-dot">
              {isCancel ? <Ban size={14} /> : <Check size={14} />}
            </span>
            <div>
              <strong>{event.label}</strong>
              <p>{event.detail}</p>
              <time>{formatDateTime(event.at)}</time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
