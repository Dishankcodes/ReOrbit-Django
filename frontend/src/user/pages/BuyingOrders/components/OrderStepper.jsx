import React from "react";
import { Check } from "lucide-react";
import { STAGES } from "../../../data/ordersStore";

/* compact = small dots for order cards; otherwise the large stepper. */
export default function OrderStepper({ order, compact = false }) {
  const stopped = order.cancelled;

  return (
    <ol
      className={`ob-steps ${compact ? "is-compact" : ""}`}
      aria-label="Order progress"
    >
      {STAGES.map((stage, index) => {
        const done = !stopped && index < order.stage;
        const current = !stopped && index === order.stage;
        const finished = !stopped && order.stage === 5 && index === 5;
        const reached = stopped && index <= order.stage;
        const cls =
          finished || done
            ? "is-done"
            : current
              ? "is-current"
              : reached
                ? "is-halted"
                : "";
        return (
          <li key={stage.key} className={cls}>
            <span className="ob-step-dot">
              {(done || finished) && <Check size={compact ? 9 : 14} />}
            </span>
            {!compact && <em>{stage.short}</em>}
          </li>
        );
      })}
    </ol>
  );
}
